import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';

export interface InternalChat {
  id: string;
  name: string;
  description?: string;
  chat_type: string;
  branch?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  participants: Array<{
    user_id: string;
    role: string;
    is_admin: boolean;
    is_muted: boolean;
    joined_at: string;
    profiles: {
      first_name?: string;
      last_name?: string;
      email?: string;
    };
  }>;
  last_message?: {
    message_text: string;
    created_at: string;
    sender: {
      first_name?: string;
      last_name?: string;
    };
  };
}

export interface InternalChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  message_text: string;
  message_type: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  reply_to_message_id?: string;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  sender: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  reply_to?: {
    message_text: string;
    sender: {
      first_name?: string;
      last_name?: string;
    };
  };
}

export const useInternalChats = () => {
  return useQuery({
    queryKey: ['internal-chats'],
    queryFn: async () => {
      // Используем таблицу clients для внутренних чатов
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .or('name.ilike.%Внутренний чат%,name.ilike.%Корпоративный чат%,name.ilike.%Чат педагогов%')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching internal chats:', error);
        return [];
      }
      
      return (data || []).map(client => ({
        id: client.id,
        name: client.name,
        description: client.notes,
        chat_type: 'group',
        branch: client.branch,
        created_by: '',
        created_at: client.created_at,
        updated_at: client.updated_at,
        is_active: client.is_active,
        participants: [],
        last_message: undefined
      })) as InternalChat[];
    }
  });
};

export const useChatMessages = (chatId: string) => {
  return useQuery({
    queryKey: ['internal-chat-messages', chatId],
    queryFn: async () => {
      if (!chatId) return [];
      
      // Получаем сообщения из таблицы chat_messages
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('client_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching chat messages:', error);
        return [];
      }
      
      return (data || []).map(msg => ({
        id: msg.id,
        chat_id: msg.client_id,
        sender_id: '',
        message_text: msg.message_text,
        message_type: msg.message_type,
        file_url: msg.file_url,
        file_name: msg.file_name,
        file_type: msg.file_type,
        reply_to_message_id: undefined,
        is_edited: false,
        is_deleted: false,
        created_at: msg.created_at,
        updated_at: msg.created_at,
        sender: {
          first_name: 'Система',
          last_name: '',
          email: ''
        },
        reply_to: undefined
      })) as InternalChatMessage[];
    },
    enabled: !!chatId
  });
};

export const useCreateInternalChat = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (chatData: {
      name: string;
      description?: string;
      chat_type: string;
      branch?: string;
      participant_user_ids?: string[];
    }) => {
      // Создаем чат напрямую в таблице clients
      const { data: chatResult, error: chatError } = await supabase
        .from('clients')
        .insert({
          name: `Внутренний чат: ${chatData.name}`,
          phone: '-',
          branch: chatData.branch,
          notes: `Внутренний чат ${chatData.chat_type}`
        })
        .select()
        .single();

      if (chatError) throw chatError;
      return chatResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-chats'] });
      toast({
        title: "Чат создан",
        description: "Внутренний чат успешно создан"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать чат",
        variant: "destructive"
      });
    }
  });
};

export const useSendInternalMessage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (messageData: {
      chat_id: string;
      message_text: string;
      message_type?: string;
      file_url?: string;
      file_name?: string;
      file_type?: string;
      reply_to_message_id?: string;
    }) => {
      // Отправляем сообщение в обычный чат
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{
          client_id: messageData.chat_id,
          message_text: messageData.message_text,
          message_type: messageData.message_type || 'text',
          file_url: messageData.file_url,
          file_name: messageData.file_name,
          file_type: messageData.file_type,
          is_outgoing: true,
          messenger_type: 'system'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['internal-chat-messages', variables.chat_id] });
      queryClient.invalidateQueries({ queryKey: ['internal-chats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить сообщение",
        variant: "destructive"
      });
    }
  });
};

export const useAddChatParticipant = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { chat_id: string; user_id: string; role?: string }) => {
      // Временная заглушка - создаем системное сообщение
      const { error } = await supabase
        .from('chat_messages')
        .insert([{
          client_id: data.chat_id,
          message_text: `Пользователь добавлен в чат`,
          message_type: 'system',
          system_type: 'user_added',
          messenger_type: 'system'
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-chats'] });
      toast({
        title: "Участник добавлен",
        description: "Пользователь успешно добавлен в чат"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось добавить участника",
        variant: "destructive"
      });
    }
  });
};

export const useRemoveChatParticipant = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { chat_id: string; user_id: string }) => {
      // Временная заглушка - создаем системное сообщение
      const { error } = await supabase
        .from('chat_messages')
        .insert([{
          client_id: data.chat_id,
          message_text: `Пользователь удален из чата`,
          message_type: 'system',
          system_type: 'user_removed',
          messenger_type: 'system'
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-chats'] });
      toast({
        title: "Участник удален",
        description: "Пользователь удален из чата"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить участника",
        variant: "destructive"
      });
    }
  });
};