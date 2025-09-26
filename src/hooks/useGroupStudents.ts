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
  student: {
    id: string;
    name: string;
    first_name?: string;
    last_name?: string;
    phone: string;
    age?: number;
  };
}

export const useGroupStudents = (groupId?: string) => {
  const [groupStudents, setGroupStudents] = useState<GroupStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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
            phone,
            age
          )
        `)
        .eq('group_id', groupId)
        .eq('status', 'active');

      if (error) throw error;
      setGroupStudents(data || []);
    } catch (error) {
      console.error('Error fetching group students:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить студентов группы",
        variant: "destructive",
      });
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
          enrollment_date: new Date().toISOString().split('T')[0],
          status: 'active',
          notes
        });

      if (error) throw error;

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
      const { error } = await supabase
        .from('group_students')
        .update({ status: 'inactive' })
        .eq('id', groupStudentId);

      if (error) throw error;

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