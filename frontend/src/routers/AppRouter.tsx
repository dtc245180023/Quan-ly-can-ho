import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import { AdminLayout } from '../components/layout/AdminLayout';
import { TenantLayout } from '../components/layout/TenantLayout';
import { PrivateRoute } from './PrivateRoute';

// Pages
import { LoginPage } from '../pages/LoginPage';
import { PublicExplorePage } from '../pages/PublicExplorePage';
import { ApartmentDetailPage } from '../pages/ApartmentDetailPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { BuildingsPage } from '../pages/BuildingsPage';
import { ContractsPage } from '../pages/ContractsPage';
import { FinancePage } from '../pages/FinancePage';
import { MaintenancePage } from '../pages/MaintenancePage';
import { AlertsAIPage } from '../pages/AlertsAIPage';
import { RagChatbotPage } from '../pages/RagChatbotPage';
import { BookingsPage } from '../pages/BookingsPage';
import { TenantsPage } from '../pages/TenantsPage';
import { ResidentPortalPage } from '../pages/ResidentPortalPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { UnauthorizedPage } from '../pages/UnauthorizedPage';
import { useAuth } from '../hooks/useAuth';

const AdminIndexRedirect: React.FC = () => {
  return <Navigate to="/admin/dashboard" replace />;
};

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* 1. Root Route: Luôn là Trang Khách Vãng Lai (PublicExplorePage) */}
      <Route path="/" element={<PublicExplorePage />} />
      <Route path="/explore" element={<PublicExplorePage />} />
      <Route path="/apartments/:id" element={<ApartmentDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* 2. Resident Portal Routes (Tenant and simulation mode for Management) */}
      <Route
        path="/tenant-portal"
        element={
          <PrivateRoute allowedRoles={['TENANT', 'ADMIN', 'STAFF', 'ACCOUNTANT']}>
            <TenantLayout>
              <ResidentPortalPage />
            </TenantLayout>
          </PrivateRoute>
        }
      />
      {/* Alias for resident-portal link compatibility */}
      <Route path="/resident-portal" element={<Navigate to="/tenant-portal" replace />} />

      {/* 3. Admin / Staff / Accountant Enterprise Portal Routes */}
      <Route
        path="/admin"
        element={
          <PrivateRoute allowedRoles={['ADMIN', 'STAFF', 'ACCOUNTANT']}>
            <AdminLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<AdminIndexRedirect />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route
          path="buildings"
          element={
            <PrivateRoute allowedRoles={['ADMIN', 'STAFF', 'ACCOUNTANT']}>
              <BuildingsPage />
            </PrivateRoute>
          }
        />
        <Route path="contracts" element={<ContractsPage />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route
          path="bookings"
          element={
            <PrivateRoute allowedRoles={['ADMIN', 'STAFF', 'ACCOUNTANT']}>
              <BookingsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="finance"
          element={
            <PrivateRoute allowedRoles={['ADMIN', 'STAFF', 'ACCOUNTANT']}>
              <FinancePage />
            </PrivateRoute>
          }
        />
        <Route
          path="maintenance"
          element={
            <PrivateRoute allowedRoles={['ADMIN', 'STAFF', 'ACCOUNTANT']}>
              <MaintenancePage />
            </PrivateRoute>
          }
        />
        <Route path="alerts" element={<AlertsAIPage />} />
        <Route path="rag-chatbot" element={<RagChatbotPage />} />
      </Route>

      {/* 4. 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
