import React, { useState, useEffect } from 'react';
import { NameplateData } from '../../types';
import LoadingSpinner from '../LoadingSpinner';

interface EditableDataTableProps {
    title: string;
    data: NameplateData[] | null | undefined;
    onDataChange: (newData: NameplateData[]) => void;
    imagePresent: boolean;
    placeholderRows: Omit<NameplateData, 'id'>[];
    isLoading: boolean;
    error: string | null;
}

const EditableDataTable: React.FC<EditableDataTableProps> = ({ title, data, onDataChange, imagePresent, placeholderRows, isLoading, error }) => {
    const [localData, setLocalData] = useState<NameplateData[]>([]);

    useEffect(() => {
        if (!imagePresent && (!data || data.length === 0)) {
            // If there's no image and no existing data, populate with placeholders
            setLocalData(placeholderRows.map(p => ({ ...p, id: crypto.randomUUID() })));
        } else {
            // Otherwise, use the data from the inspection record (which could be from an AI scan or previously saved manual entry)
            setLocalData(data || []);
        }
    }, [data, imagePresent, placeholderRows]);

    const handleRowChange = (index: number, field: 'parameter' | 'value', value: string) => {
        const newData = [...localData];
        newData[index] = { ...newData[index], [field]: value };
        setLocalData(newData);
        onDataChange(newData);
    };

    const addRow = () => {
        const newData = [...localData, { id: crypto.randomUUID(), parameter: '', value: '' }];
        setLocalData(newData);
        onDataChange(newData);
    };

    const deleteRow = (id: string) => {
        const newData = localData.filter(row => row.id !== id);
        setLocalData(newData);
        onDataChange(newData);
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 sm:p-4 rounded-lg shadow-sm">
            <h3 className="text-base sm:text-lg font-semibold text-slate-700 dark:text-gray-200 mb-3">{title}</h3>
            
            {!imagePresent && (
                <p className="text-xs text-slate-500 dark:text-gray-400 mb-3 p-2 bg-slate-100 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700">
                    Capture or upload an image to auto-fill this section with AI, or add data manually below.
                </p>
            )}

            {isLoading && <LoadingSpinner text="Scanning..." size="sm" />}
            {error && <p className="text-red-500 bg-red-100 dark:text-red-300 dark:bg-red-900/50 p-2 rounded-md text-xs" role="alert">{error}</p>}
            
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead >
                        <tr className="border-b border-slate-300 dark:border-gray-600">
                            <th className="px-2 py-2 text-left font-medium text-slate-600 dark:text-gray-300 w-5/12">Parameter</th>
                            <th className="px-2 py-2 text-left font-medium text-slate-600 dark:text-gray-300 w-5/12">Value</th>
                            <th className="px-2 py-2 text-left font-medium text-slate-600 dark:text-gray-300 w-2/12">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {localData.map((item, index) => (
                            <tr key={item.id} className="border-b border-slate-200 dark:border-gray-700">
                                <td className="p-1">
                                    <input
                                        type="text"
                                        value={item.parameter}
                                        onChange={(e) => handleRowChange(index, 'parameter', e.target.value)}
                                        className="w-full p-1.5 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white text-sm"
                                    />
                                </td>
                                <td className="p-1">
                                    <input
                                        type="text"
                                        value={item.value}
                                        onChange={(e) => handleRowChange(index, 'value', e.target.value)}
                                        className="w-full p-1.5 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white text-sm"
                                    />
                                </td>
                                <td className="p-1">
                                    <button
                                        onClick={() => deleteRow(item.id)}
                                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400 font-semibold p-1.5"
                                        aria-label={`Delete row for ${item.parameter}`}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <button
                onClick={addRow}
                className="mt-3 text-sm font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700"
            >
                + Add Row
            </button>
        </div>
    );
};

export default EditableDataTable;
