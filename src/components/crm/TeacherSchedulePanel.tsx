import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, Users, User, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeacherSchedulePanelProps {
  teacherId: string;
  teacherName?: string;
}

interface ScheduleLesson {
  id: string;
  lesson_date: string;
  start_time: string | null;
  end_time: string | null;
  type: 'group' | 'individual';
  subject: string | null;
  level: string | null;
  branch: string | null;
  group_name: string | null;
  student_name: string | null;
  classroom: string | null;
  status: string | null;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Запланировано', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  completed: { label: 'Проведено', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  cancelled: { label: 'Отменено', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  rescheduled: { label: 'Перенесено', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
};

export const TeacherSchedulePanel: React.FC<TeacherSchedulePanelProps> = ({ teacherId, teacherName }) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const startDate = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const endDate = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const daysInWeek = eachDayOfInterval({ start: startDate, end: endDate });

  // Fetch teacher's schedule from lesson_sessions
  const { data: lessons = [], isLoading, error } = useQuery({
    queryKey: ['teacher-chat-schedule', teacherId, format(startDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!teacherId) return [];

      // Get groups taught by this teacher
      const { data: teacherGroups } = await supabase
        .from('learning_groups')
        .select('id, name, subject, level, branch, schedule_time')
        .eq('teacher_id', teacherId)
        .eq('is_active', true);

      const groupIds = teacherGroups?.map(g => g.id) || [];

      // Get lesson sessions for these groups in the date range
      let groupLessons: ScheduleLesson[] = [];
      
      if (groupIds.length > 0) {
        const { data: sessions } = await supabase
          .from('lesson_sessions')
          .select('id, lesson_date, start_time, end_time, status, classroom, group_id')
          .in('group_id', groupIds)
          .gte('lesson_date', format(startDate, 'yyyy-MM-dd'))
          .lte('lesson_date', format(endDate, 'yyyy-MM-dd'))
          .order('lesson_date')
          .order('start_time');

        groupLessons = (sessions || []).map(session => {
          const group = teacherGroups?.find(g => g.id === session.group_id);
          return {
            id: session.id,
            lesson_date: session.lesson_date,
            start_time: session.start_time,
            end_time: session.end_time,
            type: 'group' as const,
            subject: group?.subject || null,
            level: group?.level || null,
            branch: group?.branch || null,
            group_name: group?.name || null,
            student_name: null,
            classroom: session.classroom,
            status: session.status,
          };
        });
      }

      // Also get direct lesson_sessions by teacher_id
      const { data: directSessions } = await supabase
        .from('lesson_sessions')
        .select(`
          id, lesson_date, start_time, end_time, status, classroom, teacher_name, branch,
          group_id, learning_groups(id, name, subject, level)
        `)
        .eq('teacher_id', teacherId)
        .gte('lesson_date', format(startDate, 'yyyy-MM-dd'))
        .lte('lesson_date', format(endDate, 'yyyy-MM-dd'))
        .order('lesson_date')
        .order('start_time');

      const directLessons: ScheduleLesson[] = (directSessions || [])
        .filter(s => !groupIds.includes(s.group_id || '')) // avoid duplicates
        .map(session => ({
          id: session.id,
          lesson_date: session.lesson_date,
          start_time: session.start_time,
          end_time: session.end_time,
          type: 'group' as const,
          subject: (session.learning_groups as any)?.subject || null,
          level: (session.learning_groups as any)?.level || null,
          branch: session.branch,
          group_name: (session.learning_groups as any)?.name || null,
          student_name: null,
          classroom: session.classroom,
          status: session.status,
        }));

      // Combine and sort
      return [...groupLessons, ...directLessons].sort((a, b) => {
        const dateCompare = a.lesson_date.localeCompare(b.lesson_date);
        if (dateCompare !== 0) return dateCompare;
        return (a.start_time || '').localeCompare(b.start_time || '');
      });
    },
    enabled: !!teacherId,
    staleTime: 30000,
  });

  const getLessonsForDay = (day: Date) => {
    return lessons.filter(lesson => isSameDay(new Date(lesson.lesson_date), day));
  };

  const weekLabel = `${format(startDate, 'd MMM', { locale: ru })} - ${format(endDate, 'd MMM yyyy', { locale: ru })}`;

  const totalLessons = lessons.length;
  const completedLessons = lessons.filter(l => l.status === 'completed').length;
  const scheduledLessons = lessons.filter(l => l.status === 'scheduled').length;

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Ошибка загрузки расписания</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b bg-background/95 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{weekLabel}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setCurrentWeek(new Date())}>
              Сегодня
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>Всего: <strong className="text-foreground">{totalLessons}</strong></span>
          <span>Проведено: <strong className="text-green-600">{completedLessons}</strong></span>
          <span>Запланировано: <strong className="text-blue-600">{scheduledLessons}</strong></span>
        </div>
      </div>

      {/* Week Grid */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {daysInWeek.map(day => (
              <div 
                key={day.toISOString()} 
                className={cn(
                  "text-center py-1 px-1 rounded text-xs font-medium",
                  isToday(day) && "bg-primary text-primary-foreground",
                  !isToday(day) && "text-muted-foreground"
                )}
              >
                <div>{format(day, 'EEE', { locale: ru })}</div>
                <div className="text-[10px]">{format(day, 'd')}</div>
              </div>
            ))}
          </div>

          {/* Lessons grid */}
          <div className="grid grid-cols-7 gap-1">
            {daysInWeek.map(day => {
              const dayLessons = getLessonsForDay(day);
              const isPast = day < new Date() && !isToday(day);
              
              return (
                <div 
                  key={day.toISOString()} 
                  className={cn(
                    "min-h-[100px] rounded-lg border p-1.5",
                    isToday(day) && "border-primary/50 bg-primary/5",
                    isPast && "opacity-60 bg-muted/30",
                    !isToday(day) && !isPast && "border-border bg-card"
                  )}
                >
                  {dayLessons.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-[10px] text-muted-foreground">—</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {dayLessons.map(lesson => (
                        <LessonCard key={lesson.id} lesson={lesson} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-2 text-[10px]">
            {Object.entries(statusConfig).map(([key, config]) => (
              <div key={key} className="flex items-center gap-1">
                <div className={cn("w-2 h-2 rounded-full", config.className.split(' ')[0])} />
                <span className="text-muted-foreground">{config.label}</span>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

// Compact lesson card component
const LessonCard: React.FC<{ lesson: ScheduleLesson }> = ({ lesson }) => {
  const status = statusConfig[lesson.status || 'scheduled'] || statusConfig.scheduled;
  
  return (
    <div 
      className={cn(
        "rounded p-1.5 text-[10px] leading-tight",
        status.className
      )}
    >
      {lesson.start_time && (
        <div className="font-medium flex items-center gap-0.5 mb-0.5">
          <Clock className="h-2.5 w-2.5" />
          {lesson.start_time.slice(0, 5)}
          {lesson.end_time && ` - ${lesson.end_time.slice(0, 5)}`}
        </div>
      )}
      
      {lesson.group_name && (
        <div className="truncate font-medium">
          {lesson.group_name}
        </div>
      )}
      
      {lesson.subject && !lesson.group_name && (
        <div className="truncate">
          {lesson.subject}
        </div>
      )}
      
      {lesson.classroom && (
        <div className="truncate opacity-75 flex items-center gap-0.5">
          <MapPin className="h-2 w-2" />
          {lesson.classroom}
        </div>
      )}
    </div>
  );
};

export default TeacherSchedulePanel;
