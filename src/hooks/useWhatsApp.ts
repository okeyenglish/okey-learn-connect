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
  instanceId: string;
  apiToken: string;
  apiUrl: string;
  webhookUrl: string;
  isEnabled: boolean;
}

export const useWhatsApp = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = useCallback(async (params: SendMessageParams) => {
    setLoading(true);
    try {
      console.log('Sending WhatsApp message:', params);

      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
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
  }, [toast]);

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

  const getMessengerSettings = useCallback(async (): Promise<WhatsAppSettings | null> => {
    try {
      const { data, error } = await supabase
        .from('messenger_settings')
        .select('*')
        .eq('messenger_type', 'whatsapp')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        return null;
      }

      const settings = data.settings as any;
      
      return {
        instanceId: settings?.instanceId || '',
        apiToken: settings?.apiToken || '',
        apiUrl: settings?.apiUrl || '',
        webhookUrl: data.webhook_url || '',
        isEnabled: data.is_enabled
      };

    } catch (error: any) {
      console.error('Error fetching WhatsApp settings:', error);
      return null;
    }
  }, []);

  const updateMessengerSettings = useCallback(async (settings: Partial<WhatsAppSettings>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('messenger_settings')
        .upsert({
          messenger_type: 'whatsapp',
          is_enabled: settings.isEnabled ?? false,
          settings: {
            instanceId: settings.instanceId,
            apiToken: settings.apiToken,
            apiUrl: settings.apiUrl,
          },
          webhook_url: settings.webhookUrl,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'messenger_type'
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

  const testConnection = useCallback(async () => {
    setLoading(true);
    try {
      // Проверяем состояние инстанса через edge функцию
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
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
  }, [toast]);

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

  return {
    loading,
    sendTextMessage,
    sendFileMessage,
    getMessengerSettings,
    updateMessengerSettings,
    testConnection,
    getWebhookLogs,
  };
};