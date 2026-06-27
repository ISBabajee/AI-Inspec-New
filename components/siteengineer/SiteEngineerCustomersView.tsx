import React, { useState, useMemo } from 'react';
import { useData } from '../../hooks/useData';
import LoadingSpinner from '../LoadingSpinner';
import { Client, SiteLocation, Equipment } from '../../types';
import { deleteEquipment } from '../../src/db';
import EquipmentModal from './EquipmentModal';

type ActiveView = 'overview' | 'records' | 'reports' | 'customers';

interface SiteEngineerCustomersViewProps {
  onSwitchView: (view: ActiveView, clientName?: string) => void;
}

const SiteEngineerCustomersView: React.FC<SiteEngineerCustomersViewProps> = ({ onSwitchView }) => {
  const { allClients, allSiteLocations, allEquipment, allInspections, loading, error, refreshData } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());

  const [modalState, setModalState] = useState<{
      isOpen: boolean;
      mode: 'addEquipment' | 'editEquipment';
      client?: Client;
      location?: SiteLocation;
      equipment?: Equipment;
  }>({ isOpen: false, mode: 'addEquipment' });

  const comprehensiveClients = useMemo(() => {
    if (loading) return [];
    const clientMap = new Map<string, Client>();
    allClients.forEach(client => clientMap.set(client.name.toLowerCase(), client));
    allInspections.forEach(inspection => {
      if (inspection.clientName && !clientMap.has(inspection.clientName.toLowerCase())) {
        clientMap.set(inspection.clientName.toLowerCase(), {
          id: `adhoc-${inspection.clientName}`, name: inspection.clientName,
          address: 'N/A (from inspection)', contactDetails: 'N/A',
        });
      }
    });
    return Array.from(clientMap.values());
  }, [allClients, allInspections, loading]);

  const filteredClients = useMemo(() => {
    return comprehensiveClients
      .filter(client => client.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [comprehensiveClients, searchQuery]);

  const toggleClient = (clientId: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  const toggleLocation = (locationId: string) => {
    setExpandedLocations(prev => {
        const next = new Set(prev);
        if (next.has(locationId)) next.delete(locationId);
        else next.add(locationId);
        return next;
    });
  };

  const handleOpenModal = (mode: 'addEquipment' | 'editEquipment', client: Client, location: SiteLocation, equipment?: Equipment) => {
    setModalState({ isOpen: true, mode, client, location, equipment });
  };
  
  const handleCloseModal = () => {
    setModalState({ ...modalState, isOpen: false });
  };

  const handleSave = () => {
    refreshData();
  };

  const handleDeleteEquipment = async (equipmentItem: Equipment) => {
    if (window.confirm(`Are you sure you want to delete equipment "${equipmentItem.name}"?`)) {
        try { 
            await deleteEquipment(equipmentItem.id); 
            refreshData(); 
        } catch (err) { 
            alert("Failed to delete equipment."); 
        }
    }
  };


  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-white">Client & Equipment Directory</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          View clients and their site locations. You can add, edit, or delete equipment for each location.
        </p>
      </div>

      <div className="shrink-0">
        <label htmlFor="client-search" className="sr-only">Search Clients</label>
        <input
            type="text" id="client-search" placeholder="Search by name..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full md:w-2/3 px-3 py-2 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-slate-900 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-brand-light-blue focus:border-brand-light-blue sm:text-sm"
        />
      </div>

      <div className="flex-grow overflow-y-auto pr-2 -mr-2">
        {loading ? (
          <div className="flex items-center justify-center h-full"><LoadingSpinner text="Loading clients..." /></div>
        ) : error ? (
            <p className="text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-300 p-3 rounded-md text-sm text-center" role="alert">{error}</p>
        ) : filteredClients.length === 0 ? (
          <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-800/30 rounded-lg">
            <p className="text-slate-500 dark:text-slate-400 text-center">{searchQuery ? "No clients match your search." : "No clients found."}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredClients.map(client => {
              const locationsForClient = allSiteLocations.filter(loc => loc.clientId === client.id);
              return (
              <div key={client.id} className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700">
                <button onClick={() => toggleClient(client.id)} className="w-full text-left p-4 flex justify-between items-center">
                  <span className="font-semibold text-purple-600 dark:text-purple-400 text-lg">{client.name}</span>
                  <div className="flex items-center gap-4">
                     <button onClick={(e) => { e.stopPropagation(); onSwitchView('records', client.name)}} className="text-xs px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded-md shadow">View Records</button>
                     <svg className={`w-5 h-5 text-slate-500 transition-transform ${expandedClients.has(client.id) ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </button>
                {expandedClients.has(client.id) && (
                  <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-700">
                    {locationsForClient.length === 0 && <p className="text-sm text-slate-500 dark:text-gray-400 py-3 text-center">No managed locations for this client.</p>}
                    {locationsForClient.map(loc => {
                      const equipmentForLocation = allEquipment.filter(eq => eq.locationId === loc.id);
                      return (
                      <div key={loc.id} className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md border border-slate-200 dark:border-slate-600">
                         <button onClick={() => toggleLocation(loc.id)} className="w-full text-left flex justify-between items-center">
                            <span className="font-semibold text-slate-700 dark:text-slate-200">{loc.name}</span>
                            <svg className={`w-4 h-4 text-slate-500 transition-transform ${expandedLocations.has(loc.id) ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                         </button>
                         {expandedLocations.has(loc.id) && (
                           <div className="pt-3 mt-2 border-t border-slate-200 dark:border-slate-600">
                               {equipmentForLocation.map(eq => (
                                <div key={eq.id} className="flex justify-between items-center p-2 bg-white dark:bg-gray-700/50 rounded text-sm mb-1"><div><p className="font-medium text-slate-700 dark:text-gray-200">{eq.name}</p><p className="text-xs text-slate-500 dark:text-gray-400">{eq.details}</p></div><div className="flex items-center space-x-2 shrink-0"><button onClick={() => handleOpenModal('editEquipment', client, loc, eq)} className="text-xs px-2 py-0.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded shadow">Edit</button><button onClick={() => handleDeleteEquipment(eq)} className="text-xs px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded shadow">Del</button></div></div>
                               ))}
                               {equipmentForLocation.length === 0 && <p className="text-xs text-center text-slate-500 dark:text-gray-400 py-1">No equipment for this site.</p>}
                               <button onClick={() => handleOpenModal('addEquipment', client, loc)} className="mt-2 text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 font-semibold">+ Add Equipment</button>
                           </div>
                         )}
                      </div>
                    )})}
                  </div>
                )}
              </div>
            )})}
          </div>
        )}
      </div>

      {modalState.isOpen && modalState.client && modalState.location && (
        <EquipmentModal 
            isOpen={modalState.isOpen} 
            onClose={handleCloseModal} 
            onSave={handleSave} 
            mode={modalState.mode} 
            client={modalState.client} 
            location={modalState.location} 
            equipment={modalState.equipment} 
        />
      )}
    </div>
  );
};

export default SiteEngineerCustomersView;