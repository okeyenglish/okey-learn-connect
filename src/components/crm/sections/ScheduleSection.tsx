import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Users, MapPin, Plus, Filter } from 'lucide-react';
import { ScheduleModal } from '@/components/schedule/ScheduleModal';
import { useLessonSessions, SessionFilters } from '@/hooks/useLessonSessions';
import { useLearningGroups } from '@/hooks/useLearningGroups';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function ScheduleSection() {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  
  const sessionFilters: SessionFilters = {
    branch: selectedBranch === 'all' ? undefined : selectedBranch
  };
  
  const { data: sessions, isLoading: sessionsLoading } = useLessonSessions(sessionFilters);
  const { groups, isLoading: groupsLoading } = useLearningGroups({});

  const todaySessions = sessions?.filter(session => 
    session.lesson_date === format(selectedDate, 'yyyy-MM-dd')
  ) || [];

  const upcomingSessions = sessions?.filter(session => 
    new Date(session.lesson_date) > selectedDate
  ).slice(0, 10) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ongoing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Запланировано';
      case 'ongoing':
        return 'Идет урок';
      case 'completed':
        return 'Завершено';
      case 'cancelled':
        return 'Отменено';
      default:
        return status;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Расписание</h1>
          <p className="text-muted-foreground">
            Управление занятиями и расписанием филиалов
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Фильтры
          </Button>
          <Button onClick={() => setShowScheduleModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить занятие
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Занятий сегодня
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaySessions.length}</div>
            <p className="text-xs text-muted-foreground">
              {format(selectedDate, 'EEEE, d MMMM', { locale: ru })}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Активных групп
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groups?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Всего групп в системе
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Завершенных занятий
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {todaySessions.filter(s => s.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Из {todaySessions.length} запланированных
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Занятий на завтра
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions?.filter(s => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                return s.lesson_date === format(tomorrow, 'yyyy-MM-dd');
              }).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(Date.now() + 86400000), 'EEEE, d MMMM', { locale: ru })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Табы с расписанием */}
      <Tabs defaultValue="today" className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Сегодня</TabsTrigger>
          <TabsTrigger value="upcoming">Предстоящие</TabsTrigger>
          <TabsTrigger value="groups">Все группы</TabsTrigger>
        </TabsList>
        
        <TabsContent value="today" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Занятия на сегодня</CardTitle>
              <CardDescription>
                {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: ru })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="text-center py-4">Загрузка...</div>
              ) : todaySessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  На сегодня занятий не запланировано
                </div>
              ) : (
                <div className="space-y-4">
                  {todaySessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {session.start_time} - {session.end_time}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4" />
                          <span className="font-medium">
                            {session.notes || `Урок ${session.id.slice(0, 8)}`}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {session.classroom}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {session.teacher_name}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(session.status)}>
                          {getStatusLabel(session.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Предстоящие занятия</CardTitle>
              <CardDescription>
                Ближайшие 10 занятий
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="text-center py-4">Загрузка...</div>
              ) : upcomingSessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Предстоящих занятий не найдено
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(session.lesson_date), 'dd.MM.yyyy')}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {session.start_time} - {session.end_time}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4" />
                          <span className="font-medium">
                            {session.notes || `Урок ${session.id.slice(0, 8)}`}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {session.classroom}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {session.teacher_name}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(session.status)}>
                          {getStatusLabel(session.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="groups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Все группы</CardTitle>
              <CardDescription>
                Список всех активных групп
              </CardDescription>
            </CardHeader>
            <CardContent>
              {groupsLoading ? (
                <div className="text-center py-4">Загрузка...</div>
              ) : !groups || groups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Активных групп не найдено
                </div>
              ) : (
                <div className="space-y-4">
                  {groups.map((group) => (
                    <div key={group.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="font-medium">{group.name}</div>
                        <Badge variant="outline">{group.level}</Badge>
                        <div className="text-sm text-muted-foreground">
                          {group.subject}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {group.current_students}/{group.capacity} студентов
                        </div>
                        {group.responsible_teacher && (
                          <div className="text-sm text-muted-foreground">
                            {group.responsible_teacher}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={group.status === 'active' ? 'default' : 'secondary'}>
                          {group.status === 'active' ? 'Активная' : group.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Модальное окно для добавления занятий */}
      <ScheduleModal 
        open={showScheduleModal} 
        onOpenChange={setShowScheduleModal} 
      />
    </div>
  );
}