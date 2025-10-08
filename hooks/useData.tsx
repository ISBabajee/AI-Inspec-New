

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { InspectionRecord, Client, SiteLocation, Equipment } from '../types';
import { getAllInspections, getAllClients, getAllSiteLocations, getAllEquipment } from '../src/db';

interface DataContextType {
  allInspections: InspectionRecord[];
  allClients: Client[];
  allSiteLocations: SiteLocation[];
  allEquipment: Equipment[];
  loading: boolean;
  error: string | null;
  refreshData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [allInspections, setAllInspections] = useState<InspectionRecord[]>([]);
    const [allClients, setAllClients] = useState<Client[]>([]);
    const [allSiteLocations, setAllSiteLocations] = useState<SiteLocation[]>([]);
    const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { initialAuthCompleted, currentUser } = useAuth();

    const fetchData = useCallback(async () => {
        if (!initialAuthCompleted) return; // Wait for auth to be ready
        
        setLoading(true);
        setError(null);
        try {
            const [inspections, clients, locations, equipment] = await Promise.all([
                getAllInspections(),
                getAllClients(),
                getAllSiteLocations(),
                getAllEquipment(),
            ]);
            setAllInspections(inspections);
            setAllClients(clients);
            setAllSiteLocations(locations);
            setAllEquipment(equipment);

        } catch (err) {
            console.error("Error fetching global data:", err);
            setError("Failed to load application data.");
        } finally {
            setLoading(false);
        }
    }, [initialAuthCompleted]);

    useEffect(() => {
        fetchData();
    }, [fetchData, currentUser]);
    
    const value = {
        allInspections,
        allClients,
        allSiteLocations,
        allEquipment,
        loading,
        error,
        refreshData: fetchData,
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    
    const { currentUser } = useAuth();

    const userInspections = useMemo(() => {
        if (!currentUser || !context.allInspections) return [];
        return context.allInspections
            .filter(i => i.userId === currentUser.id)
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }, [currentUser, context.allInspections]);

    const uniqueClientNames = useMemo(() => {
        // Derive client names from all inspections and the formal client list to be comprehensive.
        if (!context.allInspections && !context.allClients) return [];
        
        const namesFromInspections = new Set(context.allInspections.map(i => i.clientName).filter(Boolean));
        const namesFromClients = new Set(context.allClients.map(c => c.name));
        
        const combinedNames = new Set([...namesFromInspections, ...namesFromClients]);
        
        // FIX: Explicitly type sort parameters `a` and `b` as strings to resolve TypeScript inference issue.
        return Array.from(combinedNames).sort((a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase()));
    }, [context.allInspections, context.allClients]);
    
    return { ...context, userInspections, uniqueClientNames };
};
