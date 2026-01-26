import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errorUtils';
import { selfHostedPost } from '@/lib/selfHostedApi';
import type {
  MaxSendResponse,
  MaxEditResponse,
  MaxDeleteResponse,
  MaxCheckAvailabilityResponse,
  MaxAvatarResponse,
  MaxContactsResponse,
  MaxContactInfoResponse,
} from '@/types/edgeFunctions';

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

// Re-export types for external use
export type {
  MaxSendResponse,
  MaxEditResponse,
  MaxDeleteResponse,
  MaxCheckAvailabilityResponse,
  MaxAvatarResponse,
  MaxContactsResponse,
  MaxContactInfoResponse,
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
      const response = await selfHostedPost<MaxSendResponse>('max-send', params);

      if (!response.success || !response.data?.success) {
        throw new Error(response.error || response.data?.error || 'Failed to send message');
      }

      return { success: true, messageId: response.data.messageId };
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
      const response = await selfHostedPost<MaxEditResponse>('max-edit', { messageId, newMessage, clientId });

      if (!response.success || !response.data?.success) {
        throw new Error(response.error || response.data?.error || 'Failed to edit message');
      }

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
      const response = await selfHostedPost<MaxDeleteResponse>('max-delete', { messageId, clientId });

      if (!response.success || !response.data?.success) {
        throw new Error(response.error || response.data?.error || 'Failed to delete message');
      }

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
      const response = await selfHostedPost('max-typing', { clientId });

      if (!response.success) throw new Error(response.error);
      return { success: true };
    } catch (error: unknown) {
      console.error('Error sending typing notification:', error);
      return { success: false };
    }
  }, []);

  const checkAvailability = useCallback(async (phoneNumber: string): Promise<MaxCheckAvailabilityResponse> => {
    setLoading(true);
    try {
      const response = await selfHostedPost<MaxCheckAvailabilityResponse>('max-check-availability', { phoneNumber });

      if (!response.success) throw new Error(response.error);
      return { 
        success: true, 
        existsWhatsapp: response.data?.existsWhatsapp,
        chatId: response.data?.chatId 
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
      const response = await selfHostedPost<MaxAvatarResponse>('max-get-avatar', { clientId, chatId });

      if (!response.success) throw new Error(response.error);
      return { 
        success: true, 
        urlAvatar: response.data?.urlAvatar,
        available: response.data?.available
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
      const response = await selfHostedPost<MaxContactsResponse>('max-get-contacts', {});

      if (!response.success) throw new Error(response.error);
      return { success: true, contacts: response.data?.contacts };
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
      const response = await selfHostedPost<MaxContactInfoResponse>('max-get-contact-info', { clientId, chatId });

      if (!response.success) throw new Error(response.error);
      return { success: true, ...response.data };
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
