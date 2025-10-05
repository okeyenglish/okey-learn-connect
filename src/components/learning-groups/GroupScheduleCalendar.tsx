import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Circle, CheckCircle, XCircle, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { useLessonSessions } from "@/hooks/useLessonSessions";
import { useGroupStudents } from "@/hooks/useGroupStudents";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { ru } from "date-fns/locale";
import { GroupLessonScheduleStrip } from "./GroupLessonScheduleStrip";
import { StudentLessonScheduleStrip } from "./StudentLessonScheduleStrip";
import { supabase } from "@/integrations/supabase/client";

interface GroupScheduleCalendarProps {
  groupId: string;
}

export const GroupScheduleCalendar = ({ groupId }: GroupScheduleCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [studentSessions, setStudentSessions] = useState<Record<string, any[]>>({});
  const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});
  
  // Расширяем диапазон для отображения полных недель
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const { data: sessions = [], isLoading, refetch } = useLessonSessions({
    date_from: format(calendarStart, 'yyyy-MM-dd'),
    date_to: format(calendarEnd, 'yyyy-MM-dd')
  });

  const { groupStudents = [], loading: studentsLoading } = useGroupStudents(groupId);

  // Фильтруем занятия только для этой группы
  const groupSessions = sessions.filter(session => session.group_id === groupId);

  // Загружаем персональные данные студентов по занятиям
  React.useEffect(() => {
    const fetchStudentSessions = async () => {
      if (groupSessions.length === 0 || groupStudents.length === 0) return;

      const sessionIds = groupSessions.map(s => s.id);
      
      const { data, error } = await supabase
        .from('student_lesson_sessions')
        .select('*')
        .in('lesson_session_id', sessionIds)
        .in('student_id', groupStudents.map(gs => gs.student_id));

      if (error) {
        console.error('Error fetching student sessions:', error);
        return;
      }

      // Создаем Map для быстрого поиска персональных данных
      const studentSessionsMap = new Map();
      data?.forEach(session => {
        const key = `${session.student_id}_${session.lesson_session_id}`;
        studentSessionsMap.set(key, session);
      });

      // Группируем по студентам, создавая записи для всех занятий группы
      const grouped: Record<string, any[]> = {};
      
      groupStudents.forEach(groupStudent => {
        const studentId = groupStudent.student_id;
        grouped[studentId] = [];
        
        // Для каждого занятия группы создаем запись для студента
        groupSessions.forEach(lessonSession => {
          const key = `${studentId}_${lessonSession.id}`;
          const personalData = studentSessionsMap.get(key);
          
          // Если есть персональные данные - используем их, иначе создаем дефолтную запись
          grouped[studentId].push({
            id: personalData?.id || `temp_${key}`,
            lesson_session_id: lessonSession.id,
            student_id: studentId,
            lesson_date: lessonSession.lesson_date,
            attendance_status: personalData?.attendance_status || 'not_marked',
            payment_status: personalData?.payment_status || 'not_paid',
            payment_amount: personalData?.payment_amount || 0,
            is_cancelled_for_student: personalData?.is_cancelled_for_student || false,
            cancellation_reason: personalData?.cancellation_reason || null,
            notes: personalData?.notes || null,
            // Добавляем флаг что это временная запись (нужна для правильной обработки)
            _isTemp: !personalData
          });
        });
      });

      setStudentSessions(grouped);
    };

    fetchStudentSessions();
  }, [groupSessions, groupStudents]);

  const toggleStudent = (studentId: string) => {
    setExpandedStudents(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Загрузка календаря...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Легенда статусов */}
      <Card className="border-dashed border-gray-300">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Circle className="h-3 w-3 text-blue-600" />
              <span>Запланировано</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>Проведено</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-3 w-3 text-red-600" />
              <span>Отменено</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="h-3 w-3 text-yellow-600" />
              <span>Перенесено</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-yellow-500 rounded" />
              <span>Требует внимания</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Общее расписание группы */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Общее расписание группы</h3>
          {groupSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Нет занятий в выбранном периоде
            </div>
          ) : (
            <GroupLessonScheduleStrip 
              sessions={groupSessions}
              onSessionUpdated={refetch}
            />
          )}
        </CardContent>
      </Card>

      {/* Расписание каждого студента */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Ученики (всего {groupStudents.filter(gs => gs.status === 'active').length})
          </h3>
          
          {studentsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Загрузка учеников...</p>
            </div>
          ) : groupStudents.filter(gs => gs.status === 'active').length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Нет активных учеников в группе
            </div>
          ) : (
            <div className="space-y-4">
              {groupStudents
                .filter(gs => gs.status === 'active')
                .map((groupStudent) => {
                  const student = groupStudent.student;
                  const isExpanded = expandedStudents[student.id] !== false; // По умолчанию развернуто
                  const sessions = studentSessions[student.id] || [];

                  return (
                    <div key={student.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStudent(student.id)}
                            className="p-0 h-auto"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                          <span className="font-medium text-gray-900">
                            {student.name || `Студент ${student.id}`}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({sessions.length} занятий)
                          </span>
                        </div>
                      </div>

                      {isExpanded && (
                        <StudentLessonScheduleStrip
                          studentId={student.id}
                          studentName={student.name || `Студент ${student.id}`}
                          sessions={sessions}
                          onSessionUpdated={refetch}
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};