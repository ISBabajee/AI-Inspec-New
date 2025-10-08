import { useState, useCallback, useEffect, useRef } from 'react';
import { InspectionRecord, ImageType, NameplateData, AnalysisOutput, UINestedAnalysisOutput, ParsedAnalysisFinding } from '../types';
import { saveInspectionRecord } from '../src/db';
import { analyzeImagesWithGemini, analyzeNameplateWithGemini, analyzeMeterDisplayWithGemini } from '../services/geminiService';

export const useInspectionEditor = (
    initialInspection: InspectionRecord | null, 
    onSaveSuccess: () => void,
    triggerAnalysisQueue: () => void,
) => {
    const [inspection, setInspection] = useState<InspectionRecord | null>(initialInspection);
    
    // UI State
    const [isSaving, setIsSaving] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [imageTypeToManage, setImageTypeToManage] = useState<ImageType | null>(null);
    const [isDsConfirmOpen, setIsDsConfirmOpen] = useState(false);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle');

    // Analysis State
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
    const [analysisApiError, setAnalysisApiError] = useState<string | null>(null);

    // Scanner State
    const [scannerError, setScannerError] = useState<{nameplate: string|null, meter: string|null}>({nameplate: null, meter: null});
    const [isScannerLoading, setIsScannerLoading] = useState({nameplate: false, meter: false});

    // Refs for auto-saving
    // FIX: Replaced NodeJS.Timeout with ReturnType<typeof setTimeout> for browser compatibility.
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasUnsavedChanges = useRef(false);
    const isAutoSaving = useRef(false);
    const inspectionRef = useRef(inspection);
    useEffect(() => {
        inspectionRef.current = inspection;
    }, [inspection]);

    useEffect(() => {
        setInspection(initialInspection);
        setAnalysisApiError(null);
        setScannerError({nameplate: null, meter: null});
        // Reset auto-save state when a new inspection is loaded
        hasUnsavedChanges.current = false;
        isAutoSaving.current = false;
        setAutoSaveStatus('idle');
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    }, [initialInspection]);

    // --- START: Auto-save Logic ---
    const performAutoSave = useCallback(async () => {
        if (!hasUnsavedChanges.current || !inspectionRef.current || isSaving || isAutoSaving.current) {
            return;
        }

        isAutoSaving.current = true;
        setAutoSaveStatus('saving');

        try {
            await saveInspectionRecord(inspectionRef.current);
            onSaveSuccess(); // Refresh list in background
            hasUnsavedChanges.current = false;
            setAutoSaveStatus('saved');
            setTimeout(() => setAutoSaveStatus('idle'), 2500);
        } catch (err) {
            console.error("Auto-save failed:", err);
            setAutoSaveStatus('error');
        } finally {
            isAutoSaving.current = false;
        }
    }, [isSaving, onSaveSuccess]);

    // Periodic saver (every 60 seconds)
    useEffect(() => {
        const intervalId = setInterval(performAutoSave, 60000);
        return () => clearInterval(intervalId);
    }, [performAutoSave]);

    // Debounced saver (5s after change)
    useEffect(() => {
        if (inspection === initialInspection) {
            return; // Don't trigger on initial load
        }

        hasUnsavedChanges.current = true;
        setAutoSaveStatus('dirty');

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(performAutoSave, 5000); // 5-second debounce

        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, [inspection, initialInspection, performAutoSave]);

    // --- END: Auto-save Logic ---


    const updateField = useCallback((field: keyof InspectionRecord, value: any) => {
        setInspection(prev => {
            if (!prev) return null;
            // Prevent setting NaN from empty number inputs
            if (typeof value === 'number' && isNaN(value)) {
                value = null;
            }
            return { ...prev, [field]: value, updatedAt: new Date() };
        });
    }, []);

    const updateFindings = useCallback((newFindings: ParsedAnalysisFinding[]) => {
        setInspection(prev => {
          if (!prev) return null;
          // Ensure analysisOutput exists, if not, create it
          const currentAnalysisOutput = prev.analysisOutput || {};
          return {
            ...prev,
            analysisOutput: {
              ...currentAnalysisOutput,
              findings: newFindings,
            },
            updatedAt: new Date(),
          };
        });
    }, []);

    const saveRecord = async () => {
        if (!inspection) return;
        // Stop any pending auto-save before manual save
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        
        setIsSaving(true);
        setAutoSaveStatus('saving');
        try {
            await saveInspectionRecord(inspection);
            onSaveSuccess();
            hasUnsavedChanges.current = false;
            setAutoSaveStatus('saved');
            setTimeout(() => setAutoSaveStatus('idle'), 2500);
        } catch (error) { 
            console.error("Failed to save record", error); 
            setAutoSaveStatus('error');
        }
        finally {
            setIsSaving(false);
        }
    };
    
    const resetForm = useCallback(() => {
        if (!initialInspection) return;
        if (window.confirm("Are you sure you want to discard all unsaved changes? This will reload the last saved version of this record.")) {
            setInspection(initialInspection);
        }
    }, [initialInspection]);


    const openCamera = (type: ImageType) => {
        setImageTypeToManage(type);
        setIsCameraOpen(true);
    };

    const openUpload = (type: ImageType) => {
        setImageTypeToManage(type);
        setIsUploadOpen(true);
    };
    
    const runScanner = useCallback(async (type: 'NAMEPLATE' | 'METER', imageBase64: string) => {
        const setLoading = (isLoading: boolean) => {
            if (type === 'NAMEPLATE') setIsScannerLoading(prev => ({ ...prev, nameplate: isLoading }));
            else setIsScannerLoading(prev => ({ ...prev, meter: isLoading }));
        };
    
        const setError = (error: string | null) => {
            if (type === 'NAMEPLATE') setScannerError(prev => ({ ...prev, nameplate: error }));
            else setScannerError(prev => ({ ...prev, meter: error }));
        };
    
        setLoading(true);
        setError(null);
    
        const response = type === 'NAMEPLATE'
            ? await analyzeNameplateWithGemini(imageBase64)
            : await analyzeMeterDisplayWithGemini(imageBase64);
    
        if (response.error) {
            setError(response.error);
            setLoading(false);
            return;
        }
    
        if (response.data) {
            const dataField = type === 'NAMEPLATE' ? 'nameplateData' : 'meterData';
            updateField(dataField, response.data);
    
            const newFields: Partial<InspectionRecord> = {};
            
            response.data.forEach(item => {
                const param = item.parameter.toLowerCase().trim();
                const valueStr = item.value.replace(/[^0-9.-]/g, '');
                const value = parseFloat(valueStr);
                if (isNaN(value)) return;
    
                if (type === 'NAMEPLATE') {
                    if (param.includes('volt')) newFields.voltage = value;
                    if (param.includes('nominal') && (param.includes('current') || param.includes('amp'))) newFields.nominalMaxCurrent = value;
                } else { // METER
                    if (param.includes('volt')) newFields.voltage = value;
                    if (param.includes('l1') && (param.includes('current') || param.includes('load') || param.includes('amp'))) newFields.l1Load = value;
                    if (param.includes('l2') && (param.includes('current') || param.includes('load') || param.includes('amp'))) newFields.l2Load = value;
                    if (param.includes('l3') && (param.includes('current') || param.includes('load') || param.includes('amp'))) newFields.l3Load = value;
                    if (param.includes('neutral') && (param.includes('current') || param.includes('amp'))) newFields.neutralLoad = value;
    
                    if (param.includes('current') && !param.includes('nominal') && (param.includes('l1') || param.includes('l2') || param.includes('l3'))) {
                        if (newFields.measuredCurrent === undefined || value > newFields.measuredCurrent) {
                            newFields.measuredCurrent = value;
                        }
                    }
                }
            });
    
            if (Object.keys(newFields).length > 0) {
                setInspection(currentInspection => {
                    if (!currentInspection) return null;
                    const updatedRecord = { ...currentInspection, ...newFields, updatedAt: new Date() };
                    
                    // Auto-save the record to persist the changes from the scanner
                    saveInspectionRecord(updatedRecord)
                        .then(() => {
                            onSaveSuccess(); // This will refresh data in the list view
                        })
                        .catch(err => {
                            console.error("Auto-save after scan failed:", err);
                        });
    
                    return updatedRecord;
                });
            }
        }
    
        setLoading(false);
    }, [updateField, setInspection, onSaveSuccess]);


    // FIX: Refactored to be a higher-order function that accepts the image type.
    // This resolves the argument count error and fixes a latent bug with drag-and-drop.
    const handleImageUpdate = useCallback((type: ImageType) => (base64: string | null, error?: string) => {
        setIsCameraOpen(false);
        setIsUploadOpen(false);
        if (error) { 
            alert(`Image capture/upload error: ${error}`);
            return; 
        }

        if (base64) {
            const fieldMap: Record<ImageType, keyof InspectionRecord> = { 'IR': 'irImageBase64', 'DS': 'dsImageBase64', 'NAMEPLATE': 'nameplateImageBase64', 'METER': 'meterImageBase64' };
            const timestampMap: Record<ImageType, keyof InspectionRecord> = { 'IR': 'irImageTimestamp', 'DS': 'dsImageTimestamp', 'NAMEPLATE': 'nameplateImageTimestamp', 'METER': 'meterImageTimestamp' };
            
            updateField(fieldMap[type], base64);
            updateField(timestampMap[type], new Date());
            
            if (type === 'NAMEPLATE' || type === 'METER') {
                runScanner(type, base64);
            }
        }
    }, [updateField, runScanner]);

    const removeImage = (type: ImageType) => {
        if (type === 'IR') return; // IR image is mandatory
        const fieldMap: Record<ImageType, keyof InspectionRecord> = { 'IR': 'irImageBase64', 'DS': 'dsImageBase64', 'NAMEPLATE': 'nameplateImageBase64', 'METER': 'meterImageBase64' };
        const timestampMap: Record<ImageType, keyof InspectionRecord> = { 'IR': 'irImageTimestamp', 'DS': 'dsImageTimestamp', 'NAMEPLATE': 'nameplateImageTimestamp', 'METER': 'meterImageTimestamp' };
        
        updateField(fieldMap[type], null);
        updateField(timestampMap[type], null);

        // Also clear associated data
        if (type === 'NAMEPLATE') updateField('nameplateData', null);
        if (type === 'METER') updateField('meterData', null);
    };

    const startAnalysis = async (): Promise<boolean> => {
        if (!inspection || !inspection.irImageBase64) return false;
        
        setIsLoadingAnalysis(true);
        setAnalysisApiError(null);

        let pendingRecord = { ...inspection, inspectionStatus: 'pending-analysis' as const, updatedAt: new Date() };
        await saveInspectionRecord(pendingRecord);
        onSaveSuccess();
        
        // This part runs in the background, UI is now responsive
        (async () => {
            try {
                const result: AnalysisOutput = await analyzeImagesWithGemini(pendingRecord);
                
                if (result.error) {
                    throw new Error(result.error);
                }
                
                const { findings, derivedData, groundingChunks, rawText, ...flatResult } = result;

                const analysisOutputForUI: UINestedAnalysisOutput = {
                    findings,
                    derivedData,
                    groundingChunks,
                    error: result.error
                };

                const finalRecord: InspectionRecord = { 
                    ...pendingRecord, 
                    ...flatResult, 
                    inspectionStatus: 'analyzed' as const, 
                    analysisOutput: analysisOutputForUI,
                    rawAnalysisText: rawText, 
                    updatedAt: new Date() 
                };
                setInspection(finalRecord);
                await saveInspectionRecord(finalRecord);
                
            } catch(error) {
                 const message = error instanceof Error ? error.message : "An unknown error occurred during analysis.";
                 setAnalysisApiError(message);
                 const errorRecord = { ...pendingRecord, inspectionStatus: 'analysis-error' as const, analysisError: message, updatedAt: new Date() };
                 setInspection(errorRecord);
                 await saveInspectionRecord(errorRecord);
            } finally {
                setIsLoadingAnalysis(false);
                onSaveSuccess();
            }
        })();

        return true; // Indicate that the analysis process has started
    };
    
    return {
        inspection,
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
        closeCamera: () => setIsCameraOpen(false),
        closeUpload: () => setIsUploadOpen(false),
        isDsConfirmOpen,
        setIsDsConfirmOpen,
        closeDsConfirm: () => setIsDsConfirmOpen(false),
        startAnalysis,
        isLoadingAnalysis,
        analysisApiError,
        isScannerLoading,
        scannerError,
        autoSaveStatus,
    };
};