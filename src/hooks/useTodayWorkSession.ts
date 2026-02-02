import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useCallback } from 'react';

export interface ServerSessionBaseline {
  activeSeconds: number;
  idleSeconds: number;
  onCallSeconds: number;
  sessionStart: string | null;
  lastUpdated: string | null;
}

const getSessionDate = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Fetches today's aggregated work session from the database.
 * Used to sync activity statistics across devices.
 */
export const useTodayWorkSession = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['today-work-session', user?.id],
    queryFn: async (): Promise<ServerSessionBaseline> => {
      if (!user?.id) {
        return {
          activeSeconds: 0,
          idleSeconds: 0,
          onCallSeconds: 0,
          sessionStart: null,
          lastUpdated: null,
        };
      }

      const sessionDate = getSessionDate();

      const { data, error } = await supabase
        .from('staff_work_sessions')
        .select('active_seconds, idle_seconds, on_call_seconds, session_start, updated_at')
        .eq('user_id', user.id)
        .eq('session_date', sessionDate)
        .maybeSingle();

      if (error) {
        console.error('[useTodayWorkSession] Error fetching session:', error);
        return {
          activeSeconds: 0,
          idleSeconds: 0,
          onCallSeconds: 0,
          sessionStart: null,
          lastUpdated: null,
        };
      }

      if (!data) {
        return {
          activeSeconds: 0,
          idleSeconds: 0,
          onCallSeconds: 0,
          sessionStart: null,
          lastUpdated: null,
        };
      }

      return {
        activeSeconds: data.active_seconds || 0,
        idleSeconds: data.idle_seconds || 0,
        onCallSeconds: data.on_call_seconds || 0,
        sessionStart: data.session_start,
        lastUpdated: data.updated_at,
      };
    },
    enabled: !!user?.id,
    staleTime: 60_000, // 1 minute
    refetchOnWindowFocus: true, // Re-fetch when tab becomes visible
  });

  // Refetch when visibility changes to visible
  const refetch = useCallback(() => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ['today-work-session', user.id] });
    }
  }, [user?.id, queryClient]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch]);

  return {
    baseline: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch,
  };
};

export default useTodayWorkSession;
