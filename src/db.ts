import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { InspectionRecord, InspectionStatus, Client, SiteLocation, NameplateData, Equipment } from '../types';
import { db } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';

const DB_NAME = 'techlens-db';
const DB_VERSION = 8; // Incremented for syncQueue store
const INSPECTION_STORE_NAME = 'inspections';
const CLIENTS_STORE_NAME = 'clients';
const SITE_LOCATIONS_STORE_NAME = 'siteLocations';
const EQUIPMENT_STORE_NAME = 'equipment';
const SYNC_QUEUE_STORE_NAME = 'syncQueue';

export interface SyncQueueItem {
  id: string; // inspectionId
  queuedAt: Date;
  userId: string;
  clientName: string;
  location: string;
  component: string;
}

interface TechLensDB extends DBSchema {
  [INSPECTION_STORE_NAME]: {
    key: string;
    value: InspectionRecord;
    indexes: { 
      inspectionStatus: InspectionStatus;
      updatedAt: Date;
      userId: string; 
      clientName: string; 
    };
  };
  [CLIENTS_STORE_NAME]: {
    key: string;
    value: Client;
    indexes: {
        name: string;
    };
  };
  [SITE_LOCATIONS_STORE_NAME]: {
    key: string;
    value: SiteLocation;
    indexes: {
        clientId: string;
    };
  };
  [EQUIPMENT_STORE_NAME]: {
    key: string;
    value: Equipment;
    indexes: {
      locationId: string;
      clientId: string;
    };
  };
  [SYNC_QUEUE_STORE_NAME]: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      userId: string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<TechLensDB>>;

const getDb = (): Promise<IDBPDatabase<TechLensDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<TechLensDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log(`Upgrading DB from version ${oldVersion} to ${newVersion}`);
        
        // Inspections Store
        if (!db.objectStoreNames.contains(INSPECTION_STORE_NAME)) {
          const inspectionStore = db.createObjectStore(INSPECTION_STORE_NAME, { keyPath: 'id' });
          inspectionStore.createIndex('inspectionStatus', 'inspectionStatus');
          inspectionStore.createIndex('updatedAt', 'updatedAt');
          inspectionStore.createIndex('userId', 'userId');
          inspectionStore.createIndex('clientName', 'clientName');
        } else {
            const inspectionStore = transaction.objectStore(INSPECTION_STORE_NAME);
            if (!inspectionStore.indexNames.contains('inspectionStatus')) {
                 inspectionStore.createIndex('inspectionStatus', 'inspectionStatus');
            }
            if (!inspectionStore.indexNames.contains('updatedAt')) {
                 inspectionStore.createIndex('updatedAt', 'updatedAt');
            }
            if (!inspectionStore.indexNames.contains('userId')) {
                 inspectionStore.createIndex('userId', 'userId');
            }
            if (!inspectionStore.indexNames.contains('clientName')) {
                 inspectionStore.createIndex('clientName', 'clientName');
            }
        }

        // Clients Store
        if (!db.objectStoreNames.contains(CLIENTS_STORE_NAME)) {
          const clientStore = db.createObjectStore(CLIENTS_STORE_NAME, { keyPath: 'id' });
          clientStore.createIndex('name', 'name', { unique: true });
        }
        
        // Site Locations Store
        if (!db.objectStoreNames.contains(SITE_LOCATIONS_STORE_NAME)) {
          const siteLocationStore = db.createObjectStore(SITE_LOCATIONS_STORE_NAME, { keyPath: 'id' });
          siteLocationStore.createIndex('clientId', 'clientId');
        }
        
        // Equipment Store
        if (!db.objectStoreNames.contains(EQUIPMENT_STORE_NAME)) {
          const equipmentStore = db.createObjectStore(EQUIPMENT_STORE_NAME, { keyPath: 'id' });
          equipmentStore.createIndex('locationId', 'locationId');
          equipmentStore.createIndex('clientId', 'clientId');
        }

        // Sync Queue Store
        if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE_NAME)) {
          const syncQueueStore = db.createObjectStore(SYNC_QUEUE_STORE_NAME, { keyPath: 'id' });
          syncQueueStore.createIndex('userId', 'userId');
        }
      },
    });
  }
  return dbPromise;
};

// Sync all Firestore data to local IndexedDB (one-way pull)
export const syncFirestoreToLocal = async (): Promise<void> => {
  if (!navigator.onLine) return;
  console.log("[Sync] Pulling latest data from Firestore...");
  const dbLocal = await getDb();

  try {
    // 1. Sync Clients
    const clientSnap = await getDocs(collection(db, 'clients'));
    const txClients = dbLocal.transaction(CLIENTS_STORE_NAME, 'readwrite');
    for (const docSnapshot of clientSnap.docs) {
      await txClients.objectStore(CLIENTS_STORE_NAME).put(docSnapshot.data() as Client);
    }
    await txClients.done;

    // 2. Sync Site Locations
    const locSnap = await getDocs(collection(db, 'siteLocations'));
    const txLocs = dbLocal.transaction(SITE_LOCATIONS_STORE_NAME, 'readwrite');
    for (const docSnapshot of locSnap.docs) {
      await txLocs.objectStore(SITE_LOCATIONS_STORE_NAME).put(docSnapshot.data() as SiteLocation);
    }
    await txLocs.done;

    // 3. Sync Equipment
    const eqSnap = await getDocs(collection(db, 'equipment'));
    const txEqs = dbLocal.transaction(EQUIPMENT_STORE_NAME, 'readwrite');
    for (const docSnapshot of eqSnap.docs) {
      const data = docSnapshot.data();
      const equipment: Equipment = {
        ...data,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
      } as Equipment;
      await txEqs.objectStore(EQUIPMENT_STORE_NAME).put(equipment);
    }
    await txEqs.done;

    // 4. Sync Inspections
    const inspSnap = await getDocs(collection(db, 'inspections'));
    const txInsps = dbLocal.transaction(INSPECTION_STORE_NAME, 'readwrite');
    for (const docSnapshot of inspSnap.docs) {
      const data = docSnapshot.data();
      const inspection: InspectionRecord = {
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
        irImageTimestamp: data.irImageTimestamp?.toDate ? data.irImageTimestamp.toDate() : (data.irImageTimestamp ? new Date(data.irImageTimestamp) : null),
        dsImageTimestamp: data.dsImageTimestamp?.toDate ? data.dsImageTimestamp.toDate() : (data.dsImageTimestamp ? new Date(data.dsImageTimestamp) : null),
        nameplateImageTimestamp: data.nameplateImageTimestamp?.toDate ? data.nameplateImageTimestamp.toDate() : (data.nameplateImageTimestamp ? new Date(data.nameplateImageTimestamp) : null),
        meterImageTimestamp: data.meterImageTimestamp?.toDate ? data.meterImageTimestamp.toDate() : (data.meterImageTimestamp ? new Date(data.meterImageTimestamp) : null),
      } as InspectionRecord;
      await txInsps.objectStore(INSPECTION_STORE_NAME).put(inspection);
    }
    await txInsps.done;

    console.log("[Sync] Pull completed successfully!");
  } catch (error) {
    console.warn("[Sync] Error pulling from Firestore (using local cache):", error);
  }
};

// Inspection Record Functions
export const saveInspectionRecord = async (record: InspectionRecord): Promise<string> => {
  const dbLocal = await getDb();
  await dbLocal.put(INSPECTION_STORE_NAME, record);

  if (navigator.onLine) {
    try {
      const firestoreRecord = {
        ...record,
        createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : record.createdAt,
        updatedAt: record.updatedAt instanceof Date ? record.updatedAt.toISOString() : record.updatedAt,
        irImageTimestamp: record.irImageTimestamp ? (record.irImageTimestamp instanceof Date ? record.irImageTimestamp.toISOString() : record.irImageTimestamp) : null,
        dsImageTimestamp: record.dsImageTimestamp ? (record.dsImageTimestamp instanceof Date ? record.dsImageTimestamp.toISOString() : record.dsImageTimestamp) : null,
        nameplateImageTimestamp: record.nameplateImageTimestamp ? (record.nameplateImageTimestamp instanceof Date ? record.nameplateImageTimestamp.toISOString() : record.nameplateImageTimestamp) : null,
        meterImageTimestamp: record.meterImageTimestamp ? (record.meterImageTimestamp instanceof Date ? record.meterImageTimestamp.toISOString() : record.meterImageTimestamp) : null,
      };
      await setDoc(doc(db, 'inspections', record.id), firestoreRecord);
    } catch (error) {
      console.warn("Failed to write inspection to Firestore:", error);
    }
  }
  return record.id;
};

export const getInspectionRecord = async (id: string): Promise<InspectionRecord | undefined> => {
  const dbLocal = await getDb();
  return dbLocal.get(INSPECTION_STORE_NAME, id);
};

export const getAllUserInspections = async (userId: string): Promise<InspectionRecord[]> => {
  const dbLocal = await getDb();
  const records = await dbLocal.getAllFromIndex(INSPECTION_STORE_NAME, 'userId', userId);
  return records.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const getAllInspections = async (): Promise<InspectionRecord[]> => {
  const dbLocal = await getDb();
  return dbLocal.getAll(INSPECTION_STORE_NAME);
};

export const getPendingAnalysisRecords = async (userId: string): Promise<InspectionRecord[]> => {
  const dbLocal = await getDb();
  const records = await dbLocal.getAllFromIndex(INSPECTION_STORE_NAME, 'userId', userId);
  return records.filter(record => record.inspectionStatus === 'pending-analysis');
};

export const deleteInspectionRecord = async (id: string): Promise<void> => {
  const dbLocal = await getDb();
  await dbLocal.delete(INSPECTION_STORE_NAME, id);

  if (navigator.onLine) {
    try {
      await deleteDoc(doc(db, 'inspections', id));
    } catch (error) {
      console.warn("Failed to delete inspection from Firestore:", error);
    }
  }
};

export const createNewInspection = (userId: string): InspectionRecord => {
  return {
    id: crypto.randomUUID(),
    clientName: '',
    location: '',
    component: '',
    machineDetails: '',
    status: '',
    pmWorkOrder: '',
    itemId: '',
    operationPriority: '',
    faultItemDescription: '',
    problemItem: '',
    problemType: '',
    problemManufacturer: '',
    problemAnomaly: '',
    problemRootCause: '',
    problemRemedial: '',
    ambientTemp: null,
    nominalMaxCurrent: null,
    measuredCurrent: null,
    referenceTemp: null,
    voltage: null,
    l1Load: null,
    l2Load: null,
    l3Load: null,
    neutralLoad: null,
    ultrasonicReading: '',
    irImageBase64: null,
    irImageTimestamp: null,
    dsImageBase64: null,
    dsImageTimestamp: null,
    nameplateImageBase64: null,
    nameplateImageTimestamp: null,
    meterImageBase64: null,
    meterImageTimestamp: null,
    nameplateData: null,
    meterData: null,
    inspectionStatus: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: userId,
    jobIdReference: '',
    technicianNotes: '',
    analysisOutput: undefined,
  };
};

export const getUniqueClientNamesAcrossAllUsers = async (): Promise<string[]> => {
  const dbLocal = await getDb();
  const allInspections = await dbLocal.getAll(INSPECTION_STORE_NAME);
  const clientNames = new Set<string>();
  allInspections.forEach(inspection => {
    if (inspection.clientName) {
      clientNames.add(inspection.clientName);
    }
  });
  return Array.from(clientNames).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
};

export const getInspectionsByClientNameAcrossAllUsers = async (clientName: string): Promise<InspectionRecord[]> => {
    const dbLocal = await getDb();
    if (clientName === '') {
        return (await dbLocal.getAll(INSPECTION_STORE_NAME)).sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    const records = await dbLocal.getAllFromIndex(INSPECTION_STORE_NAME, 'clientName', clientName);
    return records.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()); 
};

// Client Functions
export const addClient = async (client: Omit<Client, 'id'>): Promise<Client> => {
  const dbLocal = await getDb();
  const newClient = { ...client, id: crypto.randomUUID() };
  await dbLocal.add(CLIENTS_STORE_NAME, newClient);

  if (navigator.onLine) {
    try {
      await setDoc(doc(db, 'clients', newClient.id), newClient);
    } catch (error) {
      console.warn("Failed to write client to Firestore:", error);
    }
  }
  return newClient;
};

export const getAllClients = async (): Promise<Client[]> => {
  const dbLocal = await getDb();
  return dbLocal.getAll(CLIENTS_STORE_NAME);
};

export const updateClient = async (client: Client): Promise<string> => {
    const dbLocal = await getDb();
    await dbLocal.put(CLIENTS_STORE_NAME, client);

    if (navigator.onLine) {
      try {
        await setDoc(doc(db, 'clients', client.id), client);
      } catch (error) {
        console.warn("Failed to update client in Firestore:", error);
      }
    }
    return client.id;
};

export const deleteClient = async (id: string): Promise<void> => {
    const dbLocal = await getDb();
    const tx = dbLocal.transaction([CLIENTS_STORE_NAME, SITE_LOCATIONS_STORE_NAME, EQUIPMENT_STORE_NAME], 'readwrite');
    const locations = await tx.objectStore(SITE_LOCATIONS_STORE_NAME).index('clientId').getAll(id);
    const deleteLocationPromises = locations.map(loc => tx.objectStore(SITE_LOCATIONS_STORE_NAME).delete(loc.id));
    await Promise.all(deleteLocationPromises);

    const equipment = await tx.objectStore(EQUIPMENT_STORE_NAME).index('clientId').getAll(id);
    const deleteEquipmentPromises = equipment.map(eq => tx.objectStore(EQUIPMENT_STORE_NAME).delete(eq.id));
    await Promise.all(deleteEquipmentPromises);
    
    await tx.objectStore(CLIENTS_STORE_NAME).delete(id);
    await tx.done;

    if (navigator.onLine) {
      try {
        await deleteDoc(doc(db, 'clients', id));
        for (const loc of locations) {
          await deleteDoc(doc(db, 'siteLocations', loc.id));
        }
        for (const eq of equipment) {
          await deleteDoc(doc(db, 'equipment', eq.id));
        }
      } catch (error) {
        console.warn("Failed to delete client elements from Firestore:", error);
      }
    }
};

// SiteLocation Functions
export const addSiteLocation = async (location: Omit<SiteLocation, 'id'>): Promise<SiteLocation> => {
    const dbLocal = await getDb();
    const newLocation = { ...location, id: crypto.randomUUID() };
    await dbLocal.add(SITE_LOCATIONS_STORE_NAME, newLocation);

    if (navigator.onLine) {
      try {
        await setDoc(doc(db, 'siteLocations', newLocation.id), newLocation);
      } catch (error) {
        console.warn("Failed to write site location to Firestore:", error);
      }
    }
    return newLocation;
};

export const getAllSiteLocations = async (): Promise<SiteLocation[]> => {
    const dbLocal = await getDb();
    return dbLocal.getAll(SITE_LOCATIONS_STORE_NAME);
};

export const getSiteLocationsByClientId = async (clientId: string): Promise<SiteLocation[]> => {
    const dbLocal = await getDb();
    return dbLocal.getAllFromIndex(SITE_LOCATIONS_STORE_NAME, 'clientId', clientId);
};

export const updateSiteLocation = async (location: SiteLocation): Promise<string> => {
    const dbLocal = await getDb();
    await dbLocal.put(SITE_LOCATIONS_STORE_NAME, location);

    if (navigator.onLine) {
      try {
        await setDoc(doc(db, 'siteLocations', location.id), location);
      } catch (error) {
        console.warn("Failed to update site location in Firestore:", error);
      }
    }
    return location.id;
};

export const deleteSiteLocation = async (id: string): Promise<void> => {
    const dbLocal = await getDb();
    const tx = dbLocal.transaction([SITE_LOCATIONS_STORE_NAME, EQUIPMENT_STORE_NAME], 'readwrite');
    const equipment = await tx.objectStore(EQUIPMENT_STORE_NAME).index('locationId').getAll(id);
    const deleteEquipmentPromises = equipment.map(eq => tx.objectStore(EQUIPMENT_STORE_NAME).delete(eq.id));
    await Promise.all(deleteEquipmentPromises);
    await tx.objectStore(SITE_LOCATIONS_STORE_NAME).delete(id);
    await tx.done;

    if (navigator.onLine) {
      try {
        await deleteDoc(doc(db, 'siteLocations', id));
        for (const eq of equipment) {
          await deleteDoc(doc(db, 'equipment', eq.id));
        }
      } catch (error) {
        console.warn("Failed to delete site location from Firestore:", error);
      }
    }
};

// Equipment Functions
export const addEquipment = async (equipmentData: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Equipment> => {
  const dbLocal = await getDb();
  const newEquipment: Equipment = {
    ...equipmentData,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await dbLocal.add(EQUIPMENT_STORE_NAME, newEquipment);

  if (navigator.onLine) {
    try {
      await setDoc(doc(db, 'equipment', newEquipment.id), {
        ...newEquipment,
        createdAt: newEquipment.createdAt.toISOString(),
        updatedAt: newEquipment.updatedAt.toISOString(),
      });
    } catch (error) {
      console.warn("Failed to write equipment to Firestore:", error);
    }
  }
  return newEquipment;
};

export const getAllEquipment = async (): Promise<Equipment[]> => {
  const dbLocal = await getDb();
  return dbLocal.getAll(EQUIPMENT_STORE_NAME);
};

export const updateEquipment = async (equipment: Equipment): Promise<string> => {
  const dbLocal = await getDb();
  const updated = { ...equipment, updatedAt: new Date() };
  await dbLocal.put(EQUIPMENT_STORE_NAME, updated);

  if (navigator.onLine) {
    try {
      await setDoc(doc(db, 'equipment', equipment.id), {
        ...updated,
        createdAt: updated.createdAt instanceof Date ? updated.createdAt.toISOString() : updated.createdAt,
        updatedAt: updated.updatedAt.toISOString(),
      });
    } catch (error) {
      console.warn("Failed to update equipment in Firestore:", error);
    }
  }
  return equipment.id;
};

export const deleteEquipment = async (id: string): Promise<void> => {
  const dbLocal = await getDb();
  await dbLocal.delete(EQUIPMENT_STORE_NAME, id);

  if (navigator.onLine) {
    try {
      await deleteDoc(doc(db, 'equipment', id));
    } catch (error) {
      console.warn("Failed to delete equipment from Firestore:", error);
    }
  }
};

// Sync Queue Helper Functions
export const addToSyncQueue = async (item: SyncQueueItem): Promise<string> => {
  const dbLocal = await getDb();
  return dbLocal.put(SYNC_QUEUE_STORE_NAME, item);
};

export const removeFromSyncQueue = async (id: string): Promise<void> => {
  const dbLocal = await getDb();
  return dbLocal.delete(SYNC_QUEUE_STORE_NAME, id);
};

export const getSyncQueue = async (): Promise<SyncQueueItem[]> => {
  const dbLocal = await getDb();
  return dbLocal.getAll(SYNC_QUEUE_STORE_NAME);
};

export const getSyncQueueByUserId = async (userId: string): Promise<SyncQueueItem[]> => {
  const dbLocal = await getDb();
  return dbLocal.getAllFromIndex(SYNC_QUEUE_STORE_NAME, 'userId', userId);
};
