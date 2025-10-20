import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useStudentExport = () => {
  const [isExporting, setIsExporting] = useState(false);

  const exportToExcel = async (includeDetails: boolean = false) => {
    setIsExporting(true);
    try {
      // Fetch all students with details
      const { data: students, error } = await supabase
        .from('students')
        .select(`
          *,
          family_groups:family_group_id (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let exportData: any[] = [];

      if (includeDetails) {
        // Fetch additional details for each student
        const studentsWithDetails = await Promise.all(
          (students || []).map(async (student: any) => {
            // Fetch parents
            const { data: familyMembers } = await supabase
              .from('family_members')
              .select(`
                *,
                clients:client_id (
                  name,
                  phone,
                  email
                )
              `)
              .eq('family_group_id', student.family_group_id || '');

            const parents = (familyMembers || [])
              .map((m: any) => m.clients?.name)
              .filter(Boolean)
              .join(', ');

            // Fetch groups
            const { data: groupStudents } = await supabase
              .from('group_students')
              .select(`
                learning_groups (
                  name,
                  subject
                )
              `)
              .eq('student_id', student.id)
              .eq('status', 'active');

            const groups = (groupStudents || [])
              .map((gs: any) => gs.learning_groups?.name)
              .filter(Boolean)
              .join(', ');

            // Fetch payments total
            const { data: payments } = await supabase
              .from('payments')
              .select('amount')
              .eq('student_id', student.id);

            const totalPayments = (payments || [])
              .reduce((sum, p) => sum + (p.amount || 0), 0);

            return {
              'Номер студента': student.student_number || '',
              'Фамилия': student.last_name || '',
              'Имя': student.first_name || '',
              'Отчество': student.middle_name || '',
              'Дата рождения': student.date_of_birth || '',
              'Возраст': student.age || '',
              'Пол': student.gender === 'male' ? 'Мужской' : student.gender === 'female' ? 'Женский' : '',
              'Телефон': student.phone || '',
              'Email': student.lk_email || '',
              'Статус': student.status || '',
              'Филиал': student.branch || '',
              'Родители': parents,
              'Группы': groups,
              'Всего оплат': totalPayments,
              'Примечания': student.notes || '',
              'Дата создания': student.created_at || '',
            };
          })
        );

        exportData = studentsWithDetails;
      } else {
        // Simple export
        exportData = (students || []).map((student: any) => ({
          'Номер студента': student.student_number || '',
          'Фамилия': student.last_name || '',
          'Имя': student.first_name || '',
          'Отчество': student.middle_name || '',
          'Дата рождения': student.date_of_birth || '',
          'Возраст': student.age || '',
          'Пол': student.gender === 'male' ? 'Мужской' : student.gender === 'female' ? 'Женский' : '',
          'Телефон': student.phone || '',
          'Email': student.lk_email || '',
          'Статус': student.status || '',
          'Филиал': student.branch || '',
          'Дата создания': student.created_at || '',
        }));
      }

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Студенты');

      // Set column widths
      const wscols = [
        { wch: 15 }, // Номер студента
        { wch: 20 }, // Фамилия
        { wch: 20 }, // Имя
        { wch: 20 }, // Отчество
        { wch: 15 }, // Дата рождения
        { wch: 10 }, // Возраст
        { wch: 10 }, // Пол
        { wch: 15 }, // Телефон
        { wch: 25 }, // Email
        { wch: 12 }, // Статус
        { wch: 15 }, // Филиал
      ];

      if (includeDetails) {
        wscols.push(
          { wch: 30 }, // Родители
          { wch: 30 }, // Группы
          { wch: 15 }, // Всего оплат
          { wch: 40 }, // Примечания
          { wch: 20 }  // Дата создания
        );
      } else {
        wscols.push({ wch: 20 }); // Дата создания
      }

      ws['!cols'] = wscols;

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `students_${timestamp}${includeDetails ? '_detailed' : ''}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);

      toast.success(`Экспортировано ${exportData.length} студентов`);
    } catch (error) {
      console.error('Error exporting students:', error);
      toast.error('Ошибка при экспорте данных');
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToExcel, isExporting };
};
