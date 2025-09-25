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

      {/* Календарь */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 gap-0">
            {/* Заголовки дней недели */}
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
              <div key={day} className="p-3 text-center text-sm font-semibold bg-muted border-b border-r last:border-r-0">
                {day}
              </div>
            ))}
            
            {/* Дни месяца */}
            {calendarDays.map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const daySessions = sessionsByDay[dayKey] || [];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              
              return (
                <div 
                  key={day.toISOString()} 
                  className={`min-h-[100px] p-2 border-b border-r last:border-r-0 transition-colors ${
                    isCurrentMonth ? '' : 'bg-gray-50 text-gray-400'
                  } ${isToday ? 'bg-blue-100 border-blue-300' : ''} ${getDayBackgroundColor(daySessions)}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm ${
                      isToday ? 'font-bold text-blue-800' : 
                      isCurrentMonth ? 'font-medium' : 'text-gray-400'
                    }`}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  
                  {/* Занятия в этот день */}
                  <div className="space-y-1">
                    {daySessions.map((session) => (
                      <div 
                        key={session.id}
                        className="text-xs p-1 rounded bg-white border shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5 text-gray-400" />
                            <span className="font-medium">{session.start_time}</span>
                          </div>
                          {getStatusIcon(session.status)}
                        </div>
                        
                        {session.lessons && (
                          <div className="text-gray-600 truncate">
                            Урок {session.lesson_number}: {session.lessons.title}
                          </div>
                        )}
                        
                        <div className="text-gray-500 truncate">
                          {session.classroom}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
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