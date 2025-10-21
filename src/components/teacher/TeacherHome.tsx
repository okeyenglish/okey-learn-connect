import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Video, BookOpen, User, Clock, MapPin, BarChart3, AlertCircle, CheckCircle, TrendingUp, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Teacher } from '@/hooks/useTeachers';
import { GroupDetailModal } from '@/components/teacher/GroupDetailModal';
import { IndividualLessonModal } from '@/components/teacher/IndividualLessonModal';
import { AddHomeworkModal } from '@/components/teacher/AddHomeworkModal';
import { AttendanceModal } from '@/components/teacher/AttendanceModal';
import { StartLessonModal } from '@/components/teacher/StartLessonModal';
import { LessonPlanCard } from '@/components/teacher/LessonPlanCard';
import { getLessonNumberForGroup } from '@/utils/lessonCalculator';
import { DashboardModal } from '@/components/dashboards/DashboardModal';
import { QuickActionsPanel } from '@/components/teacher/QuickActionsPanel';
import { GroupAttendanceModal } from '@/components/teacher/modals/GroupAttendanceModal';
import { HomeworkModal } from '@/components/teacher/modals/HomeworkModal';
import { QuickStartLessonModal } from '@/components/teacher/modals/QuickStartLessonModal';
import { SubstitutionRequestModal } from '@/components/teacher/modals/SubstitutionRequestModal';
import { KpiCard } from '@/components/teacher/ui/KpiCard';
import { LessonCard } from '@/components/teacher/ui/LessonCard';
import { EmptyState } from '@/components/teacher/ui/EmptyState';

interface TeacherHomeProps {
  teacher: Teacher;
}

export const TeacherHome = ({ teacher }: TeacherHomeProps) => {
  const navigate = useNavigate();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [homeworkModalOpen, setHomeworkModalOpen] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [startLessonModalOpen, setStartLessonModalOpen] = useState(false);
  const [showDashboardModal, setShowDashboardModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSessionData, setSelectedSessionData] = useState<any>(null);
  
  // Быстрые действия
  const [quickAttendanceModal, setQuickAttendanceModal] = useState<{ open: boolean; groupId: string; sessionId: string; sessionDate: string } | null>(null);
  const [quickHomeworkModal, setQuickHomeworkModal] = useState<{ open: boolean; groupId: string; sessionId: string } | null>(null);
  const [quickStartModal, setQuickStartModal] = useState<{ open: boolean; session: any } | null>(null);
  const [substitutionModal, setSubstitutionModal] = useState<{ open: boolean; type: 'substitution' | 'absence' } | null>(null);

  const teacherName = `${teacher.last_name} ${teacher.first_name}`;

  // Получаем сегодняшние занятия преподавателя
  const { data: todayLessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ['teacher-lessons-today', teacherName],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('lesson_sessions')
        .select(`
          *,
          learning_groups (
            name,
            subject,
            level,
            capacity,
            current_students
          )
        `)
        .eq('teacher_name', teacherName)
        .eq('lesson_date', today)
        .order('start_time');
      
      if (error) throw error;
      return data;
    },
  });

  // Получаем группы преподавателя
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['teacher-groups', teacherName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_groups')
        .select('*')
        .eq('responsible_teacher', teacherName)
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
  });

  // Получаем индивидуальные уроки преподавателя
  const { data: individualLessons, isLoading: individualLoading } = useQuery({
    queryKey: ['teacher-individual-lessons', teacherName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('individual_lessons')
        .select('*')
        .eq('teacher_name', teacherName)
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
  });

  // Получаем все будущие занятия преподавателя (ближайшие 7 дней)
  const { data: upcomingLessons } = useQuery({
    queryKey: ['teacher-lessons-upcoming', teacherName],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const { data, error } = await supabase
        .from('lesson_sessions')
        .select(`
          *,
          learning_groups (
            name,
            subject,
            level
          )
        `)
        .eq('teacher_name', teacherName)
        .gte('lesson_date', today)
        .lte('lesson_date', nextWeek.toISOString().split('T')[0])
        .order('lesson_date')
        .order('start_time');
      
      if (error) throw error;
      return data;
    },
  });

  const handleStartOnlineLesson = (session: any) => {
    setSelectedSessionData(session);
    setStartLessonModalOpen(true);
  };

  const handleAddHomework = (sessionId: string, groupId?: string) => {
    setSelectedSessionId(sessionId);
    setSelectedSessionData({ groupId });
    setHomeworkModalOpen(true);
  };

  const handleAttendance = (sessionId: string, lessonDate: string, startTime: string, endTime: string, groupId?: string) => {
    setSelectedSessionId(sessionId);
    setSelectedSessionData({ 
      lesson_date: lessonDate,
      start_time: startTime, 
      end_time: endTime,
      group_id: groupId
    });
    setAttendanceModalOpen(true);
  };

  // Быстрые действия
  const handleQuickStart = (lesson: any) => {
    setQuickStartModal({
      open: true,
      session: {
        id: lesson.id,
        group_name: lesson.learning_groups?.name,
        lesson_date: format(new Date(lesson.lesson_date), 'd MMMM yyyy', { locale: ru }),
        start_time: lesson.start_time,
        online_link: lesson.online_link,
        type: lesson.group_id ? 'group' : 'individual',
      },
    });
  };

  const handleQuickAttendance = (lesson: any) => {
    if (lesson.group_id) {
      setQuickAttendanceModal({
        open: true,
        groupId: lesson.group_id,
        sessionId: lesson.id,
        sessionDate: format(new Date(lesson.lesson_date), 'd MMMM yyyy', { locale: ru }),
      });
    }
  };

  const handleQuickHomework = (lesson: any) => {
    setQuickHomeworkModal({
      open: true,
      groupId: lesson.group_id,
      sessionId: lesson.id,
    });
  };

  const handleQuickOnline = (lesson: any) => {
    if (lesson.online_link) {
      window.open(lesson.online_link, '_blank');
    }
  };

  if (lessonsLoading || groupsLoading || individualLoading) {
    return <div className="text-center py-8">Загружаем данные...</div>;
  }

  // Подсчет метрик
  const todayCompleted = todayLessons?.filter(l => l.status === 'completed').length || 0;
  const todayTotal = todayLessons?.length || 0;
  const weekTotal = upcomingLessons?.length || 0;
  const weekCanceled = upcomingLessons?.filter(l => l.status === 'cancelled').length || 0;

  // Найти ближайший урок (статусы: free, paid_skip, free_skip, rescheduled, completed, cancelled)
  const nextLesson = todayLessons?.find(l => l.status !== 'completed' && l.status !== 'cancelled');

  return (
    <>
      <div className="space-y-6">
        {/* Метрики */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard
            title="Сегодня"
            value={todayTotal}
            hint={todayCompleted > 0 ? `${todayCompleted} проведено` : nextLesson ? `Ближайший урок: ${nextLesson.start_time}` : 'Нет занятий'}
            tone={todayTotal > 0 ? (nextLesson ? "warn" : "ok") : "neutral"}
            icon={Calendar}
          />

          <KpiCard
            title="Неделя"
            value={weekTotal}
            hint={weekCanceled > 0 ? `Отменено ${weekCanceled}` : `Запланировано ${weekTotal}`}
            tone="neutral"
            icon={TrendingUp}
          />

          <KpiCard
            title="Мои группы"
            value={groups?.length || 0}
            hint={`${individualLessons?.length || 0} индивидуальных`}
            tone="info"
            icon={BookOpen}
          />

          <KpiCard
            title="Статистика"
            value="Дашборд"
            hint="Детальная статистика"
            onClick={() => setShowDashboardModal(true)}
            tone="neutral"
            icon={BarChart3}
          />
        </div>

        {/* Уведомления/задачи */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Панель быстрых действий */}
          <div className="lg:col-span-1">
            <QuickActionsPanel
              todayLessons={todayLessons || []}
              onStartLesson={handleQuickStart}
              onMarkAttendance={handleQuickAttendance}
              onAddHomework={handleQuickHomework}
              onOpenOnline={handleQuickOnline}
              onRequestSubstitution={() => setSubstitutionModal({ open: true, type: 'substitution' })}
            />
          </div>

          {/* Уведомления */}
          <div className="lg:col-span-2">
            <div className="card-elevated border-l-4 border-l-warning h-full">
              <div className="flex items-start gap-3">
                <Bell className="h-5 w-5 text-warning mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-text-primary mb-1">Уведомления и задачи</h3>
                  <div className="space-y-2 text-sm text-text-secondary">
                    {todayLessons && todayLessons.length > 0 && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>У вас {todayTotal} {todayTotal === 1 ? 'занятие' : 'занятия'} сегодня</span>
                      </div>
                    )}
                    {weekTotal > 0 && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-info" />
                        <span>Запланировано {weekTotal} {weekTotal === 1 ? 'урок' : 'уроков'} на неделю</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Информация о преподавателе */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Личная информация
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-xl p-4">
                <p className="text-sm text-text-secondary">ФИО</p>
                <p className="font-medium text-text-primary">{teacher.last_name} {teacher.first_name}</p>
              </div>
              <div className="border rounded-xl p-4">
                <p className="text-sm text-text-secondary">Филиал</p>
                <p className="font-medium text-text-primary">{teacher.branch}</p>
              </div>
              <div className="border rounded-xl p-4">
                <p className="text-sm text-text-secondary">Предметы</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {teacher.subjects?.map((subject: string) => (
                    <Badge key={subject} variant="secondary">
                      {subject}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Сегодняшние занятия */}
        <div className="card-elevated">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2 mb-1">
              <Calendar className="h-5 w-5 text-brand" />
              Сегодняшние занятия
            </h2>
            <p className="text-sm text-text-secondary">
              {format(new Date(), 'EEEE, d MMMM yyyy', { locale: ru })}
            </p>
          </div>
          {todayLessons && todayLessons.length > 0 ? (
            <div className="space-y-4">
              {todayLessons.map((lesson: any) => (
                <div key={lesson.id} className="space-y-3">
                  <LessonCard
                    start={lesson.start_time}
                    end={lesson.end_time}
                    title={lesson.learning_groups?.name || 'Индивидуальное занятие'}
                    room={lesson.classroom}
                    online={!!lesson.online_link}
                    link={lesson.online_link}
                    status={lesson.status}
                    onAttendance={() => handleQuickAttendance(lesson)}
                    onHomework={() => handleQuickHomework(lesson)}
                    onOpenLink={() => handleQuickOnline(lesson)}
                    onStartLesson={() => handleQuickStart(lesson)}
                  />
                  
                  {/* Планирование урока */}
                  {lesson.status !== 'completed' && lesson.status !== 'cancelled' && (
                    <LessonPlanCard
                      lessonNumber={getLessonNumberForGroup(
                        lesson.learning_groups?.name || 'Индивидуальное занятие',
                        lesson.learning_groups?.level,
                        lesson.lesson_date
                      )}
                      groupName={lesson.learning_groups?.name || 'Индивидуальное занятие'}
                      level={lesson.learning_groups?.level}
                      subject={lesson.learning_groups?.subject}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="На сегодня занятий не запланировано"
              subtitle="Расписание на завтра и следующие дни можно посмотреть в разделе «Расписание»"
            />
          )}
        </div>

        {/* Мои группы и Индивидуальные */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-elevated">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-brand" />
              Мои группы
            </h3>
            {groups && groups.length > 0 ? (
              <div className="space-y-3">
                {groups.map((group: any) => (
                  <div 
                    key={group.id} 
                    className="p-4 border rounded-xl cursor-pointer hover:shadow-elev-1 hover:border-brand/30 transition-all bg-surface"
                    onClick={() => setSelectedGroupId(group.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-text-primary">{group.name}</h4>
                      <Badge variant="outline">{group.level}</Badge>
                    </div>
                    <div className="text-sm text-text-secondary space-y-1">
                      <p>Предмет: {group.subject}</p>
                      <p>Студентов: {group.current_students}/{group.capacity}</p>
                      {group.schedule_time && (
                        <p>Расписание: {group.schedule_time}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-text-muted opacity-50" />
                <p className="text-text-secondary">Активных групп не найдено</p>
              </div>
            )}
          </div>

          <div className="card-elevated">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-brand" />
              Индивидуальные занятия
            </h3>
            {individualLessons && individualLessons.length > 0 ? (
              <div className="space-y-3">
                {individualLessons.map((lesson: any) => (
                  <div 
                    key={lesson.id} 
                    className="p-4 border rounded-xl cursor-pointer hover:shadow-elev-1 hover:border-brand/30 transition-all bg-surface"
                    onClick={() => setSelectedLessonId(lesson.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-text-primary">{lesson.student_name}</h4>
                      <Badge variant="outline">{lesson.level}</Badge>
                    </div>
                    <div className="text-sm text-text-secondary space-y-1">
                      <p>Предмет: {lesson.subject}</p>
                      {lesson.schedule_time && (
                        <p>Расписание: {lesson.schedule_time}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <User className="h-12 w-12 mx-auto mb-4 text-text-muted opacity-50" />
                <p className="text-text-secondary">Индивидуальных занятий не найдено</p>
              </div>
            )}
          </div>
        </div>

        {/* Расписание на неделю */}
        <div className="card-elevated">
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-brand" />
            Расписание на неделю
          </h3>
          {upcomingLessons && upcomingLessons.length > 0 ? (
            <div className="space-y-3">
              {upcomingLessons.map((lesson: any) => (
                <div key={lesson.id} className="flex items-center justify-between p-4 border rounded-xl bg-surface hover:shadow-elev-1 transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-text-primary">
                        {format(new Date(lesson.lesson_date), 'EEEE, d MMMM', { locale: ru })}
                      </span>
                      <span className="text-sm text-text-secondary">
                        {lesson.start_time} - {lesson.end_time}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary">
                      {lesson.learning_groups?.name || 'Индивидуальное'}
                    </p>
                  </div>
                  <Badge variant="secondary">{lesson.classroom}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-text-muted opacity-50" />
              <p className="text-text-secondary">На ближайшую неделю занятий не запланировано</p>
            </div>
          )}
        </div>
      </div>

      {/* Модальные окна */}
      {selectedGroupId && (
        <GroupDetailModal
          groupId={selectedGroupId}
          open={!!selectedGroupId}
          onOpenChange={(open) => !open && setSelectedGroupId(null)}
        />
      )}

      {selectedLessonId && (
        <IndividualLessonModal
          lessonId={selectedLessonId}
          open={!!selectedLessonId}
          onOpenChange={(open) => !open && setSelectedLessonId(null)}
        />
      )}

      {selectedSessionId && (
        <>
          <AddHomeworkModal
            open={homeworkModalOpen}
            onOpenChange={setHomeworkModalOpen}
            sessionId={selectedSessionId}
            groupId={selectedSessionData?.groupId}
          />
          <AttendanceModal
            open={attendanceModalOpen}
            onOpenChange={setAttendanceModalOpen}
            sessionId={selectedSessionId}
            groupId={selectedSessionData?.group_id}
            sessionDate={selectedSessionData?.lesson_date || ''}
            sessionTime={`${selectedSessionData?.start_time || ''} - ${selectedSessionData?.end_time || ''}`}
          />
        </>
      )}

      {/* Модальные окна быстрых действий */}
      {quickAttendanceModal && (
        <GroupAttendanceModal
          open={quickAttendanceModal.open}
          onOpenChange={(open) => !open && setQuickAttendanceModal(null)}
          groupId={quickAttendanceModal.groupId}
          sessionId={quickAttendanceModal.sessionId}
          sessionDate={quickAttendanceModal.sessionDate}
        />
      )}

      {quickHomeworkModal && (
        <HomeworkModal
          open={quickHomeworkModal.open}
          onOpenChange={(open) => !open && setQuickHomeworkModal(null)}
          groupId={quickHomeworkModal.groupId}
          sessionId={quickHomeworkModal.sessionId}
        />
      )}

      {quickStartModal && (
        <QuickStartLessonModal
          open={quickStartModal.open}
          onOpenChange={(open) => !open && setQuickStartModal(null)}
          session={quickStartModal.session}
        />
      )}

      {substitutionModal && (
        <SubstitutionRequestModal
          open={substitutionModal.open}
          onOpenChange={(open) => !open && setSubstitutionModal(null)}
          teacherId={teacher.id}
          type={substitutionModal.type}
        />
      )}

      {selectedSessionData && (
        <StartLessonModal
          open={startLessonModalOpen}
          onOpenChange={setStartLessonModalOpen}
          session={selectedSessionData}
          teacherName={`${teacher.last_name} ${teacher.first_name}`}
        />
      )}

      <DashboardModal
        open={showDashboardModal}
        onOpenChange={setShowDashboardModal}
      />
    </>
  );
};
