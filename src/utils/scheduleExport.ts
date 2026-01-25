import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export interface ScheduleExportSession {
  id: string;
  group_id: string;
  teacher_name: string;
  branch: string;
  classroom: string;
  lesson_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  learning_groups?: {
    name: string;
    level: string;
    subject: string;
  } | null;
}

export const exportScheduleToExcel = (
  sessions: ScheduleExportSession[],
  viewType: 'teachers' | 'classrooms' | 'all' = 'all',
  filename: string = 'schedule'
) => {
  // Подготовка данных для экспорта
  const exportData = sessions.map(session => ({
    'Дата': format(new Date(session.lesson_date), 'd MMMM yyyy', { locale: ru }),
    'День недели': format(new Date(session.lesson_date), 'EEEE', { locale: ru }),
    'Время начала': session.start_time,
    'Время окончания': session.end_time,
    'Группа': session.learning_groups?.name || '-',
    'Предмет': session.learning_groups?.subject || '-',
    'Уровень': session.learning_groups?.level || '-',
    'Преподаватель': session.teacher_name,
    'Филиал': session.branch,
    'Аудитория': session.classroom,
    'Статус': getStatusLabel(session.status),
    'Примечания': session.notes || '-',
  }));

  // Создание workbook
  const wb = XLSX.utils.book_new();
  
  // Создание worksheet из данных
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Настройка ширины колонок
  const columnWidths = [
    { wch: 15 }, // Дата
    { wch: 15 }, // День недели
    { wch: 12 }, // Время начала
    { wch: 12 }, // Время окончания
    { wch: 20 }, // Группа
    { wch: 15 }, // Предмет
    { wch: 10 }, // Уровень
    { wch: 20 }, // Преподаватель
    { wch: 15 }, // Филиал
    { wch: 12 }, // Аудитория
    { wch: 15 }, // Статус
    { wch: 30 }, // Примечания
  ];
  ws['!cols'] = columnWidths;

  // Добавление worksheet в workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Расписание');

  // Если нужен отдельный лист по преподавателям
  if (viewType === 'teachers') {
    const teacherStats = getTeacherStats(sessions);
    const teacherWs = XLSX.utils.json_to_sheet(teacherStats);
    teacherWs['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, teacherWs, 'Статистика преподавателей');
  }

  // Если нужен отдельный лист по аудиториям
  if (viewType === 'classrooms') {
    const classroomStats = getClassroomStats(sessions);
    const classroomWs = XLSX.utils.json_to_sheet(classroomStats);
    classroomWs['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, classroomWs, 'Статистика аудиторий');
  }

  // Генерация файла
  const date = format(new Date(), 'yyyy-MM-dd');
  XLSX.writeFile(wb, `${filename}_${date}.xlsx`);
};

const getTeacherStats = (sessions: ScheduleExportSession[]) => {
  const teacherMap = new Map<string, { total: number; scheduled: number; completed: number }>();

  sessions.forEach(session => {
    const stats = teacherMap.get(session.teacher_name) || { total: 0, scheduled: 0, completed: 0 };
    stats.total++;
    if (session.status === 'scheduled') stats.scheduled++;
    if (session.status === 'completed') stats.completed++;
    teacherMap.set(session.teacher_name, stats);
  });

  return Array.from(teacherMap.entries()).map(([teacher, stats]) => ({
    'Преподаватель': teacher,
    'Всего занятий': stats.total,
    'Запланировано': stats.scheduled,
    'Проведено': stats.completed,
  }));
};

const getClassroomStats = (sessions: ScheduleExportSession[]) => {
  const classroomMap = new Map<string, { total: number; branch: string; scheduled: number }>();

  sessions.forEach(session => {
    const key = `${session.branch} - ${session.classroom}`;
    const stats = classroomMap.get(key) || { total: 0, branch: session.branch, scheduled: 0 };
    stats.total++;
    if (session.status === 'scheduled') stats.scheduled++;
    classroomMap.set(key, stats);
  });

  return Array.from(classroomMap.entries()).map(([classroom, stats]) => ({
    'Аудитория': classroom,
    'Филиал': stats.branch,
    'Всего занятий': stats.total,
    'Запланировано': stats.scheduled,
  }));
};

const getStatusLabel = (status: string): string => {
  const statusLabels: Record<string, string> = {
    'scheduled': 'Запланировано',
    'cancelled': 'Отменено',
    'completed': 'Проведено',
    'rescheduled': 'Перенесено'
  };
  return statusLabels[status] || status;
};
