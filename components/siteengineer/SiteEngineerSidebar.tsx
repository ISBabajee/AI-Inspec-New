import React from 'react';
import { DashboardIcon, RecordsIcon, ClientReportsIcon, ClientMgmtIcon } from '../Icons';

type ActiveView = 'overview' | 'records' | 'reports' | 'customers';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
}

interface NavItemProps {
  viewName: ActiveView;
  label: string;
  icon: React.ReactNode;
  activeView: ActiveView;
  onClick: (view: ActiveView) => void;
  dataTourId?: string;
}

const NavItem: React.FC<NavItemProps> = ({ viewName, label, icon, activeView, onClick, dataTourId }) => (
  <button
    onClick={() => onClick(viewName)}
    data-tour-id={dataTourId}
    className={`group relative flex flex-col md:flex-row items-center justify-center md:justify-start w-full px-2 md:px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out
       ${activeView === viewName
         ? 'bg-[#2563EB] text-white'
         : 'text-slate-600 dark:text-gray-300 hover:bg-slate-200 hover:text-[#1D4ED8] dark:hover:bg-slate-700 dark:hover:text-white'
       }`}
    aria-current={activeView === viewName ? 'page' : undefined}
  >
    {icon && <span className="h-6 w-6 shrink-0">{icon}</span>}
    <span className="hidden md:inline-block md:ml-3">{label}</span>
     {/* Tooltip for mobile */}
     <div className="md:hidden absolute bottom-full mb-2 w-auto p-2 min-w-max rounded-md shadow-md text-white bg-gray-900 text-xs font-bold transition-all duration-150 scale-0 origin-bottom group-hover:scale-100">
        {label}
     </div>
  </button>
);

const SiteEngineerSidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {

  return (
    <aside className="fixed bottom-0 left-0 right-0 h-16 md:h-auto md:relative md:w-56 bg-slate-100 dark:bg-slate-900 text-white flex md:flex-col shadow-lg print-hidden transition-all duration-300 border-t md:border-t-0 md:border-r border-slate-200 dark:border-slate-800 z-50">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 hidden md:block">
        <h2 className="text-lg font-semibold text-center text-slate-800 dark:text-white">Engineer Menu</h2>
      </div>
      <nav className="flex-1 p-2 flex flex-row md:flex-col justify-around md:justify-start md:space-y-2 w-full">
        <NavItem
          viewName="overview"
          label="Overview"
          icon={<DashboardIcon />}
          activeView={activeView}
          onClick={setActiveView}
          dataTourId="overview-tab"
        />
        <NavItem
          viewName="records"
          label="Records"
          icon={<RecordsIcon />}
          activeView={activeView}
          onClick={setActiveView}
          dataTourId="records-tab"
        />
        <NavItem
          viewName="reports"
          label="Reports"
          icon={<ClientReportsIcon />}
          activeView={activeView}
          onClick={setActiveView}
          dataTourId="reports-tab"
        />
        <NavItem
          viewName="customers"
          label="Clients"
          icon={<ClientMgmtIcon />}
          activeView={activeView}
          onClick={setActiveView}
        />
      </nav>
      <div className="p-2 mt-auto text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 hidden md:block">
        Version 1.2.1
      </div>
    </aside>
  );
};

export default SiteEngineerSidebar;