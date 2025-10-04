import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Student } from './useStudents';

export interface GroupStudent {
  id: string;
  group_id: string;
  student_id: string;
  enrollment_date: string;
  status: 'active' | 'inactive' | 'completed' | 'dropped' | 'paused';
  notes?: string;
  student?: Student;
}

export const useGroupStudents = (groupId?: string) => {
  const [groupStudents, setGroupStudents] = useState<GroupStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchGroupStudents = async () => {
    if (!groupId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('group_students')
        .select(`
          *,
          student:students (
            id,
            name,
            first_name,
            last_name,
            middle_name,
            phone,
            age,
            status,
            created_at,
            updated_at
          )
        `)
        .eq('group_id', groupId)
        .eq('status', 'active');

      if (error) throw error;

      setGroupStudents(data || []);
    } catch (error) {
      console.error('Error fetching group students:', error);
      setGroupStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const addStudentToGroup = async (studentId: string, notes?: string) => {
    if (!groupId) return false;

    try {
      const { error } = await supabase
        .from('group_students')
        .insert({
          group_id: groupId,
          student_id: studentId,
          status: 'active',
          enrollment_date: new Date().toISOString().split('T')[0],
          notes: notes || null,
        });

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Студент добавлен в группу",
      });

      // Инвалидируем кеш для обновления данных студента
      queryClient.invalidateQueries({ queryKey: ['student-details', studentId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['learning-groups'] });

      fetchGroupStudents();
      return true;
    } catch (error) {
      console.error('Error adding student to group:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить студента в группу",
        variant: "destructive",
      });
      return false;
    }
  };

  const removeStudentFromGroup = async (groupStudentId: string, studentId: string, transferFunds: boolean = true) => {
    try {
      // Update status to dropped instead of deleting
      const { error: updateError } = await supabase
        .from('group_students')
        .update({ 
          status: 'dropped',
          updated_at: new Date().toISOString()
        })
        .eq('id', groupStudentId);

      if (updateError) throw updateError;

      // If transferFunds is true, calculate and transfer any remaining paid balance
      if (transferFunds) {
        // This would require calculating unpaid sessions and transferring to student balance
        // For now, we just mark the student as removed
        console.log('Fund transfer logic would be implemented here');
      }

      toast({
        title: "Успешно",
        description: "Студент исключен из группы",
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['student-details', studentId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['learning-groups'] });

      fetchGroupStudents();
      return true;
    } catch (error) {
      console.error('Error removing student from group:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось исключить студента из группы",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchGroupStudents();
  }, [groupId]);

  return {
    groupStudents,
    loading,
    addStudentToGroup,
    removeStudentFromGroup,
    refetch: fetchGroupStudents
  };
};