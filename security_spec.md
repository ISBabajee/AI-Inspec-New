# Security Specification (TDD) for TechLens inspection app

## 1. Data Invariants
- **Identity Integrity**: A user can only access, read, or write their own user document under `/users/{userId}` unless they are an Admin.
- **Admin Supremacy**: Users cannot escalate their own privilege. Only pre-existing admins can approve, reject, or modify user roles and statuses.
- **Access Delegation**: Site Engineers can read `/clients`, `/siteLocations`, and `/equipment` but cannot create, modify, or delete them. Only Admins have full write permissions.
- **Inspection Ownership**: A Site Engineer can read/write their own inspections under `/inspections/{inspectionId}`. They cannot view or modify other engineers' inspections. Admins can view and manage all inspections.
- **Terminal State Lock**: Once an inspection's status is set to `analyzed` or `synced`, standard Site Engineers cannot modify the inspection data anymore. Only Admins can modify or override.
- **System-Only Fields**: Fields like AI analysis outputs cannot be updated directly by standard users except via approved server-side or validated actions.

---

## 2. The "Dirty Dozen" Payloads (Attack Vectors)

### Payload 1: Privilege Escalation (Self-Approval)
- **Path**: `/users/attacker-uid`
- **Action**: `create` or `update`
- **Payload**: `{ "id": "attacker-uid", "email": "attacker@gmail.com", "name": "Attacker", "role": "Admin", "status": "approved" }`
- **Expected Outcome**: `PERMISSION_DENIED` (Cannot self-appoint Role as Admin or self-approve status).

### Payload 2: Client Poisoning (Spam Clients)
- **Path**: `/clients/malicious-client`
- **Action**: `create`
- **Payload**: `{ "id": "malicious-client", "name": "A".repeat(1000), "address": "Junk", "contactDetails": "Junk" }`
- **Expected Outcome**: `PERMISSION_DENIED` (Non-Admin cannot create client; size limit exceeded).

### Payload 3: Location Hijacking (Orphaned Location)
- **Path**: `/siteLocations/some-loc`
- **Action**: `create`
- **Payload**: `{ "id": "some-loc", "clientId": "non-existent-client-id", "name": "Malicious Loc", "address": "Junk" }`
- **Expected Outcome**: `PERMISSION_DENIED` (Referenced client must exist, non-Admin cannot write).

### Payload 4: ID Poisoning (Long ID Denial of Wallet)
- **Path**: `/inspections/` + `"A".repeat(500)`
- **Action**: `create`
- **Payload**: `{ "id": "A".repeat(500), "clientName": "Test", "location": "Loc", "inspectionStatus": "draft", "createdAt": "request.time", "updatedAt": "request.time" }`
- **Expected Outcome**: `PERMISSION_DENIED` (ID exceeds 128 characters or fails regex).

### Payload 5: Spoofing Inspection Owner
- **Path**: `/inspections/some-insp-id`
- **Action**: `create`
- **Payload**: `{ "id": "some-insp-id", "clientName": "Test", "location": "Loc", "inspectionStatus": "draft", "userId": "victim-uid", "createdAt": "request.time", "updatedAt": "request.time" }`
- **Expected Outcome**: `PERMISSION_DENIED` (userId field must match authenticated user's UID).

### Payload 6: Modifying Someone Else's Inspection
- **Path**: `/inspections/victim-insp-id` (owned by victim-uid)
- **Action**: `update`
- **Payload**: `{ "clientName": "Attacker modified name" }` (by attacker-uid)
- **Expected Outcome**: `PERMISSION_DENIED` (Non-owner, non-Admin cannot write).

### Payload 7: State Shortcutting (Bypassing Draft Status)
- **Path**: `/inspections/new-insp-id`
- **Action**: `create`
- **Payload**: `{ "id": "new-insp-id", "clientName": "Test", "location": "Loc", "inspectionStatus": "synced", "createdAt": "request.time", "updatedAt": "request.time" }`
- **Expected Outcome**: `PERMISSION_DENIED` (Must start with draft or pending-analysis status).

### Payload 8: Immutable Field Overwrite (Altering createdAt)
- **Path**: `/inspections/existing-insp-id`
- **Action**: `update`
- **Payload**: `{ "createdAt": "2020-01-01T00:00:00Z", "updatedAt": "request.time" }`
- **Expected Outcome**: `PERMISSION_DENIED` (createdAt is immutable after creation).

### Payload 9: Terminal State Bypass (Editing Analyzed Report)
- **Path**: `/inspections/analyzed-insp-id` (status is `analyzed`)
- **Action**: `update`
- **Payload**: `{ "component": "Malicious change" }` (by non-Admin owner)
- **Expected Outcome**: `PERMISSION_DENIED` (Terminal states are locked to non-Admins).

### Payload 10: Anonymous Write Attempt
- **Path**: `/inspections/some-id`
- **Action**: `create` (Unauthenticated/Anonymous user)
- **Payload**: `{ "id": "some-id", "clientName": "Test", "location": "Loc", "inspectionStatus": "draft" }`
- **Expected Outcome**: `PERMISSION_DENIED` (Must be signed in with verified email/provider).

### Payload 11: Spoofed Login Trail
- **Path**: `/loginRecords/forged-id`
- **Action**: `create`
- **Payload**: `{ "id": "forged-id", "userId": "victim-uid", "userEmail": "victim@gmail.com", "role": "Admin", "loginTimestamp": "request.time" }` (by attacker-uid)
- **Expected Outcome**: `PERMISSION_DENIED` (userId must match request.auth.uid).

### Payload 12: Injection of Massive Base64 Attachments beyond Limit
- **Path**: `/inspections/some-id`
- **Action**: `update`
- **Payload**: `{ "irImageBase64": "A".repeat(1500000) }` (Exceeding 1.2MB for single image string)
- **Expected Outcome**: `PERMISSION_DENIED` (Size constraints on strings prevent Denial of Wallet).

---

## 3. The Test Plan
Verify that each collection has a catch-all security rules coverage ensuring all above dirty payloads fail with `PERMISSION_DENIED`.
