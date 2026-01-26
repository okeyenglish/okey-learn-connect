import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errorUtils';
import { selfHostedGet, selfHostedPost, selfHostedDelete, SELF_HOSTED_API } from '@/lib/selfHostedApi';

export interface TelegramSettings {
  profileId: string;
  apiToken: string;
  webhookUrl: string;
  isEnabled: boolean;
}

export interface TelegramInstanceState {
  status: 'authorized' | 'not_authorized' | 'loading' | 'error';
  phone?: string;
  username?: string;
  error?: string;
}

export interface TelegramSettingsResponse {
  settings: TelegramSettings | null;
  instanceState: TelegramInstanceState | null;
}

export const useTelegramWappi = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<TelegramSettings | null>(null);
  const [instanceState, setInstanceState] = useState<TelegramInstanceState | null>(null);
  const { toast } = useToast();

  const fetchSettings = useCallback(async (): Promise<TelegramSettingsResponse> => {
    setIsLoading(true);
    try {
      const response = await selfHostedGet<{ settings: TelegramSettings | null; instanceState: TelegramInstanceState | null }>('telegram-channels');

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch settings');
      }

      setSettings(response.data?.settings || null);
      setInstanceState(response.data?.instanceState || null);
      
      return {
        settings: response.data?.settings || null,
        instanceState: response.data?.instanceState || null
      };
    } catch (error: unknown) {
      console.error('Error fetching Telegram settings:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить настройки Telegram",
        variant: "destructive"
      });
      return { settings: null, instanceState: null };
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const saveSettings = useCallback(async (
    profileId: string,
    apiToken: string,
    isEnabled: boolean = true
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await selfHostedPost<{ settings: TelegramSettings | null; instanceState: TelegramInstanceState | null; error?: string }>(
        'telegram-channels',
        { profileId, apiToken, isEnabled }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to save settings');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setSettings(response.data?.settings || null);
      setInstanceState(response.data?.instanceState || null);
      
      toast({
        title: "Успешно",
        description: "Настройки Telegram сохранены"
      });
      
      return true;
    } catch (error: unknown) {
      console.error('Error saving Telegram settings:', error);
      toast({
        title: "Ошибка",
        description: getErrorMessage(error),
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const deleteSettings = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await selfHostedDelete('telegram-channels');

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete settings');
      }

      setSettings(null);
      setInstanceState(null);
      
      toast({
        title: "Успешно",
        description: "Настройки Telegram удалены"
      });
      
      return true;
    } catch (error: unknown) {
      console.error('Error deleting Telegram settings:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить настройки Telegram",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Track in-flight requests to prevent duplicates
  const sendingRef = useRef<Set<string>>(new Set());

  const sendMessage = useCallback(async (
    clientId: string,
    text: string,
    fileUrl?: string,
    fileName?: string,
    fileType?: string
  ): Promise<{ success: boolean; messageId?: string }> => {
    // Deterministic key (no Date.now) so double-triggers within a short window are deduped
    const messageKey = `${clientId}::${text}::${fileUrl || ''}::${fileName || ''}`;

    // Check if we're already sending this exact message
    if (sendingRef.current.has(messageKey)) {
      console.log('Telegram message already being sent, skipping duplicate');
      return { success: true };
    }

    // Mark as sending
    sendingRef.current.add(messageKey);

    try {
      const response = await selfHostedPost<{ messageId?: string; error?: string }>(
        'telegram-send',
        { clientId, text, fileUrl, fileName, fileType }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to send message');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return { success: true, messageId: response.data?.messageId };
    } catch (error: unknown) {
      console.error('Error sending Telegram message:', error);
      toast({
        title: "Ошибка",
        description: getErrorMessage(error),
        variant: "destructive"
      });
      return { success: false };
    } finally {
      // Clear key shortly after to allow re-sending intentionally
      setTimeout(() => {
        sendingRef.current.delete(messageKey);
      }, 1500);
    }
  }, [toast]);

  const getWebhookUrl = useCallback((): string => {
    return `${SELF_HOSTED_API}/telegram-webhook`;
  }, []);

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    isLoading,
    settings,
    instanceState,
    fetchSettings,
    saveSettings,
    deleteSettings,
    sendMessage,
    getWebhookUrl
  };
};
