import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useSchoolCalendar, useClassroomSchedule, useBranchStats } from '@/hooks/useSchoolCalendar';
import {
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Users,
  User,
  Building2,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  startOfDay,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { ru } from 'date-fns/locale';

const lessonStatusMap = {
  scheduled: { label: 'Запланировано', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Проведено', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Отменено', color: 'bg-red-100 text-red-700' },
};

export const SchoolCalendarView = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [view, setView] = useState<'timeline' | 'classrooms' | 'stats'>('timeline');

  const startDate = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const endDate = endOfWeek(currentWeek, { weekStartsOn: 1 });

  const { data: lessons = [], isLoading } = useSchoolCalendar(startDate, endDate, selectedBranch);
  const { data: classroomSchedule = [] } = useClassroomSchedule(
    selectedBranch,
    selectedDate
  );
  const { data: branchStats = [] } = useBranchStats(startDate, endDate);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  const getLessonsForDay = (day: Date) => {
    return lessons.filter((lesson) => isSameDay(new Date(lesson.lesson_date), day));
  };

  const handlePrevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const handleNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));

  // Находим конфликты (два занятия в одном кабинете в одно время)
  const findConflicts = (dayLessons: typeof lessons) => {
    const conflicts: string[] = [];
    const classroomTimes = new Map<string, Set<string>>();

    dayLessons.forEach((lesson) => {
      if (!lesson.classroom || !lesson.lesson_time) return;

      const key = `${lesson.classroom}-${lesson.lesson_time}`;
      if (!classroomTimes.has(key)) {
        classroomTimes.set(key, new Set());
      }

      const times = classroomTimes.get(key)!;
      if (times.size > 0) {
        conflicts.push(lesson.id);
      }
      times.add(lesson.id);
    });

    return conflicts;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Общий календарь школы</CardTitle>
          <CardDescription>
            Просмотр всех занятий по филиалам, загрузка кабинетов и конфликты расписания
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Филиал</label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все филиалы</SelectItem>
                    <SelectItem value="Окская">Окская</SelectItem>
                    <SelectItem value="Центр">Центр</SelectItem>
                    <SelectItem value="Онлайн">Онлайн</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {view === 'classrooms' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Дата</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>

            {view === 'timeline' && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-center min-w-[200px]">
                  <p className="text-sm font-medium">
                    {format(startDate, 'd MMM', { locale: ru })} -{' '}
                    {format(endDate, 'd MMM yyyy', { locale: ru })}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <Tabs value={view} onValueChange={(v: any) => setView(v)}>
            <TabsList>
              <TabsTrigger value="timeline">График</TabsTrigger>
              <TabsTrigger value="classrooms">Загрузка кабинетов</TabsTrigger>
              <TabsTrigger value="stats">Статистика</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {view === 'timeline' && (
        <div className="space-y-3">
          {weekDays.map((day) => {
            const dayLessons = getLessonsForDay(day);
            const conflicts = findConflicts(dayLessons);
            const isToday = isSameDay(day, new Date());

            return (
              <Card key={day.toString()} className={isToday ? 'border-primary' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {format(day, 'EEEE, d MMMM', { locale: ru })}
                        {isToday && <Badge variant="default">Сегодня</Badge>}
                      </CardTitle>
                      <CardDescription>
                        {dayLessons.length} занятий
                        {conflicts.length > 0 && (
                          <span className="text-red-600 ml-2">
                            • {conflicts.length} конфликтов
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {dayLessons.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Нет занятий
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {dayLessons.map((lesson) => {
                        const hasConflict = conflicts.includes(lesson.id);
                        return (
                          <div
                            key={lesson.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border ${
                              hasConflict ? 'border-red-500 bg-red-50' : 'bg-card'
                            }`}
                          >
                            {hasConflict && (
                              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-1" />
                            )}

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
                                <Badge
                                  variant={
                                    lesson.lesson_type === 'group' ? 'default' : 'secondary'
                                  }
                                >
                                  {lesson.lesson_type === 'group' ? 'Группа' : 'Индивид.'}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  <span>{lesson.teacher_name || '—'}</span>
                                </div>

                                <div className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3 text-muted-foreground" />
                                  <span>{lesson.branch}</span>
                                </div>

                                {lesson.classroom && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-muted-foreground" />
                                    <span>{lesson.classroom}</span>
                                  </div>
                                )}
                              </div>

                              {lesson.group_name && (
                                <div className="text-sm text-muted-foreground">
                                  {lesson.group_name}
                                </div>
                              )}
                            </div>

                            <Badge
                              className={
                                lessonStatusMap[lesson.status as keyof typeof lessonStatusMap]
                                  ?.color || 'bg-gray-100'
                              }
                            >
                              {lessonStatusMap[lesson.status as keyof typeof lessonStatusMap]
                                ?.label || lesson.status}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {view === 'classrooms' && selectedBranch !== 'all' && (
        <Card>
          <CardHeader>
            <CardTitle>
              Загрузка кабинетов - {selectedBranch} -{' '}
              {format(new Date(selectedDate), 'd MMMM yyyy', { locale: ru })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              {classroomSchedule.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Нет данных о кабинетах
                </div>
              ) : (
                <div className="space-y-4">
                  {classroomSchedule.map((schedule) => (
                    <Card key={schedule.classroom}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{schedule.classroom}</CardTitle>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {schedule.lessons.length} занятий
                            </span>
                            <Badge
                              variant={
                                schedule.utilization_percent > 80
                                  ? 'destructive'
                                  : schedule.utilization_percent > 50
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {schedule.utilization_percent}% загрузка
                            </Badge>
                          </div>
                        </div>
                        <Progress value={schedule.utilization_percent} className="mt-2" />
                      </CardHeader>
                      <CardContent>
                        {schedule.lessons.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            Свободен весь день
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {schedule.lessons.map((lesson) => (
                              <div
                                key={lesson.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-muted"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="font-medium">{lesson.lesson_time}</span>
                                  <span className="text-sm">{lesson.subject}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {lesson.group_name || lesson.student_name}
                                  </span>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {lesson.teacher_name}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {view === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branchStats.map((stat) => (
            <Card key={stat.branch}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {stat.branch}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Занятий за неделю</span>
                  <span className="text-xl font-bold">{stat.total_lessons}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Часов</span>
                  <span className="text-xl font-bold">{stat.total_hours.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Кабинетов</span>
                  <span className="text-xl font-bold">{stat.classrooms_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Преподавателей</span>
                  <span className="text-xl font-bold">{stat.teachers_count}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
