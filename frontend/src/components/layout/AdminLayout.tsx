import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

export const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50/80 flex antialiased">
      {/* Full-height enterprise sidebar flush to left edge */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <AdminHeader />

        <main className="flex-1 p-5 sm:p-6 lg:p-8 w-full max-w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
