import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GroupStudent {
  id: string;
  group_id: string;
  student_id: string;
  enrollment_date: string;
  status: 'active' | 'inactive' | 'completed';
  notes?: string;
}

export const useGroupStudents = (groupId?: string) => {
  const [groupStudents, setGroupStudents] = useState<GroupStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchGroupStudents = async () => {
    if (!groupId) return;
    
    setLoading(true);
    try {
      // For now, return empty array since types aren't updated yet
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
      toast({
        title: "Функция в разработке",
        description: "Добавление студентов будет доступно позже",
        variant: "destructive",
      });
      return false;
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
        title: "Функция в разработке",
        description: "Удаление студентов будет доступно позже",
        variant: "destructive",
      });
      return false;
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