import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Student } from './useStudents';

export const useAvailableStudents = (groupId?: string) => {
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAvailableStudents = async () => {
    if (!groupId) return;
    
    setLoading(true);
    try {
      // Получаем всех активных студентов
      const { data: allStudents, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('status', 'active');

      if (studentsError) throw studentsError;

      // Пока нет таблицы group_students, показываем всех студентов
      setAvailableStudents(allStudents || []);
    } catch (error) {
      console.error('Error fetching available students:', error);
      setAvailableStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableStudents();
  }, [groupId]);

  return {
    availableStudents,
    loading,
    refetch: fetchAvailableStudents
  };
};