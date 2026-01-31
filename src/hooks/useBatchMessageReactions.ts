import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/typedClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface ReactionRow {
  id: string;
  message_id: string;
  user_id: string | null;
  emoji: string;
  created_at: string;
}

interface ProfileRow {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export interface GroupedReaction {
  emoji: string;
  count: number;
  users: Array<{
    type: 'manager' | 'client';
    name: string;
    id: string;
    avatar?: string;
  }>;
  hasUserReaction: boolean;
}

// Batch-загрузка реакций для всех сообщений одним запросом
export const useBatchMessageReactions = (messageIds: string[]) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['batch_message_reactions', messageIds.sort().join(',')],
    queryFn: async () => {
      if (messageIds.length === 0) return {};
      
      // Загружаем все реакции одним запросом
      const { data: reactions, error } = await supabase
        .from('message_reactions')
        .select('id, message_id, user_id, emoji, created_at')
        .in('message_id', messageIds)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching batch reactions:', error);
        throw error;
      }

      const rows = (reactions || []) as ReactionRow[];
      
      // Собираем уникальные user_id для получения профилей
      const userIds = [...new Set(rows.filter(r => r.user_id).map(r => r.user_id!))];
      
      // Загружаем профили пользователей одним запросом
      let profilesMap: Record<string, ProfileRow> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);
        
        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.id] = { first_name: p.first_name, last_name: p.last_name, email: p.email };
            return acc;
          }, {} as Record<string, ProfileRow>);
        }
      }

      // Группируем реакции по message_id
      const byMessage: Record<string, ReactionRow[]> = {};
      for (const r of rows) {
        if (!byMessage[r.message_id]) byMessage[r.message_id] = [];
        byMessage[r.message_id].push(r);
      }

      // Преобразуем в GroupedReaction для каждого сообщения
      const currentUserId = user?.id;
      const result: Record<string, GroupedReaction[]> = {};

      for (const [messageId, messageReactions] of Object.entries(byMessage)) {
        const grouped = messageReactions.reduce((acc, reaction) => {
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
            const profile = profilesMap[reaction.user_id];
            acc[reaction.emoji].users.push({
              type: 'manager' as const,
              name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || profile?.email || 'Менеджер',
              id: reaction.user_id,
            });
            
            if (reaction.user_id === currentUserId) {
              acc[reaction.emoji].hasUserReaction = true;
            }
          }
          
          return acc;
        }, {} as Record<string, GroupedReaction>);

        result[messageId] = Object.values(grouped);
      }

      return result;
    },
    enabled: messageIds.length > 0,
    staleTime: 30000, // 30 секунд
    gcTime: 5 * 60 * 1000, // 5 минут
  });
};

// Хук для добавления реакции (обновляет batch cache)
export const useBatchAddReaction = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('message_reactions')
        .upsert({
          message_id: messageId,
          user_id: user.id,
          user_type: 'manager',
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
    onSuccess: () => {
      // Инвалидируем все batch-запросы реакций
      queryClient.invalidateQueries({ queryKey: ['batch_message_reactions'] });
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

// Хук для удаления реакции (обновляет batch cache)
export const useBatchRemoveReaction = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (messageId: string) => {
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error removing reaction:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch_message_reactions'] });
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
