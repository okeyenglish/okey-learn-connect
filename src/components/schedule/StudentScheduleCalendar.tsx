import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStudentSchedule } from '@/hooks/useStudentSchedule';
import { Calendar, Clock, MapPin, User, BookOpen, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';

const attendanceStatusMap = {
  present: { label: 'Присутствовал', variant: 'default' as const, color: 'text-green-600' },
  absent: { label: 'Отсутствовал', variant: 'destructive' as const, color: 'text-red-600' },
  excused: { label: 'Уважительная', variant: 'secondary' as const, color: 'text-blue-600' },
  late: { label: 'Опоздал', variant: 'outline' as const, color: 'text-yellow-600' },
};

const lessonStatusMap = {
  scheduled: { label: 'Запланировано', variant: 'secondary' as const },
  completed: { label: 'Проведено', variant: 'default' as const },
  cancelled: { label: 'Отменено', variant: 'destructive' as const },
  rescheduled: { label: 'Перенесено', variant: 'outline' as const },
};

export const StudentScheduleCalendar = () => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [filterType, setFilterType] = useState<'all' | 'group' | 'individual'>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');

  const startDate = startOfMonth(currentMonth);
  const endDate = endOfMonth(currentMonth);

  // Получаем список студентов
  const { data: students = [] } = useQuery({
    queryKey: ['students-list'],
    queryFn: async () => {
      // Сначала получаем user_id студентов
      const { data: studentRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      const studentIds = studentRoles?.map((r: any) => r.user_id) || [];

      if (studentIds.length === 0) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, branch')
        .in('id', studentIds)
        .order('first_name');

      if (error) throw error;
      return data || [];
    },
  });

  const { data: lessons = [], isLoading } = useStudentSchedule(
    selectedStudentId,
    startDate,
    endDate
  );

  // Фильтруем занятия
  const filteredLessons = lessons.filter((lesson) => {
    if (filterType !== 'all' && lesson.lesson_type !== filterType) return false;
    if (filterSubject !== 'all' && lesson.subject !== filterSubject) return false;
    return true;
  });

  // Получаем уникальные предметы для фильтра
  const subjects = Array.from(new Set(lessons.map((l) => l.subject)));

  // Получаем дни месяца для календаря
  const monthStart = startOfWeek(startDate, { locale: ru });
  const monthEnd = endOfWeek(endDate, { locale: ru });
  const daysInView = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getLessonsForDay = (day: Date) => {
    return filteredLessons.filter((lesson) =>
      isSameDay(new Date(lesson.lesson_date), day)
    );
  };

  const studentName = students.find((s) => s.id === selectedStudentId)
    ? `${students.find((s) => s.id === selectedStudentId)?.first_name} ${
        students.find((s) => s.id === selectedStudentId)?.last_name
      }`.trim()
    : 'Студент';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Расписание студента</CardTitle>
          <CardDescription>
            Просмотр всех занятий студента с отметками о посещаемости
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Студент</label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите студента" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {`${student.first_name} ${student.last_name}`.trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Тип занятий</label>
              <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все занятия</SelectItem>
                  <SelectItem value="group">Групповые</SelectItem>
                  <SelectItem value="individual">Индивидуальные</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Предмет</label>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все предметы</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedStudentId && (
            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-lg font-medium">
                  {format(currentMonth, 'LLLL yyyy', { locale: ru })}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Tabs value={view} onValueChange={(v: any) => setView(v)}>
                <TabsList>
                  <TabsTrigger value="calendar">Календарь</TabsTrigger>
                  <TabsTrigger value="list">Список</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStudentId && (
        <>
          {view === 'calendar' ? (
            <Card>
              <CardContent className="pt-6">
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
                    const isCurrentMonth =
                      day.getMonth() === currentMonth.getMonth();
                    const isToday = isSameDay(day, new Date());

                    return (
                      <div
                        key={idx}
                        className={`min-h-[120px] border rounded-lg p-2 ${
                          !isCurrentMonth ? 'bg-muted/50' : ''
                        } ${isToday ? 'border-primary' : ''}`}
                      >
                        <div
                          className={`text-sm font-medium mb-1 ${
                            !isCurrentMonth ? 'text-muted-foreground' : ''
                          }`}
                        >
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-1">
                          {dayLessons.slice(0, 3).map((lesson) => (
                            <div
                              key={lesson.id}
                              className="text-xs p-1 rounded bg-primary/10 truncate"
                              title={`${lesson.lesson_time || ''} - ${lesson.subject} (${
                                lesson.lesson_type === 'group' ? 'Группа' : 'Индивид.'
                              })`}
                            >
                              <div className="font-medium">
                                {lesson.lesson_time || '—'}
                              </div>
                              <div className="truncate">{lesson.subject}</div>
                            </div>
                          ))}
                          {dayLessons.length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{dayLessons.length - 3} еще
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <ScrollArea className="h-[600px]">
                  {filteredLessons.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      Нет занятий за выбранный период
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredLessons.map((lesson) => (
                        <Card key={lesson.id}>
                          <CardContent className="pt-4">
                            <div className="space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">
                                      {format(new Date(lesson.lesson_date), 'dd MMMM yyyy, EEEE', {
                                        locale: ru,
                                      })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span>{lesson.lesson_time || 'Время не указано'}</span>
                                    {lesson.duration && (
                                      <span className="text-muted-foreground">
                                        ({lesson.duration} мин)
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Badge
                                    variant={
                                      lesson.lesson_type === 'group' ? 'default' : 'secondary'
                                    }
                                  >
                                    {lesson.lesson_type === 'group' ? 'Группа' : 'Индивид.'}
                                  </Badge>
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

                              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-sm">
                                    <BookOpen className="h-3 w-3 text-muted-foreground" />
                                    <span className="font-medium">{lesson.subject}</span>
                                    {lesson.level && (
                                      <span className="text-muted-foreground">({lesson.level})</span>
                                    )}
                                  </div>
                                  {lesson.teacher_name && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <User className="h-3 w-3 text-muted-foreground" />
                                      <span>{lesson.teacher_name}</span>
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

                                <div className="space-y-1">
                                  {lesson.group_name && (
                                    <div className="text-sm">
                                      <span className="text-muted-foreground">Группа: </span>
                                      <span className="font-medium">{lesson.group_name}</span>
                                    </div>
                                  )}
                                  {lesson.attendance_status && (
                                    <div className="text-sm">
                                      <span className="text-muted-foreground">Посещаемость: </span>
                                      <span
                                        className={
                                          attendanceStatusMap[
                                            lesson.attendance_status as keyof typeof attendanceStatusMap
                                          ]?.color
                                        }
                                      >
                                        {
                                          attendanceStatusMap[
                                            lesson.attendance_status as keyof typeof attendanceStatusMap
                                          ]?.label
                                        }
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {lesson.notes && (
                                <div className="text-sm text-muted-foreground pt-2 border-t">
                                  {lesson.notes}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
