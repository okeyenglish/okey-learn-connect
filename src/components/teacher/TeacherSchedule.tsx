import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, MapPin, Users, User, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Teacher } from '@/hooks/useTeachers';
import { useState } from 'react';
import { LessonDetailsDrawer } from '@/components/teacher/drawers/LessonDetailsDrawer';

interface TeacherScheduleProps {
  teacher: Teacher;
}

export const TeacherSchedule = ({ teacher }: TeacherScheduleProps) => {
  const teacherName = `${teacher.last_name} ${teacher.first_name}`;
  const weekDays = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Получаем расписание преподавателя на текущую неделю
  const { data: weekSchedule, isLoading } = useQuery({
    queryKey: ['teacher-schedule-week', teacherName],
    queryFn: async () => {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Понедельник
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Воскресенье

      const { data, error } = await supabase
        .from('lesson_sessions')
        .select(`
          *,
          learning_groups (
            name,
            subject,
            current_students
          )
        `)
        .eq('teacher_name', teacherName)
        .gte('lesson_date', startOfWeek.toISOString().split('T')[0])
        .lte('lesson_date', endOfWeek.toISOString().split('T')[0])
        .order('lesson_date')
        .order('start_time');

      if (error) throw error;

      // Группируем по дням недели
      const scheduleByDay = new Map();
      data?.forEach((lesson: any) => {
        const date = new Date(lesson.lesson_date);
        const dayIndex = date.getDay();
        const dayName = weekDays[dayIndex === 0 ? 6 : dayIndex - 1]; // Преобразуем воскресенье в последний день

        if (!scheduleByDay.has(dayName)) {
          scheduleByDay.set(dayName, []);
        }

        scheduleByDay.get(dayName).push({
          ...lesson,
          time: `${lesson.start_time.slice(0, 5)} - ${lesson.end_time.slice(0, 5)}`,
          group: lesson.learning_groups?.name || lesson.notes || 'Индивидуальное занятие',
          location: lesson.classroom || 'Онлайн',
          type: lesson.group_id ? 'group' : 'individual',
          students: lesson.learning_groups?.current_students || 1,
          isOnline: !lesson.classroom || lesson.classroom === 'Online',
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

      const { data, error } = await supabase
        .from('lesson_sessions')
        .select('id, start_time, end_time')
        .eq('teacher_name', teacherName)
        .gte('lesson_date', startOfWeek.toISOString().split('T')[0])
        .lte('lesson_date', endOfWeek.toISOString().split('T')[0]);

      if (error) throw error;

      const lessonsCount = data?.length || 0;
      
      // Подсчет часов (академических)
      let totalMinutes = 0;
      data?.forEach((lesson: any) => {
        const start = lesson.start_time.split(':');
        const end = lesson.end_time.split(':');
        const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
        const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
        totalMinutes += (endMinutes - startMinutes);
      });
      
      const totalHours = (totalMinutes / 45).toFixed(1); // Академические часы

      // Количество филиалов
      const { data: branches } = await supabase
        .from('lesson_sessions')
        .select('branch')
        .eq('teacher_name', teacherName)
        .gte('lesson_date', startOfWeek.toISOString().split('T')[0])
        .lte('lesson_date', endOfWeek.toISOString().split('T')[0]);

      const uniqueBranches = new Set(branches?.map(b => b.branch).filter(Boolean));

      return {
        lessonsCount,
        totalHours,
        branchesCount: uniqueBranches.size,
      };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Расписание
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Расписание
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-brand/5 border-brand/20">
            <div className="text-sm text-muted-foreground mb-1">Уроков на неделе</div>
            <div className="text-2xl font-bold text-brand">{stats?.lessonsCount || 0}</div>
          </Card>
          <Card className="p-4 bg-brand/5 border-brand/20">
            <div className="text-sm text-muted-foreground mb-1">Часов (академических)</div>
            <div className="text-2xl font-bold text-brand">{stats?.totalHours || 0}</div>
          </Card>
          <Card className="p-4 bg-brand/5 border-brand/20">
            <div className="text-sm text-muted-foreground mb-1">Филиалы</div>
            <div className="text-2xl font-bold text-brand">{stats?.branchesCount || 0}</div>
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
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-3 flex-1">
                                    <div className="p-2 rounded-lg bg-brand/10">
                                      {lesson.type === 'group' ? (
                                        <Users className="h-5 w-5 text-brand" />
                                      ) : (
                                        <User className="h-5 w-5 text-brand" />
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-semibold mb-1">{lesson.group}</div>
                                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3.5 w-3.5" />
                                          {lesson.time}
                                        </span>
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
                                        <Badge variant="outline" className="text-xs">
                                          {lesson.students} {lesson.students === 1 ? 'ученик' : 'учеников'}
                                        </Badge>
                                      </div>
                                    </div>
                                   </div>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedLesson(lesson);
                                      setDrawerOpen(true);
                                    }}
                                  >
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

      {selectedLesson && (
        <LessonDetailsDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          lesson={{
            id: selectedLesson.id,
            title: selectedLesson.group,
            startTime: selectedLesson.start_time,
            endTime: selectedLesson.end_time,
            date: selectedLesson.lesson_date,
            room: selectedLesson.location,
            isOnline: selectedLesson.isOnline,
            onlineLink: selectedLesson.online_link,
            studentsCount: selectedLesson.students,
            status: selectedLesson.status || 'scheduled',
            level: selectedLesson.learning_groups?.level,
            groupType: selectedLesson.type,
          }}
          onStart={() => console.log('Start lesson')}
          onAttendance={() => console.log('Open attendance')}
          onHomework={() => console.log('Open homework')}
          onComplete={() => console.log('Complete lesson')}
          onJoinClass={selectedLesson.online_link ? () => window.open(selectedLesson.online_link, '_blank') : undefined}
        />
      )}
    </Card>
  );
};
