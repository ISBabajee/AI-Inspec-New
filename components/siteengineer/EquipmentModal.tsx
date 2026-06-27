import React, { useState, useEffect, useRef } from 'react';
import { Client, SiteLocation, Equipment } from '../../types';
import { addEquipment, updateEquipment } from '../../src/db';
import LoadingSpinner from '../LoadingSpinner';
import { useAccessibility } from '../../hooks/useAccessibility';

interface EquipmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    mode: 'addEquipment' | 'editEquipment';
    client: Client;
    location: SiteLocation;
    equipment?: Equipment | null;
}

const EquipmentModal: React.FC<EquipmentModalProps> = ({ isOpen, onClose, onSave, mode, client, location, equipment }) => {
    const [formData, setFormData] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    useAccessibility(modalRef, isOpen, onClose);

    useEffect(() => {
        if (isOpen) {
            if (mode === 'editEquipment' && equipment) {
                setFormData(equipment);
            } else {
                setFormData({ clientId: client.id, locationId: location.id, name: '', details: '' });
            }
        }
    }, [mode, client, location, equipment, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        try {
            const trimmedData = { ...formData };
            if (trimmedData.name) trimmedData.name = trimmedData.name.trim();
            if (trimmedData.details) trimmedData.details = trimmedData.details.trim();

            if (!trimmedData.name) {
                setError("Equipment name cannot be empty.");
                setIsSaving(false);
                return;
            }

            if (mode === 'addEquipment') {
                await addEquipment({ clientId: trimmedData.clientId, locationId: trimmedData.locationId, name: trimmedData.name, details: trimmedData.details });
            } else {
                await updateEquipment(trimmedData as Equipment);
            }
            onSave();
            onClose();
        } catch (err) {
            setError((err as Error).message || 'Failed to save equipment.');
        } finally {
            setIsSaving(false);
        }
    };
    if (!isOpen) return null;
    const title = mode === 'addEquipment' ? `Add Equipment to ${location.name}` : 'Edit Equipment';
    const modalTitleId = `modal-title-${mode}`;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
            <div ref={modalRef} className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby={modalTitleId}>
                <h3 id={modalTitleId} className="text-xl font-semibold text-slate-800 dark:text-white mb-4">{title}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <p className="text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-300 p-3 rounded-md text-sm" role="alert">{error}</p>}
                    <div><label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-gray-300">Equipment Name / ID</label><input type="text" id="name" name="name" value={formData.name || ''} onChange={handleChange} required className="mt-1 w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white" /></div>
                    <div><label htmlFor="details" className="block text-sm font-medium text-slate-700 dark:text-gray-300">Details (Model, S/N, etc.)</label><textarea id="details" name="details" value={formData.details || ''} onChange={handleChange} required rows={3} className="mt-1 w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white" /></div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-gray-700 text-slate-800 dark:text-gray-200 rounded-md hover:bg-slate-300 dark:hover:bg-gray-600">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:bg-sky-400 flex items-center">{isSaving ? <LoadingSpinner size="sm" /> : "Save"}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EquipmentModal;