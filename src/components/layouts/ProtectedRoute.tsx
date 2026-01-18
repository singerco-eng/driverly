import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

type AllowedRole = 'super_admin' | 'admin' | 'coordinator' | 'driver';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: AllowedRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { session, profile, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // No session = not logged in
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Session exists but no profile = user not in users table yet
  // This can happen if auth user exists but profile wasn't created
  if (!profile) {
    // For now, redirect to login with a message
    // In production, you might want to create the profile automatically
    console.warn('User authenticated but no profile found in users table');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role permissions
  if (!allowedRoles.includes(profile.role)) {
    const redirectPath = getRoleHomePath(profile.role);
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}

function getRoleHomePath(role: AllowedRole): string {
  switch (role) {
    case 'super_admin':
      return '/super-admin';
    case 'admin':
    case 'coordinator':
      return '/admin';
    case 'driver':
      return '/driver';
    default:
      return '/login';
  }
}
