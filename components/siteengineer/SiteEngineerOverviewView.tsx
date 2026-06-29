import React, { useMemo, useState, useCallback } from 'react';
import { InspectionRecord, InspectionStatus } from '../../types';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../LoadingSpinner';
import { createNewInspection, saveInspectionRecord, getSyncQueueByUserId, SyncQueueItem } from '../../src/db';
import { ClientIcon, LocationIcon, EquipmentIcon } from '../Icons';

type ActiveView = 'overview' | 'records' | 'reports' | 'customers';

interface SiteEngineerOverviewViewProps {
  currentUser: any;
  setActiveView: (view: ActiveView, clientName?: string) => void;
  setCurrentInspectionById: (id: string) => void;
  startTour: () => void;
}

const WorkflowCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    step: number;
    children: React.ReactNode;
    isDimmed?: boolean;
}> = ({ icon, title, step, children, isDimmed }) => (
    <div className={`p-4 sm:p-6 bg-white dark:bg-slate-800/50 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 transition-opacity duration-300 ${isDimmed ? 'opacity-50' : 'opacity-100'}`}>
        <div className="flex items-center mb-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-sky-100 dark:bg-sky-900 flex items-center justify-center mr-4">
                {icon}
            </div>
            <div>
                <h3 className="text-sm font-semibold text-sky-600 dark:text-sky-300">STEP {step}</h3>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{title}</p>
            </div>
        </div>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);


const SiteEngineerOverviewView: React.FC<SiteEngineerOverviewViewProps> = ({ currentUser, setActiveView, setCurrentInspectionById, startTour }) => {
  const { allClients, allSiteLocations, allEquipment, loading, uniqueClientNames } = useData();
  const { currentUser: authUser } = useAuth();

  const [clientName, setClientName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [equipmentName, setEquipmentName] = useState('');
  const [equipmentDetails, setEquipmentDetails] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);

  const loadSyncQueue = useCallback(async () => {
    if (authUser?.id) {
      const items = await getSyncQueueByUserId(authUser.id);
      setSyncQueue(items);
    }
  }, [authUser?.id]);

  React.useEffect(() => {
    loadSyncQueue();
    const interval = setInterval(loadSyncQueue, 3000);
    window.addEventListener('online', loadSyncQueue);
    window.addEventListener('offline', loadSyncQueue);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', loadSyncQueue);
      window.removeEventListener('offline', loadSyncQueue);
    };
  }, [loadSyncQueue]);

  const selectedClient = useMemo(() => allClients.find(c => c.name.toLowerCase() === clientName.toLowerCase()), [clientName, allClients]);
  
  const availableLocations = useMemo(() => {
    if (!selectedClient) return [];
    return allSiteLocations.filter(l => l.clientId === selectedClient.id);
  }, [selectedClient, allSiteLocations]);
  
  const selectedLocation = useMemo(() => availableLocations.find(l => l.name.toLowerCase() === locationName.toLowerCase()), [locationName, availableLocations]);
  
  const availableEquipment = useMemo(() => {
      if(!selectedLocation) return [];
      return allEquipment.filter(e => e.locationId === selectedLocation.id);
  }, [selectedLocation, allEquipment]);

  const handleEquipmentSelection = (id: string) => {
    const eq = availableEquipment.find(e => e.id === id);
    if (eq) {
      setEquipmentName(eq.name);
      setEquipmentDetails(eq.details);
    } else {
      setEquipmentName('');
      setEquipmentDetails('');
    }
  };

  const handleStartInspection = useCallback(async () => {
    if (!clientName.trim()) {
        alert("Client Name is required to start an inspection.");
        return;
    }
    setIsCreating(true);
    try {
        if (!authUser) throw new Error("User not authenticated");
        const newRecord = createNewInspection(authUser.id);
        newRecord.clientName = clientName.trim();
        newRecord.location = locationName.trim();
        newRecord.component = equipmentName.trim();
        newRecord.machineDetails = equipmentDetails.trim();
        
        await saveInspectionRecord(newRecord);
        setCurrentInspectionById(newRecord.id);
    } catch (e) {
        console.error("Failed to create new inspection:", e);
        alert("An error occurred while creating the inspection.");
        setIsCreating(false);
    }
  }, [clientName, locationName, equipmentName, equipmentDetails, authUser, setCurrentInspectionById]);


  if (loading) {
    return <LoadingSpinner text="Loading data..." />;
  }

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-sky-700 dark:text-sky-400">Start New Inspection</h2>
                
                <WorkflowCard icon={<ClientIcon />} title="Select Client" step={1}>
                    <label htmlFor="client-select" className="block text-sm font-medium text-slate-700 dark:text-gray-300">Choose an existing client or type a new one:</label>
                    <input id="client-select" list="client-list" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g., Acme Corp" className="w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white" />
                    <datalist id="client-list">
                        {uniqueClientNames.map(name => <option key={name} value={name} />)}
                    </datalist>
                </WorkflowCard>

                <WorkflowCard icon={<LocationIcon />} title="Site Location" step={2} isDimmed={!clientName}>
                    <label htmlFor="location-select" className="block text-sm font-medium text-slate-700 dark:text-gray-300">Choose an existing location or type a new one:</label>
                    <input id="location-select" list="location-list" value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="e.g., Main Factory Floor" disabled={!clientName} className="w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white disabled:opacity-50" />
                    <datalist id="location-list">
                        {availableLocations.map(l => <option key={l.id} value={l.name} />)}
                    </datalist>
                </WorkflowCard>

                <WorkflowCard icon={<EquipmentIcon />} title="Identify Equipment" step={3} isDimmed={!locationName}>
                    {availableEquipment.length > 0 ? (
                        <div>
                            <label htmlFor="equipment-select" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Select from list or enter manually below:</label>
                            <select id="equipment-select" onChange={e => handleEquipmentSelection(e.target.value)} disabled={!locationName} className="w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white disabled:opacity-50 mb-4">
                                <option value="">-- Select Pre-defined Equipment --</option>
                                {availableEquipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                            </select>
                        </div>
                    ) : (
                         <p className="text-xs text-slate-500 dark:text-gray-400 mb-2">No pre-defined equipment for this location. Please enter manually.</p>
                    )}
                     <div>
                        <label htmlFor="equipment-name" className="block text-sm font-medium text-slate-700 dark:text-gray-300">Equipment Name / ID</label>
                        <input id="equipment-name" value={equipmentName} onChange={e => setEquipmentName(e.target.value)} placeholder="e.g., Main Breaker Panel" disabled={!locationName} className="mt-1 w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white disabled:opacity-50" />
                    </div>
                     <div>
                        <label htmlFor="equipment-details" className="block text-sm font-medium text-slate-700 dark:text-gray-300">Equipment Details (Model, S/N)</label>
                        <input id="equipment-details" value={equipmentDetails} onChange={e => setEquipmentDetails(e.target.value)} placeholder="e.g., Model XYZ-123" disabled={!locationName} className="mt-1 w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white disabled:opacity-50" />
                    </div>
                </WorkflowCard>
                
                <button onClick={handleStartInspection} disabled={!clientName || isCreating} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition duration-150 ease-in-out text-lg disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center">
                    {isCreating ? <LoadingSpinner size="sm" /> : "Create Inspection & Proceed"}
                </button>
            </div>

            <div className="space-y-6">
                {syncQueue.length > 0 && (
                  <div className="p-4 sm:p-6 bg-amber-50 dark:bg-amber-950/20 rounded-lg shadow-lg border border-amber-200 dark:border-amber-900/50">
                      <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                              <span>⏳</span> Offline Sync Queue
                          </h3>
                          <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 rounded text-xs font-semibold">
                              {syncQueue.length} Pending
                          </span>
                      </div>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
                          These reports will automatically upload and run AI analysis once your connection is restored:
                      </p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                          {syncQueue.map(item => (
                              <div key={item.id} className="p-2.5 bg-white dark:bg-gray-800 rounded border border-amber-100 dark:border-amber-950/50 text-xs flex justify-between items-center shadow-sm">
                                  <div>
                                      <p className="font-bold text-slate-800 dark:text-slate-100">{item.clientName}</p>
                                      <p className="text-slate-500 dark:text-slate-400 text-[10px]">{item.location} • {item.component}</p>
                                  </div>
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 italic">Waiting</span>
                              </div>
                          ))}
                      </div>
                  </div>
                )}

                <div className="p-4 sm:p-6 bg-white dark:bg-slate-800/50 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-4">Quick Actions</h3>
                    <div className="flex flex-col space-y-3">
                        <button onClick={() => setActiveView('records')} className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-4 rounded-lg shadow transition">
                            View All Inspection Records
                        </button>
                        <button data-tour-id="start-tour-btn" onClick={startTour} className="w-full bg-brand-orange hover:bg-amber-600 text-white font-semibold py-3 px-4 rounded-lg shadow transition">
                            Start Guided Tour
                        </button>
                    </div>
                </div>

                <div className="p-4 sm:p-6 bg-white dark:bg-slate-800/50 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-4">Jump to Client</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">Quickly view all records for a specific client.</p>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                        {uniqueClientNames.map(name => (
                            <button key={name} onClick={() => setActiveView('records', name)} className="w-full text-left p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-medium text-sm transition-colors">
                                {name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default SiteEngineerOverviewView;
