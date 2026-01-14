import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SendMessageParams {
  clientId: string;
  message: string;
  phoneNumber?: string;
  fileUrl?: string;
  fileName?: string;
}

interface WhatsAppSettings {
  provider: 'greenapi' | 'wpp';
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
}

export const useWhatsApp = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

      const settings = data.settings as any;
      const provider = (data.provider === 'wpp' ? 'wpp' : 'greenapi') as 'greenapi' | 'wpp';
      
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
        wppWebhookSecret: settings?.wppWebhookSecret || ''
      };

    } catch (error: any) {
      console.error('Error fetching WhatsApp settings:', error);
      return null;
    }
  }, []);

  const sendMessage = useCallback(async (params: SendMessageParams) => {
    setLoading(true);
    try {
      console.log('Sending WhatsApp message:', params);

      // Получаем настройки для определения провайдера
      const settings = await getMessengerSettings();
      const provider = settings?.provider || 'greenapi';
      const functionName = provider === 'wpp' ? 'wpp-send' : 'whatsapp-send';

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: params
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to send message');
      }

      return { success: true, messageId: data.messageId };

    } catch (error: any) {
      console.error('Error sending WhatsApp message:', error);
      
      toast({
        title: "Ошибка отправки",
        description: error.message || "Не удалось отправить сообщение в WhatsApp",
        variant: "destructive",
      });

      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [toast, getMessengerSettings]);

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
      message: caption || '[Файл]', 
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

      const prev = (existing?.settings as any) ?? {};

      const mergedSettings = {
        ...prev,
        ...(settings.instanceId !== undefined ? { instanceId: settings.instanceId } : {}),
        ...(settings.apiToken !== undefined ? { apiToken: settings.apiToken } : {}),
        ...(settings.apiUrl !== undefined ? { apiUrl: settings.apiUrl } : {}),
        ...(settings.wppSession !== undefined ? { wppSession: settings.wppSession } : {}),
        ...(settings.wppBaseUrl !== undefined ? { wppBaseUrl: settings.wppBaseUrl } : {}),
        ...(settings.wppApiKey !== undefined ? { wppApiKey: settings.wppApiKey } : {}),
        ...(settings.wppWebhookSecret !== undefined ? { wppWebhookSecret: settings.wppWebhookSecret } : {}),
      };

      const provider = (settings.provider ?? (existing?.provider === 'wpp' ? 'wpp' : 'greenapi')) as 'greenapi' | 'wpp';
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

    } catch (error: any) {
      console.error('Error updating WhatsApp settings:', error);

      toast({
        title: "Ошибка сохранения",
        description: error.message || "Не удалось сохранить настройки",
        variant: "destructive",
      });

      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const testConnection = useCallback(async (providerOverride?: 'greenapi' | 'wpp') => {
    setLoading(true);
    try {
      // Используем выбранного в UI провайдера, если передан; иначе читаем из БД
      let provider: 'greenapi' | 'wpp' = providerOverride || 'greenapi';
      if (!providerOverride) {
        const dbSettings = await getMessengerSettings();
        provider = (dbSettings?.provider || 'greenapi') as 'greenapi' | 'wpp';
      }
      const functionName = provider === 'wpp' ? 'wpp-send' : 'whatsapp-send';

      // Проверяем состояние инстанса через edge функцию
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { action: 'test_connection' }
      });

      if (error) {
        throw error;
      }

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

    } catch (error: any) {
      console.error('Error testing WhatsApp connection:', error);
      
      toast({
        title: "Ошибка проверки",
        description: error.message || "Не удалось проверить подключение",
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
        .eq('messenger_type', 'whatsapp')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];

    } catch (error: any) {
      console.error('Error fetching webhook logs:', error);
      return [];
    }
  }, []);

  const getConnectionStatus = useCallback(async (providerOverride?: 'greenapi' | 'wpp'): Promise<{
    status: 'online' | 'offline' | 'connecting' | 'error';
    phone?: string;
    name?: string;
  }> => {
    try {
      let provider: 'greenapi' | 'wpp' = providerOverride || 'greenapi';
      if (!providerOverride) {
        const dbSettings = await getMessengerSettings();
        provider = dbSettings?.provider || 'greenapi';
      }
      
      const functionName = provider === 'wpp' ? 'wpp-status' : 'whatsapp-send';
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: provider === 'greenapi' ? { action: 'get_state' } : undefined
      });
      
      if (error) throw error;
      
      // Normalize response from different providers
      if (provider === 'wpp') {
        const status = data?.status || data?.state;
        return {
          status: status === 'CONNECTED' || status === 'isLogged' ? 'online' : 'offline',
          phone: data?.wid || data?.phone,
          name: data?.pushname
        };
      } else {
        // Green API response
        const state = data?.state?.stateInstance || data?.stateInstance;
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('wpp-status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error checking WPP status:', error);
      throw error;
    }
  }, []);

  const startWppSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('wpp-start', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      return data;
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
      const functionName = provider === 'wpp' ? 'wpp-delete' : 'delete-whatsapp-message';

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { messageId, clientId }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete message');
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting message:', error);
      toast({
        title: "Ошибка удаления",
        description: error.message || "Не удалось удалить сообщение",
        variant: "destructive",
      });
      return { success: false, error: error.message };
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
      const functionName = provider === 'wpp' ? 'wpp-edit' : 'edit-whatsapp-message';

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { messageId, newMessage, clientId }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to edit message');
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('Error editing message:', error);
      toast({
        title: "Ошибка редактирования",
        description: error.message || "Не удалось отредактировать сообщение",
        variant: "destructive",
      });
      return { success: false, error: error.message };
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
      const functionName = provider === 'wpp' ? 'wpp-download' : 'download-whatsapp-file';

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { messageId, organizationId }
      });

      if (error) throw error;

      return data;
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast({
        title: "Ошибка скачивания",
        description: error.message || "Не удалось скачать файл",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast, getMessengerSettings]);

  return {
    loading,
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
  };
};
