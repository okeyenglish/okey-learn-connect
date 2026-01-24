import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';

interface MaxSettings {
  instanceId: string;
  apiToken: string;
  webhookUrl?: string;
  isEnabled: boolean;
}

interface SendMessageParams {
  clientId: string;
  text: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
}

export const useMax = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getMaxSettings = useCallback(async (): Promise<MaxSettings | null> => {
    try {
      const { data, error } = await supabase
        .from('messenger_settings' as any)
        .select('*')
        .eq('messenger_type', 'max')
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const row = data as any;
      const settings = row.settings as any;
      return {
        instanceId: settings?.instanceId || '',
        apiToken: settings?.apiToken || '',
        webhookUrl: row.webhook_url || '',
        isEnabled: row.is_enabled || false,
      };
    } catch (error: any) {
      console.error('Error fetching MAX settings:', error);
      return null;
    }
  }, []);

  const sendMessage = useCallback(async (params: SendMessageParams) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('max-send', {
        body: params
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to send message');

      return { success: true, messageId: data.messageId };
    } catch (error: any) {
      console.error('Error sending MAX message:', error);
      toast({
        title: "Ошибка отправки",
        description: error.message || "Не удалось отправить сообщение в MAX",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const editMessage = useCallback(async (messageId: string, newMessage: string, clientId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('max-edit', {
        body: { messageId, newMessage, clientId }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to edit message');

      return { success: true, data };
    } catch (error: any) {
      console.error('Error editing MAX message:', error);
      toast({
        title: "Ошибка редактирования",
        description: error.message || "Не удалось отредактировать сообщение",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const deleteMessage = useCallback(async (messageId: string, clientId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('max-delete', {
        body: { messageId, clientId }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to delete message');

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting MAX message:', error);
      toast({
        title: "Ошибка удаления",
        description: error.message || "Не удалось удалить сообщение",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const sendTyping = useCallback(async (clientId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('max-typing', {
        body: { clientId }
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error sending typing notification:', error);
      return { success: false };
    }
  }, []);

  const checkAvailability = useCallback(async (phoneNumber: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('max-check-availability', {
        body: { phoneNumber }
      });

      if (error) throw error;
      return { 
        success: true, 
        existsWhatsapp: data.existsWhatsapp,
        chatId: data.chatId 
      };
    } catch (error: any) {
      console.error('Error checking MAX availability:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getAvatar = useCallback(async (clientId?: string, chatId?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('max-get-avatar', {
        body: { clientId, chatId }
      });

      if (error) throw error;
      return { 
        success: true, 
        urlAvatar: data.urlAvatar,
        available: data.available
      };
    } catch (error: any) {
      console.error('Error getting MAX avatar:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const getContacts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('max-get-contacts', {
        body: {}
      });

      if (error) throw error;
      return { success: true, contacts: data.contacts };
    } catch (error: any) {
      console.error('Error getting MAX contacts:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось получить контакты MAX",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getContactInfo = useCallback(async (clientId?: string, chatId?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('max-get-contact-info', {
        body: { clientId, chatId }
      });

      if (error) throw error;
      return { success: true, ...data };
    } catch (error: any) {
      console.error('Error getting MAX contact info:', error);
      return { success: false, error: error.message };
    }
  }, []);

  return {
    loading,
    getMaxSettings,
    sendMessage,
    editMessage,
    deleteMessage,
    sendTyping,
    checkAvailability,
    getAvatar,
    getContacts,
    getContactInfo,
  };
};
