import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from './use-toast';

export interface GroupHistoryEvent {
  id: string;
  group_id: string;
  event_type: 
    | 'created' 
    | 'updated' 
    | 'deleted'
    | 'student_added'
    | 'student_removed'
    | 'student_status_changed'
    | 'status_changed'
    | 'schedule_changed'
    | 'teacher_changed'
    | 'auto_sync'
    | 'manual_note';
  event_data: Record<string, any>;
  changed_by: string | null;
  created_at: string;
  changed_by_profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

/**
 * Хук для получения истории изменений группы
 */
export const useGroupHistory = (groupId?: string) => {
  return useQuery<GroupHistoryEvent[]>({
    queryKey: ['group-history', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_history')
        .select(`
          *,
          changed_by_profile:profiles!changed_by(first_name, last_name, email)
        `)
        .eq('group_id', groupId!)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching group history:', error);
        throw error;
      }
      
      return data as GroupHistoryEvent[];
    },
    enabled: !!groupId
  });
};

/**
 * Хук для добавления ручной записи в историю группы
 */
export const useAddManualNote = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      groupId, 
      note 
    }: { 
      groupId: string; 
      note: string;
    }) => {
      const { error } = await supabase
        .from('group_history')
        .insert({
          group_id: groupId,
          event_type: 'manual_note',
          event_data: { note }
        });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['group-history', variables.groupId] 
      });
      toast({
        title: "Успешно",
        description: "Заметка добавлена в историю группы"
      });
    },
    onError: (error) => {
      console.error('Error adding manual note:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить заметку",
        variant: "destructive"
      });
    }
  });
};

/**
 * Форматирует описание события для отображения
 */
export const formatEventDescription = (event: GroupHistoryEvent): string => {
  switch (event.event_type) {
    case 'created':
      return 'Группа создана';
    
    case 'updated':
      return 'Параметры группы обновлены';
    
    case 'deleted':
      return 'Группа удалена';
    
    case 'student_added':
      return `Студент добавлен: ${event.event_data.student_name || 'Неизвестно'}`;
    
    case 'student_removed':
      return `Студент удален: ${event.event_data.student_name || 'Неизвестно'}`;
    
    case 'student_status_changed':
      return `Статус студента изменен: ${event.event_data.old_status || ''} → ${event.event_data.new_status || ''}`;
    
    case 'status_changed':
      return `Статус группы изменен: ${event.event_data.old_status || ''} → ${event.event_data.new_status || ''}`;
    
    case 'schedule_changed':
      return 'Расписание группы изменено';
    
    case 'teacher_changed':
      return `Преподаватель изменен: ${event.event_data.old_teacher || 'Нет'} → ${event.event_data.new_teacher || 'Нет'}`;
    
    case 'auto_sync':
      return 'Автоматическая синхронизация состава авто-группы';
    
    case 'manual_note':
      return event.event_data.note || 'Заметка';
    
    default:
      return 'Неизвестное событие';
  }
};

/**
 * Получает имя пользователя, который внес изменение
 */
export const getChangedByName = (event: GroupHistoryEvent): string => {
  if (!event.changed_by) return 'Система';
  
  const profile = event.changed_by_profile;
  if (!profile) return 'Неизвестный пользователь';
  
  if (profile.first_name && profile.last_name) {
    return `${profile.first_name} ${profile.last_name}`;
  }
  
  if (profile.email) return profile.email;
  
  return 'Пользователь';
};
