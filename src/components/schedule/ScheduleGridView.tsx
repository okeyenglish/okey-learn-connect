import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useLessonSessions, SessionFilters, getStatusColor } from "@/hooks/useLessonSessions";
import { format, startOfDay, addDays, subDays, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

interface ScheduleGridViewProps {
  filters: SessionFilters;
}

export const ScheduleGridView = ({ filters }: ScheduleGridViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Generate time slots from 9:00 to 20:00
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 9; hour <= 19; hour++) {
      slots.push({
        start: `${hour.toString().padStart(2, '0')}:00`,
        end: `${(hour + 1).toString().padStart(2, '0')}:00`,
        label: `${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`
      });
    }
    return slots;
  }, []);

  // Get sessions for current date
  const dayFilters = {
    ...filters,
    date_from: format(currentDate, 'yyyy-MM-dd'),
    date_to: format(currentDate, 'yyyy-MM-dd')
  };

  const { data: sessions = [], isLoading } = useLessonSessions(dayFilters);

  // Get unique teachers from sessions
  const activeTeachers = useMemo(() => {
    const teacherNames = [...new Set(sessions.map(s => s.teacher_name))];
    return teacherNames.sort();
  }, [sessions]);

  // Create grid data structure
  const gridData = useMemo(() => {
    const grid: { [teacherName: string]: { [timeSlot: string]: any } } = {};
    
    activeTeachers.forEach(teacher => {
      grid[teacher] = {};
    });

    sessions.forEach(session => {
      const teacher = session.teacher_name;
      const startTime = session.start_time.substring(0, 5); // Format: HH:mm
      
      if (grid[teacher]) {
        grid[teacher][startTime] = session;
      }
    });

    return grid;
  }, [sessions, activeTeachers]);

  const goToPreviousDay = () => {
    setCurrentDate(prev => subDays(prev, 1));
  };

  const goToNextDay = () => {
    setCurrentDate(prev => addDays(prev, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Загрузка расписания...</p>
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
              {format(currentDate, "d MMMM yyyy (EEEE)", { locale: ru })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousDay}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Сегодня
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextDay}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Header with time slots */}
              <div className="grid grid-cols-[200px_repeat(11,120px)] border-b">
                <div className="p-4 bg-muted/50 border-r font-semibold">
                  Преподаватель
                </div>
                {timeSlots.map((slot) => (
                  <div key={slot.start} className="p-3 bg-muted/50 border-r text-center text-sm font-medium">
                    {slot.label}
                  </div>
                ))}
              </div>

              {/* Teacher rows */}
              {activeTeachers.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Нет занятий на выбранную дату</p>
                </div>
              ) : (
                activeTeachers.map((teacher) => (
                  <div key={teacher} className="grid grid-cols-[200px_repeat(11,120px)] border-b hover:bg-muted/30">
                    {/* Teacher name */}
                    <div className="p-4 border-r">
                      <div className="font-medium text-sm">{teacher}</div>
                    </div>

                    {/* Time slots for this teacher */}
                    {timeSlots.map((slot) => {
                      const session = gridData[teacher]?.[slot.start];
                      
                      return (
                        <div key={slot.start} className="p-1 border-r relative min-h-[60px]">
                          {session && (
                            <div 
                              className={`p-2 rounded text-xs h-full cursor-pointer transition-all hover:shadow-md ${getStatusColor(session.status)} text-foreground`}
                              title={`${session.learning_groups?.name || 'Группа'}\n${session.classroom}\n${session.start_time} - ${session.end_time}`}
                            >
                              <div className="font-medium truncate">
                                {session.learning_groups?.name || 'Группа'}
                              </div>
                              <div className="text-xs opacity-90 truncate">
                                {session.branch}
                              </div>
                              <div className="text-xs opacity-90 truncate">
                                {session.classroom}
                              </div>
                              <div className="text-xs opacity-75">
                                {session.start_time}-{session.end_time}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};