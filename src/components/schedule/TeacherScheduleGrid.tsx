import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from "lucide-react";
import { useLessonSessions, SessionFilters, getStatusColor } from "@/hooks/useLessonSessions";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, addDays, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { useLearningGroups } from "@/hooks/useLearningGroups";
import { GroupDetailModal } from "@/components/learning-groups/GroupDetailModal";

interface TeacherScheduleGridProps {
  filters: SessionFilters;
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

  // Get sessions for current week
  const weekFilters = {
    ...filters,
    date_from: format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    date_to: format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  };

  const { data: sessions = [], isLoading } = useLessonSessions(weekFilters);
  const { groups } = useLearningGroups({});

  // Get unique teachers with their total hours
  const teachersWithHours = useMemo(() => {
    const teacherStats: { [name: string]: { sessions: any[], totalHours: number } } = {};
    
    sessions.forEach(session => {
      const teacherName = session.teacher_name;
      if (!teacherStats[teacherName]) {
        teacherStats[teacherName] = { sessions: [], totalHours: 0 };
      }
      teacherStats[teacherName].sessions.push(session);
      // Calculate hours (assuming each session is 1.5 hours by default)
      teacherStats[teacherName].totalHours += 1.5;
    });

    return Object.entries(teacherStats)
      .map(([name, stats]) => ({
        name,
        totalHours: stats.totalHours,
        sessions: stats.sessions
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sessions]);

  // Create grid data structure
  const gridData = useMemo(() => {
    const grid: { [teacherName: string]: { [dateTimeKey: string]: any } } = {};
    
    teachersWithHours.forEach(teacher => {
      grid[teacher.name] = {};
    });

    sessions.forEach(session => {
      const teacher = session.teacher_name;
      const dateKey = session.lesson_date;
      const timeKey = session.start_time.substring(0, 5);
      const key = `${dateKey}-${timeKey}`;
      
      if (grid[teacher]) {
        grid[teacher][key] = session;
      }
    });

    return grid;
  }, [sessions, teachersWithHours]);

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
    if (session.group_id) {
      const group = groups.find(g => g.id === session.group_id);
      if (group) {
        setSelectedGroup(group);
        setGroupModalOpen(true);
      }
    }
  };

  const getLessonCardContent = (session: any) => {
    return (
      <div 
        className={`p-2 rounded text-xs h-full cursor-pointer transition-all hover:shadow-md border ${getStatusColor(session.status)}`}
        title={`${session.learning_groups?.name || 'Группа'}\n${session.branch} ${session.classroom}\n${session.start_time} - ${session.end_time}`}
        onClick={() => handleSessionClick(session)}
      >
        <div className="font-medium truncate">
          {session.learning_groups?.name || session.learning_groups?.level || 'Группа'}
        </div>
        <div className="text-xs opacity-90 truncate">
          {session.branch} {session.classroom}
        </div>
        <div className="text-xs opacity-75">
          {session.start_time.substring(0, 5)}-{session.end_time.substring(0, 5)}
        </div>
        <div className="text-xs opacity-75 truncate">
          {format(new Date(session.lesson_date + 'T00:00:00'), 'dd.MM') + ' — ' + format(addDays(new Date(session.lesson_date + 'T00:00:00'), 30), 'dd.MM')}
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
                  const sessionKey = gridSettings.rotated 
                    ? // For time-based view, show sessions for this time across all days
                      Object.keys(gridData[teacher.name] || {}).find(key => 
                        key.endsWith(`-${(item as any).start}`)
                      )
                    : // For day-based view, show all sessions for this day
                      null;
                  
                  const daySessions = gridSettings.rotated 
                    ? (sessionKey ? [gridData[teacher.name][sessionKey]] : []).filter(Boolean)
                    : Object.entries(gridData[teacher.name] || {})
                        .filter(([key]) => key.startsWith(format(item as Date, 'yyyy-MM-dd')))
                        .map(([, session]) => session)
                        .sort((a, b) => a.start_time.localeCompare(b.start_time));

                  return (
                    <div key={index} className="p-1 border-r relative min-h-[80px]">
                      <div className="space-y-1">
                        {daySessions.map((session, sessionIndex) => (
                          <div key={sessionIndex}>
                            {getLessonCardContent(session)}
                          </div>
                        ))}
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