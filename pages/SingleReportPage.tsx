
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getInspectionRecord } from '../src/db';
import { InspectionRecord } from '../types';
import ReportLocationSection from '../components/ReportLocationSection';
import LoadingSpinner from '../components/LoadingSpinner';

import EntechReportTemplate from '../components/EntechReportTemplate';

const SingleReportPage: React.FC = () => {
    const { inspectionId } = useParams<{ inspectionId: string }>();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [inspection, setInspection] = useState<InspectionRecord | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [template, setTemplate] = useState<'standard' | 'entech'>('standard');

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
                setError("Failed to load the inspection record.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRecord();
    }, [inspectionId]);

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><LoadingSpinner text="Loading Report..." size="lg" /></div>;
    }

    if (error) {
        return <div className="text-center p-8 text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-300 rounded-md shadow-md">{error}</div>;
    }

    if (!inspection) {
        return <div className="text-center p-8">Inspection not found.</div>;
    }

    return (
        <>
            <style>{`
                @media print {
                    .print-hidden {
                        display: none !important;
                    }
                    @page {
                        size: A4;
                        margin: 15mm;
                    }
                    body {
                        background-color: #fff;
                    }
                    .report-container {
                        box-shadow: none;
                        border: none;
                        padding: 0;
                        margin: 0;
                        width: 100%;
                        max-width: 100%;
                    }
                }
            `}</style>
            <div className="print-hidden bg-white dark:bg-slate-800 p-4 shadow-md sticky top-[64px] z-30 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center space-x-4">
                    <span>Print Preview</span>
                    <select
                        value={template}
                        onChange={(e) => setTemplate(e.target.value as 'standard' | 'entech')}
                        className="ml-4 p-2 text-sm border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    >
                        <option value="standard">Standard Template</option>
                        <option value="entech">Entech Template</option>
                    </select>
                </h2>
                <div className="flex items-center space-x-3">
                    <button onClick={() => navigate(-1)} className="px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white font-semibold rounded-md shadow transition-colors text-sm">
                        Back to Editor
                    </button>
                    <button onClick={handlePrint} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md shadow transition-colors text-sm">
                        Print / Save as PDF
                    </button>
                </div>
            </div>
            <div className={`container mx-auto max-w-4xl ${template === 'entech' ? 'print:p-0 p-0 sm:p-2' : 'p-4 sm:p-8'} bg-white report-container`}>
                {template === 'entech' ? (
                    <EntechReportTemplate inspection={inspection} />
                ) : (
                    <ReportLocationSection 
                        inspection={inspection}
                        currentUserEmail={currentUser?.email || 'N/A'}
                        sectionNumber={1}
                    />
                )}
            </div>
        </>
    );
};

export default SingleReportPage;
