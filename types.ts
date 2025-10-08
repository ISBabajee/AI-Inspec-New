
export enum UserRole {
  SITE_ENGINEER = 'Site Engineer',
  ADMIN = 'Admin',
}

export type UserStatus = 'approved' | 'pending' | 'rejected';

export type ImageType = 'IR' | 'DS' | 'NAMEPLATE' | 'METER';

export interface User {
  id: string;
  email: string;
  name: string; // Added user's full name
  phoneNumber?: string; // Added optional phone number
  role: UserRole;
  status: UserStatus;
  validUntil?: string; // Added optional validity date (ISO string)
  // Password is not stored here after login for security, only used for signup/login process
}

export interface AuthContextType {
  currentUser: User | null;
  signIn: (email: string, password: string) => Promise<User | null>;
  signUp: (email: string, password: string, role: UserRole) => Promise<User | null>;
  signOut: () => void;
  loading: boolean; // Represents isActionLoading
  initialAuthCompleted: boolean;
}

export type InspectionStatus = 'draft' | 'pending-analysis' | 'analyzed' | 'analysis-error' | 'synced';

// This represents the JSON object we expect back from the main analysis AI
export type AnalysisOutput = {
  faultItemDescription?: string;
  problemItem?: string;
  problemType?: string;
  problemManufacturer?: string;
  problemAnomaly?: string;
  problemRootCause?: string;
  problemRemedial?: string;
  rawText?: string;
  error?: string;
  findings?: ParsedAnalysisFinding[];
  derivedData?: AIDerivedDataValue[];
  groundingChunks?: GroundingChunk[];
};

export interface ParsedAnalysisFinding {
  category?: string;
  finding: string;
  details: string;
  priority: string;
  recommendation: string;
}

export interface AIDerivedDataValue {
  parameter: string;
  value: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

// This represents the nested object the UI expects
export interface UINestedAnalysisOutput {
  findings?: ParsedAnalysisFinding[];
  derivedData?: AIDerivedDataValue[];
  groundingChunks?: GroundingChunk[];
  error?: string;
}

export interface InspectionRecord {
  id: string; // UUID
  clientName: string;
  location: string;
  // Location/Equipment Information
  equipmentId?: string; // Link to a predefined piece of equipment
  component?: string;
  machineDetails?: string; // Added to match usage in components
  status?: string;
  pmWorkOrder?: string;
  itemId?: string;
  operationPriority?: string;
  faultItemDescription?: string; // AI Populated
  
  // Problem
  problemItem?: string; // AI Populated
  problemType?: string; // AI Populated
  problemManufacturer?: string; // AI Populated
  problemAnomaly?: string; // AI Populated
  problemRootCause?: string; // AI Populated
  problemRemedial?: string; // AI Populated

  // Trending Data (User Input)
  ambientTemp?: number | null;
  nominalMaxCurrent?: number | null;
  measuredCurrent?: number | null;
  referenceTemp?: number | null;
  voltage?: number | null;
  l1Load?: number | null;
  l2Load?: number | null;
  l3Load?: number | null;
  neutralLoad?: number | null;
  ultrasonicReading?: string;
  
  // Trending Data (AI Populated / Calculated)
  // These fields are now part of the dynamic analysisOutput.derivedData
  
  // Images and supporting data
  irImageBase64: string | null;
  irImageTimestamp: Date | null;
  dsImageBase64: string | null;
  dsImageTimestamp: Date | null;
  nameplateImageBase64: string | null;
  nameplateImageTimestamp: Date | null;
  meterImageBase64: string | null;
  meterImageTimestamp: Date | null;
  nameplateData: NameplateData[] | null;
  meterData: NameplateData[] | null;
  
  // Metadata
  inspectionStatus: InspectionStatus;
  createdAt: Date;
  updatedAt: Date;
  analysisError?: string; // Store specific error from analysis attempt
  userId?: string; // To associate with the logged-in user
  jobIdReference?: string; // User input, legacy name kept
  technicianNotes?: string; // User input, legacy name kept
  adminNotes?: string; // For admin/expert comments
  rawAnalysisText?: string; // For debugging
  analysisOutput?: UINestedAnalysisOutput; // Added for UI compatibility
}

export interface LoginRecord {
  id: string;
  userId: string;
  userEmail: string;
  role: UserRole;
  loginTimestamp: Date;
  logoutTimestamp?: Date;
}

export interface NameplateData {
  id: string; // for stable rendering in lists
  parameter: string;
  value: string;
}

// Admin-managed client and site data
export interface Client {
  id: string; // UUID
  name: string;
  address: string;
  contactDetails: string;
}

export interface SiteLocation {
  id: string; // UUID
  clientId: string; // Foreign key to Client
  name: string;
  address: string;
}

export interface Equipment {
  id: string; // UUID
  clientId: string; // FK to Client
  locationId: string; // FK to SiteLocation
  name: string; // e.g., "Main Electrical Panel"
  details: string; // e.g., "Model: Square-D, S/N: XYZ-123"
  createdAt: Date;
  updatedAt: Date;
}