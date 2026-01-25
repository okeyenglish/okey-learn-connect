import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon, Clock, MapPin, Users, User, Video, ClipboardCheck, BookOpenCheck, FileText, RefreshCcw, Plus, CheckCircle, XCircle, AlertCircle, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Teacher } from '@/hooks/useTeachers';
import { LessonDetailsDrawer } from '@/components/teacher/ui/LessonDetailsDrawer';
import { BranchBadge } from '@/components/teacher/ui/BranchBadge';
import { useTeacherBranches } from '@/hooks/useTeacherBranches';
import { GroupAttendanceModal } from './modals/GroupAttendanceModal';
import { HomeworkModal } from './modals/HomeworkModal';
import { SubstitutionRequestModal } from './modals/SubstitutionRequestModal';
import { cn } from '@/lib/utils';

interface TeacherScheduleJournalProps {
  teacher: Teacher;
  selectedBranchId: string | 'all';
}

export const TeacherScheduleJournal = ({ teacher, selectedBranchId }: TeacherScheduleJournalProps) => {
  const teacherName = `${teacher.last_name} ${teacher.first_name}`;
  const { selectedBranch } = useTeacherBranches(teacher.id);
  const weekDays = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'custom'>('week');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [customRange, setCustomRange] = useState<{ from: Date; to?: Date }>({ from: new Date() });
  const [calendarMode, setCalendarMode] = useState<'single' | 'range'>('single');
  
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
  const [requestModal, setRequestModal] = useState<{ open: boolean; type: 'substitution' | 'absence' } | null>(null);

  // Вычисляем диапазон дат в зависимости от режима просмотра
  const getDateRange = () => {
    switch (viewMode) {
      case 'day':
        return {
          start: startOfDay(selectedDate),
          end: endOfDay(selectedDate),
        };
      case 'week':
        return {
          start: startOfWeek(selectedDate, { locale: ru, weekStartsOn: 1 }),
          end: endOfWeek(selectedDate, { locale: ru, weekStartsOn: 1 }),
        };
      case 'month':
        return {
          start: startOfMonth(selectedDate),
          end: endOfMonth(selectedDate),
        };
      case 'custom':
        return {
          start: startOfDay(customRange.from),
          end: customRange.to ? endOfDay(customRange.to) : endOfDay(customRange.from),
        };
      default:
        return {
          start: startOfWeek(selectedDate, { locale: ru, weekStartsOn: 1 }),
          end: endOfWeek(selectedDate, { locale: ru, weekStartsOn: 1 }),
        };
    }
  };

  const dateRange = getDateRange();
  
  // Получаем расписание на выбранный период
  const { data: weekSchedule, isLoading } = useQuery({
    queryKey: ['teacher-schedule-journal', teacherName, selectedBranchId, viewMode, selectedDate, customRange],
    queryFn: async () => {
      const { start, end } = dateRange;

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
        .gte('lesson_date', start.toISOString().split('T')[0])
        .lte('lesson_date', end.toISOString().split('T')[0]);

      if (selectedBranchId !== 'all' && selectedBranch) {
        groupQuery = groupQuery.eq('branch', selectedBranch.name);
      }

      const { data: groupSessions, error: groupError } = await groupQuery.order('lesson_date').order('start_time');
      if (groupError) throw groupError;

      // Получаем индивидуальные занятия
      let individualQuery = supabase
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
        .gte('session_date', start.toISOString().split('T')[0])
        .lte('session_date', end.toISOString().split('T')[0]);

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

      const { data: individualData } = await supabase
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

  // История прошедших занятий
  const { data: historyLessons, isLoading: historyLoading } = useQuery({
    queryKey: ['teacher-history-lessons', teacherName, selectedBranchId],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Получаем последние 30 дней истории
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);

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
        .gte('lesson_date', thirtyDaysAgo.toISOString().split('T')[0])
        .lt('lesson_date', today.toISOString().split('T')[0]);

      if (selectedBranchId !== 'all' && selectedBranch) {
        groupQuery = groupQuery.eq('branch', selectedBranch.name);
      }

      const { data: groupSessions, error: groupError } = await groupQuery.order('lesson_date', { ascending: false }).order('start_time', { ascending: false });
      if (groupError) throw groupError;

      // Получаем индивидуальные занятия
      let individualQuery = supabase
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
        .gte('session_date', thirtyDaysAgo.toISOString().split('T')[0])
        .lt('session_date', today.toISOString().split('T')[0]);

      const { data: individualSessions, error: individualError } = await individualQuery.order('session_date', { ascending: false }).order('start_time', { ascending: false });
      if (individualError) throw individualError;

      // Объединяем и форматируем
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
          time: `${lesson.start_time?.slice(0, 5)} - ${lesson.end_time?.slice(0, 5)}`,
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
          time: `${lesson.start_time?.slice(0, 5)} - ${lesson.end_time?.slice(0, 5)}`,
        })),
      ];

      // Сортируем по дате (новые первые)
      allLessons.sort((a, b) => {
        const dateA = new Date(a.date + ' ' + a.start_time);
        const dateB = new Date(b.date + ' ' + b.start_time);
        return dateB.getTime() - dateA.getTime();
      });

      return allLessons;
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Расписание и журнал
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Панель периода/даты и статистики */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            {/* Переключатель периода */}
            <div className="flex items-center">
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('day')}
                >
                  День
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                >
                  Неделя
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                >
                  Месяц
                </Button>
              </div>
            </div>

            {/* Выбор даты/периода */}
            <div className="flex justify-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 w-full md:w-auto">
                    <CalendarIcon className="h-4 w-4" />
                    <span>
                      {calendarMode === 'range' && customRange.to
                        ? `${format(customRange.from, 'd MMM', { locale: ru })} – ${format(customRange.to, 'd MMM yyyy', { locale: ru })}`
                        : format(selectedDate, 'd MMMM yyyy', { locale: ru })}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="z-50 w-auto p-3" align="start">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant={calendarMode === 'single' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCalendarMode('single')}
                      className="flex-1"
                    >
                      Дата
                    </Button>
                    <Button
                      variant={calendarMode === 'range' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setCalendarMode('range');
                        setViewMode('custom');
                      }}
                      className="flex-1"
                    >
                      Период
                    </Button>
                  </div>

                  {calendarMode === 'range' ? (
                    <Calendar
                      mode="range"
                      selected={customRange}
                      onSelect={(range) => {
                        if (range?.from) {
                          setCustomRange(range as { from: Date; to?: Date });
                          setViewMode('custom');
                        }
                      }}
                      initialFocus
                      className={cn('pointer-events-auto p-1')}
                      locale={ru}
                    />
                  ) : (
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date);
                          if (viewMode === 'custom') setViewMode('day');
                        }
                      }}
                      initialFocus
                      className={cn('pointer-events-auto p-1')}
                      locale={ru}
                    />
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Статистика */}
            <div className="flex justify-end gap-2">
              <Card className="p-3 bg-brand/5 border-brand/20">
                <div className="text-xs text-muted-foreground">Уроков</div>
                <div className="text-xl font-bold text-brand">{stats?.lessonsCount || 0}</div>
              </Card>
              <Card className="p-3 bg-brand/5 border-brand/20">
                <div className="text-xs text-muted-foreground">Часов</div>
                <div className="text-xl font-bold text-brand">{stats?.totalHours || 0}</div>
              </Card>
            </div>
          </div>

          <Tabs defaultValue="schedule" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="schedule">Расписание</TabsTrigger>
              <TabsTrigger value="history">История (30 дней)</TabsTrigger>
              <TabsTrigger value="substitutions">Замены и отпуска</TabsTrigger>
            </TabsList>

            <TabsContent value="schedule">
              {!weekSchedule || weekSchedule.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-lg font-medium mb-2">Нет занятий в выбранном периоде</p>
                  <p className="text-sm text-muted-foreground">
                    Попробуйте выбрать другой период
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

            <TabsContent value="history">
              {historyLoading ? (
                <div className="text-center py-8">
                  <div className="animate-pulse">Загрузка истории...</div>
                </div>
              ) : !historyLessons || historyLessons.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-lg font-medium mb-2">История занятий пуста</p>
                  <p className="text-sm text-muted-foreground">
                    Здесь будут отображаться проведенные занятия за последние 30 дней
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyLessons.map((lesson: any, idx: number) => (
                    <Card key={idx} className="p-4 hover-scale border hover:border-brand transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-muted">
                            {lesson.lessonType === 'group' ? (
                              <Users className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <User className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold mb-1 flex items-center gap-2">
                              {lesson.group}
                              {lesson.branch && <BranchBadge branchName={lesson.branch} size="sm" variant="outline" />}
                            </div>
                             <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                               <span className="flex items-center gap-1">
                                 <CalendarIcon className="h-3.5 w-3.5" />
                                 {format(new Date(lesson.date), 'd MMM yyyy', { locale: ru })}
                               </span>
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
              )}
            </TabsContent>

            <TabsContent value="substitutions">
              <SubstitutionsContent 
                teacherId={teacher.id}
                onOpenRequestModal={setRequestModal}
              />
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

      {requestModal && (
        <SubstitutionRequestModal
          open={requestModal.open}
          onOpenChange={(open) => !open && setRequestModal(null)}
          teacherId={teacher.id}
          type={requestModal.type}
        />
      )}
    </>
  );
};

interface SubstitutionsContentProps {
  teacherId: string;
  onOpenRequestModal: (modal: { open: boolean; type: 'substitution' | 'absence' }) => void;
}

const SubstitutionsContent = ({ teacherId, onOpenRequestModal }: SubstitutionsContentProps) => {
  const { data: substitutions, isLoading: substitutionsLoading } = useQuery({
    queryKey: ['teacher-substitutions', teacherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_substitutions')
        .select(`
          *,
          lesson_sessions (
            id,
            lesson_date,
            start_time,
            end_time,
            learning_groups (name)
          )
        `)
        .or(`original_teacher_id.eq.${teacherId},substitute_teacher_id.eq.${teacherId}`)
        .order('substitution_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: 'Ожидает', variant: 'outline' as const, icon: AlertCircle },
      approved: { label: 'Одобрено', variant: 'secondary' as const, icon: CheckCircle },
      rejected: { label: 'Отклонено', variant: 'destructive' as const, icon: XCircle },
      completed: { label: 'Выполнено', variant: 'secondary' as const, icon: CheckCircle },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    const Icon = statusInfo.icon;

    return (
      <Badge variant={statusInfo.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {statusInfo.label}
      </Badge>
    );
  };

  if (substitutionsLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse">Загрузка...</div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="substitutions" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="substitutions" className="flex items-center gap-2">
          <RefreshCcw className="h-4 w-4" />
          Замены ({substitutions?.length || 0})
        </TabsTrigger>
        <TabsTrigger value="absences" className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          Отпуска
        </TabsTrigger>
      </TabsList>

      <TabsContent value="substitutions">
        <div className="mb-4">
          <Button onClick={() => onOpenRequestModal({ open: true, type: 'substitution' })}>
            <Plus className="h-4 w-4 mr-2" />
            Запросить замену
          </Button>
        </div>

        {!substitutions || substitutions.length === 0 ? (
          <div className="text-center py-12">
            <RefreshCcw className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium mb-2">Нет заявок на замены</p>
            <p className="text-sm text-muted-foreground">
              Создайте заявку, если вам нужна замена
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {substitutions.map((sub: any) => {
              const isOriginalTeacher = sub.original_teacher_id === teacherId;
              const groupName = sub.lesson_sessions?.learning_groups?.name || 'Индивидуальное занятие';
              
              return (
                <Card key={sub.id} className="card-elevated hover-scale">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{groupName}</h3>
                          {getStatusBadge(sub.status)}
                          {!isOriginalTeacher && (
                            <Badge variant="outline">Замена за коллегу</Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            <span>{format(new Date(sub.substitution_date), 'd MMMM yyyy', { locale: ru })}</span>
                          </div>
                          {sub.lesson_sessions && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>
                                {sub.lesson_sessions.start_time.slice(0, 5)} - {sub.lesson_sessions.end_time.slice(0, 5)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {sub.reason && (
                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Причина: </span>
                          <span className="font-medium">{sub.reason}</span>
                        </div>
                        {sub.status === 'pending' && isOriginalTeacher && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              Редактировать
                            </Button>
                            <Button size="sm" variant="destructive">
                              Отменить
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {sub.notes && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-muted-foreground">{sub.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="absences">
        <div className="mb-4">
          <Button onClick={() => onOpenRequestModal({ open: true, type: 'absence' })}>
            <Plus className="h-4 w-4 mr-2" />
            Запросить отпуск
          </Button>
        </div>

        <div className="text-center py-12">
          <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-lg font-medium mb-2">Нет запланированных отпусков</p>
          <p className="text-sm text-muted-foreground">
            Запланируйте отпуск заранее
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
};
