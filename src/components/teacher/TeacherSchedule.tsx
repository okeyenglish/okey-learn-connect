import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, MapPin, Users, User, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

export const TeacherSchedule = () => {
  const weekDays = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  
  const mockSchedule = [
    {
      day: 'Понедельник',
      lessons: [
        { time: '17:00 - 18:20', group: 'Kids Box 1', location: 'Аудитория 3', type: 'group', students: 8 },
        { time: '18:30 - 19:50', group: 'Prepare 4', location: 'Аудитория 3', type: 'group', students: 10 },
      ],
    },
    {
      day: 'Среда',
      lessons: [
        { time: '17:00 - 18:20', group: 'Kids Box 1', location: 'Аудитория 3', type: 'group', students: 8 },
        { time: '18:30 - 19:50', group: 'Prepare 4', location: 'Аудитория 3', type: 'group', students: 10 },
      ],
    },
    {
      day: 'Пятница',
      lessons: [
        { time: '16:00 - 17:20', group: 'Анна Иванова', location: 'Онлайн', type: 'individual', students: 1 },
      ],
    },
  ];

  const currentWeekLessons = 10;
  const totalWeeklyHours = 13.3;

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
            <div className="text-2xl font-bold text-brand">{currentWeekLessons}</div>
          </Card>
          <Card className="p-4 bg-brand/5 border-brand/20">
            <div className="text-sm text-muted-foreground mb-1">Часов (академических)</div>
            <div className="text-2xl font-bold text-brand">{totalWeeklyHours}</div>
          </Card>
          <Card className="p-4 bg-brand/5 border-brand/20">
            <div className="text-sm text-muted-foreground mb-1">Филиалы</div>
            <div className="text-2xl font-bold text-brand">1</div>
          </Card>
        </div>

        <Tabs defaultValue="week" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="week">Неделя</TabsTrigger>
            <TabsTrigger value="month">Месяц</TabsTrigger>
          </TabsList>

          <TabsContent value="week">
            <div className="space-y-4">
              {weekDays.map((day) => {
                const daySchedule = mockSchedule.find(s => s.day === day);
                
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
                          {daySchedule.lessons.map((lesson, idx) => (
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
                                        {lesson.location === 'Онлайн' ? (
                                          <>
                                            <Video className="h-3.5 w-3.5" />
                                            {lesson.location}
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
                                <Button size="sm" variant="ghost">
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
  );
};
