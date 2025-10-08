
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInspectionRecord, saveInspectionRecord } from '../../src/db';
import { InspectionRecord } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';

const AdminEditInspectionPage: React.FC = () => {
    const { inspectionId } = useParams<{ inspectionId: string }>();
    const navigate = useNavigate();
    const [inspection, setInspection] = useState<InspectionRecord | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!inspectionId) {
            setError("No inspection ID provided.");
            setIsLoading(false);
            return;
        }
        const fetchRecord = async () => {
            setIsLoading(true);
            try {
                const record = await getInspectionRecord(inspectionId);
                if (record) {
                    setInspection(record);
                } else {
                    setError("Inspection record not found.");
                }
            } catch (err) {
                setError("Failed to load inspection record.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRecord();
    }, [inspectionId]);

    const handleFieldChange = (field: keyof InspectionRecord, value: any) => {
        if (inspection) {
            setInspection({ ...inspection, [field]: value });
        }
    };

    const handleSaveChanges = async () => {
        if (!inspection) return;
        setIsSaving(true);
        setError(null);
        try {
            await saveInspectionRecord({ ...inspection, updatedAt: new Date() });
            alert("Changes saved successfully!");
            navigate('/admin/clients');
        } catch (err) {
            setError("Failed to save changes.");
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <LoadingSpinner text="Loading inspection for editing..." size="lg" />;
    }

    if (error) {
        return <p className="text-red-600 bg-red-100 p-4 rounded-md">{error}</p>;
    }

    if (!inspection) {
        return <p>Inspection not found.</p>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Edit Inspection Report</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Editing record for Client: <span className="font-semibold text-brand-dark dark:text-brand-light-blue">{inspection.clientName}</span> at Location: <span className="font-semibold text-brand-dark dark:text-brand-light-blue">{inspection.location}</span>
            </p>

            <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-300 dark:border-slate-600 pb-2 mb-4">Report Details</h2>
                
                {/* Editable Fields */}
                <div>
                    <label htmlFor="machineDetails" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Machine/Equipment Details</label>
                    <input
                        id="machineDetails"
                        type="text"
                        value={inspection.machineDetails || ''}
                        onChange={(e) => handleFieldChange('machineDetails', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md shadow-sm sm:text-sm focus:ring-brand-light-blue focus:border-brand-light-blue"
                    />
                </div>
                 <div>
                    <label htmlFor="technicianNotes" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Site Engineer Notes</label>
                    <textarea
                        id="technicianNotes"
                        rows={4}
                        value={inspection.technicianNotes || ''}
                        onChange={(e) => handleFieldChange('technicianNotes', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md shadow-sm sm:text-sm focus:ring-brand-light-blue focus:border-brand-light-blue"
                    />
                </div>
                <div>
                    <label htmlFor="adminNotes" className="block text-sm font-medium text-brand-dark dark:text-purple-400">Admin / Expert Comments</label>
                    <textarea
                        id="adminNotes"
                        rows={5}
                        value={inspection.adminNotes || ''}
                        onChange={(e) => handleFieldChange('adminNotes', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-blue-300 dark:border-purple-700 bg-blue-50 dark:bg-purple-900/20 text-slate-900 dark:text-slate-100 rounded-md shadow-sm sm:text-sm focus:ring-brand-light-blue focus:border-brand-light-blue"
                        placeholder="Add your expert review, additional findings, or final recommendations here."
                    />
                </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
                <button
                    onClick={() => navigate(-1)}
                    className="px-6 py-2 bg-slate-500 hover:bg-slate-600 text-white font-semibold rounded-md shadow-md transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="px-6 py-2 bg-[#10B981] hover:bg-[#059669] text-white font-semibold rounded-md shadow-md transition-colors disabled:bg-green-400 flex items-center"
                >
                    {isSaving ? <LoadingSpinner size="sm" text="Saving..." /> : 'Save Changes'}
                </button>
            </div>
        </div>
    );
};

export default AdminEditInspectionPage;
