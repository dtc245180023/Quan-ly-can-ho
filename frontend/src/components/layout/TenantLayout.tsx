import React from 'react';
import { Outlet } from 'react-router-dom';
import { TenantSidebar } from './TenantSidebar';
import { TenantHeader } from './TenantHeader';

interface TenantLayoutProps {
  children?: React.ReactNode;
}

export const TenantLayout: React.FC<TenantLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#f0f4f8] flex">
      {/* Resident Sidebar - Matching Admin Sidebar layout */}
      <TenantSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TenantHeader />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-[1720px] mx-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};
