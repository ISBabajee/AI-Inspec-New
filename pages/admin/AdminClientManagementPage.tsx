
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Client, SiteLocation, Equipment } from '../../types';
import { 
    addClient, 
    updateClient, 
    deleteClient, 
    addSiteLocation, 
    updateSiteLocation, 
    deleteSiteLocation,
    addEquipment,
    updateEquipment,
    deleteEquipment
} from '../../src/db';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAccessibility } from '../../hooks/useAccessibility';
import { useData } from '../../hooks/useData';

// MODALS
const ClientLocationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    mode: 'addClient' | 'editClient' | 'addLocation' | 'editLocation';
    client?: Client | null;
    location?: SiteLocation | null;
}> = ({ isOpen, onClose, onSave, mode, client, location }) => {
    const [formData, setFormData] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    
    useAccessibility(modalRef, isOpen, onClose);

    useEffect(() => {
        if (isOpen) {
            if (mode === 'editClient' && client) setFormData(client);
            else if (mode === 'addLocation' && client) setFormData({ clientId: client.id, name: '', address: '' });
            else if (mode === 'editLocation' && location) setFormData(location);
            else setFormData({ name: '', address: '', contactDetails: '' });
        }
    }, [mode, client, location, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        try {
            // Trim string inputs for data integrity
            const trimmedData = { ...formData };
            if (trimmedData.name) trimmedData.name = trimmedData.name.trim();
            if (trimmedData.address) trimmedData.address = trimmedData.address.trim();
            if (trimmedData.contactDetails) trimmedData.contactDetails = trimmedData.contactDetails.trim();
            
            if (!trimmedData.name) {
                setError("Name cannot be empty.");
                setIsSaving(false);
                return;
            }

            switch (mode) {
                case 'addClient':
                    await addClient({ name: trimmedData.name, address: trimmedData.address, contactDetails: trimmedData.contactDetails });
                    break;
                case 'editClient':
                    await updateClient(trimmedData as Client);
                    break;
                case 'addLocation':
                    await addSiteLocation({ clientId: trimmedData.clientId, name: trimmedData.name, address: trimmedData.address });
                    break;
                case 'editLocation':
                    await updateSiteLocation(trimmedData as SiteLocation);
                    break;
            }
            onSave();
            onClose();
        } catch (err) {
            console.error(`Error saving ${mode}:`, err);
            setError((err as Error).message || `Failed to save. Please check for duplicate names if applicable.`);
        } finally {
            setIsSaving(false);
        }
    };


    if (!isOpen) return null;
    const getTitle = () => {
        switch (mode) {
            case 'addClient': return 'Add New Client';
            case 'editClient': return 'Edit Client';
            case 'addLocation': return `Add Site Location for ${client?.name}`;
            case 'editLocation': return 'Edit Site Location';
        }
    };
    const modalTitleId = `modal-title-${mode}`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div ref={modalRef} className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby={modalTitleId}>
                <h3 id={modalTitleId} className="text-xl font-semibold text-slate-800 dark:text-white mb-4">{getTitle()}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <p className="text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-300 p-3 rounded-md text-sm" role="alert">{error}</p>}
                    {(mode === 'addClient' || mode === 'editClient') && <>
                        <div><label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-gray-300">Client Name</label><input type="text" id="name" name="name" value={formData.name || ''} onChange={handleChange} required className="mt-1 w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white" /></div>
                        <div><label htmlFor="address" className="block text-sm font-medium text-slate-700 dark:text-gray-300">Address</label><textarea id="address" name="address" value={formData.address || ''} onChange={handleChange} required className="mt-1 w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white" /></div>
                        <div><label htmlFor="contactDetails" className="block text-sm font-medium text-slate-700 dark:text-gray-300">Contact Details (Email/Phone)</label><input type="text" id="contactDetails" name="contactDetails" value={formData.contactDetails || ''} onChange={handleChange} required className="mt-1 w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white" /></div>
                    </>}
                     {(mode === 'addLocation' || mode === 'editLocation') && <>
                        <div><label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-gray-300">Site Location Name</label><input type="text" id="name" name="name" value={formData.name || ''} onChange={handleChange} required className="mt-1 w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white" /></div>
                        <div><label htmlFor="address" className="block text-sm font-medium text-slate-700 dark:text-gray-300">Site Address</label><textarea id="address" name="address" value={formData.address || ''} onChange={handleChange} required className="mt-1 w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white" /></div>
                    </>}
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-gray-700 text-slate-800 dark:text-gray-200 rounded-md hover:bg-slate-300 dark:hover:bg-gray-600">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:bg-sky-400 flex items-center">{isSaving ? <LoadingSpinner size="sm" /> : "Save"}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EquipmentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    mode: 'addEquipment' | 'editEquipment';
    client: Client;
    location: SiteLocation;
    equipment?: Equipment | null;
}> = ({ isOpen, onClose, onSave, mode, client, location, equipment }) => {
    const [formData, setFormData] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    useAccessibility(modalRef, isOpen, onClose);
    useEffect(() => {
        if (isOpen) {
            if (mode === 'editEquipment' && equipment) setFormData(equipment);
            else setFormData({ clientId: client.id, locationId: location.id, name: '', details: '' });
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
            // Trim string inputs for data integrity
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


// Main Page Component
const AdminClientManagementPage: React.FC = () => {
    const { 
        allClients, 
        allSiteLocations: locations, 
        allEquipment: equipment, 
        loading: isLoading, 
        error, 
        refreshData 
    } = useData();

    const clients = useMemo(() => 
        [...allClients].sort((a, b) => a.name.localeCompare(b.name)),
    [allClients]);

    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        mode: 'addClient' | 'editClient' | 'addLocation' | 'editLocation' | 'addEquipment' | 'editEquipment';
        client?: Client | null;
        location?: SiteLocation | null;
        equipment?: Equipment | null;
    }>({ isOpen: false, mode: 'addClient' });

    const handleOpenModal = (
        mode: 'addClient' | 'editClient' | 'addLocation' | 'editLocation' | 'addEquipment' | 'editEquipment',
        client?: Client | null,
        location?: SiteLocation | null,
        equipment?: Equipment | null,
    ) => {
        setModalState({ isOpen: true, mode, client, location, equipment });
    };

    const handleCloseModal = () => {
        setModalState({ ...modalState, isOpen: false });
    };

    const handleSave = () => {
        refreshData(); // Refetch all data on save
    };

    const handleDeleteClient = async (client: Client) => {
        if (window.confirm(`Are you sure you want to delete client "${client.name}" and ALL of its associated sites and equipment? This action cannot be undone.`)) {
            try { 
                await deleteClient(client.id); 
                refreshData(); 
            } catch (err) { 
                alert("Failed to delete client."); 
            }
        }
    };
    
    const handleDeleteLocation = async (location: SiteLocation) => {
        if (window.confirm(`Are you sure you want to delete site "${location.name}" and ALL its equipment?`)) {
            try { 
                await deleteSiteLocation(location.id); 
                refreshData(); 
            } catch (err) { 
                alert("Failed to delete location."); 
            }
        }
    };

    const handleDeleteEquipment = async (equipmentItem: Equipment) => {
        if (window.confirm(`Are you sure you want to delete equipment "${equipmentItem.name}"?`)) {
            try { 
                await deleteEquipment(equipmentItem.id); 
                refreshData(); 
            } catch (err) { 
                alert("Failed to delete equipment."); 
            }
        }
    };

    if (isLoading) return <LoadingSpinner text="Loading client data..." size="lg" />;
    if (error) return <p className="text-red-500 bg-red-100 p-4 rounded-md text-center">{error}</p>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Client, Site & Equipment Management</h1>
                <button onClick={() => handleOpenModal('addClient')} className="mt-3 sm:mt-0 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition-colors">
                    + Add New Client
                </button>
            </div>

            {clients.length === 0 ? (
                <div className="text-center py-8 bg-white dark:bg-gray-900 rounded-lg shadow-md"><p className="text-slate-500 dark:text-gray-400">No clients found.</p></div>
            ) : (
                <div className="space-y-6">
                    {clients.map(client => (
                        <div key={client.id} className="bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-lg shadow-xl">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-start border-b border-slate-200 dark:border-gray-700 pb-4 mb-4">
                                <div className="flex-1"><h2 className="text-xl font-bold text-sky-700 dark:text-sky-400">{client.name}</h2><p className="text-sm text-slate-600 dark:text-gray-400 mt-1">{client.address}</p><p className="text-xs text-slate-500 dark:text-gray-500 mt-1">Contact: {client.contactDetails}</p></div>
                                <div className="flex items-center space-x-2 mt-3 sm:mt-0 shrink-0"><button onClick={() => handleOpenModal('editClient', client)} className="text-xs px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md shadow">Edit</button><button onClick={() => handleDeleteClient(client)} className="text-xs px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md shadow">Delete</button></div>
                            </div>
                            {locations.filter(loc => loc.clientId === client.id).map(loc => (
                                <div key={loc.id} className="ml-0 sm:ml-4 mt-4 p-4 rounded-md bg-slate-50 dark:bg-gray-800/50 border border-slate-200 dark:border-gray-700">
                                    <div className="flex justify-between items-start "><h3 className="font-semibold text-slate-800 dark:text-white">{loc.name}</h3><div className="flex items-center space-x-2 shrink-0"><button onClick={() => handleOpenModal('editLocation', client, loc)} className="text-xs px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded shadow">Edit</button><button onClick={() => handleDeleteLocation(loc)} className="text-xs px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded shadow">Delete</button></div></div>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">{loc.address}</p>
                                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-gray-600"><h4 className="text-xs font-semibold text-slate-600 dark:text-gray-300 mb-2">EQUIPMENT</h4>
                                        {equipment.filter(eq => eq.locationId === loc.id).map(eq => (
                                            <div key={eq.id} className="flex justify-between items-center p-2 bg-white dark:bg-gray-700/50 rounded text-sm mb-1"><div><p className="font-medium text-slate-700 dark:text-gray-200">{eq.name}</p><p className="text-xs text-slate-500 dark:text-gray-400">{eq.details}</p></div><div className="flex items-center space-x-2 shrink-0"><button onClick={() => handleOpenModal('editEquipment', client, loc, eq)} className="text-xs px-2 py-0.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded shadow">Edit</button><button onClick={() => handleDeleteEquipment(eq)} className="text-xs px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded shadow">Del</button></div></div>
                                        ))}
                                        {equipment.filter(eq => eq.locationId === loc.id).length === 0 && <p className="text-xs text-center text-slate-500 dark:text-gray-400 py-1">No equipment for this site.</p>}
                                        <button onClick={() => handleOpenModal('addEquipment', client, loc)} className="mt-2 text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 font-semibold">+ Add Equipment</button>
                                    </div>
                                </div>
                            ))}
                            {locations.filter(loc => loc.clientId === client.id).length === 0 && <p className="text-sm text-center text-slate-500 dark:text-gray-400 py-2">No site locations for this client.</p>}
                            <button onClick={() => handleOpenModal('addLocation', client)} className="mt-4 text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 font-semibold">+ Add Site Location</button>
                        </div>
                    ))}
                </div>
            )}
            {modalState.isOpen && modalState.client && (modalState.mode === 'addEquipment' || modalState.mode === 'editEquipment') && modalState.location && (
                 <EquipmentModal isOpen={modalState.isOpen} onClose={handleCloseModal} onSave={handleSave} mode={modalState.mode} client={modalState.client} location={modalState.location} equipment={modalState.equipment} />
            )}
            {modalState.isOpen && (modalState.mode === 'addClient' || modalState.mode === 'editClient' || modalState.mode === 'addLocation' || modalState.mode === 'editLocation') && (
                <ClientLocationModal isOpen={modalState.isOpen} onClose={handleCloseModal} onSave={handleSave} mode={modalState.mode} client={modalState.client} location={modalState.location} />
            )}
        </div>
    );
};

export default AdminClientManagementPage;