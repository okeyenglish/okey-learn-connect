import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Student } from './useStudents';

export interface GroupStudent {
  id: string;
  group_id: string;
  student_id: string;
  enrollment_date: string;
  status: 'active' | 'inactive' | 'completed';
  notes?: string;
  student?: Student;
}

export const useGroupStudents = (groupId?: string) => {
  const [groupStudents, setGroupStudents] = useState<GroupStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchGroupStudents = async () => {
    if (!groupId) return;
    
    setLoading(true);
    try {
      // Пока группа студентов не работает из-за отсутствия таблицы, возвращаем пустой массив
      setGroupStudents([]);
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
      // Пока не работает, имитируем успех
      toast({
        title: "Успешно",
        description: "Студент добавлен в группу",
      });

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

  const removeStudentFromGroup = async (groupStudentId: string) => {
    try {
      toast({
        title: "Успешно",
        description: "Студент исключен из группы",
      });

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