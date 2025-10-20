import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { ru } from "date-fns/locale";
import { useLessonSessions, SessionFilters } from "@/hooks/useLessonSessions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface MonthlyScheduleViewProps {
  filters: SessionFilters;
}

export const MonthlyScheduleView = ({ filters }: MonthlyScheduleViewProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const monthFilters = {
    ...filters,
    date_from: format(monthStart, 'yyyy-MM-dd'),
    date_to: format(monthEnd, 'yyyy-MM-dd')
  };

  const { data: sessions = [], isLoading } = useLessonSessions(monthFilters);

  // Get all days to display in calendar
  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarStart, calendarEnd]);

  // Group sessions by date
  const sessionsByDate = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    sessions.forEach(session => {
      const dateKey = format(new Date(session.lesson_date), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(session);
    });
    return grouped;
  }, [sessions]);

  // Get sessions for selected date
  const selectedDateSessions = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return sessionsByDate[dateKey] || [];
  }, [selectedDate, sessionsByDate]);

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  const getSessionsCount = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return sessionsByDate[dateKey]?.length || 0;
  };

  const hasSessionsOnDay = (day: Date) => {
    return getSessionsCount(day) > 0;
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
      {/* Navigation */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {format(currentMonth, "LLLL yyyy", { locale: ru })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToCurrentMonth}>
                Текущий месяц
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
                <div key={day} className="text-center text-sm font-semibold text-muted-foreground p-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isToday = isSameDay(day, new Date());
                const hasSessions = hasSessionsOnDay(day);
                const sessionsCount = getSessionsCount(day);

                return (
                  <Popover key={day.toISOString()}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "h-20 w-full flex flex-col items-center justify-start p-2 relative",
                          !isCurrentMonth && "opacity-40",
                          isToday && "border-2 border-primary",
                          hasSessions && "bg-primary/5 hover:bg-primary/10"
                        )}
                        onClick={() => setSelectedDate(day)}
                      >
                        <span className={cn(
                          "text-sm font-medium",
                          isToday && "text-primary font-bold"
                        )}>
                          {format(day, 'd')}
                        </span>
                        {hasSessions && (
                          <Badge 
                            variant="secondary" 
                            className="mt-1 text-xs px-1.5 py-0"
                          >
                            {sessionsCount}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    {hasSessions && (
                      <PopoverContent className="w-80 p-0" align="start">
                        <div className="p-3 border-b bg-muted/50">
                          <h4 className="font-semibold">
                            {format(day, "d MMMM yyyy (EEEE)", { locale: ru })}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Занятий: {sessionsCount}
                          </p>
                        </div>
                        <ScrollArea className="max-h-[300px]">
                          <div className="p-3 space-y-2">
                            {(sessionsByDate[format(day, 'yyyy-MM-dd')] || []).map((session) => (
                              <div 
                                key={session.id}
                                className="p-2 border rounded-lg hover:bg-muted/50 transition-colors"
                              >
                                <div className="font-medium text-sm">
                                  {session.learning_groups?.name || 'Группа'}
                                </div>
                                <div className="text-xs text-muted-foreground space-y-1 mt-1">
                                  <div>{session.start_time} - {session.end_time}</div>
                                  <div>{session.teacher_name}</div>
                                  <div>{session.classroom} • {session.branch}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </PopoverContent>
                    )}
                  </Popover>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary rounded"></div>
              <span className="text-muted-foreground">Сегодня</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary/5 border rounded"></div>
              <span className="text-muted-foreground">Есть занятия</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs px-1.5 py-0">5</Badge>
              <span className="text-muted-foreground">Количество занятий</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};