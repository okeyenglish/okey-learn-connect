import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errorUtils';
import { selfHostedGet, selfHostedPost, selfHostedDelete, RetryConfig } from '@/lib/selfHostedApi';
import { useApiRetryStatus } from '@/hooks/useApiRetryStatus';

export interface MaxSettings {
  instanceId: string;
  apiToken: string;
  webhookUrl?: string;
}

export interface MaxInstanceState {
  success: boolean;
  stateInstance?: string;
  statusInstance?: string;
  error?: string;
}

export interface MaxSettingsResponse {
  settings: {
    id: string;
    organization_id: string;
    messenger_type: string;
    is_enabled: boolean;
    settings: MaxSettings;
    created_at: string;
    updated_at: string;
  } | null;
  instanceState: MaxInstanceState | null;
}

export const useMaxGreenApi = () => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<MaxSettingsResponse['settings']>(null);
  const [instanceState, setInstanceState] = useState<MaxInstanceState | null>(null);
  const { toast } = useToast();
  
  // Track retry status for UI indicators
  const retryStatus = useApiRetryStatus({
    autoHideSuccessMs: 1500,
    autoHideFailedMs: 5000,
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await selfHostedGet<MaxSettingsResponse>('max-channels');

      if (!response.success) throw new Error(response.error);

      setSettings(response.data?.settings || null);
      setInstanceState(response.data?.instanceState || null);
      
      return response.data;
    } catch (error: unknown) {
      console.error('Error fetching MAX settings:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить настройки MAX',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const saveSettings = useCallback(async (instanceId: string, apiToken: string, isEnabled = true) => {
    setLoading(true);
    try {
      const response = await selfHostedPost<MaxSettingsResponse & { error?: string }>('max-channels', { instanceId, apiToken, isEnabled });

      if (!response.success) throw new Error(response.error);

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setSettings(response.data?.settings || null);
      setInstanceState(response.data?.instanceState || null);

      toast({
        title: 'Успешно',
        description: 'Настройки MAX сохранены'
      });

      return response.data;
    } catch (error: unknown) {
      console.error('Error saving MAX settings:', error);
      toast({
        title: 'Ошибка',
        description: getErrorMessage(error),
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const deleteSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await selfHostedDelete('max-channels');

      if (!response.success) throw new Error(response.error);

      setSettings(null);
      setInstanceState(null);

      toast({
        title: 'Успешно',
        description: 'Настройки MAX удалены'
      });

      return true;
    } catch (error: unknown) {
      console.error('Error deleting MAX settings:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить настройки MAX',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const sendMessage = useCallback(async (
    clientId: string, 
    text: string, 
    fileUrl?: string, 
    fileName?: string,
    fileType?: string
  ) => {
    retryStatus.reset();
    
    try {
      // Create retry config with UI callbacks
      const retryConfig: RetryConfig = {
        onRetry: (attempt, maxAttempts, error) => {
          retryStatus.setRetrying(attempt, maxAttempts);
          console.log(`[MAX] Retry attempt ${attempt}/${maxAttempts}: ${error}`);
        },
        onSuccess: (retryCount) => {
          if (retryCount > 0) {
            retryStatus.setSuccess(retryCount + 1);
          } else {
            retryStatus.reset();
          }
        },
        onFailed: (retryCount, error) => {
          retryStatus.setFailed(retryCount + 1, error);
        },
      };

      const response = await selfHostedPost<{ error?: string }>(
        'max-send',
        { clientId, text, fileUrl, fileName, fileType },
        { retry: retryConfig }
      );

      if (!response.success) throw new Error(response.error);

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    } catch (error: unknown) {
      console.error('Error sending MAX message:', error);
      toast({
        title: 'Ошибка отправки',
        description: getErrorMessage(error),
        variant: 'destructive'
      });
      return null;
    }
  }, [toast, retryStatus]);

  const getWebhookUrl = useCallback(() => {
    return `https://api.academyos.ru/functions/v1/max-webhook`;
  }, []);

  return {
    loading,
    settings,
    instanceState,
    fetchSettings,
    saveSettings,
    deleteSettings,
    sendMessage,
    getWebhookUrl,
    // Retry status for UI indicators
    retryStatus: retryStatus.state,
    isRetrying: retryStatus.isActive,
  };
};
