import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errorUtils';
import { selfHostedGet, selfHostedPost, selfHostedDelete } from '@/lib/selfHostedApi';

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
      const response = await selfHostedGet<{ channels: MaxChannel[] }>('max-channels');

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch channels');
      }

      setChannels(response.data?.channels || []);
      return response.data?.channels || [];
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
      const response = await selfHostedPost<{ channel: MaxChannel }>('max-channels', { name, token, autoStart });

      if (!response.success) {
        throw new Error(response.error || 'Failed to add channel');
      }
      
      toast({
        title: 'Успешно',
        description: `MAX канал "${name}" добавлен`
      });
      
      await fetchChannels();
      return response.data?.channel;
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
      const response = await selfHostedDelete(`max-channels?channelId=${channelId}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete channel');
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
      const response = await selfHostedPost<unknown>('max-send', { clientId, channelId, text });

      if (!response.success) {
        throw new Error(response.error || 'Failed to send message');
      }

      return response.data;
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
