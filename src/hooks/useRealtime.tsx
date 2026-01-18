import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

// Types for realtime configuration
export interface RealtimeConfig {
  table: string;
  schema?: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
}

export interface RealtimeProps<T> {
  config: RealtimeConfig;
  fetchData: () => Promise<T[]>;
  enabled?: boolean;
}

export interface RealtimeResult<T> {
  data: T[];
  status: {
    connected: boolean;
    error: string | null;
  };
  refetch: () => Promise<void>;
}

// Context for global realtime state
interface RealtimeContextValue {
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  isEnabled: true,
  setEnabled: () => {},
});

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [isEnabled, setEnabled] = useState(true);

  return (
    <RealtimeContext.Provider value={{ isEnabled, setEnabled }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeContext() {
  return useContext(RealtimeContext);
}

// Main realtime hook
export function useRealtime<T extends { id: string }>(
  props: RealtimeProps<T>
): RealtimeResult<T> | null {
  const { config, fetchData, enabled = true } = props;
  const { isEnabled: globalEnabled } = useRealtimeContext();
  
  const [data, setData] = useState<T[]>([]);
  const [status, setStatus] = useState<{ connected: boolean; error: string | null }>({
    connected: false,
    error: null,
  });

  const refetch = useCallback(async () => {
    try {
      const result = await fetchData();
      setData(result);
      setStatus(prev => ({ ...prev, error: null }));
    } catch (err) {
      setStatus(prev => ({ 
        ...prev, 
        error: err instanceof Error ? err.message : 'Failed to fetch data' 
      }));
    }
  }, [fetchData]);

  useEffect(() => {
    // If disabled, don't set up realtime
    if (!enabled || !globalEnabled || !config.table) {
      return;
    }

    let channel: RealtimeChannel | null = null;

    const setupRealtime = async () => {
      // Initial fetch
      await refetch();

      // Set up realtime subscription
      channel = supabase
        .channel(`realtime-${config.table}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: config.event || '*',
            schema: config.schema || 'public',
            table: config.table,
            filter: config.filter,
          },
          async () => {
            // Refetch on any change for simplicity
            // Could optimize to handle INSERT/UPDATE/DELETE individually
            await refetch();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setStatus(prev => ({ ...prev, connected: true }));
          } else if (status === 'CHANNEL_ERROR') {
            setStatus(prev => ({ ...prev, connected: false, error: 'Channel error' }));
          } else if (status === 'TIMED_OUT') {
            setStatus(prev => ({ ...prev, connected: false, error: 'Connection timed out' }));
          }
        });
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [enabled, globalEnabled, config.table, config.schema, config.filter, config.event, refetch]);

  // Return null if not enabled
  if (!enabled || !globalEnabled || !config.table) {
    return null;
  }

  return { data, status, refetch };
}

export default useRealtime;
