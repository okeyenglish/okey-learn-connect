import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/typedClient";
import { useToast } from "@/hooks/use-toast";

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id?: string;
  client_id?: string;
  emoji: string;
  created_at: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  } | null;
  clients?: {
    name: string;
    avatar_url?: string;
  } | null;
}

// Хук для получения реакций на сообщение
export const useMessageReactions = (messageId: string) => {
  return useQuery({
    queryKey: ['message_reactions', messageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_reactions' as any)
        .select(`
          id,
          message_id,
          user_id,
          client_id,
          emoji,
          created_at
        `)
        .eq('message_id', messageId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching message reactions:', error);
        throw error;
      }

      // Получаем дополнительную информацию о пользователях и клиентах
      const reactionsWithDetails = await Promise.all(
        ((data || []) as any[]).map(async (reaction) => {
          let profiles = null;
          let clients = null;

          if (reaction.user_id) {
            const { data: profile } = await supabase
              .from('profiles' as any)
              .select('first_name, last_name, email')
              .eq('id', reaction.user_id)
              .single();
            profiles = profile;
          }

          if (reaction.client_id) {
            const { data: client } = await supabase
              .from('clients' as any)
              .select('name, avatar_url')
              .eq('id', reaction.client_id)
              .single();
            clients = client;
          }

          return {
            ...reaction,
            profiles,
            clients,
          };
        })
      );

      return reactionsWithDetails as MessageReaction[];
    },
    enabled: !!messageId,
  });
};

// Хук для добавления реакции
export const useAddReaction = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const { data, error } = await supabase
        .from('message_reactions' as any)
        .upsert({
          message_id: messageId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          emoji: emoji,
        }, {
          onConflict: 'message_id,user_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding reaction:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['message_reactions', variables.messageId] });
      toast({
        title: "Реакция добавлена",
        description: "Ваша реакция успешно добавлена к сообщению",
      });
    },
    onError: (error) => {
      console.error('Error adding reaction:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить реакцию",
        variant: "destructive",
      });
    },
  });
};

// Хук для удаления реакции
export const useRemoveReaction = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('message_reactions' as any)
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) {
        console.error('Error removing reaction:', error);
        throw error;
      }
    },
    onSuccess: (_, messageId) => {
      queryClient.invalidateQueries({ queryKey: ['message_reactions', messageId] });
      toast({
        title: "Реакция удалена",
        description: "Ваша реакция удалена",
      });
    },
    onError: (error) => {
      console.error('Error removing reaction:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить реакцию",
        variant: "destructive",
      });
    },
  });
};

// Хук для получения групп реакций (эмодзи с количеством)
export const useGroupedReactions = (messageId: string) => {
  const { data: reactions, ...query } = useMessageReactions(messageId);
  
  return useQuery({
    queryKey: ['grouped_reactions', messageId, reactions],
    queryFn: async () => {
      if (!reactions) return [];
      
      // Получаем текущего пользователя для проверки
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;
      
      const groupedReactions = reactions.reduce((acc, reaction) => {
        if (!acc[reaction.emoji]) {
          acc[reaction.emoji] = {
            emoji: reaction.emoji,
            count: 0,
            users: [],
            hasUserReaction: false,
          };
        }
        
        acc[reaction.emoji].count += 1;
        
        if (reaction.user_id) {
          acc[reaction.emoji].users.push({
            type: 'manager' as const,
            name: `${reaction.profiles?.first_name || ''} ${reaction.profiles?.last_name || ''}`.trim() || reaction.profiles?.email || 'Менеджер',
            id: reaction.user_id,
          });
          
          // Проверяем, является ли это реакцией текущего пользователя
          if (reaction.user_id === currentUserId) {
            acc[reaction.emoji].hasUserReaction = true;
          }
        } else if (reaction.client_id) {
          acc[reaction.emoji].users.push({
            type: 'client' as const,
            name: reaction.clients?.name || 'Клиент',
            id: reaction.client_id,
            avatar: reaction.clients?.avatar_url,
          });
        }
        
        return acc;
      }, {} as Record<string, {
        emoji: string;
        count: number;
        users: Array<{
          type: 'manager' | 'client';
          name: string;
          id: string;
          avatar?: string;
        }>;
        hasUserReaction: boolean;
      }>);

      return Object.values(groupedReactions);
    },
    enabled: !!reactions && !!messageId,
  });
};
