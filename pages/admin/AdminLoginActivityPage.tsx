import React, { useState } from 'react';
import { useAdmin } from '../../hooks/useAdmin';
import { LoginRecord } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';

const AdminLoginActivityPage: React.FC = () => {
  const { allLoginRecords, loading } = useAdmin();
  const [sortConfig, setSortConfig] = useState<{ key: keyof LoginRecord, direction: 'ascending' | 'descending' } | null>({ key: 'loginTimestamp', direction: 'descending'});

  const sortedRecords = React.useMemo(() => {
    let sortableItems = [...allLoginRecords];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';

        if (valA < valB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [allLoginRecords, sortConfig]);

  const requestSort = (key: keyof LoginRecord) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key: keyof LoginRecord) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };

  const getAriaSort = (key: keyof LoginRecord): 'ascending' | 'descending' | 'none' => {
    if (!sortConfig || sortConfig.key !== key) return 'none';
    return sortConfig.direction;
  };


  if (loading) {
    return <LoadingSpinner text="Loading login activity..." />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-white">User Login Activity</h1>
      
      {allLoginRecords.length === 0 ? (
         <p className="text-slate-500 dark:text-gray-400 text-center py-4">No login activity recorded yet.</p>
      ) : (
      <div className="bg-white dark:bg-gray-900 p-2 md:p-6 rounded-lg shadow-xl overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-700">
          <thead className="bg-slate-100 dark:bg-gray-800">
            <tr>
              <th 
                onClick={() => requestSort('userEmail')} 
                className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                aria-sort={getAriaSort('userEmail')}
              >
                User Email {getSortIndicator('userEmail')}
              </th>
              <th 
                onClick={() => requestSort('role')} 
                className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                 aria-sort={getAriaSort('role')}
              >
                Role {getSortIndicator('role')}
              </th>
              <th 
                onClick={() => requestSort('loginTimestamp')} 
                className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                 aria-sort={getAriaSort('loginTimestamp')}
              >
                Login Time {getSortIndicator('loginTimestamp')}
              </th>
              <th 
                onClick={() => requestSort('logoutTimestamp')} 
                className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                 aria-sort={getAriaSort('logoutTimestamp')}
              >
                Logout Time {getSortIndicator('logoutTimestamp')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-slate-200 dark:divide-gray-700">
            {sortedRecords.map(record => (
              <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 dark:text-gray-300">{record.userEmail}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 dark:text-gray-300">{record.role}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 dark:text-gray-300">{new Date(record.loginTimestamp).toLocaleString()}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 dark:text-gray-300">
                  {record.logoutTimestamp ? new Date(record.logoutTimestamp).toLocaleString() : 'N/A (Session Active or Abruptly Closed)'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
};

export default AdminLoginActivityPage;