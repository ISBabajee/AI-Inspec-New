
import React from 'react';
import { NavLink } from 'react-router-dom';
import { APP_TITLE } from '../constants';
import { DashboardIcon, UsersIcon, ClientMgmtIcon, ClientReportsIcon, ActivityIcon } from './Icons';

interface NavItemProps {
  to: string;
  label: string;
  icon?: React.ReactNode;
}

const NavItem: React.FC<NavItemProps> = ({ to, label, icon }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex flex-col md:flex-row items-center w-full px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium rounded-md transition-colors duration-150 ease-in-out justify-center 
       ${isActive 
         ? 'bg-brand-light-blue text-white' 
         : 'text-slate-600 dark:text-gray-300 hover:bg-slate-200 hover:text-brand-dark dark:hover:bg-gray-700 dark:hover:text-white'
       }`
    }
  >
    {icon && <span className="h-6 w-6 shrink-0 mb-1 md:mb-0 md:mr-3">{icon}</span>}
    <span className="md:inline">{label}</span>
  </NavLink>
);

const AdminSidebar: React.FC = () => {
  return (
    <aside className="fixed bottom-0 left-0 right-0 h-20 md:h-auto md:relative md:w-64 bg-slate-100 dark:bg-gray-800 flex md:flex-col shadow-lg print-hidden transition-all duration-300 border-t md:border-t-0 md:border-r border-slate-200 dark:border-gray-700 z-50">
      <div className="p-4 border-b border-slate-200 dark:border-gray-700 hidden md:block">
        <h2 className="text-xl font-semibold text-center text-slate-800 dark:text-white">{APP_TITLE} Admin</h2>
      </div>
      <nav className="flex-1 p-2 flex flex-row md:flex-col justify-around md:justify-start md:space-y-2 w-full">
        <NavItem 
          to="dashboard" 
          label="Dashboard" 
          icon={<DashboardIcon />} 
        />
        <NavItem 
          to="users" 
          label="Users"
          icon={<UsersIcon />} 
        />
        <NavItem 
          to="client-management" 
          label="Client Mgmt."
          icon={<ClientMgmtIcon />}
        />
        <NavItem 
          to="clients" 
          label="Client Reports"
          icon={<ClientReportsIcon />}
        />
        <NavItem 
          to="activity" 
          label="Activity"
          icon={<ActivityIcon />}
        />
      </nav>
      <div className="p-2 mt-auto text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-gray-700 hidden md:block">
        Version 1.0.0
      </div>
    </aside>
  );
};

export default AdminSidebar;