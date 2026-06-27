
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../hooks/useData';
import { useAdmin } from '../../hooks/useAdmin';
import LoadingSpinner from '../../components/LoadingSpinner';
import { InspectionRecord, User } from '../../types';
import InspectionSummaryModal from '../../components/InspectionSummaryModal';

interface ClientStats {
  totalInspections: number;
  engineers: Set<string>; // user emails or IDs
  lastInspectionDate?: Date;
}

const AdminClientOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { allInspections, allClients, loading: isLoadingData, error: dataError } = useData();
  const { allUsers, loading: loadingAdminData } = useAdmin();
  
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInspectionForModal, setSelectedInspectionForModal] = useState<InspectionRecord | null>(null);

  const usersMap = useMemo(() => {
    const uMap = new Map<string, User>();
    allUsers.forEach(user => uMap.set(user.id, user));
    return uMap;
  }, [allUsers]);

  const { clientNames, clientStatsMap } = useMemo(() => {
      // Get all client names from the master list for consistency
      const names = allClients.map(c => c.name).sort((a,b) => a.localeCompare(b));
      const stats = new Map<string, ClientStats>();
      
      // Seed the map with all clients to ensure they appear even with 0 inspections
      allClients.forEach(client => {
          stats.set(client.name, { totalInspections: 0, engineers: new Set<string>() });
      });

      // Then, populate stats from existing inspections
      allInspections.forEach(insp => {
          if (!insp.clientName || !stats.has(insp.clientName)) return;

          let currentClientStat = stats.get(insp.clientName)!;
          currentClientStat.totalInspections += 1;

          if (insp.userId) {
              const engineer = usersMap.get(insp.userId);
              if (engineer) currentClientStat.engineers.add(engineer.email);
          }
          if (!currentClientStat.lastInspectionDate || insp.createdAt > currentClientStat.lastInspectionDate) {
              currentClientStat.lastInspectionDate = insp.createdAt;
          }
          stats.set(insp.clientName, currentClientStat);
      });
      return { clientNames: names, clientStatsMap: stats };
  }, [allInspections, allClients, usersMap]);


  const clientInspections = useMemo(() => {
    if (!selectedClient) {
        // Return all recent inspections if no client selected, sorted newest first
        return allInspections.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 50);
    }
    return allInspections
        .filter(insp => insp.clientName === selectedClient)
        .sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [selectedClient, allInspections]);

  const openInspectionModal = (inspection: InspectionRecord) => {
    setSelectedInspectionForModal(inspection);
    setIsModalOpen(true);
  };

  const closeInspectionModal = () => {
    setIsModalOpen(false);
    setSelectedInspectionForModal(null);
  };

  const handleEditReport = (inspectionId: string) => {
    navigate(`/admin/edit-report/${inspectionId}`);
  };

  const getSiteEngineerEmail = (userId?: string): string => {
    if (!userId) return 'N/A';
    return usersMap.get(userId)?.email || 'Unknown User';
  };
  
  const getStatusClass = (status: string) => {
    switch(status) {
        case 'analyzed': return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300';
        case 'pending-analysis': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300';
        case 'draft': return 'bg-slate-100 text-slate-700 dark:bg-gray-700 dark:text-gray-200';
        case 'analysis-error': return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300';
        default: return 'bg-slate-100 text-slate-700 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  if (isLoadingData || loadingAdminData) {
    return <LoadingSpinner text="Loading client overview..." />;
  }

  if (dataError) {
    return <p className="text-red-500 bg-red-100 p-4 rounded-md text-center" role="alert">{dataError}</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Client Inspection Reports</h1>
      
      {/* Client Selection Dropdown */}
      <div className="mb-6 p-4 bg-white dark:bg-gray-900 rounded-lg shadow-md">
        <label htmlFor="admin-client-select" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Select Client:</label>
        {clientNames.length > 0 ? (
          <select
            id="admin-client-select"
            value={selectedClient || ''}
            onChange={(e) => setSelectedClient(e.target.value || null)}
            className="mt-1 block w-full md:w-1/2 px-3 py-2 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-slate-900 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-brand-light-blue focus:border-brand-light-blue sm:text-sm"
          >
            <option value="">-- All Clients Overview --</option>
            {clientNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        ) : (
          <p className="text-slate-500 dark:text-gray-400 mt-2">No clients found. Inspections may not have client names assigned or no inspections exist.</p>
        )}
      </div>

      {/* Display General Client Stats if no specific client is selected */}
      {!selectedClient && clientNames.length > 0 && (
        <div className="bg-white dark:bg-gray-900 p-2 md:p-6 rounded-lg shadow-xl overflow-x-auto mb-8">
            <h2 className="text-2xl font-semibold text-slate-700 dark:text-white mb-4">Summary Across All Clients</h2>
            <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-700">
                <thead className="bg-slate-100 dark:bg-gray-800">
                <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Client Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Total Inspections</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Associated Engineers</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Last Inspection Date</th>
                </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-slate-200 dark:divide-gray-700">
                {clientNames.map(clientName => {
                    const stats = clientStatsMap.get(clientName);
                    return (
                    <tr key={clientName} className="hover:bg-slate-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-brand-light-blue cursor-pointer hover:underline" onClick={() => setSelectedClient(clientName)}>{clientName}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 dark:text-gray-300">{stats?.totalInspections || 0}</td>
                        <td className="px-4 py-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-gray-300">
                            {stats?.engineers ? Array.from(stats.engineers).join(', ') : 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 dark:text-gray-300">
                        {stats?.lastInspectionDate ? new Date(stats.lastInspectionDate).toLocaleDateString() : 'N/A'}
                        </td>
                    </tr>
                    );
                })}
                </tbody>
            </table>
        </div>
      )}


      {/* Inspections List */}
      <div className="mt-6">
        <h2 className="text-2xl font-semibold text-slate-700 dark:text-white mb-4">
            {selectedClient ? <span>Inspections for: <span className="text-brand-dark dark:text-brand-light-blue">{selectedClient}</span></span> : "All Recent Inspections (Last 50)"}
        </h2>
        {clientInspections.length === 0 ? (
          <p className="text-slate-500 bg-white p-4 rounded-lg shadow text-center dark:bg-gray-900 dark:text-gray-400">No inspections found.</p>
        ) : (
          <div className="bg-white dark:bg-gray-900 p-2 md:p-4 rounded-lg shadow-xl overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-700">
              <thead className="bg-slate-100 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Client</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Location/Equipment</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Site Engineer</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-slate-200 dark:divide-gray-700">
                {clientInspections.map(inspection => (
                  <tr key={inspection.id} className="hover:bg-slate-50 dark:hover:bg-gray-800/50">
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-700 dark:text-gray-300">{new Date(inspection.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-700 dark:text-gray-300 font-medium">{inspection.clientName}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-700 dark:text-gray-300">
                      <div>{inspection.location}</div>
                      <div className="text-xs text-slate-500 dark:text-gray-400">{inspection.machineDetails}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-700 dark:text-gray-300">{getSiteEngineerEmail(inspection.userId)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                      <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(inspection.inspectionStatus)}`}>
                          {inspection.inspectionStatus.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm space-x-4">
                      <button
                        onClick={() => openInspectionModal(inspection)}
                        className="text-brand-orange hover:text-amber-600 font-medium hover:underline"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEditReport(inspection.id)}
                        className="text-brand-light-blue hover:text-sky-600 font-medium hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedInspectionForModal && (
        <InspectionSummaryModal
          isOpen={isModalOpen}
          onClose={closeInspectionModal}
          inspection={selectedInspectionForModal}
          reportUserEmail={getSiteEngineerEmail(selectedInspectionForModal.userId)} 
        />
      )}
    </div>
  );
};

export default AdminClientOverviewPage;
