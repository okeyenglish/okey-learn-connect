import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from './useAuth';

export interface AutoRetrySettings {
  retryDelaySeconds: 15 | 30 | 60;
  maxRetryAttempts: number;
  enabled: boolean;
}

const DEFAULT_SETTINGS: AutoRetrySettings = {
  retryDelaySeconds: 30,
  maxRetryAttempts: 3,
  enabled: true,
};

// In-memory cache for fast access from non-React contexts
let cachedSettings: AutoRetrySettings | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

export const getAutoRetrySettings = (): AutoRetrySettings => {
  if (cachedSettings && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedSettings;
  }
  return DEFAULT_SETTINGS;
};

export const useAutoRetrySettings = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings = DEFAULT_SETTINGS, isLoading } = useQuery({
    queryKey: ['auto-retry-settings', profile?.organization_id],
    queryFn: async (): Promise<AutoRetrySettings> => {
      if (!profile?.organization_id) return DEFAULT_SETTINGS;

      const { data, error } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', profile.organization_id)
        .single();

      if (error) {
        console.error('[AutoRetrySettings] Error loading:', error);
        return DEFAULT_SETTINGS;
      }

      const orgSettings = data?.settings as Record<string, unknown> | null;
      const autoRetry = orgSettings?.auto_retry as Partial<AutoRetrySettings> | undefined;

      const result: AutoRetrySettings = {
        retryDelaySeconds: (autoRetry?.retryDelaySeconds as 15 | 30 | 60) || DEFAULT_SETTINGS.retryDelaySeconds,
        maxRetryAttempts: typeof autoRetry?.maxRetryAttempts === 'number' 
          ? autoRetry.maxRetryAttempts 
          : DEFAULT_SETTINGS.maxRetryAttempts,
        enabled: autoRetry?.enabled !== false,
      };

      // Update cache
      cachedSettings = result;
      cacheTimestamp = Date.now();

      return result;
    },
    enabled: !!profile?.organization_id,
    staleTime: 60000, // 1 minute
  });

  const updateMutation = useMutation({
    mutationFn: async (newSettings: Partial<AutoRetrySettings>) => {
      if (!profile?.organization_id) throw new Error('No organization');

      // Get current settings
      const { data: org } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', profile.organization_id)
        .single();

      const currentSettings = (org?.settings as Record<string, unknown>) || {};
      const currentAutoRetry = (currentSettings.auto_retry as Partial<AutoRetrySettings>) || {};

      const updatedAutoRetry = {
        ...currentAutoRetry,
        ...newSettings,
      };

      const { error } = await supabase
        .from('organizations')
        .update({
          settings: {
            ...currentSettings,
            auto_retry: updatedAutoRetry,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.organization_id);

      if (error) throw error;

      // Update cache immediately
      cachedSettings = {
        ...DEFAULT_SETTINGS,
        ...currentAutoRetry,
        ...newSettings,
      };
      cacheTimestamp = Date.now();

      return updatedAutoRetry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-retry-settings'] });
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
};
