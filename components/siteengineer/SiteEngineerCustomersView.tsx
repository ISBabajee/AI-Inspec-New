import React, { useState, useMemo } from 'react';
import { useData } from '../../hooks/useData';
import LoadingSpinner from '../LoadingSpinner';
import { Client } from '../../types';

type ActiveView = 'overview' | 'records' | 'reports' | 'customers';

interface SiteEngineerCustomersViewProps {
  onSwitchView: (view: ActiveView, clientName?: string) => void;
}


const SiteEngineerCustomersView: React.FC<SiteEngineerCustomersViewProps> = ({ onSwitchView }) => {
  const { allClients, uniqueClientNames, loading, error } = useData();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAndSortedClients = useMemo(() => {
    if (loading) return [];

    // Create a map of official clients for easy lookup
    const officialClientsMap = new Map<string, Client>();
    allClients.forEach(client => officialClientsMap.set(client.name.toLowerCase(), client));
    
    // Create a comprehensive list of Client-like objects
    const comprehensiveClients: Client[] = uniqueClientNames.map(name => {
        const officialClient = officialClientsMap.get(name.toLowerCase());
        if (officialClient) {
            return officialClient;
        } else {
            // This is an ad-hoc client from an inspection
            return {
                id: `adhoc-${name}`, // Create a stable but unique ID
                name: name,
                address: 'N/A (created via inspection)',
                contactDetails: 'N/A'
            };
        }
    });

    // Now filter and sort this comprehensive list
    return comprehensiveClients.filter(client => 
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.contactDetails.toLowerCase().includes(searchQuery.toLowerCase())
      ).sort((a,b) => a.name.localeCompare(b.name));

  }, [allClients, uniqueClientNames, searchQuery, loading]);


  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-white">Client Directory</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          A read-only list of all clients in the system. To create a new client, start a new inspection and enter a new client name.
        </p>
      </div>

      <div className="shrink-0">
        <label htmlFor="client-search" className="sr-only">
            Search Clients
        </label>
        <input
            type="text"
            id="client-search"
            placeholder="Search by name, address, or contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full md:w-2/3 px-3 py-2 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-slate-900 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-brand-light-blue focus:border-brand-light-blue sm:text-sm"
        />
      </div>

      <div className="flex-grow overflow-y-auto pr-2 -mr-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner text="Loading clients..." />
          </div>
        ) : error ? (
            <p className="text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-300 p-3 rounded-md text-sm text-center" role="alert">{error}</p>
        ) : filteredAndSortedClients.length === 0 ? (
          <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-800/30 rounded-lg">
            <p className="text-slate-500 dark:text-slate-400 text-center">
              {searchQuery 
                  ? "No clients match your search criteria."
                  : "No clients have been added by an administrator."
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSortedClients.map(client => (
              <div key={client.id} className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 flex flex-col justify-between border border-slate-200 dark:border-slate-700">
                <div>
                    <p className="text-purple-600 dark:text-purple-400 font-semibold text-lg">{client.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{client.address}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{client.contactDetails}</p>
                </div>
                <button 
                    onClick={() => onSwitchView('records', client.name)} 
                    className="mt-4 w-full text-sm px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md shadow shrink-0 transition-colors"
                >
                    View Records
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteEngineerCustomersView;