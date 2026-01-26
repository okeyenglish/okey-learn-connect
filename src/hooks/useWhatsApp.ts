import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errorUtils';
import { selfHostedPost, selfHostedGet, RetryConfig } from '@/lib/selfHostedApi';
import type { MessengerSettings as MessengerSettingsDB } from '@/integrations/supabase/database.types';
import { useApiRetryStatus } from '@/hooks/useApiRetryStatus';

interface SendMessageParams {
  clientId: string;
  message: string;
  phoneNumber?: string;
  fileUrl?: string;
  fileName?: string;
}

interface WhatsAppSettings {
  provider: 'greenapi' | 'wpp' | 'wappi';
  instanceId: string;
  apiToken: string;
  apiUrl: string;
  webhookUrl: string;
  isEnabled: boolean;
  // WPP specific
  wppSession?: string;
  wppBaseUrl?: string;
  wppApiKey?: string;
  wppWebhookSecret?: string;
  // Wappi specific
  wappiProfileId?: string;
  wappiApiToken?: string;
}

export const useWhatsApp = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  // Track retry status for UI indicators
  const retryStatus = useApiRetryStatus({
    autoHideSuccessMs: 1500,
    autoHideFailedMs: 5000,
  });

  const getMessengerSettings = useCallback(async (): Promise<WhatsAppSettings | null> => {
    try {
      // RLS will automatically filter by organization_id
      const { data, error } = await supabase
        .from('messenger_settings')
        .select('*')
        .eq('messenger_type', 'whatsapp')
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      const settings = data.settings as Record<string, any> | null;
      const provider = (data.provider === 'wpp' ? 'wpp' : data.provider === 'wappi' ? 'wappi' : 'greenapi') as 'greenapi' | 'wpp' | 'wappi';
      
      return {
        provider,
        instanceId: settings?.instanceId || '',
        apiToken: settings?.apiToken || '',
        apiUrl: settings?.apiUrl || 'https://api.green-api.com',
        webhookUrl: data.webhook_url || '',
        isEnabled: data.is_enabled || false,
        wppSession: settings?.wppSession || 'default',
        wppBaseUrl: settings?.wppBaseUrl || '',
        wppApiKey: settings?.wppApiKey || '',
        wppWebhookSecret: settings?.wppWebhookSecret || '',
        wappiProfileId: settings?.wappiProfileId || '',
        wappiApiToken: settings?.wappiApiToken || ''
      };

    } catch (error: unknown) {
      console.error('Error fetching WhatsApp settings:', error);
      return null;
    }
  }, []);

  const sendMessage = useCallback(async (params: SendMessageParams) => {
    setLoading(true);
    retryStatus.reset();
    
    try {
      console.log('Sending WhatsApp message:', params);

      // Получаем настройки для определения провайдера
      const settings = await getMessengerSettings();
      const provider = settings?.provider || 'greenapi';
      const functionName = provider === 'wpp' ? 'wpp-send' : provider === 'wappi' ? 'wappi-whatsapp-send' : 'whatsapp-send';

      // Create retry config with UI callbacks
      const retryConfig: RetryConfig = {
        onRetry: (attempt, maxAttempts, error) => {
          retryStatus.setRetrying(attempt, maxAttempts);
          console.log(`[WhatsApp] Retry attempt ${attempt}/${maxAttempts}: ${error}`);
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

      const response = await selfHostedPost<{ success: boolean; messageId?: string; error?: string }>(
        functionName, 
        params,
        { retry: retryConfig }
      );

      if (!response.success || !response.data?.success) {
        throw new Error(response.error || response.data?.error || 'Failed to send message');
      }

      return { success: true, messageId: response.data.messageId };

    } catch (error: unknown) {
      console.error('Error sending WhatsApp message:', error);
      
      toast({
        title: "Ошибка отправки",
        description: getErrorMessage(error),
        variant: "destructive",
      });

      return { success: false, error: getErrorMessage(error) };
    } finally {
      setLoading(false);
    }
  }, [toast, getMessengerSettings, retryStatus]);

  const sendTextMessage = useCallback(async (clientId: string, message: string, phoneNumber?: string) => {
    return sendMessage({ clientId, message, phoneNumber });
  }, [sendMessage]);

  const sendFileMessage = useCallback(async (
    clientId: string, 
    fileUrl: string, 
    fileName: string, 
    caption?: string,
    phoneNumber?: string
  ) => {
    return sendMessage({ 
      clientId, 
      message: caption || '', 
      phoneNumber, 
      fileUrl, 
      fileName 
    });
  }, [sendMessage]);

  const updateMessengerSettings = useCallback(async (settings: Partial<WhatsAppSettings>) => {
    setLoading(true);
    try {
      // Get user's organization_id for multi-tenant isolation
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error('Пользователь не авторизован');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userData.user.id)
        .single();

      if (!profile?.organization_id) throw new Error('Organization ID не найден');

      // Read existing settings so partial updates don't wipe fields (e.g. switch provider)
      const { data: existing } = await supabase
        .from('messenger_settings')
        .select('provider, is_enabled, settings, webhook_url')
        .eq('organization_id', profile.organization_id)
        .eq('messenger_type', 'whatsapp')
        .maybeSingle();

      const prev = (existing?.settings as Record<string, any>) ?? {};

      const mergedSettings = {
        ...prev,
        ...(settings.instanceId !== undefined ? { instanceId: settings.instanceId } : {}),
        ...(settings.apiToken !== undefined ? { apiToken: settings.apiToken } : {}),
        ...(settings.apiUrl !== undefined ? { apiUrl: settings.apiUrl } : {}),
        ...(settings.wppSession !== undefined ? { wppSession: settings.wppSession } : {}),
        ...(settings.wppBaseUrl !== undefined ? { wppBaseUrl: settings.wppBaseUrl } : {}),
        ...(settings.wppApiKey !== undefined ? { wppApiKey: settings.wppApiKey } : {}),
        ...(settings.wppWebhookSecret !== undefined ? { wppWebhookSecret: settings.wppWebhookSecret } : {}),
        ...(settings.wappiProfileId !== undefined ? { wappiProfileId: settings.wappiProfileId } : {}),
        ...(settings.wappiApiToken !== undefined ? { wappiApiToken: settings.wappiApiToken } : {}),
      };

      const provider = (settings.provider ?? (existing?.provider === 'wpp' ? 'wpp' : existing?.provider === 'wappi' ? 'wappi' : 'greenapi')) as 'greenapi' | 'wpp' | 'wappi';
      const isEnabled = settings.isEnabled ?? existing?.is_enabled ?? false;
      const webhookUrl = settings.webhookUrl !== undefined ? settings.webhookUrl : existing?.webhook_url;

      // Upsert messenger_settings with organization_id for tenant isolation
      const { error } = await supabase
        .from('messenger_settings')
        .upsert({
          organization_id: profile.organization_id,
          messenger_type: 'whatsapp',
          provider,
          is_enabled: isEnabled,
          settings: mergedSettings,
          webhook_url: webhookUrl,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'organization_id,messenger_type'
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Настройки сохранены",
        description: "Настройки WhatsApp интеграции обновлены",
      });

      return { success: true };

    } catch (error: unknown) {
      console.error('Error updating WhatsApp settings:', error);

      toast({
        title: "Ошибка сохранения",
        description: getErrorMessage(error),
        variant: "destructive",
      });

      return { success: false, error: getErrorMessage(error) };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const testConnection = useCallback(async (providerOverride?: 'greenapi' | 'wpp' | 'wappi') => {
    setLoading(true);
    try {
      // Используем выбранного в UI провайдера, если передан; иначе читаем из БД
      let provider: 'greenapi' | 'wpp' | 'wappi' = providerOverride || 'greenapi';
      if (!providerOverride) {
        const dbSettings = await getMessengerSettings();
        provider = (dbSettings?.provider || 'greenapi') as 'greenapi' | 'wpp' | 'wappi';
      }
      const functionName = provider === 'wpp' ? 'wpp-send' : provider === 'wappi' ? 'wappi-whatsapp-send' : 'whatsapp-send';

      // Проверяем состояние инстанса через edge функцию
      const response = await selfHostedPost<{ success: boolean; state?: { stateInstance?: string; state?: string; status?: string }; message?: string; error?: string; rawSnippet?: string }>(
        functionName, 
        { action: 'test_connection' }
      );

      if (!response.success) {
        throw new Error(response.error || 'Connection test failed');
      }

      const data = response.data;
      const ok = data?.success;
      const stateValue = data?.state?.stateInstance || data?.state?.state || data?.state?.status;
      const rawSnippet = data?.rawSnippet ? `\nRaw: ${data.rawSnippet}` : '';
      const desc = ok
        ? (data?.message || (stateValue ? `Состояние: ${stateValue}` : 'WhatsApp инстанс работает корректно'))
        : (data?.error || data?.message || (stateValue ? `Состояние: ${stateValue}` : 'Ошибка подключения к WhatsApp')) + rawSnippet;

      toast({
        title: ok ? 'Подключение проверено' : 'Ошибка проверки',
        description: desc,
        variant: ok ? 'default' : 'destructive',
      });

      return !!ok;

    } catch (error: unknown) {
      console.error('Error testing WhatsApp connection:', error);
      
      toast({
        title: "Ошибка проверки",
        description: getErrorMessage(error),
        variant: "destructive",
      });

      return false;
    } finally {
      setLoading(false);
    }
  }, [toast, getMessengerSettings]);

  const getWebhookLogs = useCallback(async (limit: number = 50) => {
    try {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];

    } catch (error: unknown) {
      console.error('Error fetching webhook logs:', error);
      return [];
    }
  }, []);

  const getConnectionStatus = useCallback(async (providerOverride?: 'greenapi' | 'wpp' | 'wappi'): Promise<{
    status: 'online' | 'offline' | 'connecting' | 'error';
    phone?: string;
    name?: string;
  }> => {
    try {
      let provider: 'greenapi' | 'wpp' | 'wappi' = providerOverride || 'greenapi';
      if (!providerOverride) {
        const dbSettings = await getMessengerSettings();
        provider = dbSettings?.provider || 'greenapi';
      }
      
      const functionName = provider === 'wpp' ? 'wpp-status' : provider === 'wappi' ? 'wappi-whatsapp-status' : 'whatsapp-send';
      
      const response = await selfHostedPost<{ 
        status?: string; 
        state?: string | { stateInstance?: string }; 
        stateInstance?: string;
        wid?: string; 
        phone?: string; 
        pushname?: string 
      }>(
        functionName,
        provider === 'greenapi' ? { action: 'get_state' } : undefined
      );
      
      if (!response.success) throw new Error(response.error);
      
      const data = response.data;
      
      // Normalize response from different providers
      if (provider === 'wpp') {
        const status = data?.status || data?.state;
        return {
          status: status === 'CONNECTED' || status === 'isLogged' ? 'online' : 'offline',
          phone: data?.wid || data?.phone,
          name: data?.pushname
        };
      } else if (provider === 'wappi') {
        const status = data?.status || (typeof data?.state === 'string' ? data.state : undefined);
        return {
          status: status === 'CONNECTED' || status === 'online' || status === 'connected' ? 'online' : 'offline',
          phone: data?.wid || data?.phone,
          name: data?.pushname
        };
      } else {
        // Green API response
        const stateObj = typeof data?.state === 'object' ? data.state : null;
        const state = stateObj?.stateInstance || data?.stateInstance;
        return {
          status: state === 'authorized' ? 'online' : state === 'notAuthorized' ? 'offline' : 'error',
          phone: data?.phone,
          name: data?.pushname
        };
      }
    } catch (error) {
      console.error('Error getting connection status:', error);
      return { status: 'error' };
    }
  }, [getMessengerSettings]);

  const checkWppStatus = useCallback(async () => {
    try {
      const response = await selfHostedGet<unknown>('wpp-status');
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to check WPP status');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error checking WPP status:', error);
      throw error;
    }
  }, []);

  const startWppSession = useCallback(async () => {
    try {
      const response = await selfHostedPost<unknown>('wpp-start');
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to start WPP session');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error starting WPP session:', error);
      throw error;
    }
  }, []);

  const deleteMessage = useCallback(async (messageId: string, clientId: string) => {
    setLoading(true);
    try {
      // Get provider settings
      const settings = await getMessengerSettings();
      const provider = settings?.provider || 'greenapi';
      const functionName = provider === 'wpp' ? 'wpp-delete' : provider === 'wappi' ? 'wappi-whatsapp-delete' : 'delete-whatsapp-message';

      const response = await selfHostedPost<{ success: boolean; error?: string }>(functionName, { messageId, clientId });

      if (!response.success || !response.data?.success) {
        throw new Error(response.error || response.data?.error || 'Failed to delete message');
      }

      return { success: true };
    } catch (error: unknown) {
      console.error('Error deleting message:', error);
      toast({
        title: "Ошибка удаления",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return { success: false, error: getErrorMessage(error) };
    } finally {
      setLoading(false);
    }
  }, [toast, getMessengerSettings]);

  const editMessage = useCallback(async (messageId: string, newMessage: string, clientId: string) => {
    setLoading(true);
    try {
      // Get provider settings
      const settings = await getMessengerSettings();
      const provider = settings?.provider || 'greenapi';
      const functionName = provider === 'wpp' ? 'wpp-edit' : provider === 'wappi' ? 'wappi-whatsapp-edit' : 'edit-whatsapp-message';

      const response = await selfHostedPost<{ success: boolean; error?: string }>(functionName, { messageId, newMessage, clientId });

      if (!response.success || !response.data?.success) {
        throw new Error(response.error || response.data?.error || 'Failed to edit message');
      }

      return { success: true, data: response.data };
    } catch (error: unknown) {
      console.error('Error editing message:', error);
      toast({
        title: "Ошибка редактирования",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return { success: false, error: getErrorMessage(error) };
    } finally {
      setLoading(false);
    }
  }, [toast, getMessengerSettings]);

  const downloadFile = useCallback(async (messageId: string, organizationId: string) => {
    setLoading(true);
    try {
      // Get provider settings
      const settings = await getMessengerSettings();
      const provider = settings?.provider || 'greenapi';
      const functionName = provider === 'wpp' ? 'wpp-download' : provider === 'wappi' ? 'wappi-whatsapp-download' : 'download-whatsapp-file';

      const response = await selfHostedPost<unknown>(functionName, { messageId, organizationId });

      if (!response.success) {
        throw new Error(response.error || 'Failed to download file');
      }

      return response.data;
    } catch (error: unknown) {
      console.error('Error downloading file:', error);
      toast({
        title: "Ошибка скачивания",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast, getMessengerSettings]);

  // Check WhatsApp availability for a phone number
  const checkAvailability = useCallback(async (phoneNumber: string) => {
    try {
      const response = await selfHostedPost<{ success: boolean; existsWhatsapp?: boolean; chatId?: string; error?: string }>('whatsapp-check-availability', { phoneNumber });

      if (!response.success) {
        throw new Error(response.error || 'Failed to check availability');
      }
      return response.data || { success: false };
    } catch (error: unknown) {
      console.error('Error checking WhatsApp availability:', error);
      return { success: false, error: getErrorMessage(error) };
    }
  }, []);

  // Get avatar for a contact
  const getAvatar = useCallback(async (clientId: string) => {
    try {
      const response = await selfHostedPost<{ success: boolean; error?: string }>('whatsapp-get-avatar', { clientId });

      if (!response.success) {
        throw new Error(response.error || 'Failed to get avatar');
      }
      return response.data;
    } catch (error: unknown) {
      console.error('Error getting WhatsApp avatar:', error);
      return { success: false, error: getErrorMessage(error) };
    }
  }, []);

  // Send typing indicator (not all providers support this)
  const sendTyping = useCallback(async (clientId: string, isTyping: boolean) => {
    try {
      const settings = await getMessengerSettings();
      const provider = settings?.provider || 'greenapi';
      
      // Only Green API supports typing indicator
      if (provider !== 'greenapi') {
        return { success: false, error: 'Typing not supported' };
      }

      const response = await selfHostedPost<{ success: boolean }>('whatsapp-send', { action: 'send_typing', clientId, isTyping });

      if (!response.success) {
        throw new Error(response.error || 'Failed to send typing');
      }
      return { success: true };
    } catch (error: unknown) {
      console.error('Error sending typing indicator:', error);
      return { success: false, error: getErrorMessage(error) };
    }
  }, [getMessengerSettings]);

  return {
    loading,
    sendMessage,
    sendTextMessage,
    sendFileMessage,
    getMessengerSettings,
    updateMessengerSettings,
    testConnection,
    getWebhookLogs,
    getConnectionStatus,
    checkWppStatus,
    startWppSession,
    deleteMessage,
    editMessage,
    downloadFile,
    checkAvailability,
    getAvatar,
    sendTyping,
    // Retry status for UI indicators
    retryStatus: retryStatus.state,
    isRetrying: retryStatus.isActive,
  };
};
