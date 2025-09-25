import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle, XCircle, Circle, RotateCcw } from "lucide-react";
import { useLessonSessions, getStatusColor, getStatusLabel } from "@/hooks/useLessonSessions";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isSameMonth, startOfWeek, endOfWeek } from "date-fns";
import { ru } from "date-fns/locale";

interface GroupScheduleCalendarProps {
  groupId: string;
}

export const GroupScheduleCalendar = ({ groupId }: GroupScheduleCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Расширяем диапазон для отображения полных недель
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const { data: sessions = [], isLoading } = useLessonSessions({
    date_from: format(calendarStart, 'yyyy-MM-dd'),
    date_to: format(calendarEnd, 'yyyy-MM-dd')
  });

  // Фильтруем занятия только для этой группы
  const groupSessions = sessions.filter(session => session.group_id === groupId);

  // Создаем дни календаря
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Группируем занятия по дням
  const sessionsByDay = useMemo(() => {
    const result: { [key: string]: any[] } = {};
    groupSessions.forEach(session => {
      const dayKey = format(new Date(session.lesson_date), 'yyyy-MM-dd');
      if (!result[dayKey]) {
        result[dayKey] = [];
      }
      result[dayKey].push(session);
    });
    return result;
  }, [groupSessions]);

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  // Получаем иконку для статуса
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-3 w-3 text-red-600" />;
      case 'rescheduled':
        return <RotateCcw className="h-3 w-3 text-yellow-600" />;
      default:
        return <Circle className="h-3 w-3 text-blue-600" />;
    }
  };

  // Получаем цвет фона для дня
  const getDayBackgroundColor = (sessions: any[]) => {
    if (sessions.length === 0) return '';
    
    const hasCompleted = sessions.some(s => s.status === 'completed');
    const hasCancelled = sessions.some(s => s.status === 'cancelled');
    const hasRescheduled = sessions.some(s => s.status === 'rescheduled');
    
    if (hasCompleted) return 'bg-green-50 border-green-200';
    if (hasCancelled) return 'bg-red-50 border-red-200';
    if (hasRescheduled) return 'bg-yellow-50 border-yellow-200';
    return 'bg-blue-50 border-blue-200';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Загрузка календаря...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Навигация */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-blue-600" />
          {format(currentMonth, "LLLL yyyy", { locale: ru })}
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToCurrentMonth}>
            Сегодня
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Легенда статусов */}
      <Card className="border-dashed border-gray-300">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Circle className="h-3 w-3 text-blue-600" />
              <span>Запланировано</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>Проведено</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-3 w-3 text-red-600" />
              <span>Отменено</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="h-3 w-3 text-yellow-600" />
              <span>Перенесено</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Занятия по датам */}
      <Card>
        <CardContent className="p-4">
          {groupSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Нет занятий в выбранном периоде
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(sessionsByDay)
                .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                .map(([date, sessions]) => (
                  <div key={date} className="border rounded-lg p-4 bg-card">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">
                          {format(new Date(date), 'd MMMM', { locale: ru })}
                        </span>
                        <span className="text-muted-foreground">
                          ({format(new Date(date), 'EEEE', { locale: ru })})
                        </span>
                        {isSameDay(new Date(date), new Date()) && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                            Сегодня
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {sessions.map((session) => (
                        <div 
                          key={session.id}
                          className={`p-3 rounded-lg border transition-colors ${getDayBackgroundColor([session])}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">{session.start_time}</span>
                              {getStatusIcon(session.status)}
                              <Badge 
                                variant="outline" 
                                className={`${getStatusColor(session.status)} text-xs`}
                              >
                                {getStatusLabel(session.status)}
                              </Badge>
                            </div>
                          </div>
                          
                          {session.lessons && (
                            <div className="text-sm text-gray-700 mb-1">
                              <strong>Урок {session.lesson_number}:</strong> {session.lessons.title}
                            </div>
                          )}
                          
                          <div className="text-sm text-gray-500">
                            <strong>Аудитория:</strong> {session.classroom}
                          </div>
                          
                          {session.notes && (
                            <div className="text-sm text-gray-600 mt-2 italic">
                              {session.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {groupSessions.filter(s => s.status === 'scheduled').length}
            </div>
            <div className="text-sm text-gray-600">Запланировано</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {groupSessions.filter(s => s.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Проведено</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {groupSessions.filter(s => s.status === 'cancelled').length}
            </div>
            <div className="text-sm text-gray-600">Отменено</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {groupSessions.filter(s => s.status === 'rescheduled').length}
            </div>
            <div className="text-sm text-gray-600">Перенесено</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};