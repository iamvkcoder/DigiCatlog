import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ToastProvider } from './context/ToastContext.js';
import { Role } from '@digicatlog/shared';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage.js';
import { ChangePasswordPage } from './pages/auth/ChangePasswordPage.js';

// Super Admin Pages
import { AdminLayout } from './pages/admin/AdminLayout.js';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.js';
import { ShopsDirectoryPage } from './pages/admin/ShopsDirectoryPage.js';
import { AuditLogsPage } from './pages/admin/AuditLogsPage.js';

// Shop Dashboard Pages
import { DashboardLayout } from './pages/dashboard/DashboardLayout.js';
import { ItemsPage } from './pages/dashboard/ItemsPage.js';
import { CategoriesPage } from './pages/dashboard/CategoriesPage.js';
import { TemplatesPage } from './pages/dashboard/TemplatesPage.js';
import { ProfileSettingsPage } from './pages/dashboard/ProfileSettingsPage.js';
import { QrPage } from './pages/dashboard/QrPage.js';
import { BulkCsvPage } from './pages/dashboard/BulkCsvPage.js';
import { AnalyticsPage } from './pages/dashboard/AnalyticsPage.js';

// CODE-SPLIT PUBLIC MENU: Keeps the customer menu bundle tiny and ultra-fast
const PublicMenuPage = React.lazy(() => import('./pages/public/PublicMenuPage.js'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
    },
  },
});

const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  if (user.role === Role.SUPER_ADMIN) {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Root redirect */}
              <Route path="/" element={<RootRedirect />} />

              {/* Authentication Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />

              {/* Super Admin Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="shops" element={<ShopsDirectoryPage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
              </Route>

              {/* Shop Owner Dashboard Routes */}
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<ItemsPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="templates" element={<TemplatesPage />} />
                <Route path="profile" element={<ProfileSettingsPage />} />
                <Route path="qr" element={<QrPage />} />
                <Route path="bulk" element={<BulkCsvPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
              </Route>

              {/* Code-Split Public Menu Route */}
              <Route
                path="/m/:slug"
                element={
                  <Suspense
                    fallback={
                      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
                      </div>
                    }
                  >
                    <PublicMenuPage />
                  </Suspense>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
