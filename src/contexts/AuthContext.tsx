import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { clearSentryUser, setSentryUser } from '@/lib/sentry';

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

// Helper to extract profile from app_metadata (for super_admin fallback)
function getProfileFromAppMetadata(user: User): UserProfile | null {
  const appMetadata = user.app_metadata;
  const role = appMetadata?.role as UserRole | undefined;
  
  if (role) {
    return {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      role,
      company_id: appMetadata?.company_id || null,
      avatar_url: user.user_metadata?.avatar_url || null,
    };
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Listen for auth changes - this is the primary handler
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      console.log('Auth state change:', event, { hasSession: !!newSession });
      
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        // Try to get profile from app_metadata first (instant, no network)
        const metadataProfile = getProfileFromAppMetadata(newSession.user);
        
        if (metadataProfile) {
          console.log('Using profile from app_metadata:', metadataProfile.role);
          setProfile(metadataProfile);
          setIsLoading(false);
          
          // Then try to fetch full profile from DB in background (non-blocking)
          fetchProfileAsync(newSession.user.id);
        } else {
          // No metadata, must fetch from DB
          await fetchProfileBlocking(newSession.user.id);
          if (isMounted) {
            setIsLoading(false);
          }
        }
      } else {
        setProfile(null);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      setSentryUser({
        id: user.id,
        email: user.email ?? undefined,
        role: profile?.role,
      });
    } else {
      clearSentryUser();
    }
  }, [user, profile?.role]);

  // Non-blocking profile fetch (updates profile in background)
  async function fetchProfileAsync(userId: string) {
    try {
      const { data, error } = await (supabase as any)
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        console.log('Profile fetched from DB (async):', data.email);
        setProfile(data as UserProfile);
      }
    } catch (error) {
      console.warn('Background profile fetch failed:', error);
      // Keep using the metadata profile
    }
  }

  // Blocking profile fetch with timeout
  async function fetchProfileBlocking(userId: string) {
    console.log('Fetching profile for user:', userId);
    try {
      // Use a timeout wrapper to prevent infinite hanging
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          console.warn('Profile fetch timeout after 5s');
          resolve(null);
        }, 5000);
      });

      const fetchPromise = (supabase as any)
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
        .then(({ data, error }: { data: any; error: any }) => {
          if (error) {
            console.error('Error fetching profile from DB:', error);
            return null;
          }
          return data as UserProfile;
        });

      const result = await Promise.race([fetchPromise, timeoutPromise]);

      if (result) {
        console.log('Profile loaded from DB:', result.email);
        setProfile(result);
      } else {
        console.warn('Profile fetch failed or timed out, no profile available');
        setProfile(null);
      }
    } catch (error) {
      console.error('Error in fetchProfileBlocking:', error);
      setProfile(null);
    }
  }

  async function signIn(email: string, password: string) {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setIsLoading(false);
    }
    // If no error, onAuthStateChange will handle setting isLoading to false
    return { error };
  }

  async function signOut() {
    setIsLoading(true);
    try {
      // Use 'local' scope to clear the session locally even if server call fails
      // This prevents 403 errors when the server session is already expired
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.warn('Sign out error (clearing local state anyway):', error);
    }
    // Clear state regardless of server response
    setSession(null);
    setUser(null);
    setProfile(null);
    setIsLoading(false);
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
