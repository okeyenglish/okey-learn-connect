import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('max-channels', {
        method: 'GET'
      });

      if (error) throw error;

      setSettings(data?.settings || null);
      setInstanceState(data?.instanceState || null);
      
      return data;
    } catch (error: any) {
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
      const { data, error } = await supabase.functions.invoke('max-channels', {
        body: { instanceId, apiToken, isEnabled }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      setSettings(data?.settings || null);
      setInstanceState(data?.instanceState || null);

      toast({
        title: 'Успешно',
        description: 'Настройки MAX сохранены'
      });

      return data;
    } catch (error: any) {
      console.error('Error saving MAX settings:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось сохранить настройки MAX',
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
      const { data, error } = await supabase.functions.invoke('max-channels', {
        method: 'DELETE'
      });

      if (error) throw error;

      setSettings(null);
      setInstanceState(null);

      toast({
        title: 'Успешно',
        description: 'Настройки MAX удалены'
      });

      return true;
    } catch (error: any) {
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
    try {
      const { data, error } = await supabase.functions.invoke('max-send', {
        body: { clientId, text, fileUrl, fileName, fileType }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error: any) {
      console.error('Error sending MAX message:', error);
      toast({
        title: 'Ошибка отправки',
        description: error.message || 'Не удалось отправить сообщение в MAX',
        variant: 'destructive'
      });
      return null;
    }
  }, [toast]);

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
    getWebhookUrl
  };
};
