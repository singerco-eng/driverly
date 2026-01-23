# TASK 002: Authentication Layer

## Prerequisites
- Migration `001_core_tables.sql` must be applied to Supabase first
- Run in Supabase SQL Editor or via CLI: `supabase db push`

## Context
Build the authentication layer for Driverly. We have 4 roles:
- `super_admin` - Platform owner, no company_id
- `admin` - Company admin, has company_id  
- `coordinator` - Limited admin, has company_id
- `driver` - Driver user, has company_id

Reference: `docs/03-AUTHENTICATION.md`

## Your Tasks

### Task 1: Auth Context

Create `src/contexts/AuthContext.tsx`:

```tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'super_admin' | 'admin' | 'coordinator' | 'driver';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  company_id: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isCoordinator: boolean;
  isDriver: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data as UserProfile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const value: AuthContextType = {
    session,
    user,
    profile,
    isLoading,
    signIn,
    signOut,
    isSuperAdmin: profile?.role === 'super_admin',
    isAdmin: profile?.role === 'admin',
    isCoordinator: profile?.role === 'coordinator',
    isDriver: profile?.role === 'driver',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Task 2: Protected Route Component

Create `src/components/layouts/ProtectedRoute.tsx`:

```tsx
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

type AllowedRole = 'super_admin' | 'admin' | 'coordinator' | 'driver';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: AllowedRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { profile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(profile.role)) {
    // Redirect to appropriate dashboard based on role
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
```

### Task 3: Login Page

Create `src/pages/auth/Login.tsx`:

```tsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { signIn, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already logged in, redirect to appropriate dashboard
  if (profile) {
    const redirectPath = getRoleRedirect(profile.role);
    navigate(redirectPath, { replace: true });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    // Auth state change will trigger redirect via useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome to Driverly</CardTitle>
          <CardDescription>Enter your credentials to sign in</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function getRoleRedirect(role: string): string {
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
```

### Task 4: Update App.tsx

Update `src/App.tsx` to use AuthProvider and ProtectedRoutes:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/layouts/ProtectedRoute';
import Login from '@/pages/auth/Login';

// Placeholder pages - we'll build these out
const SuperAdminDashboard = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
    <p className="text-muted-foreground">Coming soon...</p>
  </div>
);

const AdminDashboard = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold">Admin Dashboard</h1>
    <p className="text-muted-foreground">Coming soon...</p>
  </div>
);

const DriverDashboard = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold">Driver Dashboard</h1>
    <p className="text-muted-foreground">Coming soon...</p>
  </div>
);

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />

            {/* Super Admin routes */}
            <Route
              path="/super-admin/*"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Admin routes (admin + coordinator) */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['admin', 'coordinator']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Driver routes */}
            <Route
              path="/driver/*"
              element={
                <ProtectedRoute allowedRoles={['driver']}>
                  <DriverDashboard />
                </ProtectedRoute>
              }
            />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
```

### Task 5: Add Path Alias

Ensure `vite.config.ts` has the @ alias configured:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

And `tsconfig.json` has:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Output Summary

When complete, confirm:
1. ✅ `src/contexts/AuthContext.tsx` - Auth state management
2. ✅ `src/components/layouts/ProtectedRoute.tsx` - Route protection
3. ✅ `src/pages/auth/Login.tsx` - Login page with form
4. ✅ Updated `src/App.tsx` - With AuthProvider and protected routes
5. ✅ Path aliases configured in vite.config.ts and tsconfig.json

## DO NOT
- Create signup/registration (drivers apply via AD-001)
- Add forgot password yet (future task)
- Modify UI components in src/components/ui/
