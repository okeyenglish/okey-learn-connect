import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TelegramSettings {
  profileId: string;
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
      const { data, error } = await supabase.functions.invoke('telegram-channels', {
        method: 'GET'
      });

      if (error) throw error;

      setSettings(data.settings || null);
      setInstanceState(data.instanceState || null);
      
      return {
        settings: data.settings || null,
        instanceState: data.instanceState || null
      };
    } catch (error: any) {
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
    isEnabled: boolean = true
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('telegram-channels', {
        method: 'POST',
        body: { profileId, isEnabled }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setSettings(data.settings || null);
      setInstanceState(data.instanceState || null);
      
      toast({
        title: "Успешно",
        description: "Настройки Telegram сохранены"
      });
      
      return true;
    } catch (error: any) {
      console.error('Error saving Telegram settings:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить настройки Telegram",
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
      const { data, error } = await supabase.functions.invoke('telegram-channels', {
        method: 'DELETE'
      });

      if (error) throw error;

      setSettings(null);
      setInstanceState(null);
      
      toast({
        title: "Успешно",
        description: "Настройки Telegram удалены"
      });
      
      return true;
    } catch (error: any) {
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

  const sendMessage = useCallback(async (
    clientId: string,
    text: string,
    fileUrl?: string,
    fileName?: string,
    fileType?: string
  ): Promise<{ success: boolean; messageId?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('telegram-send', {
        body: { clientId, text, fileUrl, fileName, fileType }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      return { success: true, messageId: data.messageId };
    } catch (error: any) {
      console.error('Error sending Telegram message:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить сообщение в Telegram",
        variant: "destructive"
      });
      return { success: false };
    }
  }, [toast]);

  const getWebhookUrl = useCallback((): string => {
    return `https://kbojujfwtvmsgudumown.supabase.co/functions/v1/telegram-webhook`;
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
