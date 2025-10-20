import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTeacherSchedule, useTeacherScheduleStats } from '@/hooks/useTeacherSchedule';
import {
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Users,
  User,
  TrendingUp,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameDay,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const lessonStatusMap = {
  scheduled: { label: 'Запланировано', variant: 'secondary' as const, color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Проведено', variant: 'default' as const, color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Отменено', variant: 'destructive' as const, color: 'bg-red-100 text-red-700' },
  rescheduled: { label: 'Перенесено', variant: 'outline' as const, color: 'bg-yellow-100 text-yellow-700' },
};

export const TeacherScheduleCalendar = () => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [currentPeriod, setCurrentPeriod] = useState(new Date());
  const [view, setView] = useState<'week' | 'month'>('week');

  const startDate = view === 'week' 
    ? startOfWeek(currentPeriod, { weekStartsOn: 1 })
    : startOfWeek(startOfMonth(currentPeriod), { locale: ru });
  const endDate = view === 'week'
    ? endOfWeek(currentPeriod, { weekStartsOn: 1 })
    : endOfWeek(endOfMonth(currentPeriod), { locale: ru });

  // Получаем список преподавателей
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers-list-schedule'],
    queryFn: async () => {
      const { data: teacherRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');

      const teacherIds = teacherRoles?.map((r: any) => r.user_id) || [];

      if (teacherIds.length === 0) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, branch')
        .in('id', teacherIds)
        .order('first_name');

      if (error) throw error;
      return data || [];
    },
  });

  const { data: lessons = [], isLoading } = useTeacherSchedule(
    selectedTeacherId,
    startDate,
    endDate
  );

  // Получаем данные за весь месяц для статистики
  const { data: monthLessons = [] } = useTeacherSchedule(
    selectedTeacherId,
    startOfMonth(currentPeriod),
    endOfMonth(currentPeriod)
  );

  const stats = useTeacherScheduleStats(selectedTeacherId, monthLessons);

  const daysInView = eachDayOfInterval({ start: startDate, end: endDate });

  const getLessonsForDay = (day: Date) => {
    return lessons.filter((lesson) => isSameDay(new Date(lesson.lesson_date), day));
  };

  const getHoursForDay = (day: Date) => {
    const dayLessons = getLessonsForDay(day);
    return dayLessons.reduce((sum, l) => sum + ((l.duration || 0) / 60), 0);
  };

  const teacherName = teachers.find((t) => t.id === selectedTeacherId)
    ? `${teachers.find((t) => t.id === selectedTeacherId)?.first_name} ${
        teachers.find((t) => t.id === selectedTeacherId)?.last_name
      }`.trim()
    : 'Преподаватель';

  const handlePrevPeriod = () => {
    setCurrentPeriod(view === 'week' ? subWeeks(currentPeriod, 1) : subMonths(currentPeriod, 1));
  };

  const handleNextPeriod = () => {
    setCurrentPeriod(view === 'week' ? addWeeks(currentPeriod, 1) : addMonths(currentPeriod, 1));
  };

  const getPeriodLabel = () => {
    if (view === 'week') {
      return `${format(startDate, 'd MMM', { locale: ru })} - ${format(endDate, 'd MMM yyyy', {
        locale: ru,
      })}`;
    }
    return format(currentPeriod, 'LLLL yyyy', { locale: ru });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Расписание преподавателя</CardTitle>
          <CardDescription>Просмотр нагрузки и свободных слотов преподавателя</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Преподаватель</label>
              <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите преподавателя" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {`${teacher.first_name} ${teacher.last_name}`.trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTeacherId && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevPeriod}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-center min-w-[200px]">
                  <p className="text-sm font-medium">{getPeriodLabel()}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleNextPeriod}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {selectedTeacherId && (
              <Tabs value={view} onValueChange={(v: any) => setView(v)}>
                <TabsList>
                  <TabsTrigger value="week">Неделя</TabsTrigger>
                  <TabsTrigger value="month">Месяц</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>

          {selectedTeacherId && stats && (
            <div className="grid grid-cols-5 gap-4 pt-4 border-t">
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Всего занятий
                    </p>
                    <p className="text-xl font-bold">{stats.total_lessons}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Часов
                    </p>
                    <p className="text-xl font-bold">{stats.total_hours.toFixed(1)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Групповых
                    </p>
                    <p className="text-xl font-bold text-blue-600">{stats.group_lessons}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Индивид.
                    </p>
                    <p className="text-xl font-bold text-purple-600">{stats.individual_lessons}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Проведено
                    </p>
                    <p className="text-xl font-bold text-green-600">{stats.completed_lessons}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTeacherId && (
        <Card>
          <CardContent className="pt-6">
            {view === 'week' ? (
              <div className="space-y-4">
                {daysInView.map((day) => {
                  const dayLessons = getLessonsForDay(day);
                  const hoursForDay = getHoursForDay(day);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <Card key={day.toString()} className={isToday ? 'border-primary' : ''}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">
                              {format(day, 'EEEE, d MMMM', { locale: ru })}
                            </CardTitle>
                            <CardDescription>
                              {dayLessons.length} занятий • {hoursForDay.toFixed(1)} часов
                            </CardDescription>
                          </div>
                          {isToday && <Badge variant="default">Сегодня</Badge>}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {dayLessons.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Нет занятий
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {dayLessons.map((lesson) => (
                              <div
                                key={lesson.id}
                                className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                              >
                                <div className="flex-shrink-0">
                                  <div className="text-sm font-medium">{lesson.lesson_time}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {lesson.duration} мин
                                  </div>
                                </div>

                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{lesson.subject}</span>
                                    {lesson.level && (
                                      <span className="text-sm text-muted-foreground">
                                        ({lesson.level})
                                      </span>
                                    )}
                                  </div>

                                  {lesson.lesson_type === 'group' ? (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Users className="h-3 w-3 text-muted-foreground" />
                                      <span>{lesson.group_name}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-sm">
                                      <User className="h-3 w-3 text-muted-foreground" />
                                      <span>{lesson.student_name}</span>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="h-3 w-3 text-muted-foreground" />
                                    <span>
                                      {lesson.branch}
                                      {lesson.classroom && `, ${lesson.classroom}`}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex-shrink-0">
                                  <Badge
                                    variant={
                                      lessonStatusMap[lesson.status as keyof typeof lessonStatusMap]
                                        ?.variant || 'secondary'
                                    }
                                  >
                                    {lessonStatusMap[lesson.status as keyof typeof lessonStatusMap]
                                      ?.label || lesson.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-medium text-muted-foreground p-2"
                  >
                    {day}
                  </div>
                ))}

                {daysInView.map((day, idx) => {
                  const dayLessons = getLessonsForDay(day);
                  const hoursForDay = getHoursForDay(day);
                  const isCurrentMonth = day.getMonth() === currentPeriod.getMonth();
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={idx}
                      className={`min-h-[100px] border rounded-lg p-2 ${
                        !isCurrentMonth ? 'bg-muted/50' : ''
                      } ${isToday ? 'border-primary border-2' : ''}`}
                    >
                      <div
                        className={`text-sm font-medium mb-1 ${
                          !isCurrentMonth ? 'text-muted-foreground' : ''
                        }`}
                      >
                        {format(day, 'd')}
                      </div>

                      {dayLessons.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-xs font-medium">
                            {dayLessons.length} занятий
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {hoursForDay.toFixed(1)} ч
                          </div>
                          <div className="space-y-0.5">
                            {dayLessons.slice(0, 2).map((lesson) => (
                              <div
                                key={lesson.id}
                                className={`text-xs p-1 rounded truncate ${
                                  lessonStatusMap[lesson.status as keyof typeof lessonStatusMap]
                                    ?.color || 'bg-gray-100'
                                }`}
                              >
                                {lesson.lesson_time}
                              </div>
                            ))}
                            {dayLessons.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{dayLessons.length - 2}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
