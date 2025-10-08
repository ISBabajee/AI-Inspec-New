import React, { useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import LoadingSpinner from '../components/LoadingSpinner';
import { SiteEngineerRecordsView } from '../components/siteengineer/SiteEngineerRecordsView';
import SiteEngineerNewInspectionView from '../components/siteengineer/SiteEngineerNewInspectionView';
import SiteEngineerReportsView from '../components/siteengineer/SiteEngineerReportsView';
import { User } from '../types';
import SiteEngineerCustomersView from '../components/siteengineer/SiteEngineerCustomersView';
import { useGuide, TourStep } from '../hooks/useGuide';
import { createNewInspection, saveInspectionRecord } from '../src/db';
import { BackIcon, ClientMgmtIcon, ClientReportsIcon, NewInspectionIcon, RecordsIcon } from '../components/Icons';

type ActiveView = 'menu' | 'new-inspection' | 'records' | 'reports' | 'customers';

const viewTitles: Record<ActiveView, string> = {
  menu: "Main Menu",
  "new-inspection": "New Inspection Workflow",
  records: "Inspection Records",
  reports: "Reporting Tools",
  customers: "Customer Directory",
};

const MenuButton: React.FC<{
    title: string;
    icon: React.ReactNode;
    onClick: () => void;
    color: string;
    dataTourId?: string;
}> = ({ title, icon, onClick, color, dataTourId }) => (
    <button 
        onClick={onClick}
        data-tour-id={dataTourId}
        className={`flex flex-col items-center justify-center p-4 sm:p-6 rounded-xl shadow-lg text-white font-semibold text-base sm:text-lg transition-transform transform hover:scale-105 ${color}`}
    >
        <div className="w-10 h-10 sm:w-12 sm:h-12 mb-3">{icon}</div>
        <span>{title}</span>
    </button>
);


const SiteEngineerDashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { loading, refreshData } = useData();
  const [activeView, setActiveView] = useState<ActiveView>('menu');
  const [targetInspectionId, setTargetInspectionId] = useState<string | null>(null);
  const [initialClientFilter, setInitialClientFilter] = useState<string>('all');
  const { startGuide } = useGuide();

  const navigateToRecord = useCallback((inspectionId: string) => {
    setTargetInspectionId(inspectionId);
    setInitialClientFilter('all');
    setActiveView('records');
  }, []);
  
  const handleStartNewInspection = useCallback((id: string) => {
    setTargetInspectionId(id);
    setActiveView('records');
  }, []);

  const tourSteps: TourStep[] = [
    // Tour steps can be updated later if needed
  ];

  const handleStartTour = () => {
      startGuide(tourSteps);
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
        <LoadingSpinner text="Authenticating..." />
      </div>
    );
  }
  
  const MainMenu: React.FC = () => (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Main Menu</h1>
        <p className="text-slate-600 dark:text-gray-400 text-sm mb-8">Welcome, {currentUser.name || currentUser.email}. Select an option to begin.</p>
        <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <MenuButton 
                title="New Inspection" 
                icon={<NewInspectionIcon className="w-full h-full" />} 
                onClick={() => setActiveView('new-inspection')}
                color="bg-blue-500 hover:bg-blue-600"
                dataTourId="new-inspection-btn"
            />
            <MenuButton 
                title="Inspection Records" 
                icon={<RecordsIcon className="w-full h-full" />} 
                onClick={() => setActiveView('records')}
                color="bg-teal-500 hover:bg-teal-600"
                dataTourId="records-btn"
            />
            <MenuButton 
                title="Client Reports" 
                icon={<ClientReportsIcon className="w-full h-full" />} 
                onClick={() => setActiveView('reports')}
                color="bg-green-500 hover:bg-green-600"
                dataTourId="reports-btn"
            />
            <MenuButton 
                title="Customers" 
                icon={<ClientMgmtIcon className="w-full h-full" />} 
                onClick={() => setActiveView('customers')}
                color="bg-purple-500 hover:bg-purple-600"
                dataTourId="customers-btn"
            />
        </div>
    </div>
  );

  const viewComponents: Record<Exclude<ActiveView, 'menu'>, React.ReactNode> = {
    "new-inspection": (
        <SiteEngineerNewInspectionView 
            onBack={() => setActiveView('menu')}
            setCurrentInspectionById={handleStartNewInspection}
        />
    ),
    records: (
      <SiteEngineerRecordsView 
        currentUser={currentUser} 
        initialTargetId={targetInspectionId}
        clearTargetId={() => setTargetInspectionId(null)}
        initialClientFilter={initialClientFilter}
      />
    ),
    reports: <SiteEngineerReportsView />,
    customers: <SiteEngineerCustomersView onSwitchView={(view, clientName) => {
        setInitialClientFilter(clientName || 'all');
        setActiveView(view)
    }} />,
  };
  
  const ActiveComponent = activeView !== 'menu' ? viewComponents[activeView] : null;

  return (
    <div className="h-[calc(100vh-104px)] sm:h-[calc(100vh-120px)] bg-slate-100 dark:bg-gray-950">
      {activeView === 'menu' ? (
          <MainMenu />
      ) : (
        <div className="flex flex-col h-full p-2 sm:p-4 md:p-6">
            <div className="flex items-center mb-4 shrink-0">
                <button 
                    onClick={() => setActiveView('menu')} 
                    className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-lg shadow hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                    <BackIcon className="w-4 h-4" />
                    Menu
                </button>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white ml-4">{viewTitles[activeView]}</h1>
            </div>
             <div className="bg-white dark:bg-slate-900 p-2 sm:p-4 rounded-lg shadow-lg flex-1 overflow-hidden">
              {loading ? (
                 <div className="flex items-center justify-center h-full">
                  <LoadingSpinner text={`Loading ${viewTitles[activeView]}...`} />
                </div>
              ) : ActiveComponent }
            </div>
        </div>
      )}
    </div>
  );
};

export default SiteEngineerDashboardPage;