import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Users } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, addDays } from "date-fns";
import { ru } from "date-fns/locale";
import { useScheduleData, ScheduleFilters, getSessionStatusColor, getDayNames } from "@/hooks/useScheduleData";
import { GroupDetailModal } from "@/components/learning-groups/GroupDetailModal";
import { useLearningGroups } from "@/hooks/useLearningGroups";

interface TeacherScheduleGridProps {
  filters: ScheduleFilters;
  viewFormat: string;
  gridSettings: {
    timeStep: string;
    weekMode: boolean;
    mergedColumns: boolean;
    rotated: boolean;
  };
}

export const TeacherScheduleGrid = ({ filters, viewFormat, gridSettings }: TeacherScheduleGridProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  // Get sessions using real data
  const { data: sessions = [], isLoading } = useScheduleData(filters);
  const { groups } = useLearningGroups({});

  // Generate time slots based on grid settings
  const timeSlots = useMemo(() => {
    const slots = [];
    let step = 1; // Default 1 hour
    
    switch (gridSettings.timeStep) {
      case '30min':
        step = 0.5;
        break;
      case '2hours':
        step = 2;  
        break;
      case '3hours':
        step = 3;
        break;
      case '4hours':
        step = 4;
        break;
      default:
        step = 1;
    }

    for (let hour = 8; hour < 22; hour += step) {
      const endHour = Math.min(hour + step, 22);
      slots.push({
        start: `${hour.toString().padStart(2, '0')}:00`,
        end: `${endHour.toString().padStart(2, '0')}:00`,
        label: `${hour.toString().padStart(2, '0')}:00-${endHour.toString().padStart(2, '0')}:00`
      });
    }
    return slots;
  }, [gridSettings.timeStep]);

  // Get week days for display
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const end = endOfWeek(currentWeek, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentWeek]);

  // Get unique teachers with their total hours
  const teachersWithHours = useMemo(() => {
    const teacherStats: { [name: string]: { sessions: any[], totalHours: number } } = {};
    
    sessions.forEach(session => {
      const teacherName = session.teacher_name;
      if (!teacherStats[teacherName]) {
        teacherStats[teacherName] = { sessions: [], totalHours: 0 };
      }
      teacherStats[teacherName].sessions.push(session);
      // Calculate hours based on schedule (assuming 1.5 hours per session by default)
      teacherStats[teacherName].totalHours += session.days.length * 1.5;
    });

    return Object.entries(teacherStats)
      .map(([name, stats]) => ({
        name,
        totalHours: stats.totalHours,
        sessions: stats.sessions
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sessions]);

  // Create grid data structure based on teacher schedules
  const gridData = useMemo(() => {
    const grid: { [teacherName: string]: { [dayKey: string]: any[] } } = {};
    
    teachersWithHours.forEach(teacher => {
      grid[teacher.name] = {};
      weekDays.forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        grid[teacher.name][dayKey] = [];
      });
    });

    // Map sessions to grid based on their schedule days
    sessions.forEach(session => {
      const teacher = session.teacher_name;
      if (grid[teacher]) {
        // Map days to actual dates in current week
        session.days.forEach(dayName => {
          const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(dayName.toLowerCase());
          if (dayIndex !== -1 && dayIndex < weekDays.length) {
            const dayKey = format(weekDays[dayIndex], 'yyyy-MM-dd');
            if (grid[teacher][dayKey]) {
              grid[teacher][dayKey].push(session);
            }
          }
        });
      }
    });

    return grid;
  }, [sessions, teachersWithHours, weekDays]);

  const goToPreviousWeek = () => {
    setCurrentWeek(prev => subWeeks(prev, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, 1));
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(new Date());
  };

  const handleSessionClick = (session: any) => {
    if (session.type === 'group') {
      const group = groups.find(g => g.id === session.id);
      if (group) {
        setSelectedGroup(group);
        setGroupModalOpen(true);
      }
    }
  };

  const getLessonCardContent = (session: any) => {
    const status = !session.teacher_name || session.teacher_name === 'Не назначен' 
      ? 'no_teacher' 
      : session.status;
    
    return (
      <div 
        className={`p-2 rounded text-xs h-full cursor-pointer transition-all hover:shadow-md border ${getSessionStatusColor(status)}`}
        title={`${session.name}\n${session.branch} ${session.classroom || ''}\n${session.time}\nУчеников: ${session.student_count}/${session.capacity || 'N/A'}`}
        onClick={() => handleSessionClick(session)}
      >
        <div className="font-medium truncate">
          {session.name}
        </div>
        <div className="text-xs opacity-90 truncate">
          {session.branch} {session.classroom}
        </div>
        <div className="text-xs opacity-75">
          {session.time}
        </div>
        <div className="text-xs opacity-75 truncate flex items-center gap-1">
          <Users className="h-3 w-3" />
          {session.student_count}/{session.capacity || 'N/A'}
        </div>
        <div className="text-xs opacity-60 truncate">
          {getDayNames(session.days)}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Загрузка расписания преподавателей...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          {format(currentWeek, "d MMMM yyyy", { locale: ru })} — {format(endOfWeek(currentWeek, { weekStartsOn: 1 }), "d MMMM yyyy", { locale: ru })}
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
            Текущая неделя
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="overflow-x-auto border rounded-lg">
      <div className="inline-block min-w-full">
          {/* Header */}
          <div className={`grid ${gridSettings.rotated 
            ? `grid-cols-[200px_repeat(${timeSlots.length},120px)]` 
            : `grid-cols-[200px_repeat(${weekDays.length},150px)]`
          } border-b bg-muted/50`}>
            <div className="p-4 border-r font-semibold">
              Преподаватель
            </div>
            {(gridSettings.rotated ? timeSlots : weekDays).map((item, index) => (
              <div key={index} className="p-3 border-r text-center text-sm font-medium">
                {gridSettings.rotated 
                  ? (item as any).label 
                  : format(item as Date, "EEE d MMM", { locale: ru })
                }
              </div>
            ))}
          </div>

          {/* Teacher rows */}
          {teachersWithHours.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Нет занятий на выбранный период</p>
            </div>
          ) : (
            teachersWithHours.map((teacher) => (
              <div key={teacher.name} className={`grid ${gridSettings.rotated 
                ? `grid-cols-[200px_repeat(${timeSlots.length},120px)]` 
                : `grid-cols-[200px_repeat(${weekDays.length},150px)]`
              } border-b hover:bg-muted/20`}>
                {/* Teacher name with hours */}
                <div className="p-4 border-r">
                  <div className="font-medium text-sm">{teacher.name}</div>
                  <div className="text-xs text-muted-foreground">
                    ({teacher.totalHours} а.ч. c {format(weekDays[0], 'dd.MM')} по {format(weekDays[6], 'dd.MM')})
                  </div>
                </div>

                {/* Time slots or day columns */}
                {(gridSettings.rotated ? timeSlots : weekDays).map((item, index) => {
                  const daySessions = gridSettings.rotated 
                    ? // For time-based view, filter sessions by time slot
                      Object.values(gridData[teacher.name] || {})
                        .flat()
                        .filter(session => {
                          const sessionStart = session.start_time || session.time.split('-')[0];
                          return sessionStart >= (item as any).start && sessionStart < (item as any).end;
                        })
                    : // For day-based view, get sessions for this day
                      gridData[teacher.name]?.[format(item as Date, 'yyyy-MM-dd')] || [];

                  return (
                    <div key={index} className="p-1 border-r relative min-h-[80px]">
                      <div className="space-y-1">
                        {daySessions.map((session, sessionIndex) => (
                          <div key={sessionIndex}>
                            {getLessonCardContent(session)}
                          </div>
                        ))}
                        {daySessions.length === 0 && !gridSettings.rotated && (
                          <div className="text-xs text-muted-foreground text-center py-2">
                            Свободно
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      <GroupDetailModal 
        group={selectedGroup}
        open={groupModalOpen}
        onOpenChange={setGroupModalOpen}
      />
    </div>
  );
};