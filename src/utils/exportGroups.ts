import * as XLSX from 'xlsx';
import { LearningGroup } from '@/hooks/useLearningGroups';
import { GroupStudent } from '@/hooks/useGroupStudents';

/**
 * Экспортирует список групп в Excel файл
 */
export const exportGroupsToExcel = (
  groups: LearningGroup[],
  filename: string = 'groups'
) => {
  try {
    const ws = XLSX.utils.json_to_sheet(
      groups.map(g => ({
        'Название': g.name,
        'Филиал': g.branch,
        'Дисциплина': g.subject,
        'Уровень': g.level,
        'Категория': getCategoryLabel(g.category),
        'Тип': g.group_type === 'mini' ? 'Мини-группа' : 'Группа',
        'Статус': getStatusLabel(g.status),
        'Студентов': g.current_students,
        'Вместимость': g.capacity,
        'Заполненность %': Math.round((g.current_students / g.capacity) * 100),
        'Расписание': formatSchedule(g.schedule_days, g.schedule_time),
        'Преподаватель': g.responsible_teacher || 'Не назначен',
        'Дата начала': g.period_start || '',
        'Дата окончания': g.period_end || '',
        'Авто-группа': g.is_auto_group ? 'Да' : 'Нет',
        'Создана': new Date(g.created_at).toLocaleDateString('ru-RU')
      }))
    );
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Группы');
    
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${filename}_${dateStr}.xlsx`);
    
    return true;
  } catch (error) {
    console.error('Error exporting groups to Excel:', error);
    throw error;
  }
};

/**
 * Экспортирует студентов группы в Excel файл
 */
export const exportGroupStudentsToExcel = (
  groupName: string,
  students: GroupStudent[],
  filename?: string
) => {
  try {
    const ws = XLSX.utils.json_to_sheet(
      students.map(gs => ({
        'Фамилия': gs.student?.last_name || '',
        'Имя': gs.student?.first_name || '',
        'Отчество': gs.student?.middle_name || '',
        'Телефон': gs.student?.phone || '',
        'Возраст': gs.student?.age || '',
        'Статус': getStudentStatusLabel(gs.status),
        'Дата зачисления': new Date(gs.enrollment_date).toLocaleDateString('ru-RU'),
        'Тип зачисления': getEnrollmentTypeLabel(gs.enrollment_type),
        'Примечания': gs.notes || ''
      }))
    );
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Студенты');
    
    const dateStr = new Date().toISOString().split('T')[0];
    const exportFilename = filename || `students_${groupName.replace(/\s+/g, '_')}`;
    XLSX.writeFile(wb, `${exportFilename}_${dateStr}.xlsx`);
    
    return true;
  } catch (error) {
    console.error('Error exporting group students to Excel:', error);
    throw error;
  }
};

/**
 * Экспортирует расширенную статистику группы в Excel
 */
export const exportGroupDetailedReport = (
  group: LearningGroup,
  students: GroupStudent[],
  financialStats?: {
    totalPaid: number;
    totalDebt: number;
    studentsWithDebt: number;
  }
) => {
  try {
    const wb = XLSX.utils.book_new();
    
    // Лист 1: Общая информация о группе
    const groupInfoWs = XLSX.utils.json_to_sheet([
      {
        'Параметр': 'Название',
        'Значение': group.name
      },
      {
        'Параметр': 'Филиал',
        'Значение': group.branch
      },
      {
        'Параметр': 'Дисциплина',
        'Значение': group.subject
      },
      {
        'Параметр': 'Уровень',
        'Значение': group.level
      },
      {
        'Параметр': 'Статус',
        'Значение': getStatusLabel(group.status)
      },
      {
        'Параметр': 'Преподаватель',
        'Значение': group.responsible_teacher || 'Не назначен'
      },
      {
        'Параметр': 'Студентов',
        'Значение': `${group.current_students} / ${group.capacity}`
      },
      {
        'Параметр': 'Расписание',
        'Значение': formatSchedule(group.schedule_days, group.schedule_time)
      }
    ]);
    
    // Лист 2: Студенты
    const studentsWs = XLSX.utils.json_to_sheet(
      students.map(gs => ({
        'ФИО': `${gs.student?.last_name || ''} ${gs.student?.first_name || ''} ${gs.student?.middle_name || ''}`.trim(),
        'Телефон': gs.student?.phone || '',
        'Возраст': gs.student?.age || '',
        'Статус': getStudentStatusLabel(gs.status),
        'Дата зачисления': new Date(gs.enrollment_date).toLocaleDateString('ru-RU'),
        'Примечания': gs.notes || ''
      }))
    );
    
    // Лист 3: Финансы (если предоставлены)
    if (financialStats) {
      const financeWs = XLSX.utils.json_to_sheet([
        {
          'Показатель': 'Всего оплачено',
          'Значение': financialStats.totalPaid
        },
        {
          'Показатель': 'Всего долг',
          'Значение': financialStats.totalDebt
        },
        {
          'Показатель': 'Студентов с долгом',
          'Значение': financialStats.studentsWithDebt
        }
      ]);
      XLSX.utils.book_append_sheet(wb, financeWs, 'Финансы');
    }
    
    XLSX.utils.book_append_sheet(wb, groupInfoWs, 'Информация');
    XLSX.utils.book_append_sheet(wb, studentsWs, 'Студенты');
    
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `group_report_${group.name.replace(/\s+/g, '_')}_${dateStr}.xlsx`;
    XLSX.writeFile(wb, filename);
    
    return true;
  } catch (error) {
    console.error('Error exporting group detailed report:', error);
    throw error;
  }
};

// Вспомогательные функции
const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    'preschool': 'Дошкольники',
    'school': 'Школьники',
    'adult': 'Взрослые',
    'all': 'Все'
  };
  return labels[category] || category;
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'reserve': 'Резерв',
    'forming': 'Формируется',
    'active': 'В работе',
    'suspended': 'Приостановлена',
    'finished': 'Завершена'
  };
  return labels[status] || status;
};

const getStudentStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'active': 'Активный',
    'inactive': 'Неактивный',
    'completed': 'Завершил',
    'dropped': 'Исключён',
    'paused': 'Приостановлен',
    'reserve': 'Резерв',
    'makeup': 'Отработка'
  };
  return labels[status] || status;
};

const getEnrollmentTypeLabel = (type?: string): string => {
  if (!type) return 'Ручное';
  const labels: Record<string, string> = {
    'manual': 'Ручное',
    'auto': 'Автоматическое',
    'transfer': 'Перевод',
    'lead_conversion': 'Из лидов'
  };
  return labels[type] || type;
};

const formatSchedule = (days?: string[], time?: string): string => {
  if (!days || !time) return 'Не указано';
  const dayMap: Record<string, string> = {
    'monday': 'Пн',
    'tuesday': 'Вт',
    'wednesday': 'Ср',
    'thursday': 'Чт',
    'friday': 'Пт',
    'saturday': 'Сб',
    'sunday': 'Вс'
  };
  const formattedDays = days.map(day => dayMap[day.toLowerCase()] || day).join(', ');
  return `${formattedDays} ${time}`;
};
