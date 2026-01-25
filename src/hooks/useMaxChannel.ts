import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errorUtils';

export interface MaxChannel {
  id: string;
  name: string;
  bot_username: string | null;
  bot_id: number | null;
  is_enabled: boolean;
  auto_start: boolean;
  status: 'online' | 'offline' | 'error' | 'starting';
  last_error: string | null;
  last_heartbeat_at: string | null;
  messages_today: number;
  created_at: string;
  updated_at: string;
}

export const useMaxChannel = () => {
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<MaxChannel[]>([]);
  const { toast } = useToast();

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('max-channels', {
        method: 'GET'
      });

      if (error) throw error;
      setChannels(data?.channels || []);
      return data?.channels || [];
    } catch (error: unknown) {
      console.error('Error fetching MAX channels:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить MAX каналы',
        variant: 'destructive'
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const addChannel = useCallback(async (name: string, token: string, autoStart = true) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('max-channels', {
        body: { name, token, autoStart }
      });

      if (error) throw error;
      
      toast({
        title: 'Успешно',
        description: `MAX канал "${name}" добавлен`
      });
      
      await fetchChannels();
      return data?.channel;
    } catch (error: unknown) {
      console.error('Error adding MAX channel:', error);
      toast({
        title: 'Ошибка',
        description: getErrorMessage(error),
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast, fetchChannels]);

  const deleteChannel = useCallback(async (channelId: string) => {
    try {
      const { error } = await supabase.functions.invoke(`max-channels/${channelId}`, {
        method: 'DELETE'
      });

      if (error) throw error;
      
      toast({
        title: 'Успешно',
        description: 'MAX канал удален'
      });
      
      await fetchChannels();
      return true;
    } catch (error: unknown) {
      console.error('Error deleting MAX channel:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить MAX канал',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast, fetchChannels]);

  const sendMessage = useCallback(async (clientId: string, channelId: string, text: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('max-send', {
        body: { clientId, channelId, text }
      });

      if (error) throw error;
      return data;
    } catch (error: unknown) {
      console.error('Error sending MAX message:', error);
      toast({
        title: 'Ошибка отправки',
        description: getErrorMessage(error),
        variant: 'destructive'
      });
      return null;
    }
  }, [toast]);

  return {
    loading,
    channels,
    fetchChannels,
    addChannel,
    deleteChannel,
    sendMessage
  };
};