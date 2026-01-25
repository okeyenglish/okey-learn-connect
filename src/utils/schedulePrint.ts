import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export interface SchedulePrintSession {
  id: string;
  lesson_date: string;
  start_time: string;
  end_time: string;
  teacher_name: string;
  branch: string;
  classroom: string;
  status: string;
  notes?: string;
  learning_groups?: {
    name: string;
    level: string;
    subject: string;
  } | null;
}

export const printSchedule = (
  sessions: SchedulePrintSession[],
  viewType: 'teachers' | 'classrooms' | 'all' = 'all',
  title: string = 'Расписание занятий'
) => {
  // Создаем HTML для печати
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Разрешите всплывающие окна для печати');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          @media print {
            @page {
              size: A4 landscape;
              margin: 15mm;
            }
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 10pt;
            line-height: 1.4;
            color: #333;
          }
          
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #333;
          }
          
          .header h1 {
            font-size: 18pt;
            margin-bottom: 5px;
          }
          
          .header .subtitle {
            color: #666;
            font-size: 10pt;
          }
          
          .metadata {
            margin-bottom: 15px;
            display: flex;
            justify-content: space-between;
            font-size: 9pt;
            color: #666;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          
          th {
            background-color: #f0f0f0;
            font-weight: 600;
            text-align: left;
            padding: 8px;
            border: 1px solid #ddd;
            font-size: 9pt;
          }
          
          td {
            padding: 6px 8px;
            border: 1px solid #ddd;
            font-size: 9pt;
          }
          
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          
          .status-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 8pt;
            font-weight: 500;
          }
          
          .status-scheduled {
            background-color: #dbeafe;
            color: #1e40af;
          }
          
          .status-completed {
            background-color: #dcfce7;
            color: #166534;
          }
          
          .status-cancelled {
            background-color: #fee2e2;
            color: #991b1b;
          }
          
          .status-rescheduled {
            background-color: #fef3c7;
            color: #92400e;
          }
          
          .footer {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 8pt;
            color: #999;
          }
          
          .group-section {
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          
          .group-header {
            background-color: #e5e7eb;
            padding: 8px;
            font-weight: 600;
            margin-bottom: 5px;
            font-size: 11pt;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <div class="subtitle">O'KEY ENGLISH Language Centre</div>
        </div>
        
        <div class="metadata">
          <div>Дата формирования: ${format(new Date(), 'd MMMM yyyy, HH:mm', { locale: ru })}</div>
          <div>Всего занятий: ${sessions.length}</div>
        </div>
        
        ${generateScheduleTable(sessions, viewType)}
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} O'KEY ENGLISH. Все права защищены.</p>
          <p>Документ сформирован автоматически</p>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  
  // Даем время на загрузку и открываем диалог печати
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
};

const generateScheduleTable = (sessions: SchedulePrintSession[], viewType: string): string => {
  if (viewType === 'teachers') {
    return generateTeacherSchedule(sessions);
  } else if (viewType === 'classrooms') {
    return generateClassroomSchedule(sessions);
  } else {
    return generateAllSchedule(sessions);
  }
};

const generateAllSchedule = (sessions: SchedulePrintSession[]): string => {
  const sortedSessions = [...sessions].sort((a, b) => {
    const dateCompare = a.lesson_date.localeCompare(b.lesson_date);
    if (dateCompare !== 0) return dateCompare;
    return a.start_time.localeCompare(b.start_time);
  });

  return `
    <table>
      <thead>
        <tr>
          <th>Дата</th>
          <th>Время</th>
          <th>Группа</th>
          <th>Преподаватель</th>
          <th>Филиал</th>
          <th>Аудитория</th>
          <th>Статус</th>
          <th>Примечания</th>
        </tr>
      </thead>
      <tbody>
        ${sortedSessions.map(session => `
          <tr>
            <td>${format(new Date(session.lesson_date), 'd MMM yyyy', { locale: ru })}</td>
            <td>${session.start_time}-${session.end_time}</td>
            <td>${session.learning_groups?.name || '-'}</td>
            <td>${session.teacher_name}</td>
            <td>${session.branch}</td>
            <td>${session.classroom}</td>
            <td><span class="status-badge status-${session.status}">${getStatusLabel(session.status)}</span></td>
            <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis;">${session.notes || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
};

const generateTeacherSchedule = (sessions: SchedulePrintSession[]): string => {
  const teacherGroups: { [key: string]: SchedulePrintSession[] } = {};
  
  sessions.forEach(session => {
    if (!teacherGroups[session.teacher_name]) {
      teacherGroups[session.teacher_name] = [];
    }
    teacherGroups[session.teacher_name].push(session);
  });

  return Object.entries(teacherGroups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([teacher, teacherSessions]) => {
      const sorted = teacherSessions.sort((a, b) => {
        const dateCompare = a.lesson_date.localeCompare(b.lesson_date);
        if (dateCompare !== 0) return dateCompare;
        return a.start_time.localeCompare(b.start_time);
      });

      return `
        <div class="group-section">
          <div class="group-header">Преподаватель: ${teacher}</div>
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Время</th>
                <th>Группа</th>
                <th>Филиал</th>
                <th>Аудитория</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              ${sorted.map(session => `
                <tr>
                  <td>${format(new Date(session.lesson_date), 'd MMM', { locale: ru })}</td>
                  <td>${session.start_time}-${session.end_time}</td>
                  <td>${session.learning_groups?.name || '-'}</td>
                  <td>${session.branch}</td>
                  <td>${session.classroom}</td>
                  <td><span class="status-badge status-${session.status}">${getStatusLabel(session.status)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }).join('');
};

const generateClassroomSchedule = (sessions: SchedulePrintSession[]): string => {
  const classroomGroups: { [key: string]: SchedulePrintSession[] } = {};
  
  sessions.forEach(session => {
    const key = `${session.branch} - ${session.classroom}`;
    if (!classroomGroups[key]) {
      classroomGroups[key] = [];
    }
    classroomGroups[key].push(session);
  });

  return Object.entries(classroomGroups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([classroom, classroomSessions]) => {
      const sorted = classroomSessions.sort((a, b) => {
        const dateCompare = a.lesson_date.localeCompare(b.lesson_date);
        if (dateCompare !== 0) return dateCompare;
        return a.start_time.localeCompare(b.start_time);
      });

      return `
        <div class="group-section">
          <div class="group-header">Аудитория: ${classroom}</div>
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Время</th>
                <th>Группа</th>
                <th>Преподаватель</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              ${sorted.map(session => `
                <tr>
                  <td>${format(new Date(session.lesson_date), 'd MMM', { locale: ru })}</td>
                  <td>${session.start_time}-${session.end_time}</td>
                  <td>${session.learning_groups?.name || '-'}</td>
                  <td>${session.teacher_name}</td>
                  <td><span class="status-badge status-${session.status}">${getStatusLabel(session.status)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }).join('');
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
