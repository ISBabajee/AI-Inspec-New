import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../LoadingSpinner';
import { createNewInspection, saveInspectionRecord, addClient, addSiteLocation, addEquipment } from '../../src/db';
import { ClientIcon, LocationIcon, EquipmentIcon, UploadIcon } from '../Icons';
import { PDFUploadModal } from './PDFUploadModal';
import { InspectionRecord } from '../../types';

interface SiteEngineerNewInspectionViewProps {
  onBack: () => void;
  setCurrentInspectionById: (id: string) => void;
}

const WorkflowCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    step: number;
    children: React.ReactNode;
    isDimmed?: boolean;
}> = ({ icon, title, step, children, isDimmed }) => (
    <div className={`p-4 sm:p-6 bg-white dark:bg-slate-800/50 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 transition-opacity duration-300 ${isDimmed ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
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

const SiteEngineerNewInspectionView: React.FC<SiteEngineerNewInspectionViewProps> = ({ onBack, setCurrentInspectionById }) => {
  const { allClients, allSiteLocations, allEquipment, uniqueClientNames, allInspections, loading, refreshData } = useData();
  const { currentUser } = useAuth();
  
  const [clientSelection, setClientSelection] = useState(''); // Manages the dropdown for clients
  const [clientName, setClientName] = useState(''); // The actual client name to be used

  const [locationSelection, setLocationSelection] = useState(''); // Manages the dropdown for locations
  const [locationName, setLocationName] = useState(''); // The actual location name

  const [equipmentName, setEquipmentName] = useState('');
  const [equipmentDetails, setEquipmentDetails] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isPDFUploadOpen, setIsPDFUploadOpen] = useState(false);

  // When clientSelection changes, update clientName and reset location
  useEffect(() => {
    if (clientSelection === '__NEW__') {
      setClientName('');
    } else {
      setClientName(clientSelection);
    }
    setLocationSelection('');
    setLocationName('');
  }, [clientSelection]);
  
  // When locationSelection changes, update locationName
  useEffect(() => {
      if (locationSelection === '__NEW__') {
          setLocationName('');
      } else {
          setLocationName(locationSelection);
      }
  }, [locationSelection]);

  const selectedClient = useMemo(() => allClients.find(c => c.name === clientName), [clientName, allClients]);
  
  const availableLocations = useMemo(() => {
    if (!clientName) return [];
    
    // First, get explicit site locations if we have a client entity
    const locations = selectedClient ? allSiteLocations.filter(l => l.clientId === selectedClient.id) : [];
    
    // Then add any ad-hoc locations from existing inspections
    const existingLocNames = new Set(locations.map(l => l.name));
    allInspections.forEach(insp => {
        if (insp.clientName === clientName && insp.location && !existingLocNames.has(insp.location)) {
            existingLocNames.add(insp.location);
            locations.push({ id: `adhoc-${insp.location}`, clientId: selectedClient?.id || 'adhoc', name: insp.location, address: '' });
        }
    });
    
    return locations;
  }, [clientName, selectedClient, allSiteLocations, allInspections]);
  
  const selectedLocation = useMemo(() => availableLocations.find(l => l.name === locationName), [locationName, availableLocations]);
  
  const availableEquipment = useMemo(() => {
      if(!locationName || !clientName) return [];
      
      const equipment = selectedLocation && !selectedLocation.id.startsWith('adhoc-') 
        ? allEquipment.filter(e => e.locationId === selectedLocation.id) 
        : [];
        
      const existingEqNames = new Set(equipment.map(e => e.name));
      allInspections.forEach(insp => {
          if (insp.clientName === clientName && insp.location === locationName && insp.component && !existingEqNames.has(insp.component)) {
              existingEqNames.add(insp.component);
              equipment.push({ id: `adhoc-${insp.component}`, clientId: selectedClient?.id || 'adhoc', locationId: selectedLocation?.id || 'adhoc', name: insp.component, details: insp.machineDetails || '', createdAt: new Date(), updatedAt: new Date() });
          }
      });
      return equipment;
  }, [clientName, locationName, selectedClient, selectedLocation, allEquipment, allInspections]);

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

  const getOrCreateClientAndLocation = async () => {
    if (!currentUser) throw new Error("User not authenticated");
        
    let finalClientId = selectedClient?.id;
    if (!finalClientId && clientName.trim()) {
         const newClient = await addClient({
             name: clientName.trim(),
             address: '',
             contactDetails: ''
         });
         finalClientId = newClient.id;
    }

    let finalLocationId = selectedLocation?.id;
    if (!finalLocationId && locationName.trim() && finalClientId) {
         const newLoc = await addSiteLocation({
             clientId: finalClientId,
             name: locationName.trim(),
             address: ''
         });
         finalLocationId = newLoc.id;
    }
    return { finalClientId, finalLocationId };
  };

  const handleStartInspection = useCallback(async () => {
    if (!clientName.trim()) {
        alert("Client Name is required to start an inspection.");
        return;
    }
    setIsCreating(true);
    try {
        if (!currentUser) throw new Error("User not authenticated");
        
        const { finalClientId, finalLocationId } = await getOrCreateClientAndLocation();

        let finalEqId = availableEquipment.find(e => e.name === equipmentName.trim())?.id;
        if (!finalEqId && equipmentName.trim() && finalLocationId && finalClientId) {
             const newEq = await addEquipment({
                 clientId: finalClientId,
                 locationId: finalLocationId,
                 name: equipmentName.trim(),
                 details: equipmentDetails.trim()
             });
             finalEqId = newEq.id;
        }

        const newRecord = createNewInspection(currentUser.id);
        newRecord.clientName = clientName.trim();
        newRecord.location = locationName.trim();
        newRecord.component = equipmentName.trim();
        newRecord.machineDetails = equipmentDetails.trim();
        
        await saveInspectionRecord(newRecord);
        await refreshData();
        setCurrentInspectionById(newRecord.id);
    } catch (e) {
        console.error("Failed to create new inspection:", e);
        alert("An error occurred while creating the inspection.");
    } finally {
        setIsCreating(false);
    }
  }, [clientName, locationName, equipmentName, equipmentDetails, currentUser, refreshData, setCurrentInspectionById, selectedClient, selectedLocation, availableEquipment]);

  const handlePDFUploadComplete = async (extractedRecords: Partial<InspectionRecord>[]) => {
    setIsCreating(true);
    try {
      if (!currentUser) throw new Error("User not authenticated");
      const { finalClientId, finalLocationId } = await getOrCreateClientAndLocation();

      let lastId = null;
      for (const rec of extractedRecords) {
        const newRecord = createNewInspection(currentUser.id);
        newRecord.clientName = clientName.trim();
        newRecord.location = locationName.trim();
        
        if (rec.component && finalLocationId && finalClientId) {
            // Check if equipment already exists
            let eq = availableEquipment.find(e => e.name === rec.component);
            if (!eq) {
               await addEquipment({
                   clientId: finalClientId,
                   locationId: finalLocationId,
                   name: rec.component,
                   details: rec.technicianNotes || ''
               });
            }
        }
        
        Object.assign(newRecord, rec);
        await saveInspectionRecord(newRecord);
        lastId = newRecord.id;
      }
      
      await refreshData();
      if (lastId) {
        setCurrentInspectionById(lastId); // Open the last one, or you can route to 'records' view
      }
    } catch (e) {
      console.error("Failed to batch create inspections:", e);
      alert("An error occurred while saving the extracted records.");
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><LoadingSpinner text="Loading data..." /></div>;
  }

  const isEquipmentDimmed = !clientName.trim() || locationSelection === '';

  return (
    <div className="h-full overflow-y-auto p-2 sm:p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">Start New Inspection</h2>
        
        <WorkflowCard icon={<ClientIcon />} title="Select Client" step={1}>
            <label htmlFor="client-select-dropdown" className="block text-sm font-medium text-slate-700 dark:text-gray-300">Choose an existing client or create a new one:</label>
            <select 
                id="client-select-dropdown" 
                value={clientSelection} 
                onChange={e => setClientSelection(e.target.value)} 
                className="w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white"
            >
                <option value="">-- Select a Client --</option>
                {uniqueClientNames.map(name => <option key={name} value={name}>{name}</option>)}
                <option value="__NEW__">-- Create a New Client --</option>
            </select>
            {clientSelection === '__NEW__' && (
                <div className="mt-3">
                    <label htmlFor="new-client-name" className="block text-xs font-medium text-slate-600 dark:text-gray-400">New Client Name:</label>
                    <input 
                        id="new-client-name" 
                        type="text" 
                        value={clientName} 
                        onChange={e => setClientName(e.target.value)} 
                        placeholder="Enter new client name"
                        className="mt-1 w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white"
                        autoFocus
                    />
                </div>
            )}
        </WorkflowCard>

        <WorkflowCard icon={<LocationIcon />} title="Site Location" step={2} isDimmed={!clientName.trim()}>
            <label htmlFor="location-select-dropdown" className="block text-sm font-medium text-slate-700 dark:text-gray-300">Choose an existing location or create a new one:</label>
            <select 
                id="location-select-dropdown" 
                value={locationSelection} 
                onChange={e => setLocationSelection(e.target.value)}
                disabled={!clientName.trim()}
                className="w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white disabled:opacity-50"
            >
                <option value="">-- Select a Location --</option>
                {availableLocations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                <option value="__NEW__">-- Create a New Location --</option>
            </select>
            {locationSelection === '__NEW__' && (
                <div className="mt-3">
                    <label htmlFor="new-location-name" className="block text-xs font-medium text-slate-600 dark:text-gray-400">New Location Name:</label>
                    <input 
                        id="new-location-name" 
                        type="text" 
                        value={locationName} 
                        onChange={e => setLocationName(e.target.value)} 
                        placeholder="Enter new location name"
                        className="mt-1 w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white"
                        autoFocus
                    />
                </div>
            )}
        </WorkflowCard>

        <WorkflowCard icon={<EquipmentIcon />} title="Identify Equipment" step={3} isDimmed={isEquipmentDimmed}>
            {availableEquipment.length > 0 ? (
                <div>
                    <label htmlFor="equipment-select" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Select from list or enter manually below:</label>
                    <select id="equipment-select" onChange={e => handleEquipmentSelection(e.target.value)} disabled={isEquipmentDimmed} className="w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white disabled:opacity-50 mb-4">
                        <option value="">-- Select Pre-defined Equipment --</option>
                        {availableEquipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                    </select>
                </div>
            ) : (
                  <p className="text-xs text-slate-500 dark:text-gray-400 mb-2">No pre-defined equipment for this location. Please enter manually.</p>
            )}
              <div>
                <label htmlFor="equipment-name" className="block text-sm font-medium text-slate-700 dark:text-gray-300">Equipment Name / ID</label>
                <input id="equipment-name" value={equipmentName} onChange={e => setEquipmentName(e.target.value)} placeholder="e.g., Main Breaker Panel" disabled={isEquipmentDimmed} className="mt-1 w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white disabled:opacity-50" />
            </div>
              <div>
                <label htmlFor="equipment-details" className="block text-sm font-medium text-slate-700 dark:text-gray-300">Equipment Details (Model, S/N)</label>
                <input id="equipment-details" value={equipmentDetails} onChange={e => setEquipmentDetails(e.target.value)} placeholder="e.g., Model XYZ-123" disabled={isEquipmentDimmed} className="mt-1 w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white disabled:opacity-50" />
            </div>
        </WorkflowCard>
        
        <div className="flex flex-col gap-4">
          <button onClick={handleStartInspection} disabled={!clientName.trim() || isCreating} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition duration-150 ease-in-out text-lg disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center">
              {isCreating ? <LoadingSpinner size="sm" /> : "Create Inspection & Proceed"}
          </button>
          
          <button onClick={() => setIsPDFUploadOpen(true)} disabled={!clientName.trim() || !locationName.trim() || isCreating} className="w-full bg-brand-light-blue hover:bg-sky-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition duration-150 ease-in-out text-lg disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <UploadIcon />
              <span>Batch Upload OEM PDF Report</span>
          </button>
        </div>
      </div>
      <PDFUploadModal 
        isOpen={isPDFUploadOpen} 
        onClose={() => setIsPDFUploadOpen(false)} 
        onUploadComplete={handlePDFUploadComplete} 
      />
    </div>
  );
};

export default SiteEngineerNewInspectionView;
