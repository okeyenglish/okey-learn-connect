import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { selfHostedGet, selfHostedPost, selfHostedPut, selfHostedDelete } from '@/lib/selfHostedApi';
import { useToast } from '@/hooks/use-toast';

export type MessengerType = 'whatsapp' | 'telegram' | 'max';

export interface MessengerIntegration {
  id: string;
  organization_id: string;
  messenger_type: MessengerType;
  provider: string;
  name: string;
  is_primary: boolean;
  is_enabled: boolean;
  webhook_key: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateIntegrationPayload {
  messenger_type: MessengerType;
  provider: string;
  name: string;
  is_primary?: boolean;
  is_enabled?: boolean;
  settings: Record<string, unknown>;
}

export interface UpdateIntegrationPayload {
  id: string;
  name?: string;
  provider?: string;
  is_primary?: boolean;
  is_enabled?: boolean;
  settings?: Record<string, unknown>;
}

interface IntegrationsResponse {
  success: boolean;
  integrations?: MessengerIntegration[];
  integration?: MessengerIntegration;
  error?: string;
}

/**
 * Hook for managing multiple messenger integrations per organization
 */
export const useMessengerIntegrations = (messengerType?: MessengerType) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = messengerType 
    ? ['messenger-integrations', messengerType] 
    : ['messenger-integrations'];

  // Fetch all integrations (optionally filtered by messenger type)
  const { 
    data: integrations = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = messengerType ? `?messenger_type=${messengerType}` : '';
      const response = await selfHostedGet<IntegrationsResponse>(`messenger-integrations${params}`);
      
      if (!response.success || response.error) {
        throw new Error(response.error || 'Failed to fetch integrations');
      }
      
      return response.data?.integrations || [];
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Create new integration
  const createMutation = useMutation({
    mutationFn: async (payload: CreateIntegrationPayload) => {
      const response = await selfHostedPost<IntegrationsResponse>('messenger-integrations', payload, { retry: { noRetry: true } });
      
      if (!response.success || response.error) {
        throw new Error(response.error || response.data?.error || 'Failed to create integration');
      }
      
      return response.data?.integration;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['messenger-integrations'] });
      toast({
        title: 'Успешно',
        description: `Интеграция "${data?.name}" создана`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update integration
  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateIntegrationPayload) => {
      const response = await selfHostedPut<IntegrationsResponse>('messenger-integrations', payload);
      
      if (!response.success || response.error) {
        throw new Error(response.error || response.data?.error || 'Failed to update integration');
      }
      
      return response.data?.integration;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['messenger-integrations'] });
      toast({
        title: 'Успешно',
        description: `Интеграция "${data?.name}" обновлена`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete integration
  const deleteMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      const response = await selfHostedDelete<IntegrationsResponse>(`messenger-integrations?id=${integrationId}`);
      
      if (!response.success || response.error) {
        throw new Error(response.error || response.data?.error || 'Failed to delete integration');
      }
      
      return integrationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messenger-integrations'] });
      toast({
        title: 'Успешно',
        description: 'Интеграция удалена',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Set integration as primary
  const setPrimary = useCallback(async (integrationId: string) => {
    return updateMutation.mutateAsync({ id: integrationId, is_primary: true });
  }, [updateMutation]);

  // Toggle integration enabled state
  const toggleEnabled = useCallback(async (integrationId: string, enabled: boolean) => {
    return updateMutation.mutateAsync({ id: integrationId, is_enabled: enabled });
  }, [updateMutation]);

  // Get primary integration for a messenger type
  const getPrimaryIntegration = useCallback((type: MessengerType) => {
    return integrations.find(i => i.messenger_type === type && i.is_primary);
  }, [integrations]);

  // Get all integrations for a messenger type
  const getIntegrationsByType = useCallback((type: MessengerType) => {
    return integrations.filter(i => i.messenger_type === type);
  }, [integrations]);

  // Generate webhook URL for an integration
  const getWebhookUrl = useCallback((integration: MessengerIntegration) => {
    const baseUrl = 'https://api.academyos.ru/functions/v1';
    
    // For GreenAPI WhatsApp, use query param format for better compatibility
    if (integration.messenger_type === 'whatsapp' && integration.provider === 'green_api') {
      return `${baseUrl}/whatsapp-webhook?key=${integration.webhook_key}`;
    }
    
    // For telegram_crm provider, use query param format
    if (integration.provider === 'telegram_crm') {
      return `${baseUrl}/telegram-crm-webhook?key=${integration.webhook_key}`;
    }
    
    // For Telegram Wappi provider, use profile_id from settings
    if (integration.messenger_type === 'telegram' && integration.provider === 'wappi') {
      const profileId = integration.settings?.profileId as string | undefined;
      if (profileId) {
        return `${baseUrl}/telegram-webhook?profile_id=${profileId}`;
      }
      // Fallback if no profile_id yet
      return `${baseUrl}/telegram-webhook`;
    }
    
    // For WPP and other providers, use path format: messenger-webhook/xxx
    return `${baseUrl}/${integration.messenger_type}-webhook/${integration.webhook_key}`;
  }, []);

  return {
    integrations,
    isLoading,
    error,
    refetch,
    
    // Mutations
    createIntegration: createMutation.mutateAsync,
    updateIntegration: updateMutation.mutateAsync,
    deleteIntegration: deleteMutation.mutateAsync,
    
    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    
    // Helpers
    setPrimary,
    toggleEnabled,
    getPrimaryIntegration,
    getIntegrationsByType,
    getWebhookUrl,
  };
};

/**
 * Hook for getting integration status for chat message sending
 */
export const useIntegrationForSending = (messengerType: MessengerType) => {
  const { getPrimaryIntegration, isLoading } = useMessengerIntegrations();
  
  const primaryIntegration = getPrimaryIntegration(messengerType);
  
  return {
    integration: primaryIntegration,
    isLoading,
    isConfigured: !!primaryIntegration && primaryIntegration.is_enabled,
    webhookKey: primaryIntegration?.webhook_key,
  };
};
