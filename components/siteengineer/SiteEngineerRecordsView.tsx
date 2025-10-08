import React, { useState, useCallback, useRef, useEffect, useMemo, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, InspectionRecord, Client, SiteLocation, NameplateData, ImageType, AIDerivedDataValue, InspectionStatus, ParsedAnalysisFinding, Equipment } from '../../types';
import CameraCaptureModal from '../CameraCaptureModal';
import ImageUploadModal from '../ImageUploadModal';
import LoadingSpinner from '../LoadingSpinner';
import ImageInputArea from '../ImageInputArea'; 
import { saveInspectionRecord } from '../../src/db';
import { useData } from '../../hooks/useData';
import { useInspectionEditor } from '../../hooks/useInspectionEditor';
import EditableDataTable from './EditableDataTable';
import { useAccessibility } from '../../hooks/useAccessibility';
import { IRScannerIcon, DSScannerIcon, NameplateScannerIcon, MeterScannerIcon } from '../Icons';

const DsConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAddDsImage: () => void;
  onProceedWithoutDs: () => void;
}> = ({ isOpen, onClose, onAddDsImage, onProceedWithoutDs }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  useAccessibility(modalRef, isOpen, onClose);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[80] p-4">
      <div ref={modalRef} className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl w-full max-w-md" role="alertdialog" aria-modal="true" aria-labelledby="ds-confirm-title">
        <h3 id="ds-confirm-title" className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-white mb-4">DS Image Missing</h3>
        <p className="text-slate-600 dark:text-gray-300 mb-6 text-sm">AI analysis is usually more accurate with both IR and DS images. Would you like to add a DS image now, or proceed with only the IR image?</p>
        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-200 dark:bg-gray-700 text-slate-800 dark:text-gray-200 rounded-md hover:bg-slate-300 dark:hover:bg-gray-600 transition duration-150 text-xs sm:text-sm">Cancel Analysis</button>
          <button onClick={onProceedWithoutDs} className="px-3 py-1.5 sm:px-4 sm:py-2 bg-brand-orange hover:bg-amber-600 text-white rounded-md transition duration-150 text-xs sm:text-sm">Proceed with IR Only</button>
          <button onClick={onAddDsImage} className="px-3 py-1.5 sm:px-4 sm:py-2 bg-brand-light-blue text-white rounded-md hover:bg-sky-500 transition duration-150 text-xs sm:text-sm">Add DS Image</button>
        </div>
      </div>
    </div>
  );
};

const FormSection: React.FC<{title: string, children: React.ReactNode, dataTourId?: string}> = ({title, children, dataTourId}) => (
    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 sm:p-4 rounded-lg shadow-sm" data-tour-id={dataTourId}>
        <h3 className="text-base sm:text-lg font-semibold text-slate-700 dark:text-gray-200 mb-3 sm:mb-4 border-b border-slate-300 dark:border-gray-600 pb-2">{title}</h3>
        {children}
    </div>
);

const FormRow: React.FC<{label: React.ReactNode, children: React.ReactNode, dataTourId?: string}> = ({label, children, dataTourId}) => {
    const id = useId();
    return (
        <div data-tour-id={dataTourId}>
            <label htmlFor={id} className="flex items-center text-xs font-medium text-slate-600 dark:text-gray-300 mb-1">{label}</label>
            {React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child as React.ReactElement<any>, { id });
                }
                return child;
            })}
        </div>
    );
};

const FormInput: React.FC<{value: string | number | null | undefined, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void, type?: string, list?: string, rows?: number, customClassName?: string, id?: string}> = ({value, onChange, type="text", list, rows, customClassName = '', id}) => {
    const commonProps = {
        id,
        value: value ?? '',
        onChange: onChange,
        list: list,
        className: `w-full p-1.5 sm:p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white text-sm focus:ring-brand-light-blue focus:border-brand-light-blue min-h-[38px] ${customClassName}`
    };
    if (type === 'textarea') {
        return <textarea {...commonProps} rows={rows || 3} />;
    }
    return <input type={type} {...commonProps} />;
};


const FormDisplay: React.FC<{value: string | number | null | undefined, unit?: string}> = ({value, unit}) => (
    <div className="w-full p-1.5 sm:p-2 border border-slate-200 dark:border-gray-700 rounded-md bg-slate-100 dark:bg-gray-900/50 text-slate-800 dark:text-white text-sm min-h-[38px] flex items-center">
      {value ?? ''}{value != null && unit ? ` ${unit}`: ''}
    </div>
);

const AutoSaveIndicator: React.FC<{ status: 'idle' | 'dirty' | 'saving' | 'saved' | 'error' }> = ({ status }) => {
    const getStatusContent = () => {
        switch (status) {
            case 'dirty': return { text: 'Unsaved changes', color: 'text-amber-600 dark:text-amber-400' };
            case 'saving': return { text: 'Auto-saving...', color: 'text-sky-600 dark:text-sky-400' };
            case 'saved': return { text: 'Saved!', color: 'text-green-600 dark:text-green-400' };
            case 'error': return { text: 'Save failed', color: 'text-red-600 dark:text-red-400' };
            default: return { text: '', color: '' };
        }
    };
    const { text, color } = getStatusContent();
    if (!text) return null;

    return <span className={`text-xs font-medium mr-2 transition-opacity duration-300 ${color}`}>{text}</span>;
};


const NAMEPLATE_PLACEHOLDERS: Omit<NameplateData, 'id'>[] = [
    { parameter: 'Model', value: '' },
    { parameter: 'S/N', value: '' },
    { parameter: 'Voltage', value: '' },
    { parameter: 'Amperage', value: '' },
    { parameter: 'HP/kW', value: '' },
    { parameter: 'RPM', value: '' },
];

const METER_PLACEHOLDERS: Omit<NameplateData, 'id'>[] = [
    { parameter: 'Voltage L1-N', value: '' },
    { parameter: 'Voltage L2-N', value: '' },
    { parameter: 'Voltage L3-N', value: '' },
    { parameter: 'Current L1', value: '' },
    { parameter: 'Current L2', value: '' },
    { parameter: 'Current L3', value: '' },
];

export const SiteEngineerRecordsView: React.FC<{
  currentUser: User,
  initialTargetId: string | null;
  clearTargetId: () => void;
  initialClientFilter?: string;
}> = ({ currentUser, initialTargetId, clearTargetId, initialClientFilter }) => {
  const [activeInspection, setActiveInspection] = useState<InspectionRecord | null>(null);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const { userInspections, allInspections, allClients, allSiteLocations, allEquipment, loading, refreshData, uniqueClientNames } = useData();

  // Filter and Sort states
  const [clientFilter, setClientFilter] = useState(initialClientFilter || 'all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [componentFilter, setComponentFilter] = useState('all');
  const [filterStatus, setFilterStatus] = useState<InspectionStatus | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;
  
  useEffect(() => {
    if (initialClientFilter) {
      setClientFilter(initialClientFilter);
    }
  }, [initialClientFilter]);

  const clientNamesForFilter = useMemo(() => {
    return ['all', ...uniqueClientNames];
  }, [uniqueClientNames]);

  const locationsForFilter = useMemo(() => {
    if (clientFilter === 'all') return ['all'];

    // Get locations from all inspections for the selected client
    const locationsFromInspections = allInspections
        .filter(insp => insp.clientName === clientFilter && insp.location)
        .map(insp => insp.location!);

    // Get "official" locations from admin-managed data
    const selectedClient = allClients.find(c => c.name === clientFilter);
    const officialLocations = selectedClient
        ? allSiteLocations.filter(loc => loc.clientId === selectedClient.id).map(loc => loc.name)
        : [];

    const combinedLocations = [...new Set([...locationsFromInspections, ...officialLocations])].sort((a,b) => a.localeCompare(b));

    return ['all', ...combinedLocations];
  }, [clientFilter, allInspections, allClients, allSiteLocations]);
  
  const componentsForFilter = useMemo(() => {
    if (locationFilter === 'all' || clientFilter === 'all') return ['all'];
    // Get components from all inspections for the selected client and location
    const componentsFromInspections = allInspections
        .filter(insp => insp.clientName === clientFilter && insp.location === locationFilter && insp.component)
        .map(insp => insp.component!);

    // Get "official" equipment from admin-managed data
    const selectedClient = allClients.find(c => c.name === clientFilter);
    const selectedLocation = selectedClient 
        ? allSiteLocations.find(loc => loc.clientId === selectedClient.id && loc.name === locationFilter) 
        : undefined;
    const officialEquipment = selectedLocation 
        ? allEquipment.filter(eq => eq.locationId === selectedLocation.id).map(eq => eq.name)
        : [];
        
    const combinedComponents = [...new Set([...componentsFromInspections, ...officialEquipment])].sort((a,b) => a.localeCompare(b));
    
    return ['all', ...combinedComponents];
  }, [locationFilter, clientFilter, allInspections, allClients, allSiteLocations, allEquipment]);


  useEffect(() => { setLocationFilter('all'); }, [clientFilter]);
  useEffect(() => { setComponentFilter('all'); }, [locationFilter]);


  const inspectionsForList = useMemo(() => {
    // Optimistically add a new (unsaved) active inspection to the dropdown list.
    if (activeInspection && userInspections.every(insp => insp.id !== activeInspection.id)) {
      const newList = [activeInspection, ...userInspections];
      return newList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    return userInspections;
  }, [activeInspection, userInspections]);

  const filteredInspections = useMemo(() => {
    return inspectionsForList
      .filter(insp => {
        const isTrulyNew = activeInspection ? insp.id === activeInspection.id && !userInspections.some(i => i.id === activeInspection.id) : false;
        if (isTrulyNew) return true;

        const statusMatch = filterStatus === 'all' || insp.inspectionStatus === filterStatus;
        const clientMatch = clientFilter === 'all' || insp.clientName === clientFilter;
        const locationMatch = locationFilter === 'all' || insp.location === locationFilter;
        const componentMatch = componentFilter === 'all' || insp.component === componentFilter;
        
        return statusMatch && clientMatch && locationMatch && componentMatch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt).getTime();
        const dateB = new Date(b.updatedAt).getTime();
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
      });
  }, [inspectionsForList, filterStatus, sortOrder, activeInspection, userInspections, clientFilter, locationFilter, componentFilter]);

  const { paginatedInspections, totalPages } = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return {
        paginatedInspections: filteredInspections.slice(startIndex, endIndex),
        totalPages: Math.ceil(filteredInspections.length / ITEMS_PER_PAGE) || 1
    };
  }, [filteredInspections, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [clientFilter, locationFilter, componentFilter, filterStatus, sortOrder]);

  useEffect(() => {
    if (activeInspection && !filteredInspections.some(insp => insp.id === activeInspection.id)) {
        const isTrulyNew = !userInspections.some(i => i.id === activeInspection.id);
        if (!isTrulyNew) {
            setActiveInspection(null);
        }
    }
  }, [filteredInspections, activeInspection, userInspections]);


  const processPendingAnalyses = useCallback(async () => {
    // This function will be handled by the useInspectionEditor hook internally.
  }, []);

  const {
      inspection: editedInspection,
      updateField,
      updateFindings,
      saveRecord,
      resetForm,
      isSaving,
      isCameraOpen,
      isUploadOpen,
      imageTypeToManage,
      openCamera,
      openUpload,
      handleImageUpdate,
      removeImage,
      closeCamera,
      closeUpload,
      isDsConfirmOpen,
      setIsDsConfirmOpen,
      closeDsConfirm,
      startAnalysis,
      isLoadingAnalysis,
      analysisApiError,
      isScannerLoading,
      scannerError,
      autoSaveStatus,
  } = useInspectionEditor(
      activeInspection, 
      () => refreshData(), 
      () => processPendingAnalyses()
  );
  
  const handleStartAnalysis = async () => {
    await startAnalysis();
  };
  
  const handleDsConfirmAndAnalyze = async () => {
    closeDsConfirm();
    await handleStartAnalysis();
  };
  
  const handleAnalysisClick = async () => {
    if (editedInspection && !editedInspection.dsImageBase64) {
      setIsDsConfirmOpen(true);
    } else {
      await handleStartAnalysis();
    }
  };


  useEffect(() => {
    if (initialTargetId && userInspections.length > 0) {
      const target = userInspections.find(insp => insp.id === initialTargetId);
      if (target) {
        setActiveInspection(target);
        clearTargetId();
      }
    }
  }, [initialTargetId, userInspections, clearTargetId]);
  
    useEffect(() => {
        const updateOnlineStatus = () => {
            setSyncStatusMessage(navigator.onLine ? "Online" : "Offline. Changes saved locally.");
        };
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus();
        
        return () => {
            window.removeEventListener('online', updateOnlineStatus);
            window.removeEventListener('offline', updateOnlineStatus);
        };
    }, []);

  const handleSelectInspection = (inspectionId: string | null) => {
    const inspectionToSet = userInspections.find(insp => insp.id === inspectionId) || null;
    setActiveInspection(inspectionToSet);
  };

  const clearFilters = () => {
    setFilterStatus('all');
    setSortOrder('newest');
    setClientFilter('all');
  };
  
  const filteredLocations = editedInspection?.clientName ? allSiteLocations.filter(loc => {
    const client = allClients.find(c => c.name === editedInspection.clientName);
    return client && loc.clientId === client.id;
  }) : [];
  
  const availableEquipment = useMemo(() => {
    if (editedInspection?.clientName && editedInspection.location) {
        const client = allClients.find(c => c.name === editedInspection.clientName);
        if (client) {
            const location = allSiteLocations.find(l => l.clientId === client.id && l.name === editedInspection.location);
            if (location) {
                return allEquipment.filter(eq => eq.locationId === location.id);
            }
        }
    }
    return [];
  }, [editedInspection?.clientName, editedInspection?.location, allClients, allSiteLocations, allEquipment]);

  const handleEquipmentSelect = (equipmentId: string) => {
    if (!equipmentId) {
        updateField('equipmentId', undefined);
        return;
    }
    const selectedEquipment = availableEquipment.find(eq => eq.id === equipmentId);
    if (selectedEquipment) {
        updateField('equipmentId', selectedEquipment.id);
        updateField('component', selectedEquipment.name);
        updateField('machineDetails', selectedEquipment.details);
    }
  };

  const renderAIDataTable = (data: AIDerivedDataValue[] | undefined) => {
    if (!data || data.length === 0) return <p className="text-slate-500 dark:text-gray-400 text-sm">No AI data available.</p>;

    return (
        <div className="overflow-x-auto border border-slate-300 dark:border-gray-600 rounded-md">
            <table className="min-w-full text-sm">
                <thead className="bg-slate-200 dark:bg-gray-700">
                    <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-gray-300 w-1/2">Parameter</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-gray-300 w-1/2">Value</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-gray-600">
                    {data.map((item, index) => (
                        <tr key={index}>
                            <td className="px-3 py-2 font-medium text-slate-800 dark:text-white whitespace-pre-wrap">{item.parameter}</td>
                            <td className="px-3 py-2 text-slate-700 dark:text-gray-300 whitespace-pre-wrap">{item.value}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const renderEditableFindingsTable = (findings: ParsedAnalysisFinding[] | undefined) => {
    if (!findings || findings.length === 0) {
        return <p className="text-slate-500 dark:text-gray-400 text-sm">No findings were generated by the AI.</p>;
    }

    const handlePriorityChange = (index: number, newPriority: string) => {
        const updatedFindings = findings.map((finding, i) => 
            i === index ? { ...finding, priority: newPriority } : finding
        );
        updateFindings(updatedFindings);
    };

    return (
        <div className="overflow-x-auto border border-slate-300 dark:border-gray-600 rounded-md">
            <table className="min-w-full text-sm">
                <thead className="bg-slate-200 dark:bg-gray-700">
                    <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-gray-300 w-[25%]">Finding</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-gray-300 w-[30%]">Details</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-gray-300 w-[30%]">Recommendation</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-gray-300 w-[15%]">Priority</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-gray-600">
                    {findings.map((finding, index) => (
                        <tr key={index}>
                            <td className="px-3 py-2 text-slate-700 dark:text-gray-300 align-top">{finding.finding}</td>
                            <td className="px-3 py-2 text-slate-700 dark:text-gray-300 align-top whitespace-pre-wrap">{finding.details}</td>
                            <td className="px-3 py-2 text-slate-700 dark:text-gray-300 align-top whitespace-pre-wrap">{finding.recommendation}</td>
                            <td className="px-3 py-2 align-top">
                                <select 
                                    value={finding.priority || ''} 
                                    onChange={(e) => handlePriorityChange(index, e.target.value)}
                                    className="w-full p-1.5 border border-slate-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-slate-900 dark:text-white text-xs focus:ring-brand-light-blue focus:border-brand-light-blue"
                                    aria-label={`Priority for finding: ${finding.finding}`}
                                >
                                    <option value="">N/A</option>
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const getStatusColor = (status: InspectionStatus) => {
    switch (status) {
        case 'analyzed': return 'border-green-500';
        case 'pending-analysis': return 'border-yellow-500';
        case 'draft': return 'border-slate-500';
        case 'analysis-error': return 'border-red-500';
        default: return 'border-gray-400';
    }
};

  if (loading) return <LoadingSpinner text="Loading inspection records..." />;
  
  return (
    <div className="flex flex-col h-full">
      <CameraCaptureModal isOpen={isCameraOpen} onClose={closeCamera} onCapture={handleImageUpdate(imageTypeToManage || 'IR')} imageType={imageTypeToManage || 'IR'} />
      <ImageUploadModal isOpen={isUploadOpen} onClose={closeUpload} onUpload={handleImageUpdate(imageTypeToManage || 'IR')} imageType={imageTypeToManage || 'IR'} />
      <DsConfirmationModal isOpen={isDsConfirmOpen} onClose={closeDsConfirm} onAddDsImage={() => { closeDsConfirm(); openCamera('DS'); }} onProceedWithoutDs={handleDsConfirmAndAnalyze} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full overflow-hidden">
        {/* Left Column: List and Filters */}
        <div className="lg:col-span-1 flex flex-col h-full bg-slate-100 dark:bg-slate-900/50 p-3 rounded-lg overflow-hidden">
            <div className="shrink-0 mb-3">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">Records</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{syncStatusMessage}</p>
            </div>
            
            <div className="shrink-0 mb-3 p-3 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-base font-semibold text-slate-700 dark:text-gray-200 mb-2">Filter & Sort</h3>
                <div className="space-y-2 text-sm">
                    <div>
                        <label htmlFor="client-filter" className="text-xs font-medium text-slate-600 dark:text-gray-300 mb-1 block">Client</label>
                        <select id="client-filter" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white">
                            {clientNamesForFilter.map(name => <option key={name} value={name}>{name === 'all' ? 'All Clients' : name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="location-filter" className="text-xs font-medium text-slate-600 dark:text-gray-300 mb-1 block">Location</label>
                        <select id="location-filter" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} disabled={clientFilter === 'all'} className="w-full px-2 py-1.5 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed">
                            {locationsForFilter.map(name => <option key={name} value={name}>{name === 'all' ? 'All Locations' : name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="component-filter" className="text-xs font-medium text-slate-600 dark:text-gray-300 mb-1 block">Equipment</label>
                        <select id="component-filter" value={componentFilter} onChange={(e) => setComponentFilter(e.target.value)} disabled={locationFilter === 'all'} className="w-full px-2 py-1.5 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed">
                            {componentsForFilter.map(name => <option key={name} value={name}>{name === 'all' ? 'All Equipment' : name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                        <div>
                            <label htmlFor="status-filter" className="text-xs font-medium text-slate-600 dark:text-gray-300 mb-1 block">Status</label>
                            <select id="status-filter" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="w-full px-2 py-1.5 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white">
                                <option value="all">All</option>
                                <option value="draft">Draft</option>
                                <option value="pending-analysis">Pending</option>
                                <option value="analyzed">Analyzed</option>
                                <option value="analysis-error">Error</option>
                            </select>
                        </div>
                         <div>
                            <label htmlFor="sort-order" className="text-xs font-medium text-slate-600 dark:text-gray-300 mb-1 block">Sort By</label>
                            <select id="sort-order" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)} className="w-full px-2 py-1.5 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white">
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                            </select>
                        </div>
                    </div>
                    <div className="pt-2">
                         <button onClick={clearFilters} className="w-full text-xs px-2 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded shadow-sm">Clear Filters</button>
                    </div>
                </div>
            </div>
            
            <div className="flex-grow overflow-y-auto space-y-2 pr-1">
                 {paginatedInspections.length > 0 ? paginatedInspections.map(insp => (
                    <button
                        key={insp.id}
                        onClick={() => handleSelectInspection(insp.id)}
                        className={`w-full text-left p-3 rounded-lg shadow-md transition-all duration-200 border-l-4 ${getStatusColor(insp.inspectionStatus)} ${
                            activeInspection?.id === insp.id
                                ? 'bg-sky-100 dark:bg-sky-900/50'
                                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                    >
                        <p className="font-semibold text-sm text-slate-800 dark:text-white truncate">{insp.clientName || 'Untitled Inspection'}</p>
                        <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{insp.location}</p>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs text-slate-400 dark:text-gray-500">{new Date(insp.updatedAt).toLocaleDateString()}</p>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 capitalize">
                            {insp.inspectionStatus.replace('-',' ')}
                          </span>
                        </div>
                    </button>
                )) : (
                    <p className="text-center text-sm text-slate-500 dark:text-gray-400 pt-8">No records match filters.</p>
                )}
            </div>

            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 shrink-0">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-white dark:bg-slate-700 text-xs font-semibold rounded-md shadow disabled:opacity-50">Prev</button>
                <span className="text-xs font-medium text-slate-600 dark:text-gray-300">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-white dark:bg-slate-700 text-xs font-semibold rounded-md shadow disabled:opacity-50">Next</button>
            </div>
        </div>

        {/* Right Column: Editor */}
        <div className="lg:col-span-3 overflow-y-auto pr-1">
        {!editedInspection ? (
            <div className="flex items-center justify-center h-full rounded-lg bg-slate-50 dark:bg-slate-800/30 border-2 border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-slate-500 dark:text-gray-400 text-center">Select an inspection from the list to view or edit.</p>
            </div>
        ) : (
            <div className="space-y-8">
              <div className="flex justify-end items-center space-x-2">
                  <AutoSaveIndicator status={autoSaveStatus} />
                  <button onClick={() => navigate(`/report/${editedInspection.id}`)} className="text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow">Print Report</button>
                  <button onClick={saveRecord} disabled={isSaving} className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-1.5 px-3 rounded-lg shadow text-sm disabled:opacity-50">{isSaving ? 'Saving...' : 'Save'}</button>
              </div>

              <FormSection title="Location/Equipment Information" dataTourId="location-info-group">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 sm:gap-y-4">
                      <FormRow label="Client Name" dataTourId="client-name-input">
                          <FormInput value={editedInspection.clientName} onChange={e => updateField('clientName', e.target.value)} list="client-list" />
                          <datalist id="client-list">{allClients.map(c => <option key={c.id} value={c.name} />)}</datalist>
                      </FormRow>
                      <FormRow label="Location">
                          <FormInput value={editedInspection.location} onChange={e => updateField('location', e.target.value)} list="location-list" />
                          <datalist id="location-list">{filteredLocations.map(l => <option key={l.id} value={l.name} />)}</datalist>
                      </FormRow>
                      {availableEquipment.length > 0 && (
                          <div className="sm:col-span-2">
                          <FormRow label="Select Predefined Equipment">
                              <select
                                  value={editedInspection.equipmentId || ''}
                                  onChange={(e) => handleEquipmentSelect(e.target.value)}
                                  className="w-full p-1.5 sm:p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white text-sm focus:ring-brand-light-blue focus:border-brand-light-blue min-h-[38px]"
                              >
                                  <option value="">-- Manual Entry --</option>
                                  {availableEquipment.map(eq => (
                                      <option key={eq.id} value={eq.id}>{eq.name}</option>
                                  ))}
                              </select>
                          </FormRow>
                          </div>
                      )}
                      <FormRow label="Component/Equipment Name"><FormInput value={editedInspection.component} onChange={e => updateField('component', e.target.value)} /></FormRow>
                      <FormRow label="Machine Details (Model, S/N)"><FormInput value={editedInspection.machineDetails} onChange={e => updateField('machineDetails', e.target.value)} /></FormRow>
                      <FormRow label="Status"><FormInput value={editedInspection.status} onChange={e => updateField('status', e.target.value)} /></FormRow>
                      <FormRow label="PM Work Order"><FormInput value={editedInspection.pmWorkOrder} onChange={e => updateField('pmWorkOrder', e.target.value)} /></FormRow>
                      <FormRow label="Item ID"><FormInput value={editedInspection.itemId} onChange={e => updateField('itemId', e.target.value)} /></FormRow>
                      <FormRow label="Operation Priority"><FormInput value={editedInspection.operationPriority} onChange={e => updateField('operationPriority', e.target.value)} /></FormRow>
                  </div>
              </FormSection>

              <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Capture & Identify</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <ImageInputArea id="ir-image" title="Infrared (IR) Image" icon={<IRScannerIcon className="w-12 h-12" />} cardColor="bg-orange-500 hover:bg-orange-600" imageSrc={editedInspection.irImageBase64} imageTimestamp={editedInspection.irImageTimestamp} onTimestampChange={(d) => updateField('irImageTimestamp', d)} onCaptureClick={() => openCamera('IR')} onUploadClick={() => openUpload('IR')} onImageUpdate={handleImageUpdate('IR')} dataTourId="ir-capture-btn" />
                      <ImageInputArea id="ds-image" title="Digital Still (DS) Image" icon={<DSScannerIcon className="w-12 h-12" />} cardColor="bg-sky-500 hover:bg-sky-600" imageSrc={editedInspection.dsImageBase64} imageTimestamp={editedInspection.dsImageTimestamp} onTimestampChange={(d) => updateField('dsImageTimestamp', d)} onCaptureClick={() => openCamera('DS')} onUploadClick={() => openUpload('DS')} onRemoveClick={() => removeImage('DS')} onImageUpdate={handleImageUpdate('DS')} dataTourId="ds-capture-btn" />
                      <ImageInputArea id="nameplate-scanner" title="Nameplate Scanner" icon={<NameplateScannerIcon className="w-12 h-12" />} cardColor="bg-purple-500 hover:bg-purple-600" imageSrc={editedInspection.nameplateImageBase64} imageTimestamp={editedInspection.nameplateImageTimestamp} onTimestampChange={(d) => updateField('nameplateImageTimestamp', d)} onCaptureClick={() => openCamera('NAMEPLATE')} onUploadClick={() => openUpload('NAMEPLATE')} onRemoveClick={() => removeImage('NAMEPLATE')} onImageUpdate={handleImageUpdate('NAMEPLATE')} dataTourId="nameplate-scan-btn" />
                      <ImageInputArea id="meter-scanner" title="Meter Scanner" icon={<MeterScannerIcon className="w-12 h-12" />} cardColor="bg-teal-500 hover:bg-teal-600" imageSrc={editedInspection.meterImageBase64} imageTimestamp={editedInspection.meterImageTimestamp} onTimestampChange={(d) => updateField('meterImageTimestamp', d)} onCaptureClick={() => openCamera('METER')} onUploadClick={() => openUpload('METER')} onRemoveClick={() => removeImage('METER')} onImageUpdate={handleImageUpdate('METER')} dataTourId="meter-scan-btn" />
                  </div>
              </div>
              
              <FormSection title="Operational Data" dataTourId="trending-data-inputs">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 sm:gap-y-4">
                  <FormRow label="Ambient Temp. (°C)"><FormInput type="number" value={editedInspection.ambientTemp} onChange={e => updateField('ambientTemp', parseFloat(e.target.value))} /></FormRow>
                  <FormRow label="Nominal Max Current (A)"><FormInput type="number" value={editedInspection.nominalMaxCurrent} onChange={e => updateField('nominalMaxCurrent', parseFloat(e.target.value))} /></FormRow>
                  <FormRow label="Measured Current (A)"><FormInput type="number" value={editedInspection.measuredCurrent} onChange={e => updateField('measuredCurrent', parseFloat(e.target.value))} /></FormRow>
                  <FormRow label="Reference Temp. (°C)"><FormInput type="number" value={editedInspection.referenceTemp} onChange={e => updateField('referenceTemp', parseFloat(e.target.value))} /></FormRow>
                  <FormRow label="Voltage (V)"><FormInput type="number" value={editedInspection.voltage} onChange={e => updateField('voltage', parseFloat(e.target.value))} /></FormRow>
                  <FormRow label="L1 Load (A)"><FormInput type="number" value={editedInspection.l1Load} onChange={e => updateField('l1Load', parseFloat(e.target.value))} /></FormRow>
                  <FormRow label="L2 Load (A)"><FormInput type="number" value={editedInspection.l2Load} onChange={e => updateField('l2Load', parseFloat(e.target.value))} /></FormRow>
                  <FormRow label="L3 Load (A)"><FormInput type="number" value={editedInspection.l3Load} onChange={e => updateField('l3Load', parseFloat(e.target.value))} /></FormRow>
                  <FormRow label="Neutral Load (A)"><FormInput type="number" value={editedInspection.neutralLoad} onChange={e => updateField('neutralLoad', parseFloat(e.target.value))} /></FormRow>
                  <FormRow label="Ultrasonic Reading"><FormInput value={editedInspection.ultrasonicReading} onChange={e => updateField('ultrasonicReading', e.target.value)} /></FormRow>
                </div>
              </FormSection>
              
              <FormSection title="Notes">
                <FormRow label="Technician Notes">
                  <FormInput type="textarea" value={editedInspection.technicianNotes} onChange={e => updateField('technicianNotes', e.target.value)} rows={4} />
                </FormRow>
              </FormSection>

              <div className="text-center my-8">
                <button onClick={handleAnalysisClick} disabled={!editedInspection.irImageBase64 || isLoadingAnalysis || editedInspection.inspectionStatus === 'pending-analysis'} className="bg-brand-orange hover:bg-amber-600 text-white font-bold py-3 px-8 text-base sm:text-lg sm:py-4 sm:px-10 rounded-lg shadow-lg transition-transform transform hover:scale-105 disabled:bg-slate-400 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center mx-auto" data-tour-id="analyze-btn">
                    {isLoadingAnalysis ? <LoadingSpinner text="Analyzing..." size="sm" /> : 
                    editedInspection.inspectionStatus === 'pending-analysis' ? 'Analysis Queued' :
                    'Run AI Analysis'}
                </button>
                {analysisApiError && <p className="text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-300 p-2 rounded-md text-sm text-center mt-4" role="alert">{analysisApiError}</p>}
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Nameplate & Meter Data</h2>
                <div className="space-y-6">
                  <EditableDataTable title="Nameplate Data" data={editedInspection.nameplateData} onDataChange={(newData) => updateField('nameplateData', newData)} imagePresent={!!editedInspection.nameplateImageBase64} placeholderRows={NAMEPLATE_PLACEHOLDERS} isLoading={isScannerLoading.nameplate} error={scannerError.nameplate} />
                  <EditableDataTable title="Meter Data" data={editedInspection.meterData} onDataChange={(newData) => updateField('meterData', newData)} imagePresent={!!editedInspection.meterImageBase64} placeholderRows={METER_PLACEHOLDERS} isLoading={isScannerLoading.meter} error={scannerError.meter} />
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">AI Analysis Results</h2>
                  {isLoadingAnalysis ? (
                    <div className="flex items-center justify-center h-64"><LoadingSpinner text="Analyzing..."/></div>
                  ) : editedInspection.analysisOutput || editedInspection.rawAnalysisText ? (
                      <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <FormSection title="Problem Details (AI Populated)">
                                <div className="space-y-3">
                                  <FormRow label="Fault Item/Description"><FormDisplay value={editedInspection.faultItemDescription} /></FormRow>
                                  <FormRow label="Item"><FormDisplay value={editedInspection.problemItem} /></FormRow>
                                  <FormRow label="Type"><FormDisplay value={editedInspection.problemType} /></FormRow>
                                  <FormRow label="Manufacturer"><FormDisplay value={editedInspection.problemManufacturer} /></FormRow>
                                  <FormRow label="Anomaly"><FormDisplay value={editedInspection.problemAnomaly} /></FormRow>
                                  <FormRow label="Root Cause"><FormDisplay value={editedInspection.problemRootCause} /></FormRow>
                                  <FormRow label="Remedial"><FormDisplay value={editedInspection.problemRemedial} /></FormRow>
                                </div>
                              </FormSection>
                              
                              <FormSection title="AI Analysis Data">
                                  {renderAIDataTable(editedInspection.analysisOutput?.derivedData)}
                              </FormSection>

                              <div className="md:col-span-2">
                                  <FormSection title="AI Analysis Findings">
                                      {renderEditableFindingsTable(editedInspection.analysisOutput?.findings)}
                                  </FormSection>
                              </div>
                          </div>
                      
                       {editedInspection.rawAnalysisText && (
                          <details className="text-xs mt-4">
                              <summary className="text-slate-500 dark:text-gray-400 cursor-pointer hover:text-slate-700 dark:hover:text-gray-200">View Full Raw AI Output</summary>
                              <pre className="mt-1 bg-slate-100 dark:bg-black/50 p-2 rounded-md whitespace-pre-wrap break-words text-left">{editedInspection.rawAnalysisText}</pre>
                          </details>
                      )}
                      </div>
                  ) : (
                      <p className="text-slate-500 dark:text-gray-400 mt-6 text-center py-8 bg-slate-50 dark:bg-slate-800/30 rounded-lg">No analysis has been run for this record yet.</p>
                  )}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-300 dark:border-gray-600 text-right">
                <button
                    onClick={resetForm}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition-colors text-sm disabled:opacity-50"
                >
                    Reset Form
                </button>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-2">This will discard all unsaved changes and reload the last saved version of this record.</p>
              </div>
            </div>
        )}
        </div>
      </div>
    </div>
  );
};