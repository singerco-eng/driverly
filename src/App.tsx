import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ProtectedRoute } from '@/components/layouts/ProtectedRoute';
import { Toaster } from '@/components/ui/toaster';
import Login from '@/pages/auth/Login';
import AcceptInvitation from '@/pages/auth/AcceptInvitation';
import SuperAdminLayout from '@/components/layouts/SuperAdminLayout';
import AdminLayout from '@/components/layouts/AdminLayout';
import DriverLayout from '@/components/layouts/DriverLayout';
import Companies from '@/pages/super-admin/Companies';
import CompanyDetail from '@/pages/super-admin/CompanyDetail';
import Settings from '@/pages/super-admin/Settings';
import AdminDashboard from '@/pages/admin/Dashboard';
import DriversPage from '@/pages/admin/Drivers';
import DriverDetailPage from '@/pages/admin/DriverDetail';
import VehiclesPage from '@/pages/admin/Vehicles';
import VehicleDetailPage from '@/pages/admin/VehicleDetail';
import AdminSettings from '@/pages/admin/Settings';
import ApplicationsPage from '@/pages/admin/Applications';
import ApplicationReviewPage from '@/pages/admin/ApplicationReview';
import CredentialTypes from '@/pages/admin/CredentialTypes';
import Brokers from '@/pages/admin/Brokers';
import BrokerDetail from '@/pages/admin/BrokerDetail';
import ApplicationPage from '@/pages/apply/[companySlug]';
import ApplicationStatus from '@/pages/driver/ApplicationStatus';
import DriverDashboard from '@/pages/driver/Dashboard';
import DriverAvailability from '@/pages/driver/Availability';
import PaymentSettings from '@/pages/driver/PaymentSettings';
import DriverComingSoon from '@/pages/driver/ComingSoon';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/accept-invitation" element={<AcceptInvitation />} />
              <Route path="/apply/:companySlug" element={<ApplicationPage />} />

              {/* Super Admin routes */}
              <Route
                path="/super-admin"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <SuperAdminLayout>
                      <Navigate to="/super-admin/companies" replace />
                    </SuperAdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/super-admin/companies"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <SuperAdminLayout>
                      <Companies />
                    </SuperAdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/super-admin/companies/:id"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <SuperAdminLayout>
                      <CompanyDetail />
                    </SuperAdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/super-admin/settings"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <SuperAdminLayout>
                      <Settings />
                    </SuperAdminLayout>
                  </ProtectedRoute>
                }
              />

              {/* Admin routes (admin + coordinator) */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'coordinator']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="drivers" element={<DriversPage />} />
                <Route path="drivers/:id" element={<DriverDetailPage />} />
                <Route path="vehicles" element={<VehiclesPage />} />
                <Route path="vehicles/:id" element={<VehicleDetailPage />} />
                <Route path="applications" element={<ApplicationsPage />} />
                <Route path="applications/:id" element={<ApplicationReviewPage />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="settings/credentials" element={<CredentialTypes />} />
                <Route path="brokers" element={<Brokers />} />
                <Route path="brokers/:id" element={<BrokerDetail />} />
              </Route>

              {/* Driver routes */}
              <Route
                path="/driver"
                element={
                  <ProtectedRoute allowedRoles={['driver']}>
                    <DriverLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DriverDashboard />} />
                <Route path="application-status" element={<ApplicationStatus />} />
                <Route
                  path="profile"
                  element={
                    <DriverComingSoon
                      title="Profile"
                      description="Update your personal information and driver profile."
                    />
                  }
                />
                <Route
                  path="vehicles"
                  element={
                    <DriverComingSoon
                      title="Vehicles"
                      description="Manage your vehicle details and documentation."
                    />
                  }
                />
                <Route
                  path="credentials"
                  element={
                    <DriverComingSoon
                      title="Credentials"
                      description="Upload and manage required credentials."
                    />
                  }
                />
                <Route
                  path="brokers"
                  element={
                    <DriverComingSoon
                      title="Brokers"
                      description="Request broker assignments to expand trip options."
                    />
                  }
                />
                <Route path="availability" element={<DriverAvailability />} />
                <Route path="settings" element={<Navigate to="settings/payment" replace />} />
                <Route path="settings/payment" element={<PaymentSettings />} />
              </Route>

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
