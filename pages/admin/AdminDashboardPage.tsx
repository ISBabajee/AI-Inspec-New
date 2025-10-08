
import React, { useMemo }from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../../hooks/useAdmin';
import { useData } from '../../hooks/useData';
import { UserRole } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import { UsersIcon, ClientMgmtIcon, ClientReportsIcon, ActivityIcon } from '../../components/Icons';


interface DashboardCardProps {
  title: string;
  icon?: React.ReactNode;
  borderColorClass?: string;
  titleColorClass?: string;
  buttonLink?: string;
  buttonText?: string;
  buttonColorClass?: string;
  children: React.ReactNode;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  icon,
  borderColorClass = 'border-slate-200 dark:border-gray-700',
  titleColorClass = 'text-slate-700 dark:text-gray-200',
  buttonLink,
  buttonText,
  buttonColorClass = 'bg-brand-light-blue hover:bg-sky-500',
  children
}) => (
  <div className={`bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl border ${borderColorClass}`}>
    <div className="flex items-start mb-3">
        {icon && <div className="mr-3 mt-1">{icon}</div>}
        <h2 className={`text-xl font-semibold ${titleColorClass}`}>{title}</h2>
    </div>
    <div className="text-slate-600 dark:text-gray-300 text-sm space-y-1 mb-4">
        {children}
    </div>
    {buttonLink && buttonText && (
      <Link 
        to={buttonLink} 
        className={`mt-4 inline-block ${buttonColorClass} text-white font-semibold py-2 px-4 rounded-md text-sm transition-colors shadow hover:shadow-lg`}
      >
        {buttonText}
      </Link>
    )}
  </div>
);


const AdminDashboardPage: React.FC = () => {
  const { allUsers, allLoginRecords, loading: loadingAdminData } = useAdmin();
  const { allInspections, loading: loadingInspections } = useData();

  const loadingData = loadingAdminData || loadingInspections;

  const siteEngineers = useMemo(() => allUsers.filter(user => user.role === UserRole.SITE_ENGINEER), [allUsers]);
  const pendingApprovals = useMemo(() => siteEngineers.filter(user => user.status === 'pending').length, [siteEngineers]);
  
  const recentLogins = useMemo(() => allLoginRecords
    .sort((a,b) => b.loginTimestamp.getTime() - a.loginTimestamp.getTime())
    .slice(0, 5), [allLoginRecords]);

  const inspectionStats = useMemo(() => {
    if (!allInspections) return { total: 0, pending: 0, errors: 0 };
    return {
        total: allInspections.length,
        pending: allInspections.filter(insp => insp.status === 'pending-analysis').length,
        errors: allInspections.filter(insp => insp.status === 'analysis-error').length,
    }
  }, [allInspections]);

  const InspectionActivityIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#DC2626] dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-slate-800 dark:text-white tracking-tight">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6"> {/* Changed to 2 columns for wider cards */}
        <DashboardCard 
            title="User Management" 
            icon={<UsersIcon />} 
            borderColorClass="border-sky-300 dark:border-sky-700" 
            titleColorClass="text-brand-light-blue"
            buttonLink="/admin/users"
            buttonText="Manage Users"
            buttonColorClass="bg-brand-light-blue hover:bg-sky-500"
        >
          {loadingData ? <LoadingSpinner size="sm"/> : <>
            <p>Total Site Engineers: <strong>{siteEngineers.length}</strong></p>
            {pendingApprovals > 0 ? (
                <p className="text-amber-600 dark:text-amber-400">Pending Approvals: <strong>{pendingApprovals}</strong></p>
            ) : (
                <p className="text-green-600 dark:text-green-400">No pending user approvals.</p>
            )}
          </>}
        </DashboardCard>

        <DashboardCard 
            title="Inspection Activity" 
            icon={<InspectionActivityIcon />} 
            borderColorClass="border-red-300 dark:border-rose-700" 
            titleColorClass="text-[#B91C1C] dark:text-rose-400"
        >
          {loadingData ? <LoadingSpinner text="Loading stats..." size="sm" /> : (
            <>
              <p>Total Inspections: <strong>{inspectionStats.total}</strong></p>
              <p className={inspectionStats.pending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-gray-300'}>
                Pending Analysis: <strong>{inspectionStats.pending}</strong>
              </p>
              <p className={inspectionStats.errors > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-gray-300'}>
                Analysis Errors: <strong>{inspectionStats.errors}</strong>
              </p>
            </>
          )}
        </DashboardCard>
        
        <DashboardCard 
            title="Client Data Overview" 
            icon={<ClientMgmtIcon />} 
            borderColorClass="border-green-300 dark:border-green-700" 
            titleColorClass="text-[#047857] dark:text-green-400"
            buttonLink="/admin/client-management"
            buttonText="Manage Clients"
            buttonColorClass="bg-[#10B981] hover:bg-[#059669]"
        >
          <p>Create, edit, and manage clients and their site locations.</p>
        </DashboardCard>

        <DashboardCard 
            title="Login Activity" 
            icon={<ActivityIcon />} 
            borderColorClass="border-amber-300 dark:border-amber-700" 
            titleColorClass="text-[#B45309] dark:text-amber-400"
            buttonLink="/admin/activity"
            buttonText="View Login Logs"
            buttonColorClass="bg-[#F59E0B] hover:bg-[#D97706]"
        >
         {loadingData ? <LoadingSpinner size="sm" /> : <>
          <p>Total recorded login events: <strong>{allLoginRecords.length}</strong></p>
          <p>Track user session activity across the platform.</p>
         </>}
        </DashboardCard>
      </div>

      {recentLogins.length > 0 && !loadingData && (
        <div className="mt-10 bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl">
          <h2 className="text-xl font-semibold text-slate-700 dark:text-gray-200 mb-4">Recent Login Activity (Last 5)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-700 text-sm">
              <thead className="bg-slate-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">User Email</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Login Time</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-slate-200 dark:divide-gray-700">
                {recentLogins.map(record => (
                  <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 whitespace-nowrap">{record.userEmail}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{record.role}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{record.loginTimestamp.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;