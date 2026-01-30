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
import FeatureFlags from '@/pages/super-admin/FeatureFlags';
import SuperAdminBilling from '@/pages/super-admin/Billing';
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
import CredentialTypeEditor from '@/pages/admin/CredentialTypeEditor';
import CredentialReview from '@/pages/admin/CredentialReview';
import DriverCredentialDetail from '@/pages/admin/DriverCredentialDetail';
import VehicleCredentialDetail from '@/pages/admin/VehicleCredentialDetail';
import Brokers from '@/pages/admin/Brokers';
import BrokerDetail from '@/pages/admin/BrokerDetail';
import Billing from '@/pages/admin/Billing';
import ApplicationPage from '@/pages/apply/[companySlug]';
import ApplicationStatus from '@/pages/driver/ApplicationStatus';
import DriverDashboard from '@/pages/driver/Dashboard';
import DriverAvailability from '@/pages/driver/Availability';
import PaymentSettings from '@/pages/driver/PaymentSettings';
import DriverComingSoon from '@/pages/driver/ComingSoon';
import DriverProfile from '@/pages/driver/Profile';
import AccountSettings from '@/pages/driver/AccountSettings';
import DriverCredentials from '@/pages/driver/Credentials';
import CredentialDetailPage from '@/pages/driver/CredentialDetail';
import DriverVehicles from '@/pages/driver/Vehicles';
import DriverVehicleDetail from '@/pages/driver/VehicleDetail';
import DriverVehicleCredentialDetail from '@/pages/driver/VehicleCredentialDetail';
import { WebsiteLayout } from '@/components/website/WebsiteLayout';
import HomePage from '@/pages/website/HomePage';
import CredentialingPage from '@/pages/website/CredentialingPage';
import PricingPage from '@/pages/website/PricingPage';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

const queryClient = new QueryClient();

function DriverPaymentRoute() {
  const paymentsEnabled = useFeatureFlag('driver_payments');

  if (!paymentsEnabled) {
    return <Navigate to="/driver/settings/account" replace />;
  }

  return <PaymentSettings />;
}

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
                    <SuperAdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="companies" replace />} />
                <Route path="companies" element={<Companies />} />
                <Route path="companies/:id" element={<CompanyDetail />} />
                <Route path="feature-flags" element={<FeatureFlags />} />
                <Route path="billing" element={<SuperAdminBilling />} />
                <Route path="settings" element={<Settings />} />
              </Route>

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
                <Route path="drivers/:driverId/credentials/:credentialId" element={<DriverCredentialDetail />} />
                <Route path="vehicles" element={<VehiclesPage />} />
                <Route path="vehicles/:id" element={<VehicleDetailPage />} />
                <Route path="vehicles/:vehicleId/credentials/:credentialId" element={<VehicleCredentialDetail />} />
                <Route path="applications" element={<ApplicationsPage />} />
                <Route path="applications/:id" element={<ApplicationReviewPage />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="settings/credentials" element={<CredentialTypes />} />
                <Route path="settings/credentials/:id" element={<CredentialTypeEditor />} />
                <Route path="credentials" element={<CredentialReview />} />
                <Route path="brokers" element={<Brokers />} />
                <Route path="brokers/:id" element={<BrokerDetail />} />
                <Route path="billing" element={<Billing />} />
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
                <Route path="profile" element={<DriverProfile />} />
                <Route path="vehicles" element={<DriverVehicles />} />
                <Route path="vehicles/:vehicleId" element={<DriverVehicleDetail />} />
                <Route path="vehicles/:vehicleId/credentials/:credentialId" element={<DriverVehicleCredentialDetail />} />
                <Route path="credentials" element={<DriverCredentials />} />
                <Route path="credentials/:id" element={<CredentialDetailPage />} />
                <Route path="credentials/broker/:brokerId" element={<DriverCredentials />} />
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
                <Route path="settings" element={<Navigate to="settings/account" replace />} />
                <Route path="settings/payment" element={<DriverPaymentRoute />} />
                <Route path="settings/account" element={<AccountSettings />} />
              </Route>

              {/* Public website routes */}
              <Route path="/website" element={<WebsiteLayout />}>
                <Route index element={<HomePage />} />
                <Route path="credentialing" element={<CredentialingPage />} />
                <Route path="pricing" element={<PricingPage />} />
              </Route>

              {/* Redirect old demo routes to website (for browser history cleanup) */}
              <Route path="/demo/admin" element={<Navigate to="/website" replace />} />
              <Route path="/demo/driver" element={<Navigate to="/website" replace />} />

              {/* Default redirect to website homepage */}
              <Route path="/" element={<Navigate to="/website" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
