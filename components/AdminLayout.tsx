

import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

const AdminLayout: React.FC = () => {
  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-120px)]"> {/* Adjust min-height based on header/footer */}
      <AdminSidebar />
      <div className="flex-1 p-4 md:p-8 bg-slate-50 dark:bg-slate-900 overflow-y-auto pb-24 md:pb-8">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;