import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errorUtils';

const SELF_HOSTED_API = "https://api.academyos.ru/functions/v1";

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

const getAuthToken = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

export const useMaxChannel = () => {
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<MaxChannel[]>([]);
  const { toast } = useToast();

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${SELF_HOSTED_API}/max-channels`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to fetch channels');
      }

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
      const authToken = await getAuthToken();
      if (!authToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${SELF_HOSTED_API}/max-channels`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, token, autoStart })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to add channel');
      }
      
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
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${SELF_HOSTED_API}/max-channels?channelId=${channelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete channel');
      }
      
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
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${SELF_HOSTED_API}/max-send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ clientId, channelId, text })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to send message');
      }

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
