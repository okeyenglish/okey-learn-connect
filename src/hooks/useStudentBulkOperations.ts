import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useBulkUpdateStudents = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      studentIds, 
      updates 
    }: { 
      studentIds: string[]; 
      updates: Record<string, any>;
    }) => {
      // Call bulk update function
      const { error } = await supabase
        .from('students')
        .update(updates)
        .in('id', studentIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast({
        title: "Успех",
        description: "Ученики обновлены",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useBulkArchiveStudents = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      studentIds, 
      reason 
    }: { 
      studentIds: string[]; 
      reason: string;
    }) => {
      const updates: any = {
        status: 'archived',
        archived_at: new Date().toISOString(),
        archived_reason: reason,
      };

      const { error } = await supabase
        .from('students')
        .update(updates)
        .in('id', studentIds);

      if (error) throw error;

      // Log operations
      for (const studentId of studentIds) {
        await (supabase as any).from('student_operation_logs').insert({
          student_id: studentId,
          operation_type: 'archived',
          notes: reason,
          new_value: updates,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast({
        title: "Успех",
        description: "Ученики архивированы",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useBulkAssignToGroup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      studentIds, 
      groupId 
    }: { 
      studentIds: string[]; 
      groupId: string;
    }) => {
      const enrollments = studentIds.map(studentId => ({
        student_id: studentId,
        group_id: groupId,
        status: 'active' as const,
        enrollment_date: new Date().toISOString().split('T')[0],
        enrollment_type: 'manual',
      }));

      const { error } = await supabase
        .from('group_students')
        .insert(enrollments);

      if (error) throw error;

      // Log operations
      for (const studentId of studentIds) {
        await (supabase as any).from('student_operation_logs').insert({
          student_id: studentId,
          operation_type: 'enrolled_to_group',
          new_value: { group_id: groupId },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['group-students'] });
      toast({
        title: "Успех",
        description: "Ученики добавлены в группу",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useBulkSendNotification = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      studentIds, 
      message,
      channel 
    }: { 
      studentIds: string[]; 
      message: string;
      channel: 'email' | 'sms' | 'whatsapp';
    }) => {
      // This would integrate with your notification system
      // For now, just a placeholder
      console.log('Send notification to:', studentIds, 'via', channel, ':', message);
      
      // TODO: Implement actual notification sending
      // await supabase.functions.invoke('send-bulk-notification', {
      //   body: { studentIds, message, channel }
      // });
    },
    onSuccess: () => {
      toast({
        title: "Успех",
        description: "Уведомления отправлены",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
