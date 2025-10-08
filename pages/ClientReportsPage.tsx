import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { InspectionRecord } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import InspectionSummaryModal from '../components/InspectionSummaryModal';
import { HomeIcon } from '../components/Icons';

const ClientReportsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { allInspections, uniqueClientNames, loading: loadingData, error: dataError } = useData();
  
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInspectionForModal, setSelectedInspectionForModal] = useState<InspectionRecord | null>(null);
  
  const clientInspections = useMemo(() => {
      if (!selectedClient) return [];
      return allInspections
        .filter(insp => insp.clientName === selectedClient)
        .sort((a,b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [selectedClient, allInspections]);


  const handleClientChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClient(event.target.value || null);
  };

  const openInspectionModal = (inspection: InspectionRecord) => {
    setSelectedInspectionForModal(inspection);
    setIsModalOpen(true);
  };

  const closeInspectionModal = () => {
    setIsModalOpen(false);
    setSelectedInspectionForModal(null);
  };

  const handleGenerateCompleteReport = () => {
    if (selectedClient && clientInspections.length > 0) {
      // Pass the already loaded inspections to the report page to ensure data consistency
      navigate('/complete-report', { state: { clientName: selectedClient, inspections: clientInspections } });
    }
  };

  const overallFindingsSummary = useMemo(() => {
    if (!clientInspections.length) return { high: 0, medium: 0, low: 0 };
    let high = 0, medium = 0, low = 0;
    clientInspections.forEach(inspection => {
      inspection.analysisOutput?.findings?.forEach(finding => {
        const priority = finding.priority?.toLowerCase();
        if (priority === 'high') high++;
        else if (priority === 'medium') medium++;
        else if (priority === 'low') low++;
      });
    });
    return { high, medium, low };
  }, [clientInspections]);

  const getInspectionFindingsSummary = (inspection: InspectionRecord): string => {
    if (!inspection.analysisOutput?.findings?.length) return "No findings";
    let high = 0, medium = 0, low = 0;
    inspection.analysisOutput.findings.forEach(finding => {
        const priority = finding.priority?.toLowerCase();
        if (priority === 'high') high++;
        else if (priority === 'medium') medium++;
        else if (priority === 'low') low++;
    });
    const parts: string[] = [];
    if (high > 0) parts.push(`High: ${high}`);
    if (medium > 0) parts.push(`Medium: ${medium}`);
    if (low > 0) parts.push(`Low: ${low}`);
    if (parts.length === 0 && inspection.analysisOutput?.findings?.length > 0) return `${inspection.analysisOutput.findings.length} findings (unprioritized)`;
    return parts.join(', ') || "No priority findings";
  };
  
  const getPriorityClass = (priority: string): string => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'text-[#DC2626] dark:text-red-400 font-semibold';
      case 'medium': return 'text-[#D97706] dark:text-orange-400 font-semibold';
      case 'low': return 'text-[#059669] dark:text-green-400 font-semibold';
      default: return 'text-slate-700 dark:text-gray-300';
    }
  };

  if (!currentUser) {
    return (
      <div className="container mx-auto p-4 md:p-8 bg-slate-50 dark:bg-black min-h-[calc(100vh-120px)] flex items-center justify-center">
        <p className="text-slate-600 dark:text-gray-400">Please sign in to view client reports.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-[calc(100vh-120px)]">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6">
        <h2 className="text-3xl font-semibold text-slate-800 dark:text-white">Client Summary Reports</h2>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-3 sm:mt-0 bg-brand-light-blue hover:bg-sky-500 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-150 ease-in-out text-sm flex items-center"
        >
          <HomeIcon />
          Back to Dashboard
        </button>
      </div>


      {dataError && <p className="mb-4 text-center text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-300 p-3 rounded-md" role="alert">{dataError}</p>}

      <div className="mb-6 p-6 bg-white dark:bg-gray-950 rounded-lg shadow-xl">
        <label htmlFor="client-select" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Select Client:</label>
        {loadingData ? (
          <LoadingSpinner text="Loading clients..." />
        ) : uniqueClientNames.length > 0 ? (
          <select
            id="client-select"
            value={selectedClient || ''}
            onChange={handleClientChange}
            className="mt-1 block w-full md:w-1/2 px-3 py-2 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-slate-900 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-brand-light-blue focus:border-brand-light-blue sm:text-sm"
          >
            <option value="">-- Select a Client --</option>
            {uniqueClientNames.map(client => (
              <option key={client} value={client}>{client}</option>
            ))}
          </select>
        ) : (
          <p className="text-slate-500 dark:text-gray-400 mt-2">No clients found. Start by creating some inspections.</p>
        )}
      </div>

      {selectedClient && loadingData && (
        <div className="mt-6 p-6 bg-white dark:bg-gray-950 rounded-lg shadow-xl flex justify-center">
            <LoadingSpinner text={`Loading inspections for ${selectedClient}...`} size="lg" />
        </div>
      )}

      {selectedClient && !loadingData && clientInspections.length > 0 && (
        <div className="mt-8">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 pb-2 border-b border-slate-300 dark:border-gray-700">
            <h3 className="text-2xl font-semibold text-brand-dark dark:text-brand-light-blue">
              Summary for: <span className="text-slate-800 dark:text-sky-300">{selectedClient}</span>
            </h3>
            <button
              onClick={handleGenerateCompleteReport}
              disabled={clientInspections.length === 0}
              className="mt-3 sm:mt-0 bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-150 ease-in-out text-sm disabled:bg-slate-400 disabled:cursor-not-allowed"
              title={clientInspections.length === 0 ? "No inspections to report" : "Generate printable report"}
            >
              Generate Complete Report
            </button>
          </div>
          
          <div className="mb-6 p-4 bg-blue-50 dark:bg-sky-900/50 rounded-lg shadow">
            <h4 className="text-lg font-semibold text-brand-dark dark:text-sky-300 mb-2">Overall Findings Summary:</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li className={getPriorityClass('high')}>High Priority Issues: {overallFindingsSummary.high}</li>
              <li className={getPriorityClass('medium')}>Medium Priority Issues: {overallFindingsSummary.medium}</li>
              <li className={getPriorityClass('low')}>Low Priority Issues: {overallFindingsSummary.low}</li>
            </ul>
          </div>

          <h4 className="text-xl font-semibold text-slate-700 dark:text-gray-200 mb-4">Inspections:</h4>
          <div className="space-y-6">
            {clientInspections.map(inspection => (
              <div key={inspection.id} className="bg-white dark:bg-gray-950 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-150">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-3">
                  <div>
                    <h5 className="text-lg font-semibold text-brand-light-blue">{inspection.location}</h5>
                    <p className="text-sm text-slate-600 dark:text-gray-400">{inspection.machineDetails}</p>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-gray-500 mt-2 md:mt-0">
                    {new Date(inspection.createdAt).toLocaleDateString()}
                    {inspection.jobIdReference && ` (Job ID: ${inspection.jobIdReference})`}
                  </p>
                </div>
                <div className="mb-3">
                  <p className="text-sm">
                    <strong className="text-slate-600 dark:text-gray-300">Status:</strong> 
                    <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium
                      ${inspection.inspectionStatus === 'analyzed' ? 'bg-green-100 text-[#059669] dark:bg-green-900/50 dark:text-green-300' :
                        inspection.inspectionStatus === 'pending-analysis' ? 'bg-amber-100 text-[#D97706] dark:bg-yellow-900/50 dark:text-yellow-300' :
                        inspection.inspectionStatus === 'draft' ? 'bg-slate-100 text-slate-700 dark:bg-gray-700/80 dark:text-gray-300' :
                        'bg-red-100 text-[#DC2626] dark:bg-red-900/50 dark:text-red-300'}`}>
                      {inspection.inspectionStatus.replace('-', ' ')}
                    </span>
                  </p>
                  <p className="text-sm"><strong className="text-slate-600 dark:text-gray-300">Findings:</strong> {getInspectionFindingsSummary(inspection)}</p>
                </div>
                
                <button
                  onClick={() => openInspectionModal(inspection)}
                  className="bg-brand-light-blue hover:bg-sky-500 text-white font-semibold py-2 px-4 rounded-md shadow text-sm transition duration-150 ease-in-out"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedClient && !loadingData && clientInspections.length === 0 && (
        <div className="mt-6 p-6 bg-white dark:bg-gray-950 rounded-lg shadow-xl">
          <p className="text-slate-500 dark:text-gray-400 text-center">No inspections found for {selectedClient}.</p>
        </div>
      )}

      {selectedInspectionForModal && currentUser && (
        <InspectionSummaryModal
          isOpen={isModalOpen}
          onClose={closeInspectionModal}
          inspection={selectedInspectionForModal}
          reportUserEmail={currentUser.email || 'N/A'} /* Pass current user's email */
        />
      )}
    </div>
  );
};

export default ClientReportsPage;