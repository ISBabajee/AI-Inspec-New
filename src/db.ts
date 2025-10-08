
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { InspectionRecord, InspectionStatus, Client, SiteLocation, NameplateData, Equipment } from '../types';

const DB_NAME = 'techlens-db';
const DB_VERSION = 7; // Incremented for equipment store
const INSPECTION_STORE_NAME = 'inspections';
const CLIENTS_STORE_NAME = 'clients';
const SITE_LOCATIONS_STORE_NAME = 'siteLocations';
const EQUIPMENT_STORE_NAME = 'equipment';

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
            // If the store exists, we might need to recreate indexes if they changed
            const inspectionStore = transaction.objectStore(INSPECTION_STORE_NAME);
            if (!inspectionStore.indexNames.contains('inspectionStatus')) {
                 inspectionStore.createIndex('inspectionStatus', 'inspectionStatus');
            }
             if (inspectionStore.indexNames.contains('status' as any)) {
                 inspectionStore.deleteIndex('status' as any);
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
      },
    });
  }
  return dbPromise;
};

// Inspection Record Functions
export const saveInspectionRecord = async (record: InspectionRecord): Promise<string> => {
  const db = await getDb();
  return db.put(INSPECTION_STORE_NAME, record);
};

export const getInspectionRecord = async (id: string): Promise<InspectionRecord | undefined> => {
  const db = await getDb();
  return db.get(INSPECTION_STORE_NAME, id);
};

export const getAllUserInspections = async (userId: string): Promise<InspectionRecord[]> => {
  const db = await getDb();
  const records = await db.getAllFromIndex(INSPECTION_STORE_NAME, 'userId', userId);
  return records.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
};

export const getAllInspections = async (): Promise<InspectionRecord[]> => {
  const db = await getDb();
  return db.getAll(INSPECTION_STORE_NAME);
};

export const getPendingAnalysisRecords = async (userId: string): Promise<InspectionRecord[]> => {
  const db = await getDb();
  const records = await db.getAllFromIndex(INSPECTION_STORE_NAME, 'userId', userId);
  return records.filter(record => record.inspectionStatus === 'pending-analysis');
};

export const deleteInspectionRecord = async (id: string): Promise<void> => {
  const db = await getDb();
  return db.delete(INSPECTION_STORE_NAME, id);
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
    // FIX: Removed deprecated properties that no longer exist on the InspectionRecord type.
    // These values are now part of the `analysisOutput.derivedData` object.
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
  const db = await getDb();
  const allInspections = await db.getAll(INSPECTION_STORE_NAME);
  const clientNames = new Set<string>();
  allInspections.forEach(inspection => {
    if (inspection.clientName) {
      clientNames.add(inspection.clientName);
    }
  });
  return Array.from(clientNames).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
};

export const getInspectionsByClientNameAcrossAllUsers = async (clientName: string): Promise<InspectionRecord[]> => {
    const db = await getDb();
    if (clientName === '') { // Special case to get all records if client name is empty
        return (await db.getAll(INSPECTION_STORE_NAME)).sort((a,b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
    const records = await db.getAllFromIndex(INSPECTION_STORE_NAME, 'clientName', clientName);
    return records.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()); 
};

// Client Functions
export const addClient = async (client: Omit<Client, 'id'>): Promise<Client> => {
  const db = await getDb();
  const newClient = { ...client, id: crypto.randomUUID() };
  await db.add(CLIENTS_STORE_NAME, newClient);
  return newClient;
};

export const getAllClients = async (): Promise<Client[]> => {
  const db = await getDb();
  return db.getAll(CLIENTS_STORE_NAME);
};

export const updateClient = async (client: Client): Promise<string> => {
    const db = await getDb();
    return db.put(CLIENTS_STORE_NAME, client);
};

export const deleteClient = async (id: string): Promise<void> => {
    const db = await getDb();
    // Also delete associated site locations and equipment
    const tx = db.transaction([CLIENTS_STORE_NAME, SITE_LOCATIONS_STORE_NAME, EQUIPMENT_STORE_NAME], 'readwrite');
    const locations = await tx.objectStore(SITE_LOCATIONS_STORE_NAME).index('clientId').getAll(id);
    const deleteLocationPromises = locations.map(loc => tx.objectStore(SITE_LOCATIONS_STORE_NAME).delete(loc.id));
    await Promise.all(deleteLocationPromises);

    const equipment = await tx.objectStore(EQUIPMENT_STORE_NAME).index('clientId').getAll(id);
    const deleteEquipmentPromises = equipment.map(eq => tx.objectStore(EQUIPMENT_STORE_NAME).delete(eq.id));
    await Promise.all(deleteEquipmentPromises);
    
    await tx.objectStore(CLIENTS_STORE_NAME).delete(id);
    await tx.done;
};


// SiteLocation Functions
export const addSiteLocation = async (location: Omit<SiteLocation, 'id'>): Promise<SiteLocation> => {
    const db = await getDb();
    const newLocation = { ...location, id: crypto.randomUUID() };
    await db.add(SITE_LOCATIONS_STORE_NAME, newLocation);
    return newLocation;
};

export const getAllSiteLocations = async (): Promise<SiteLocation[]> => {
    const db = await getDb();
    return db.getAll(SITE_LOCATIONS_STORE_NAME);
};

export const getSiteLocationsByClientId = async (clientId: string): Promise<SiteLocation[]> => {
    const db = await getDb();
    return db.getAllFromIndex(SITE_LOCATIONS_STORE_NAME, 'clientId', clientId);
};

export const updateSiteLocation = async (location: SiteLocation): Promise<string> => {
    const db = await getDb();
    return db.put(SITE_LOCATIONS_STORE_NAME, location);
};

export const deleteSiteLocation = async (id: string): Promise<void> => {
    const db = await getDb();
    // Also delete associated equipment
    const tx = db.transaction([SITE_LOCATIONS_STORE_NAME, EQUIPMENT_STORE_NAME], 'readwrite');
    const equipment = await tx.objectStore(EQUIPMENT_STORE_NAME).index('locationId').getAll(id);
    const deleteEquipmentPromises = equipment.map(eq => tx.objectStore(EQUIPMENT_STORE_NAME).delete(eq.id));
    await Promise.all(deleteEquipmentPromises);
    await tx.objectStore(SITE_LOCATIONS_STORE_NAME).delete(id);
    await tx.done;
};

// Equipment Functions
export const addEquipment = async (equipmentData: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Equipment> => {
  const db = await getDb();
  const newEquipment: Equipment = {
    ...equipmentData,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await db.add(EQUIPMENT_STORE_NAME, newEquipment);
  return newEquipment;
};

export const getAllEquipment = async (): Promise<Equipment[]> => {
  const db = await getDb();
  return db.getAll(EQUIPMENT_STORE_NAME);
};

export const updateEquipment = async (equipment: Equipment): Promise<string> => {
  const db = await getDb();
  return db.put(EQUIPMENT_STORE_NAME, { ...equipment, updatedAt: new Date() });
};

export const deleteEquipment = async (id: string): Promise<void> => {
  const db = await getDb();
  return db.delete(EQUIPMENT_STORE_NAME, id);
};
