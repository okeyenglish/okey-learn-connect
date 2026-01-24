import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, MapPin, Users, UserCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import { useStudents } from "@/hooks/useStudents";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/typedClient";
import { useQuery } from "@tanstack/react-query";

interface StudentScheduleViewProps {
  preSelectedStudentId?: string;
}

export const StudentScheduleView = ({ preSelectedStudentId }: StudentScheduleViewProps) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>(preSelectedStudentId);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  const { students = [] } = useStudents();
  
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Fetch student's group sessions
  const { data: groupSessions = [], isLoading: loadingGroups } = useQuery({
    queryKey: ['student-group-sessions', selectedStudentId, weekStart, weekEnd],
    queryFn: async () => {
      if (!selectedStudentId) return [];
      
      const { data, error } = await supabase
        .from('lesson_sessions')
        .select(`
          *,
          learning_groups!inner(
            id,
            name,
            level,
            subject
          )
        `)
        .gte('lesson_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('lesson_date', format(weekEnd, 'yyyy-MM-dd'))
        .eq('learning_groups.group_students.student_id', selectedStudentId)
        .order('lesson_date')
        .order('start_time');

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedStudentId,
  });

  // Fetch student's individual lessons
  const { data: individualLessons = [], isLoading: loadingIndividual } = useQuery({
    queryKey: ['student-individual-sessions', selectedStudentId, weekStart, weekEnd],
    queryFn: async () => {
      if (!selectedStudentId) return [];
      
      const { data, error } = await supabase
        .from('individual_lesson_sessions')
        .select(`
          *,
          individual_lessons!inner(
            student_name,
            teacher_name,
            subject,
            branch
          )
        `)
        .eq('individual_lessons.student_id', selectedStudentId)
        .gte('lesson_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('lesson_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('lesson_date')
        .order('start_time');

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedStudentId,
  });

  const isLoading = loadingGroups || loadingIndividual;

  // Combine and organize sessions by day
  const sessionsByDay = useMemo(() => {
    const organized: { [key: string]: any[] } = {};
    
    weekDays.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      organized[dateKey] = [];
    });

    // Add group sessions
    groupSessions.forEach(session => {
      const dateKey = session.lesson_date;
      if (organized[dateKey]) {
        organized[dateKey].push({
          ...session,
          type: 'group',
          title: session.learning_groups?.name,
        });
      }
    });

    // Add individual lessons
    individualLessons.forEach(session => {
      const dateKey = session.lesson_date;
      if (organized[dateKey]) {
        organized[dateKey].push({
          ...session,
          type: 'individual',
          title: 'Индивидуальное занятие',
          teacher_name: session.individual_lessons?.teacher_name,
          subject: session.individual_lessons?.subject,
          branch: session.individual_lessons?.branch,
        });
      }
    });

    // Sort sessions by time within each day
    Object.keys(organized).forEach(dateKey => {
      organized[dateKey].sort((a, b) => {
        const timeA = a.start_time || a.schedule_time?.split('-')[0] || '00:00';
        const timeB = b.start_time || b.schedule_time?.split('-')[0] || '00:00';
        return timeA.localeCompare(timeB);
      });
    });

    return organized;
  }, [groupSessions, individualLessons, weekDays]);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const goToPreviousWeek = () => setCurrentWeek(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentWeek(prev => addWeeks(prev, 1));
  const goToCurrentWeek = () => setCurrentWeek(new Date());

  const getSessionTypeColor = (type: string) => {
    return type === 'group' 
      ? 'bg-blue-50 border-blue-200 text-blue-700' 
      : 'bg-purple-50 border-purple-200 text-purple-700';
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'scheduled': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      {/* Student Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Расписание ученика
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Выберите ученика</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите ученика..." />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedStudent && (
            <div className="p-3 bg-muted rounded-lg space-y-1">
              <div className="font-medium">
                {selectedStudent.name || `${selectedStudent.first_name || ''} ${selectedStudent.last_name || ''}`.trim()}
              </div>
              <div className="text-sm text-muted-foreground">
                Телефон: {selectedStudent.phone}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStudentId && (
        <>
          {/* Week Navigation */}
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
                    Текущая неделя
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToNextWeek}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Schedule Grid */}
          {isLoading ? (
            <Card>
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Загрузка расписания...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {weekDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const daySessions = sessionsByDay[dateKey] || [];
                const isToday = isSameDay(day, new Date());

                return (
                  <Card key={dateKey} className={`min-h-[200px] ${isToday ? 'border-2 border-primary' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="text-center">
                        <div className="text-sm font-medium text-muted-foreground">
                          {format(day, "EEEE", { locale: ru })}
                        </div>
                        <div className={`text-lg font-semibold ${isToday ? 'text-primary' : ''}`}>
                          {format(day, "d", { locale: ru })}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-0">
                      {daySessions.length === 0 ? (
                        <div className="text-center text-muted-foreground py-4 text-sm">
                          Нет занятий
                        </div>
                      ) : (
                        <ScrollArea className="max-h-[400px]">
                          <div className="space-y-2">
                            {daySessions.map((session, idx) => (
                              <div
                                key={`${session.id}-${idx}`}
                                className={`p-3 border rounded-lg ${getSessionTypeColor(session.type)}`}
                              >
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <Badge variant={session.type === 'group' ? 'default' : 'secondary'} className="text-xs">
                                      {session.type === 'group' ? 'Группа' : 'Индивид.'}
                                    </Badge>
                                    {session.status && (
                                      <Badge variant={getStatusBadgeVariant(session.status)} className="text-xs">
                                        {session.status === 'completed' ? 'Проведено' :
                                         session.status === 'scheduled' ? 'Запланировано' :
                                         session.status === 'cancelled' ? 'Отменено' : session.status}
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="font-medium text-sm">
                                    {session.title}
                                  </div>

                                  <div className="space-y-1 text-xs">
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span>
                                        {session.start_time || session.schedule_time} - {session.end_time || ''}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      <span>{session.teacher_name}</span>
                                    </div>

                                    {session.classroom && (
                                      <div className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        <span>{session.classroom}</span>
                                      </div>
                                    )}

                                    {session.branch && (
                                      <div className="text-muted-foreground">
                                        {session.branch}
                                      </div>
                                    )}
                                  </div>

                                  {session.notes && (
                                    <div className="text-xs text-muted-foreground pt-1 border-t">
                                      {session.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};