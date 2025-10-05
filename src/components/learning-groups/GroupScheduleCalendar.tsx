import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Circle, CheckCircle, XCircle, RotateCcw, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useLessonSessions } from "@/hooks/useLessonSessions";
import { useGroupStudents } from "@/hooks/useGroupStudents";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { ru } from "date-fns/locale";
import { GroupLessonScheduleStrip } from "./GroupLessonScheduleStrip";
import { StudentLessonScheduleStrip } from "./StudentLessonScheduleStrip";
import { StudentPaymentInfo } from "./StudentPaymentInfo";
import { LessonColorLegend } from "./LessonColorLegend";
import { AddLessonModal } from "../schedule/AddLessonModal";
import { supabase } from "@/integrations/supabase/client";

interface GroupScheduleCalendarProps {
  groupId: string;
}

export const GroupScheduleCalendar = ({ groupId }: GroupScheduleCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [studentSessions, setStudentSessions] = useState<Record<string, any[]>>({});
  const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});
  const [addLessonOpen, setAddLessonOpen] = useState(false);
  
  // Загружаем ВСЕ занятия группы без ограничений по датам
  const { data: sessions = [], isLoading, refetch } = useLessonSessions({});

  const { groupStudents = [], loading: studentsLoading } = useGroupStudents(groupId);

  // Фильтруем занятия только для этой группы
  const groupSessions = sessions.filter(session => session.group_id === groupId);

  // Загружаем персональные данные студентов по занятиям
  React.useEffect(() => {
    const fetchStudentSessions = async () => {
      if (groupSessions.length === 0 || groupStudents.length === 0) {
        console.info('[GroupScheduleCalendar] Skip fetch: groupSessions', groupSessions.length, 'groupStudents', groupStudents.length);
        return;
      }

      const sessionIds = groupSessions.map(s => s.id);
      const studentIds = groupStudents.map(gs => gs.student_id);
      console.info('[GroupScheduleCalendar] Fetching student sessions for', {
        groupId,
        groupSessions: groupSessions.length,
        studentCount: groupStudents.length,
        firstSession: groupSessions[0]?.lesson_date,
      });
      
      // Объединяем запросы для оптимизации
      const [studentSessionsResponse, paymentsResponse] = await Promise.all([
        supabase
          .from('student_lesson_sessions')
          .select('*')
          .in('lesson_session_id', sessionIds)
          .in('student_id', studentIds),
        
        supabase
          .from('payments')
          .select('student_id, lessons_count, created_at')
          .in('student_id', studentIds)
          .eq('group_id', groupId)
          .order('created_at', { ascending: true })
      ]);

      if (studentSessionsResponse.error) {
        console.error('Error fetching student sessions:', studentSessionsResponse.error);
        return;
      }

      // Создаем Map для быстрого поиска персональных данных
      const studentSessionsMap = new Map();
      studentSessionsResponse.data?.forEach(session => {
        const key = `${session.student_id}_${session.lesson_session_id}`;
        studentSessionsMap.set(key, session);
      });

      // Создаем Map с оплаченных минут (академические часы × 40) для каждого студента
      const paidMinutesMap = new Map<string, number>();
      paymentsResponse.data?.forEach(payment => {
        const current = paidMinutesMap.get(payment.student_id) || 0;
        const paidAcademicHours = payment.lessons_count || 0;
        paidMinutesMap.set(payment.student_id, current + paidAcademicHours * 40);
      });

      // Группируем по студентам, создавая записи для всех занятий группы
      const grouped: Record<string, any[]> = {};
      
      // Сортируем занятия по дате для правильного порядка
      const sortedSessions = [...groupSessions].sort((a, b) => 
        new Date(a.lesson_date).getTime() - new Date(b.lesson_date).getTime()
      );

      groupStudents.forEach(groupStudent => {
        const studentId = groupStudent.student_id;
        grouped[studentId] = [];
        
        const totalPaidMinutes = paidMinutesMap.get(studentId) || 0;
        const enrollmentDate = groupStudent.enrollment_date ? new Date(groupStudent.enrollment_date) : null;
        
        // Устанавливаем время на начало дня для корректного сравнения
        if (enrollmentDate) {
          enrollmentDate.setHours(0, 0, 0, 0);
        }
        
        // Фильтруем занятия начиная с даты зачисления студента
        const studentLessons = enrollmentDate 
          ? sortedSessions.filter(session => {
              const sessionDate = new Date(session.lesson_date);
              sessionDate.setHours(0, 0, 0, 0);
              return sessionDate >= enrollmentDate;
            })
          : sortedSessions;
        
        // Для каждого занятия студента (после зачисления) создаем запись
        let remainingPaidMinutes = (paidMinutesMap.get(studentId) || 0);
        const getDuration = (s: any) => {
          if (s.start_time && s.end_time) {
            try {
              const [sh, sm] = String(s.start_time).split(':').map(Number);
              const [eh, em] = String(s.end_time).split(':').map(Number);
              return (eh * 60 + em) - (sh * 60 + sm);
            } catch { return 80; }
          }
          return 80;
        };
        studentLessons.forEach((lessonSession) => {
          const key = `${studentId}_${lessonSession.id}`;
          const personalData = studentSessionsMap.get(key);
          
          const lessonDate = new Date(lessonSession.lesson_date);
          lessonDate.setHours(0, 0, 0, 0);
          
          // Определяем статус оплаты на основе оставшихся оплаченных минут
          let payment_status = 'not_paid';
          let is_cancelled_for_student = personalData?.is_cancelled_for_student || false;
          let cancellation_reason = personalData?.cancellation_reason || null;
          
          if (personalData?.payment_status && personalData.payment_status !== 'not_paid') {
            // Если уже есть явный статус - используем его
            payment_status = personalData.payment_status;
          } else {
            const duration = getDuration(lessonSession);
            if (remainingPaidMinutes >= duration) {
              payment_status = 'paid';
              remainingPaidMinutes -= duration;
            }
          }
          
          // Если есть персональные данные - используем их, иначе создаем дефолтную запись
          grouped[studentId].push({
            id: personalData?.id || `temp_${key}`,
            lesson_session_id: lessonSession.id,
            student_id: studentId,
            lesson_date: lessonSession.lesson_date,
            attendance_status: personalData?.attendance_status || 'not_marked',
            payment_status,
            payment_amount: personalData?.payment_amount || 0,
            is_cancelled_for_student,
            cancellation_reason,
            notes: personalData?.notes || null,
            // Добавляем флаг что это временная запись (нужна для правильной обработки)
            _isTemp: !personalData
          });
        });
      });

      console.info('[GroupScheduleCalendar] Built grouped sessions counts:', Object.fromEntries(Object.entries(grouped).map(([k,v]) => [k, v.length])));
      setStudentSessions(grouped);
    };

    fetchStudentSessions();
  }, [groupSessions, groupStudents, groupId]);

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
      <LessonColorLegend />

      {/* Общее расписание группы */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Общее расписание группы</h3>
            <Button 
              size="sm" 
              className="bg-blue-500 hover:bg-blue-600"
              onClick={() => setAddLessonOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить занятие
            </Button>
          </div>
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
                      <div className="flex items-start justify-between mb-3 gap-4">
                        <div className="flex items-center gap-2 flex-1">
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
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-gray-900">
                                {student.name || `Студент ${student.id}`}
                              </span>
                              <span className="text-sm text-gray-500">
                                ({sessions.length} занятий)
                              </span>
                            </div>
                            
                            {/* Информация о платежах */}
                            <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                              <StudentPaymentInfo 
                                studentId={student.id}
                                groupId={groupId}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3">
                          <StudentLessonScheduleStrip
                            studentId={student.id}
                            studentName={student.name || `Студент ${student.id}`}
                            sessions={sessions}
                            onSessionUpdated={refetch}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Модальное окно добавления занятия */}
      <AddLessonModal 
        open={addLessonOpen} 
        onOpenChange={(open) => {
          setAddLessonOpen(open);
          if (!open) {
            // Обновляем данные после закрытия модального окна
            refetch();
          }
        }}
        defaultGroupId={groupId}
      />
    </div>
  );
};