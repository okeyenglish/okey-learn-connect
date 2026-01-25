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

interface MaxSendResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface MaxEditResponse {
  success: boolean;
  error?: string;
}

interface MaxDeleteResponse {
  success: boolean;
  error?: string;
}

interface MaxCheckAvailabilityResponse {
  success: boolean;
  existsWhatsapp?: boolean;
  chatId?: string;
  error?: string;
}

interface MaxAvatarResponse {
  success: boolean;
  urlAvatar?: string;
  available?: boolean;
  error?: string;
}

interface MaxContact {
  id: string;
  name?: string;
  phone?: string;
}

interface MaxContactsResponse {
  success: boolean;
  contacts?: MaxContact[];
  error?: string;
}

interface MaxContactInfoResponse {
  success: boolean;
  name?: string;
  phone?: string;
  error?: string;
  [key: string]: unknown;
}

// Helper to extract error message from unknown error
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Unknown error';
};

export const useMax = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getMaxSettings = useCallback(async (): Promise<MaxSettings | null> => {
    try {
      const { data, error } = await supabase
        .from('messenger_settings')
        .select('*')
        .eq('messenger_type', 'max')
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const settings = data.settings as Record<string, unknown> | null;
      return {
        instanceId: (settings?.instanceId as string) || '',
        apiToken: (settings?.apiToken as string) || '',
        webhookUrl: data.webhook_url || '',
        isEnabled: data.is_enabled || false,
      };
    } catch (error: unknown) {
      console.error('Error fetching MAX settings:', error);
      return null;
    }
  }, []);

  const sendMessage = useCallback(async (params: SendMessageParams): Promise<MaxSendResponse> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<MaxSendResponse>('max-send', {
        body: params
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to send message');

      return { success: true, messageId: data.messageId };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      console.error('Error sending MAX message:', error);
      toast({
        title: "Ошибка отправки",
        description: message || "Не удалось отправить сообщение в MAX",
        variant: "destructive",
      });
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const editMessage = useCallback(async (messageId: string, newMessage: string, clientId: string): Promise<MaxEditResponse> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<MaxEditResponse>('max-edit', {
        body: { messageId, newMessage, clientId }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to edit message');

      return { success: true };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      console.error('Error editing MAX message:', error);
      toast({
        title: "Ошибка редактирования",
        description: message || "Не удалось отредактировать сообщение",
        variant: "destructive",
      });
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const deleteMessage = useCallback(async (messageId: string, clientId: string): Promise<MaxDeleteResponse> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<MaxDeleteResponse>('max-delete', {
        body: { messageId, clientId }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to delete message');

      return { success: true };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      console.error('Error deleting MAX message:', error);
      toast({
        title: "Ошибка удаления",
        description: message || "Не удалось удалить сообщение",
        variant: "destructive",
      });
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const sendTyping = useCallback(async (clientId: string): Promise<{ success: boolean }> => {
    try {
      const { error } = await supabase.functions.invoke('max-typing', {
        body: { clientId }
      });

      if (error) throw error;
      return { success: true };
    } catch (error: unknown) {
      console.error('Error sending typing notification:', error);
      return { success: false };
    }
  }, []);

  const checkAvailability = useCallback(async (phoneNumber: string): Promise<MaxCheckAvailabilityResponse> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<MaxCheckAvailabilityResponse>('max-check-availability', {
        body: { phoneNumber }
      });

      if (error) throw error;
      return { 
        success: true, 
        existsWhatsapp: data?.existsWhatsapp,
        chatId: data?.chatId 
      };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      console.error('Error checking MAX availability:', error);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getAvatar = useCallback(async (clientId?: string, chatId?: string): Promise<MaxAvatarResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke<MaxAvatarResponse>('max-get-avatar', {
        body: { clientId, chatId }
      });

      if (error) throw error;
      return { 
        success: true, 
        urlAvatar: data?.urlAvatar,
        available: data?.available
      };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      console.error('Error getting MAX avatar:', error);
      return { success: false, error: message };
    }
  }, []);

  const getContacts = useCallback(async (): Promise<MaxContactsResponse> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<MaxContactsResponse>('max-get-contacts', {
        body: {}
      });

      if (error) throw error;
      return { success: true, contacts: data?.contacts };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      console.error('Error getting MAX contacts:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось получить контакты MAX",
        variant: "destructive",
      });
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getContactInfo = useCallback(async (clientId?: string, chatId?: string): Promise<MaxContactInfoResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke<MaxContactInfoResponse>('max-get-contact-info', {
        body: { clientId, chatId }
      });

      if (error) throw error;
      return { success: true, ...data };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      console.error('Error getting MAX contact info:', error);
      return { success: false, error: message };
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
