import React, { useState, useEffect, useRef } from 'react';
import { Client, SiteLocation, Equipment } from '../../types';
import { addSiteLocation, addEquipment } from '../../src/db';
import LoadingSpinner from '../LoadingSpinner';
import { useAccessibility } from '../../hooks/useAccessibility';

interface AddDataModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void; // Simplified to just trigger a refresh
    mode: 'location' | 'equipment';
    client: Client;
    location?: SiteLocation; // Only needed for 'equipment' mode
}

const AddDataModal: React.FC<AddDataModalProps> = ({ isOpen, onClose, onSave, mode, client, location }) => {
    const [name, setName] = useState('');
    const [details, setDetails] = useState(''); // For address or equipment details
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    useAccessibility(modalRef, isOpen, onClose);

    useEffect(() => {
        if (isOpen) {
            setName('');
            setDetails('');
            setError(null);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Name cannot be empty.');
            return;
        }
        setIsSaving(true);
        setError(null);
        try {
            if (mode === 'location') {
                await addSiteLocation({ clientId: client.id, name: name.trim(), address: details.trim() });
            } else if (mode === 'equipment' && location) {
                // FIX: Removed createdAt and updatedAt properties from the object passed to addEquipment.
                // The addEquipment function is responsible for setting these properties.
                await addEquipment({ clientId: client.id, locationId: location.id, name: name.trim(), details: details.trim() });
            }
            onSave();
            onClose();
        } catch (err) {
            setError((err as Error).message || 'Failed to save item. A duplicate name may exist.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const title = mode === 'location' ? `Add New Location to ${client.name}` : `Add New Equipment to ${location?.name}`;
    const nameLabel = mode === 'location' ? 'Location Name' : 'Equipment Name / ID';
    const detailsLabel = mode === 'location' ? 'Location Address' : 'Equipment Details (Model, S/N)';
    const modalTitleId = `add-data-modal-${mode}`;

    return (
         <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[80] p-4">
            <div ref={modalRef} className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby={modalTitleId}>
                <h3 id={modalTitleId} className="text-xl font-semibold text-slate-800 dark:text-white mb-4">{title}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <p className="text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-300 p-3 rounded-md text-sm" role="alert">{error}</p>}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-gray-300">{nameLabel}</label>
                        <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white" autoFocus />
                    </div>
                    <div>
                        <label htmlFor="details" className="block text-sm font-medium text-slate-700 dark:text-gray-300">{detailsLabel}</label>
                        <textarea id="details" value={details} onChange={e => setDetails(e.target.value)} required rows={3} className="mt-1 w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white" />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-gray-700 text-slate-800 dark:text-gray-200 rounded-md hover:bg-slate-300 dark:hover:bg-gray-600">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:bg-sky-400 flex items-center">{isSaving ? <LoadingSpinner size="sm" /> : "Save"}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddDataModal;
