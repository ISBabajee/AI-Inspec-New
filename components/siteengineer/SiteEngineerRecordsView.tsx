
import React, { useState, useCallback, useRef, useEffect, useMemo, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, InspectionRecord, Client, SiteLocation, NameplateData, ImageType, AIDerivedDataValue, InspectionStatus, ParsedAnalysisFinding, Equipment } from '../../types';
import CameraCaptureModal from '../CameraCaptureModal';
import ImageUploadModal from '../ImageUploadModal';
import LoadingSpinner from '../LoadingSpinner';
import { saveInspectionRecord } from '../../src/db';
import { useData } from '../../hooks/useData';
import { useInspectionEditor } from '../../hooks/useInspectionEditor';
import EditableDataTable from './EditableDataTable';
import { useAccessibility } from '../../hooks/useAccessibility';
import { IRScannerIcon, DSScannerIcon, NameplateScannerIcon, MeterScannerIcon, CaptureIcon, DetailsTabIcon, AnalysisTabIcon, UploadIcon, BackIcon, CloseIcon, EditIcon } from '../Icons';
import AddDataModal from './AddDataModal';
import ImageConfirmationModal from './ImageConfirmationModal';
import ImageInputArea from '../ImageInputArea';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  alt: string;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ isOpen, onClose, src, alt }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  useAccessibility(modalRef, isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[90] p-4"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="relative bg-white dark:bg-gray-900 p-2 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${alt} image viewer`}
      >
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 p-1.5 bg-white dark:bg-gray-700 rounded-full shadow-lg text-slate-600 dark:text-gray-200 hover:bg-slate-200 dark:hover:bg-gray-600"
          aria-label="Close image viewer"
        >
          <CloseIcon />
        </button>
        <img 
          src={src} 
          alt={alt} 
          className="w-full h-auto max-h-[calc(90vh-1rem)] object-contain"
        />
        <p className="text-center text-sm font-semibold text-slate-800 dark:text-white mt-2 pb-1">{alt}</p>
      </div>
    </div>
  );
};


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

const FormRow: React.FC<{label: React.ReactNode, children: React.ReactNode, dataTourId?: string, error?: string}> = ({label, children, dataTourId, error}) => {
    const id = useId();
    const errorId = error ? `error-${id}` : undefined;

    const augmentChildren = (nodes: React.ReactNode): React.ReactNode => {
        return React.Children.map(nodes, node => {
            if (!React.isValidElement(node)) return node;

            const inputTypes = [FormInput, 'input', 'textarea', 'select'];
            if (inputTypes.some(type => node.type === type)) {
                return React.cloneElement(node as React.ReactElement<any>, {
                    id: node.props.id || id,
                    'aria-invalid': !!error,
                    'aria-describedby': errorId,
                });
            }

            if (node.props.children) {
                 return React.cloneElement(node, {
                    ...node.props,
                    children: augmentChildren(node.props.children)
                });
            }

            return node;
        });
    };

    return (
        <div data-tour-id={dataTourId}>
            <label htmlFor={id} className="flex items-center text-xs font-medium text-slate-600 dark:text-gray-300 mb-1">{label}</label>
            {augmentChildren(children)}
            <div className="min-h-[1.25rem]"> {/* Reserve space for error message */}
              {error && <p id={errorId} className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">{error}</p>}
            </div>
        </div>
    );
};

const FormInput: React.FC<{
    value: string | number | null | undefined, 
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void, 
    type?: string, 
    list?: string, 
    rows?: number, 
    customClassName?: string, 
    id?: string,
    'aria-invalid'?: boolean,
    'aria-describedby'?: string
}> = ({value, onChange, type="text", list, rows, customClassName = '', id, 'aria-invalid': ariaInvalid, 'aria-describedby': ariaDescribedby}) => {
    const errorClasses = ariaInvalid ? 'border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-gray-600 focus:ring-brand-light-blue focus:border-brand-light-blue';
    const commonProps = {
        id,
        'aria-invalid': ariaInvalid,
        'aria-describedby': ariaDescribedby,
        value: value ?? '',
        onChange: onChange,
        list: list,
        className: `w-full p-1.5 sm:p-2 border rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white text-sm min-h-[38px] ${errorClasses} ${customClassName}`
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

type EditorTab = 'capture' | 'details' | 'analysis';

const TabButton: React.FC<{
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        role="tab"
        aria-selected={isActive}
        className={`flex-1 sm:flex-none sm:flex-grow-0 flex items-center justify-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base font-semibold border-b-4 transition-all duration-200 ease-in-out
            ${isActive
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-sky-500 dark:hover:text-sky-400 hover:border-sky-300'
            }
        `}
    >
        {icon}
        <span>{label}</span>
    </button>
);


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

// Efficiency Calculation Helper
const calculateEfficiencyMetrics = (inspection: InspectionRecord) => {
    let ratedAmps: number | null = null;
    let ratedVolts: number | null = null;

    if (inspection.nameplateData) {
        for (const item of inspection.nameplateData) {
            const param = item.parameter.toLowerCase();
            // Simple fuzzy matching for key electrical params
            if (param.includes('amp') || param === 'a' || param.includes('current')) {
                const val = parseFloat(item.value.replace(/[^0-9.]/g, ''));
                if (!isNaN(val)) ratedAmps = val;
            }
            if (param.includes('volt') || param === 'v') {
                const val = parseFloat(item.value.replace(/[^0-9.]/g, ''));
                if (!isNaN(val)) ratedVolts = val;
            }
        }
    }

    const measuredAmps = inspection.measuredCurrent;
    const measuredVolts = inspection.voltage;

    let loadPercentage = null;
    if (ratedAmps && measuredAmps) {
        loadPercentage = (measuredAmps / ratedAmps) * 100;
    }

    let voltageDeviation = null;
    if (ratedVolts && measuredVolts) {
        voltageDeviation = ((measuredVolts - ratedVolts) / ratedVolts) * 100;
    }

    return { ratedAmps, ratedVolts, measuredAmps, measuredVolts, loadPercentage, voltageDeviation };
};


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
  const [activeTab, setActiveTab] = useState<EditorTab>('capture');
  
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    mode: 'location' | 'equipment' | null;
  }>({ isOpen: false, mode: null });
  
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);

  const closeDetailsModal = useCallback(() => {
    setDetailsModalOpen(false);
    if (window.history.state?.modalOpen) {
      window.history.back();
    }
  }, []);

  const closeAnalysisModal = useCallback(() => {
    setAnalysisModalOpen(false);
    if (window.history.state?.modalOpen) {
      window.history.back();
    }
  }, []);

  useEffect(() => {
    if (detailsModalOpen || analysisModalOpen) {
      window.history.pushState({ modalOpen: true }, '');

      const handlePopState = () => {
        setDetailsModalOpen(false);
        setAnalysisModalOpen(false);
      };

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [detailsModalOpen, analysisModalOpen]);

  const [viewerState, setViewerState] = useState<{ isOpen: boolean; src: string; alt: string }>({ isOpen: false, src: '', alt: '' });
  const openImageViewer = (src: string, alt: string) => setViewerState({ isOpen: true, src, alt });
  const closeImageViewer = () => setViewerState({ isOpen: false, src: '', alt: '' });

  // Refs for modals - Moved to top level to avoid conditional hook execution error
  const detailsModalRef = useRef<HTMLDivElement>(null);
  const analysisModalRef = useRef<HTMLDivElement>(null);

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
        const locations = new Set<string>();
        const selectedClient = allClients.find(c => c.name === clientFilter);
        if (selectedClient) {
            allSiteLocations
                .filter(loc => loc.clientId === selectedClient.id)
                .forEach(loc => locations.add(loc.name));
        }
        allInspections
            .filter(insp => insp.clientName === clientFilter && insp.location)
            .forEach(insp => locations.add(insp.location!));

        return ['all', ...Array.from(locations).sort((a, b) => a.localeCompare(b))];
    }, [clientFilter, allInspections, allClients, allSiteLocations]);

    const componentsForFilter = useMemo(() => {
        if (locationFilter === 'all' || clientFilter === 'all') return ['all'];
        const components = new Set<string>();
        const selectedClient = allClients.find(c => c.name === clientFilter);
        const selectedLocation = selectedClient
            ? allSiteLocations.find(loc => loc.clientId === selectedClient.id && loc.name === locationFilter)
            : undefined;
        if (selectedLocation) {
            allEquipment
                .filter(eq => eq.locationId === selectedLocation.id)
                .forEach(eq => components.add(eq.name));
        }
        allInspections
            .filter(insp => insp.clientName === clientFilter && insp.location === locationFilter && insp.component)
            .forEach(insp => components.add(insp.component!));

        return ['all', ...Array.from(components).sort((a, b) => a.localeCompare(b))];
    }, [locationFilter, clientFilter, allInspections, allClients, allSiteLocations, allEquipment]);


  useEffect(() => { setLocationFilter('all'); }, [clientFilter]);
  useEffect(() => { setComponentFilter('all'); }, [locationFilter]);


  const inspectionsForList = useMemo(() => {
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

  useEffect(() => {
    if (initialTargetId && inspectionsForList.length > 0) {
        const target = inspectionsForList.find(insp => insp.id === initialTargetId);
        if (target) {
            setActiveInspection(target);
            setActiveTab('capture');
            clearTargetId();
            return;
        }
    }
    
    setActiveInspection(currentActive => {
        if (currentActive && filteredInspections.some(insp => insp.id === currentActive.id)) {
            return currentActive;
        }
        if (filteredInspections.length > 0) {
            setActiveTab('capture');
            return filteredInspections[0];
        }
        return null;
    });
    
  }, [filteredInspections, initialTargetId, inspectionsForList, clearTargetId]);

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
      confirmationState,
      confirmImage,
      cancelImageConfirmation,
      errors,
      reRunScanner,
  } = useInspectionEditor(
      activeInspection, 
      () => refreshData(), 
      () => processPendingAnalyses()
  );

  const handleManualSave = async () => {
    const success = await saveRecord();
    if (!success) {
      const detailTabFields: (keyof InspectionRecord)[] = [
        'clientName', 'location', 'component', 'ambientTemp', 'nominalMaxCurrent', 
        'measuredCurrent', 'referenceTemp', 'voltage', 'l1Load', 'l2Load', 'l3Load', 'neutralLoad'
      ];
      if (detailTabFields.some(field => errors[field])) {
        if (activeTab !== 'details') {
          setActiveTab('details');
        }
        alert('Please fix the errors on the Details tab before saving.');
      } else {
        alert('Please fix the validation errors before saving.');
      }
    }
  };
  
  const handleDsConfirmAndAnalyze = async () => {
    closeDsConfirm();
    await startAnalysis();
  };
  
  const handleAnalysisClick = async () => {
    if (editedInspection && !editedInspection.dsImageBase64) {
      setIsDsConfirmOpen(true);
    } else {
      const success = await startAnalysis();
      if (!success) {
        const detailTabFields: (keyof InspectionRecord)[] = [
          'clientName', 'location', 'component', 'ambientTemp', 'nominalMaxCurrent',
          'measuredCurrent', 'referenceTemp', 'voltage', 'l1Load', 'l2Load', 'l3Load', 'neutralLoad'
        ];
        if (detailTabFields.some(field => errors[field])) {
          setDetailsModalOpen(true); // Open details modal on mobile
          if (activeTab !== 'details') { // Switch tab on desktop
            setActiveTab('details');
          }
          alert('Please fill in all required fields on the Details tab before running analysis.');
        } else {
          alert('Please fix validation errors before running analysis.');
        }
      }
    }
  };
  
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

  const currentClient = useMemo(() => {
    if (!editedInspection?.clientName) return null;
    return allClients.find(c => c.name === editedInspection.clientName) || null;
  }, [editedInspection?.clientName, allClients]);

  const currentLocation = useMemo(() => {
    if (!currentClient || !editedInspection?.location) return null;
    return allSiteLocations.find(l => l.clientId === currentClient.id && l.name === editedInspection.location) || null;
  }, [currentClient, editedInspection?.location, allSiteLocations]);

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
  
  const openAddModal = (mode: 'location' | 'equipment') => {
    if (mode === 'location' && !currentClient) {
        alert("Please select a client before adding a new location.");
        return;
    }
    if (mode === 'equipment' && !currentLocation) {
        alert("Please select a location before adding new equipment.");
        return;
    }
    setModalConfig({ isOpen: true, mode });
  };
  
  const handleModalSave = () => {
    refreshData();
    setModalConfig({ isOpen: false, mode: null });
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

const EfficiencyAnalysis: React.FC<{ inspection: InspectionRecord }> = ({ inspection }) => {
    const metrics = calculateEfficiencyMetrics(inspection);
    const { ratedAmps, ratedVolts, measuredAmps, measuredVolts, loadPercentage, voltageDeviation } = metrics;

    if (ratedAmps === null && ratedVolts === null) {
        return (
            <FormSection title="Efficiency & Load Analysis">
                <p className="text-sm text-slate-500 dark:text-gray-400 italic">
                    To see efficiency analysis, please ensure Nameplate Data includes Rated Current (Amps) or Rated Voltage (Volts) and fill in the Operational Data above.
                </p>
            </FormSection>
        );
    }

    return (
        <FormSection title="Efficiency & Load Analysis">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">Comparison Table</h4>
                    <div className="overflow-x-auto border border-slate-300 dark:border-gray-600 rounded-md">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-200 dark:bg-gray-700">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-gray-300">Parameter</th>
                                    <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-gray-300">Rated (Nameplate)</th>
                                    <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-gray-300">Measured</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-gray-600">
                                <tr>
                                    <td className="px-3 py-2 font-medium text-slate-800 dark:text-white">Current (Amps)</td>
                                    <td className="px-3 py-2 text-slate-700 dark:text-gray-300">{ratedAmps !== null ? `${ratedAmps} A` : 'N/A'}</td>
                                    <td className="px-3 py-2 text-slate-700 dark:text-gray-300">{measuredAmps !== null ? `${measuredAmps} A` : 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td className="px-3 py-2 font-medium text-slate-800 dark:text-white">Voltage (Volts)</td>
                                    <td className="px-3 py-2 text-slate-700 dark:text-gray-300">{ratedVolts !== null ? `${ratedVolts} V` : 'N/A'}</td>
                                    <td className="px-3 py-2 text-slate-700 dark:text-gray-300">{measuredVolts !== null ? `${measuredVolts} V` : 'N/A'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="space-y-4">
                    {loadPercentage !== null && (
                        <div className={`p-4 rounded-lg border ${loadPercentage > 100 ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                            <h5 className="font-bold text-lg mb-1">Load Percentage</h5>
                            <p className="text-3xl font-extrabold">{loadPercentage.toFixed(1)}%</p>
                            <p className="text-xs mt-1">{loadPercentage > 100 ? 'Warning: Equipment Overloaded' : 'Operating within rated capacity'}</p>
                        </div>
                    )}
                    {voltageDeviation !== null && (
                        <div className={`p-4 rounded-lg border ${Math.abs(voltageDeviation) > 5 ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                            <h5 className="font-bold text-lg mb-1">Voltage Deviation</h5>
                            <p className="text-3xl font-extrabold">{voltageDeviation > 0 ? '+' : ''}{voltageDeviation.toFixed(1)}%</p>
                            <p className="text-xs mt-1">{Math.abs(voltageDeviation) > 5 ? 'Warning: Significant voltage deviation' : 'Voltage within normal range'}</p>
                        </div>
                    )}
                </div>
            </div>
        </FormSection>
    );
};


  if (loading) return <LoadingSpinner text="Loading inspection records..." />;
  
  const imageTypes: { type: ImageType; title: string; icon: React.ReactNode; }[] = editedInspection ? [
    { type: 'IR', title: 'Infrared (IR)', icon: <IRScannerIcon /> },
    { type: 'DS', title: 'Digital Still (DS)', icon: <DSScannerIcon /> },
    { type: 'NAMEPLATE', title: 'Nameplate', icon: <NameplateScannerIcon /> },
    { type: 'METER', title: 'Meter', icon: <MeterScannerIcon /> },
  ] : [];

  const imageSrcMap = editedInspection ? {
      IR: editedInspection.irImageBase64,
      DS: editedInspection.dsImageBase64,
      NAMEPLATE: editedInspection.nameplateImageBase64,
      METER: editedInspection.meterImageBase64,
  } : null;

  const detailsContent = editedInspection ? (
    <>
      <FormSection title="Location & Equipment Information" dataTourId="details-location-equipment">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <FormRow label="Client" error={errors.clientName}>
            <FormInput value={editedInspection.clientName} onChange={e => updateField('clientName', e.target.value)} list="client-list" />
            <datalist id="client-list">{allClients.map(c => <option key={c.id} value={c.name} />)}</datalist>
          </FormRow>
          <FormRow label={<>Location <button onClick={() => openAddModal('location')} className="ml-2 text-xs text-sky-500 hover:underline" disabled={!currentClient}>+ New</button></>} error={errors.location}>
            <FormInput value={editedInspection.location} onChange={e => updateField('location', e.target.value)} list="location-list" />
            <datalist id="location-list">{filteredLocations.map(l => <option key={l.id} value={l.name} />)}</datalist>
          </FormRow>
          <FormRow label="Pre-defined Equipment">
            <select
              value={editedInspection.equipmentId || ''}
              onChange={(e) => handleEquipmentSelect(e.target.value)}
              className="w-full p-1.5 sm:p-2 border rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white text-sm border-slate-300 dark:border-gray-600 focus:ring-brand-light-blue focus:border-brand-light-blue"
              disabled={availableEquipment.length === 0}
            >
              <option value="">-- Select or Enter Manually --</option>
              {availableEquipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
            </select>
          </FormRow>
          <FormRow label={<>Equipment Name / ID <button onClick={() => openAddModal('equipment')} className="ml-2 text-xs text-sky-500 hover:underline" disabled={!currentLocation}>+ New</button></>} error={errors.component}>
            <FormInput value={editedInspection.component} onChange={e => updateField('component', e.target.value)} />
          </FormRow>
          <div className="sm:col-span-2">
            <FormRow label="Equipment Details (Model, S/N, etc.)">
              <FormInput value={editedInspection.machineDetails} onChange={e => updateField('machineDetails', e.target.value)} />
            </FormRow>
          </div>
        </div>
      </FormSection>
  
      <FormSection title="Job & Status Information" dataTourId="details-job-status">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4">
          <FormRow label="Job ID / Ref"><FormInput value={editedInspection.jobIdReference} onChange={e => updateField('jobIdReference', e.target.value)} /></FormRow>
          <FormRow label="PM Work Order #"><FormInput value={editedInspection.pmWorkOrder} onChange={e => updateField('pmWorkOrder', e.target.value)} /></FormRow>
          <FormRow label="Item ID #"><FormInput value={editedInspection.itemId} onChange={e => updateField('itemId', e.target.value)} /></FormRow>
          <FormRow label="Operation Priority"><FormInput value={editedInspection.operationPriority} onChange={e => updateField('operationPriority', e.target.value)} /></FormRow>
        </div>
      </FormSection>
  
      <FormSection title="Operational & Trending Data" dataTourId="details-operational-data">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4">
          <FormRow label={<>Ambient Temp (&deg;C)</>} error={errors.ambientTemp}><FormInput value={editedInspection.ambientTemp} onChange={e => updateField('ambientTemp', e.target.value === '' ? null : parseFloat(e.target.value))} type="number" /></FormRow>
          <FormRow label={<>Nominal Max Current (A)</>} error={errors.nominalMaxCurrent}><FormInput value={editedInspection.nominalMaxCurrent} onChange={e => updateField('nominalMaxCurrent', e.target.value === '' ? null : parseFloat(e.target.value))} type="number" /></FormRow>
          <FormRow label={<>Measured Current (A)</>} error={errors.measuredCurrent}><FormInput value={editedInspection.measuredCurrent} onChange={e => updateField('measuredCurrent', e.target.value === '' ? null : parseFloat(e.target.value))} type="number" /></FormRow>
          <FormRow label={<>Reference Temp (&deg;C)</>} error={errors.referenceTemp}><FormInput value={editedInspection.referenceTemp} onChange={e => updateField('referenceTemp', e.target.value === '' ? null : parseFloat(e.target.value))} type="number" /></FormRow>
          <FormRow label={<>Voltage (V)</>} error={errors.voltage}><FormInput value={editedInspection.voltage} onChange={e => updateField('voltage', e.target.value === '' ? null : parseFloat(e.target.value))} type="number" /></FormRow>
          <FormRow label={<>L1 Load (A)</>} error={errors.l1Load}><FormInput value={editedInspection.l1Load} onChange={e => updateField('l1Load', e.target.value === '' ? null : parseFloat(e.target.value))} type="number" /></FormRow>
          <FormRow label={<>L2 Load (A)</>} error={errors.l2Load}><FormInput value={editedInspection.l2Load} onChange={e => updateField('l2Load', e.target.value === '' ? null : parseFloat(e.target.value))} type="number" /></FormRow>
          <FormRow label={<>L3 Load (A)</>} error={errors.l3Load}><FormInput value={editedInspection.l3Load} onChange={e => updateField('l3Load', e.target.value === '' ? null : parseFloat(e.target.value))} type="number" /></FormRow>
          <FormRow label={<>Neutral Load (A)</>} error={errors.neutralLoad}><FormInput value={editedInspection.neutralLoad} onChange={e => updateField('neutralLoad', e.target.value === '' ? null : parseFloat(e.target.value))} type="number" /></FormRow>
          <FormRow label="Ultrasonic Reading"><FormInput value={editedInspection.ultrasonicReading} onChange={e => updateField('ultrasonicReading', e.target.value)} /></FormRow>
        </div>
      </FormSection>
  
      <FormSection title="Notes" dataTourId="details-notes">
        <FormRow label="Site Engineer Notes">
          <FormInput value={editedInspection.technicianNotes} onChange={e => updateField('technicianNotes', e.target.value)} type="textarea" />
        </FormRow>
      </FormSection>
  
      <EditableDataTable 
        title="Nameplate Data" 
        data={editedInspection.nameplateData} 
        onDataChange={(newData) => updateField('nameplateData', newData)} 
        imagePresent={!!editedInspection.nameplateImageBase64} 
        placeholderRows={NAMEPLATE_PLACEHOLDERS} 
        isLoading={isScannerLoading.nameplate} 
        error={scannerError.nameplate} 
        onScan={() => openCamera('NAMEPLATE')}
        onReRunAI={() => reRunScanner('NAMEPLATE')}
      />
      <EditableDataTable 
        title="Meter Data" 
        data={editedInspection.meterData} 
        onDataChange={(newData) => updateField('meterData', newData)} 
        imagePresent={!!editedInspection.meterImageBase64} 
        placeholderRows={METER_PLACEHOLDERS} 
        isLoading={isScannerLoading.meter} 
        error={scannerError.meter} 
        onScan={() => openCamera('METER')}
        onReRunAI={() => reRunScanner('METER')}
      />
    </>
  ) : null;

  const analysisContent = editedInspection ? (
    <div className="space-y-6">
        <div className="flex justify-center">
            <button
                onClick={handleAnalysisClick}
                disabled={!editedInspection.irImageBase64 || isLoadingAnalysis || editedInspection.inspectionStatus === 'pending-analysis'}
                className="px-6 py-3 bg-brand-orange hover:bg-amber-600 text-white font-semibold rounded-lg shadow-lg text-base disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center gap-2"
                data-tour-id="analyze-btn"
            >
                {isLoadingAnalysis ? <LoadingSpinner size="sm" /> : <AnalysisTabIcon />}
                {editedInspection.analysisOutput ? 'Re-run AI Analysis' : 'Run AI Analysis'}
            </button>
        </div>
        {analysisApiError && (
            analysisApiError === 'offline_queued' ? (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 p-4 rounded-lg text-sm text-center font-medium" role="alert">
                    ⏳ You are currently offline. This report has been successfully saved locally and added to your offline sync queue. It will automatically upload and process as soon as internet connection is restored.
                </div>
            ) : (
                <p className="text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-300 p-3 rounded-md text-sm text-center" role="alert">{analysisApiError}</p>
            )
        )}
        {isLoadingAnalysis && <p className="text-sky-600 dark:text-sky-400 text-center text-sm font-medium">Analysis in progress... This may take a moment.</p>}
        
        {editedInspection.analysisOutput ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <EfficiencyAnalysis inspection={editedInspection} />
                </div>

                <FormSection title="Problem Details (AI Populated)">
                    <div className="space-y-2">
                        <FormRow label="Fault Item/Description"><FormDisplay value={editedInspection.faultItemDescription} /></FormRow>
                        <FormRow label="Problem Item"><FormDisplay value={editedInspection.problemItem} /></FormRow>
                        <FormRow label="Problem Type"><FormDisplay value={editedInspection.problemType} /></FormRow>
                        <FormRow label="Problem Manufacturer"><FormDisplay value={editedInspection.problemManufacturer} /></FormRow>
                        <FormRow label="Problem Anomaly"><FormDisplay value={editedInspection.problemAnomaly} /></FormRow>
                        <FormRow label="Suspected Root Cause"><FormDisplay value={editedInspection.problemRootCause} /></FormRow>
                        <FormRow label="Recommended Remedial Action"><FormDisplay value={editedInspection.problemRemedial} /></FormRow>
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
        ) : <p className="text-center text-slate-500 dark:text-gray-400 text-sm py-4">Run AI analysis to see results here.</p>}
    </div>
) : null;


  return (
    <div className="flex flex-col h-full">
      <ImageViewerModal isOpen={viewerState.isOpen} onClose={closeImageViewer} src={viewerState.src} alt={viewerState.alt} />
      <CameraCaptureModal isOpen={isCameraOpen} onClose={closeCamera} onCapture={handleImageUpdate(imageTypeToManage || 'IR')} imageType={imageTypeToManage || 'IR'} />
      <ImageUploadModal isOpen={isUploadOpen} onClose={closeUpload} onUpload={handleImageUpdate(imageTypeToManage || 'IR')} imageType={imageTypeToManage || 'IR'} />
      <DsConfirmationModal isOpen={isDsConfirmOpen} onClose={closeDsConfirm} onAddDsImage={() => { closeDsConfirm(); openCamera('DS'); }} onProceedWithoutDs={handleDsConfirmAndAnalyze} />
      {currentClient && modalConfig.isOpen && (
        <AddDataModal
            isOpen={modalConfig.isOpen}
            onClose={() => setModalConfig({ isOpen: false, mode: null })}
            onSave={handleModalSave}
            mode={modalConfig.mode!}
            client={currentClient}
            location={currentLocation || undefined}
        />
      )}
      <ImageConfirmationModal
          isOpen={confirmationState.isOpen}
          imageSrc={confirmationState.base64 ? `data:image/png;base64,${confirmationState.base64}` : null}
          onConfirm={confirmImage}
          onRetake={() => {
              const type = confirmationState.type;
              cancelImageConfirmation(); 
              if (type) openCamera(type);
          }}
          onReplace={() => {
              const type = confirmationState.type;
              cancelImageConfirmation();
              if (type) openUpload(type);
          }}
          onClose={cancelImageConfirmation}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
        {/* Left Column: List and Filters */}
        <div className={`${activeInspection ? 'hidden' : 'flex'} lg:flex lg:col-span-1 flex-col h-full bg-slate-100 dark:bg-slate-900/50 p-3 rounded-lg overflow-hidden`}>
            <details className="shrink-0 mb-3" open={window.innerWidth > 768}>
                <summary className="font-semibold text-slate-700 dark:text-gray-200 cursor-pointer p-3 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">Filter & Sort</summary>
                <div className="mt-2 p-3 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
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
                    </div>
                </div>
            </details>
            
            <div className="flex-grow overflow-y-auto space-y-2 pr-1">
                 {filteredInspections.map(insp => (
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
                ))}
                {filteredInspections.length === 0 && (
                    <p className="text-center text-sm text-slate-500 dark:text-gray-400 pt-8">No records match filters.</p>
                )}
            </div>
        </div>

        {/* Right Column: Editor */}
        <div className={`${activeInspection ? 'flex' : 'hidden'} lg:flex lg:col-span-3 flex-col h-full`}>
        {!editedInspection ? (
            <div className="flex-grow items-center justify-center h-full rounded-lg bg-slate-50 dark:bg-slate-800/30 border-2 border-dashed border-slate-300 dark:border-slate-700 hidden lg:flex">
                <p className="text-slate-500 dark:text-gray-400 text-center">Select an inspection from the list to view or edit.</p>
            </div>
        ) : (
             <div className="flex flex-col h-full">
                <div className="shrink-0 flex items-center mb-2">
                    <button onClick={() => setActiveInspection(null)} className="lg:hidden flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-lg shadow hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                        <BackIcon className="w-4 h-4" />
                        List
                    </button>
                    <p className="lg:hidden font-semibold text-slate-600 dark:text-slate-300 text-sm ml-3 truncate">
                        {editedInspection.clientName || 'New Inspection'}
                    </p>
                </div>
                
                {/* DESKTOP: Tab Navigation */}
                <div className="hidden lg:flex shrink-0 items-center justify-between border-b border-slate-200 dark:border-gray-700 mb-4">
                    <div className="flex items-center space-x-2 sm:space-x-4" role="tablist" aria-label="Inspection Editor Tabs">
                        <TabButton label="Capture" icon={<CaptureIcon />} isActive={activeTab === 'capture'} onClick={() => setActiveTab('capture')} />
                        <TabButton label="Details" icon={<DetailsTabIcon />} isActive={activeTab === 'details'} onClick={() => setActiveTab('details')} />
                        <TabButton label="AI Analysis" icon={<AnalysisTabIcon />} isActive={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} />
                    </div>
                    <div className="flex items-center space-x-2 pr-2">
                        <AutoSaveIndicator status={autoSaveStatus} />
                        <button onClick={handleManualSave} disabled={isSaving} className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-1.5 px-3 rounded-lg shadow text-sm disabled:opacity-50">{isSaving ? 'Saving...' : 'Save'}</button>
                    </div>
                </div>

                {/* DESKTOP: Tab Panels */}
                <div className="hidden lg:block flex-grow overflow-y-auto space-y-6 p-1">
                    <div role="tabpanel" hidden={activeTab !== 'capture'}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 p-2">
                            {imageTypes.map(imgType => (
                                <ImageInputArea
                                    key={imgType.type}
                                    type={imgType.type}
                                    title={imgType.title}
                                    icon={imgType.icon}
                                    imageSrc={imageSrcMap ? imageSrcMap[imgType.type] : null}
                                    onCameraClick={openCamera}
                                    onUploadClick={openUpload}
                                    onViewClick={openImageViewer}
                                />
                            ))}
                        </div>
                    </div>
                    <div role="tabpanel" hidden={activeTab !== 'details'} className="space-y-6">{detailsContent}</div>
                    <div role="tabpanel" hidden={activeTab !== 'analysis'} className="space-y-6">{analysisContent}</div>
                </div>

                {/* MOBILE: Single Screen Layout */}
                <div className="lg:hidden flex-grow overflow-y-auto space-y-3 p-1">
                    <FormSection title="Core Details">
                        <div className="grid grid-cols-2 gap-x-2 gap-y-0 text-sm">
                            <FormRow label="Client" error={errors.clientName}>
                                <FormInput value={editedInspection.clientName} onChange={e => updateField('clientName', e.target.value)} list="client-list" />
                                <datalist id="client-list">{allClients.map(c => <option key={c.id} value={c.name} />)}</datalist>
                            </FormRow>
                             <FormRow label="Location" error={errors.location}>
                                <FormInput value={editedInspection.location} onChange={e => updateField('location', e.target.value)} list="location-list" />
                                <datalist id="location-list">{filteredLocations.map(l => <option key={l.id} value={l.name} />)}</datalist>
                            </FormRow>
                             <div className="col-span-2">
                                <FormRow label="Equipment" error={errors.component}>
                                    <FormInput value={editedInspection.component} onChange={e => updateField('component', e.target.value)} />
                                </FormRow>
                             </div>
                        </div>
                    </FormSection>

                    <FormSection title="Images">
                        <div className="grid grid-cols-2 gap-3">
                           {imageTypes.map(imgType => (
                                <ImageInputArea
                                    key={imgType.type}
                                    type={imgType.type}
                                    title={imgType.title}
                                    icon={imgType.icon}
                                    imageSrc={imageSrcMap ? imageSrcMap[imgType.type] : null}
                                    onCameraClick={openCamera}
                                    onUploadClick={openUpload}
                                    onViewClick={openImageViewer}
                                    isMobile
                                />
                            ))}
                        </div>
                    </FormSection>

                    <div className="p-2 space-y-3">
                        <button onClick={() => setDetailsModalOpen(true)} className="w-full text-center p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
                            More Details & Notes...
                        </button>
                        
                        {editedInspection.analysisOutput && (
                             <button onClick={() => setAnalysisModalOpen(true)} className="w-full text-center p-3 bg-sky-100 dark:bg-sky-900/50 border border-sky-300 dark:border-sky-700 rounded-lg shadow-sm font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-800/50">
                                View Analysis Results
                            </button>
                        )}
                         {analysisApiError && (
                             analysisApiError === 'offline_queued' ? (
                                 <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 p-2 rounded-lg text-xs text-center font-medium" role="alert">
                                     ⏳ Offline: Report queued for sync
                                 </div>
                             ) : (
                                 <p className="text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-300 p-2 rounded-md text-xs text-center" role="alert">{analysisApiError}</p>
                             )
                         )}
                    </div>

                    <div className="h-20" /> {/* Spacer for sticky footer */}
                </div>
                
                 {/* MOBILE: Sticky Footer */}
                <div className="lg:hidden sticky bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 p-2 flex items-center justify-between gap-2 shadow- ऊपर">
                    <AutoSaveIndicator status={autoSaveStatus} />
                    <div className="flex items-center gap-2">
                        <button onClick={handleManualSave} disabled={isSaving} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg shadow text-sm disabled:opacity-50">{isSaving ? 'Saving...' : 'Save'}</button>
                        <button onClick={handleAnalysisClick} disabled={!editedInspection.irImageBase64 || isLoadingAnalysis || editedInspection.inspectionStatus === 'pending-analysis'} className="px-4 py-2 bg-brand-orange hover:bg-amber-600 text-white font-semibold rounded-lg shadow text-sm disabled:bg-slate-400 disabled:cursor-not-allowed">
                            {isLoadingAnalysis ? <LoadingSpinner size="sm" /> : 'Analyze'}
                        </button>
                    </div>
                </div>

                {/* MODALS for mobile view */}
                {detailsModalOpen && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div ref={detailsModalRef} className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[90vh] max-h-[90vh] rounded-xl shadow-2xl flex flex-col">
                            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
                                <button onClick={closeDetailsModal} className="flex items-center gap-1.5 px-3 py-1.5 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs sm:text-sm font-semibold transition-colors">
                                    <BackIcon className="w-4 h-4" />
                                    Back
                                </button>
                                <h3 className="text-base sm:text-xl font-bold text-slate-800 dark:text-white">Details & Notes</h3>
                                <button onClick={closeDetailsModal} className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white" aria-label="Close details modal"><CloseIcon /></button>
                            </div>
                            <div className="flex-grow overflow-y-auto p-4 space-y-6">
                              {detailsContent}
                            </div>
                            <div className="p-4 border-t border-slate-200 dark:border-slate-700 shrink-0 flex justify-end bg-slate-50 dark:bg-slate-900/50 rounded-b-xl">
                                <button onClick={closeDetailsModal} className="w-full px-5 py-3 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-gray-200 font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors shadow-sm">
                                    ← Back to Inspection
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                 {analysisModalOpen && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div ref={analysisModalRef} className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[90vh] max-h-[90vh] rounded-xl shadow-2xl flex flex-col">
                            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
                                <button onClick={closeAnalysisModal} className="flex items-center gap-1.5 px-3 py-1.5 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs sm:text-sm font-semibold transition-colors">
                                    <BackIcon className="w-4 h-4" />
                                    Back
                                </button>
                                <h3 className="text-base sm:text-xl font-bold text-slate-800 dark:text-white">AI Analysis Results</h3>
                                <button onClick={closeAnalysisModal} className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white" aria-label="Close analysis modal"><CloseIcon /></button>
                            </div>
                            <div className="flex-grow overflow-y-auto p-4 space-y-6">
                               {analysisContent}
                            </div>
                            <div className="p-4 border-t border-slate-200 dark:border-slate-700 shrink-0 flex justify-end bg-slate-50 dark:bg-slate-900/50 rounded-b-xl">
                                <button onClick={closeAnalysisModal} className="w-full px-5 py-3 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-gray-200 font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors shadow-sm">
                                    ← Back to Inspection
                                </button>
                            </div>
                        </div>
                    </div>
                 )}

            </div>
        )}
        </div>
      </div>
    </div>
  );
};
