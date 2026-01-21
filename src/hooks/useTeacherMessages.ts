import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Helper function to send push notifications without blocking
const sendPushToManagers = async (teacherName: string, messageText: string, messageId: string) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (supabase as any)
      .from('profiles')
      .select('id')
      .eq('role', 'manager');

    const managers = response.data as { id: string }[] | null;
    if (managers && managers.length > 0) {
      const managerIds = managers.map((m) => m.id);
      await supabase.functions.invoke('send-push-notification', {
        body: {
          userIds: managerIds,
          payload: {
            title: '📝 Новое сообщение на модерацию',
            body: `От ${teacherName}: ${messageText.slice(0, 50)}...`,
            icon: '/pwa-192x192.png',
            url: '/crm?tab=messages',
            tag: `teacher-message-${messageId}`,
          },
        },
      });
    }
  } catch (err) {
    console.error('Push notification error:', err);
  }
};

export interface TeacherMessage {
  id: string;
  teacher_id: string;
  teacher_name: string;
  message_text: string;
  message_type: 'group' | 'individual';
  target_group_id?: string;
  target_student_id?: string;
  target_student_name?: string;
  branch: string;
  status: 'pending' | 'approved' | 'rejected' | 'sent';
  moderated_by?: string;
  moderated_at?: string;
  moderation_notes?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTeacherMessageData {
  message_text: string;
  message_type: 'group' | 'individual';
  target_group_id?: string;
  target_student_id?: string;
  target_student_name?: string;
  branch: string;
}

export const useTeacherMessages = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Получение сообщений (для преподавателей - свои, для менеджеров - все в филиале)
  const { data: messages, isLoading } = useQuery({
    queryKey: ['teacher_messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TeacherMessage[];
    },
  });

  // Создание сообщения преподавателем
  const createMessageMutation = useMutation({
    mutationFn: async (messageData: CreateTeacherMessageData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Пользователь не авторизован');

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      const teacherName = profile 
        ? `${profile.first_name} ${profile.last_name}`.trim()
        : 'Преподаватель';

      const { data, error } = await supabase
        .from('teacher_messages')
        .insert({
          teacher_id: user.id,
          teacher_name: teacherName,
          ...messageData,
        })
        .select()
        .single();

      if (error) throw error;

      // Send push notification to managers about new message for moderation (fire-and-forget)
      sendPushToManagers(teacherName, messageData.message_text, data.id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher_messages'] });
      toast({
        title: "Сообщение отправлено на модерацию",
        description: "Менеджеры проверят ваше сообщение и отправят его клиентам",
      });
    },
    onError: (error) => {
      console.error('Error creating teacher message:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить сообщение",
        variant: "destructive",
      });
    },
  });

  // Модерация сообщения (для менеджеров)
  const moderateMessageMutation = useMutation({
    mutationFn: async ({ 
      messageId, 
      status, 
      moderationNotes 
    }: { 
      messageId: string; 
      status: 'approved' | 'rejected'; 
      moderationNotes?: string; 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Пользователь не авторизован');

      const { data, error } = await supabase
        .from('teacher_messages')
        .update({
          status,
          moderated_by: user.id,
          moderated_at: new Date().toISOString(),
          moderation_notes: moderationNotes,
        })
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;

      // Notify teacher about moderation result
      try {
        const statusText = status === 'approved' ? '✅ одобрено' : '❌ отклонено';
        await supabase.functions.invoke('send-push-notification', {
          body: {
            userId: data.teacher_id,
            payload: {
              title: `Сообщение ${statusText}`,
              body: status === 'approved' 
                ? 'Ваше сообщение будет отправлено клиентам'
                : moderationNotes || 'Сообщение не прошло модерацию',
              icon: '/pwa-192x192.png',
              url: '/teacher-portal?tab=messages',
              tag: `moderation-${messageId}`,
            },
          },
        });
      } catch (pushError) {
        console.error('Push notification error:', pushError);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['teacher_messages'] });
      
      if (data.status === 'approved') {
        toast({
          title: "Сообщение одобрено",
          description: "Сообщение будет отправлено клиентам через WhatsApp",
        });
      } else {
        toast({
          title: "Сообщение отклонено",
          description: "Сообщение не будет отправлено клиентам",
        });
      }
    },
    onError: (error) => {
      console.error('Error moderating message:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обработать сообщение",
        variant: "destructive",
      });
    },
  });

  // Реал-тайм подписка на новые сообщения (для менеджеров)
  useEffect(() => {
    const channel = supabase
      .channel('teacher_messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'teacher_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['teacher_messages'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    messages: messages || [],
    isLoading,
    createMessage: createMessageMutation.mutate,
    isCreating: createMessageMutation.isPending,
    moderateMessage: moderateMessageMutation.mutate,
    isModerating: moderateMessageMutation.isPending,
  };
};