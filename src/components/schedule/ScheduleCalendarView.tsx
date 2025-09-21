import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Users } from "lucide-react";
import { useLessonSessions, SessionFilters, getStatusColor, getStatusLabel } from "@/hooks/useLessonSessions";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks } from "date-fns";
import { ru } from "date-fns/locale";

interface ScheduleCalendarViewProps {
  filters: SessionFilters;
}

export const ScheduleCalendarView = ({ filters }: ScheduleCalendarViewProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  // Получаем начало и конец текущей недели
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  
  // Добавляем фильтры по датам для текущей недели
  const weekFilters = {
    ...filters,
    date_from: format(weekStart, 'yyyy-MM-dd'),
    date_to: format(weekEnd, 'yyyy-MM-dd')
  };
  
  const { data: sessions = [], isLoading } = useLessonSessions(weekFilters);
  
  // Получаем дни недели
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  // Группируем занятия по дням
  const sessionsByDay = weekDays.map(day => {
    const daySessions = sessions.filter(session => 
      isSameDay(new Date(session.lesson_date), day)
    ).sort((a, b) => a.start_time.localeCompare(b.start_time));
    
    return {
      date: day,
      sessions: daySessions
    };
  });
  
  const goToPreviousWeek = () => {
    setCurrentWeek(prev => subWeeks(prev, 1));
  };
  
  const goToNextWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, 1));
  };
  
  const goToCurrentWeek = () => {
    setCurrentWeek(new Date());
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка календаря...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Навигация по неделям */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {format(weekStart, "d MMMM", { locale: ru })} - {format(weekEnd, "d MMMM yyyy", { locale: ru })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
                Сегодня
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Сетка календаря */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {sessionsByDay.map(({ date, sessions }) => (
          <Card key={date.toISOString()} className="min-h-[300px]">
            <CardHeader className="pb-3">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-600">
                  {format(date, "EEEE", { locale: ru })}
                </div>
                <div className={`text-lg font-semibold ${
                  isSameDay(date, new Date()) ? "text-blue-600" : "text-gray-900"
                }`}>
                  {format(date, "d", { locale: ru })}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {sessions.length === 0 ? (
                <div className="text-center text-gray-400 py-4">
                  <div className="text-sm">Нет занятий</div>
                </div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="font-medium">
                            {session.start_time} - {session.end_time}
                          </span>
                        </div>
                        <Badge className={`text-xs ${getStatusColor(session.status)}`}>
                          {getStatusLabel(session.status)}
                        </Badge>
                      </div>
                      
                      <div className="text-sm font-medium text-blue-600 truncate">
                        {session.learning_groups?.name || 'Группа не найдена'}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Users className="h-3 w-3" />
                          <span className="truncate">{session.teacher_name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{session.classroom}</span>
                        </div>
                      </div>
                      
                      {session.notes && (
                        <div className="text-xs text-gray-500 truncate">
                          {session.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};