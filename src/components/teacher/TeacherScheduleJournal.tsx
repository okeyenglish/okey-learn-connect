import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, MapPin, Users, User, Video, ClipboardCheck, BookOpenCheck, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Teacher } from '@/hooks/useTeachers';
import { LessonDetailsDrawer } from '@/components/teacher/ui/LessonDetailsDrawer';
import { BranchBadge } from '@/components/teacher/ui/BranchBadge';
import { useTeacherBranches } from '@/hooks/useTeacherBranches';
import { GroupAttendanceModal } from './modals/GroupAttendanceModal';
import { HomeworkModal } from './modals/HomeworkModal';

interface TeacherScheduleJournalProps {
  teacher: Teacher;
  selectedBranchId: string | 'all';
}

export const TeacherScheduleJournal = ({ teacher, selectedBranchId }: TeacherScheduleJournalProps) => {
  const teacherName = `${teacher.last_name} ${teacher.first_name}`;
  const { selectedBranch } = useTeacherBranches(teacher.id);
  const weekDays = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [attendanceModal, setAttendanceModal] = useState<{ 
    open: boolean; 
    groupId: string; 
    sessionId: string; 
    sessionDate: string;
    isIndividual: boolean;
  } | null>(null);
  const [homeworkModal, setHomeworkModal] = useState<{ 
    open: boolean; 
    groupId: string; 
    sessionId: string 
  } | null>(null);
  
  // Получаем расписание на текущую неделю
  const { data: weekSchedule, isLoading } = useQuery({
    queryKey: ['teacher-schedule-journal-week', teacherName, selectedBranchId],
    queryFn: async () => {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Понедельник
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Воскресенье

      // Получаем групповые занятия
      let groupQuery = supabase
        .from('lesson_sessions')
        .select(`
          *,
          learning_groups (
            id,
            name,
            subject,
            level,
            current_students
          )
        `)
        .eq('teacher_name', teacherName)
        .gte('lesson_date', startOfWeek.toISOString().split('T')[0])
        .lte('lesson_date', endOfWeek.toISOString().split('T')[0]);

      if (selectedBranchId !== 'all' && selectedBranch) {
        groupQuery = groupQuery.eq('branch', selectedBranch.name);
      }

      const { data: groupSessions, error: groupError } = await groupQuery.order('lesson_date').order('start_time');
      if (groupError) throw groupError;

      // Получаем индивидуальные занятия
      let individualQuery = (supabase as any)
        .from('individual_lesson_sessions')
        .select(`
          *,
          individual_lessons (
            id,
            student_id,
            subject,
            duration_minutes,
            students (
              first_name,
              last_name
            )
          )
        `)
        .eq('teacher_name', teacherName)
        .gte('session_date', startOfWeek.toISOString().split('T')[0])
        .lte('session_date', endOfWeek.toISOString().split('T')[0]);

      const { data: individualSessions, error: individualError } = await individualQuery.order('session_date').order('start_time');
      if (individualError) throw individualError;

      // Объединяем оба типа занятий
      const allLessons = [
        ...(groupSessions || []).map((lesson: any) => ({
          ...lesson,
          lessonType: 'group',
          date: lesson.lesson_date,
          group: lesson.learning_groups?.name || 'Группа',
          subject: lesson.learning_groups?.subject,
          level: lesson.learning_groups?.level,
          students: lesson.learning_groups?.current_students || 0,
          location: lesson.classroom || 'Онлайн',
          isOnline: !lesson.classroom || lesson.classroom === 'Online',
          groupId: lesson.group_id,
        })),
        ...(individualSessions || []).map((lesson: any) => ({
          ...lesson,
          lessonType: 'individual',
          date: lesson.session_date,
          group: `${lesson.individual_lessons?.students?.first_name || ''} ${lesson.individual_lessons?.students?.last_name || ''}`,
          subject: lesson.individual_lessons?.subject,
          students: 1,
          location: lesson.location || 'Онлайн',
          isOnline: !lesson.location || lesson.location === 'Online',
          groupId: lesson.individual_lesson_id,
          duration_minutes: lesson.individual_lessons?.duration_minutes || lesson.duration_minutes,
        })),
      ];

      // Группируем по дням недели
      const scheduleByDay = new Map();
      allLessons.forEach((lesson: any) => {
        const date = new Date(lesson.date);
        const dayIndex = date.getDay();
        const dayName = weekDays[dayIndex === 0 ? 6 : dayIndex - 1];

        if (!scheduleByDay.has(dayName)) {
          scheduleByDay.set(dayName, []);
        }

        scheduleByDay.get(dayName).push({
          ...lesson,
          time: `${lesson.start_time?.slice(0, 5)} - ${lesson.end_time?.slice(0, 5)}`,
        });
      });

      // Сортируем каждый день по времени
      scheduleByDay.forEach((lessons, day) => {
        lessons.sort((a: any, b: any) => {
          return a.start_time?.localeCompare(b.start_time);
        });
      });

      return Array.from(scheduleByDay.entries()).map(([day, lessons]) => ({
        day,
        lessons,
      }));
    },
  });

  // Статистика
  const { data: stats } = useQuery({
    queryKey: ['teacher-schedule-stats', teacherName],
    queryFn: async () => {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const { data: groupData } = await supabase
        .from('lesson_sessions')
        .select('id, start_time, end_time')
        .eq('teacher_name', teacherName)
        .gte('lesson_date', startOfWeek.toISOString().split('T')[0])
        .lte('lesson_date', endOfWeek.toISOString().split('T')[0]);

      const { data: individualData } = await (supabase as any)
        .from('individual_lesson_sessions')
        .select('id, start_time, end_time, duration_minutes')
        .eq('teacher_name', teacherName)
        .gte('session_date', startOfWeek.toISOString().split('T')[0])
        .lte('session_date', endOfWeek.toISOString().split('T')[0]);

      const lessonsCount = (groupData?.length || 0) + (individualData?.length || 0);
      
      // Подсчет часов
      let totalMinutes = 0;
      [...(groupData || []), ...(individualData || [])].forEach((lesson: any) => {
        if (lesson.duration_minutes) {
          totalMinutes += lesson.duration_minutes;
        } else if (lesson.start_time && lesson.end_time) {
          const start = lesson.start_time.split(':');
          const end = lesson.end_time.split(':');
          const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
          const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
          totalMinutes += (endMinutes - startMinutes);
        }
      });
      
      const totalHours = (totalMinutes / 40).toFixed(1); // Академические часы (40 мин)

      return {
        lessonsCount,
        totalHours,
      };
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      scheduled: { label: 'Запланировано', variant: 'secondary' },
      completed: { label: 'Проведено', variant: 'default' },
      cancelled: { label: 'Отменено', variant: 'destructive' },
      rescheduled: { label: 'Перенесено', variant: 'outline' },
    };
    return statusMap[status] || { label: status, variant: 'secondary' };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Расписание и журнал
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-pulse">Загрузка...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Расписание и журнал
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 bg-brand/5 border-brand/20">
              <div className="text-sm text-muted-foreground mb-1">Уроков на неделе</div>
              <div className="text-2xl font-bold text-brand">{stats?.lessonsCount || 0}</div>
            </Card>
            <Card className="p-4 bg-brand/5 border-brand/20">
              <div className="text-sm text-muted-foreground mb-1">Часов (академических)</div>
              <div className="text-2xl font-bold text-brand">{stats?.totalHours || 0}</div>
            </Card>
          </div>

          <Tabs defaultValue="week" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="week">Неделя</TabsTrigger>
              <TabsTrigger value="month">Месяц</TabsTrigger>
            </TabsList>

            <TabsContent value="week">
              {!weekSchedule || weekSchedule.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-lg font-medium mb-2">Нет занятий на этой неделе</p>
                  <p className="text-sm text-muted-foreground">
                    Расписание на следующую неделю появится позже
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {weekDays.map((day) => {
                    const daySchedule = weekSchedule.find(s => s.day === day);
                    
                    return (
                      <Card key={day} className="card-elevated">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg">{day}</h3>
                            {daySchedule && (
                              <Badge variant="secondary">
                                {daySchedule.lessons.length} {daySchedule.lessons.length === 1 ? 'урок' : 'урока'}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {daySchedule ? (
                            <div className="space-y-3">
                              {daySchedule.lessons.map((lesson: any, idx: number) => (
                                <Card key={idx} className="p-4 hover-scale border-2 hover:border-brand transition-colors">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-start gap-3 flex-1">
                                      <div className="p-2 rounded-lg bg-brand/10">
                                        {lesson.lessonType === 'group' ? (
                                          <Users className="h-5 w-5 text-brand" />
                                        ) : (
                                          <User className="h-5 w-5 text-brand" />
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <div className="font-semibold mb-1 flex items-center gap-2">
                                          {lesson.group}
                                          {lesson.branch && <BranchBadge branchName={lesson.branch} size="sm" variant="outline" />}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                                          <span className="flex items-center gap-1">
                                            <Clock className="h-3.5 w-3.5" />
                                            {lesson.time}
                                          </span>
                                          {lesson.subject && (
                                            <Badge variant="outline" className="text-xs">
                                              {lesson.subject}
                                            </Badge>
                                          )}
                                          <span className="flex items-center gap-1">
                                            {lesson.isOnline ? (
                                              <>
                                                <Video className="h-3.5 w-3.5" />
                                                Онлайн
                                              </>
                                            ) : (
                                              <>
                                                <MapPin className="h-3.5 w-3.5" />
                                                {lesson.location}
                                              </>
                                            )}
                                          </span>
                                          {lesson.status && (
                                            <Badge variant={getStatusBadge(lesson.status).variant} className="text-xs">
                                              {getStatusBadge(lesson.status).label}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex gap-2 flex-wrap">
                                    {lesson.lessonType === 'group' && (
                                      <>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => {
                                            setAttendanceModal({
                                              open: true,
                                              groupId: lesson.groupId,
                                              sessionId: lesson.id,
                                              sessionDate: format(new Date(lesson.date), 'd MMMM yyyy', { locale: ru }),
                                              isIndividual: false,
                                            });
                                          }}
                                        >
                                          <ClipboardCheck className="h-4 w-4 mr-1" />
                                          Посещаемость
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => {
                                            setHomeworkModal({
                                              open: true,
                                              groupId: lesson.groupId,
                                              sessionId: lesson.id,
                                            });
                                          }}
                                        >
                                          <BookOpenCheck className="h-4 w-4 mr-1" />
                                          ДЗ
                                        </Button>
                                      </>
                                    )}
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      onClick={() => {
                                        setSelectedLesson(lesson);
                                        setDrawerOpen(true);
                                      }}
                                    >
                                      <FileText className="h-4 w-4 mr-1" />
                                      Детали
                                    </Button>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                              Нет запланированных занятий
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="month">
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium mb-2">Календарь на месяц</p>
                <p className="text-sm text-muted-foreground">
                  Здесь будет отображаться календарный вид на месяц
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {selectedLesson && (
        <LessonDetailsDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          lesson={{
            id: selectedLesson.id,
            title: selectedLesson.group,
            startTime: selectedLesson.start_time,
            endTime: selectedLesson.end_time,
            branch: selectedLesson.branch,
            location: selectedLesson.location,
            isOnline: selectedLesson.isOnline,
            subject: selectedLesson.subject,
            level: selectedLesson.level,
            studentsCount: selectedLesson.students,
          }}
        />
      )}

      {attendanceModal && !attendanceModal.isIndividual && (
        <GroupAttendanceModal
          open={attendanceModal.open}
          onOpenChange={(open) => !open && setAttendanceModal(null)}
          groupId={attendanceModal.groupId}
          sessionId={attendanceModal.sessionId}
          sessionDate={attendanceModal.sessionDate}
        />
      )}

      {homeworkModal && (
        <HomeworkModal
          open={homeworkModal.open}
          onOpenChange={(open) => !open && setHomeworkModal(null)}
          groupId={homeworkModal.groupId}
          sessionId={homeworkModal.sessionId}
        />
      )}
    </>
  );
};
