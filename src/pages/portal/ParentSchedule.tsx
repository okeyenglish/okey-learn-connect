import { useState, useEffect } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar, Clock, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PortalContext {
  selectedStudent: any;
  students: any[];
}

interface LessonSession {
  id: string;
  lesson_date: string;
  start_time: string;
  end_time: string | null;
  status: string | null;
  classroom: string | null;
  notes: string | null;
  learning_groups: {
    name: string;
    subject: string | null;
  }[] | null;
  teachers: {
    first_name: string;
    last_name: string | null;
  }[] | null;
}

export default function ParentSchedule() {
  const { selectedStudent } = useOutletContext<PortalContext>();
  const [searchParams] = useSearchParams();
  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

  useEffect(() => {
    if (selectedStudent?.id) {
      loadSchedule();
    }
  }, [selectedStudent?.id, currentWeek]);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      // Get groups student belongs to
      const { data: groupStudents } = await supabase
        .from("group_students")
        .select("group_id")
        .eq("student_id", selectedStudent.id);

      if (!groupStudents || groupStudents.length === 0) {
        setSessions([]);
        setLoading(false);
        return;
      }

      const groupIds = groupStudents.map(gs => gs.group_id);

      // Get sessions for these groups
      const { data: sessionsData } = await supabase
        .from("lesson_sessions")
        .select(`
          id,
          lesson_date,
          start_time,
          end_time,
          status,
          classroom,
          notes,
          learning_groups(name, subject),
          teachers(first_name, last_name)
        `)
        .in("group_id", groupIds)
        .gte("lesson_date", format(weekStart, "yyyy-MM-dd"))
        .lte("lesson_date", format(weekEnd, "yyyy-MM-dd"))
        .order("lesson_date", { ascending: true })
        .order("start_time", { ascending: true });

      setSessions((sessionsData as LessonSession[]) || []);
    } catch (err) {
      console.error("Error loading schedule:", err);
    } finally {
      setLoading(false);
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getSessionsForDay = (date: Date) => {
    return sessions.filter(s => isSameDay(parseISO(s.lesson_date), date));
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500">Проведено</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Отменено</Badge>;
      case "scheduled":
        return <Badge variant="secondary">Запланировано</Badge>;
      default:
        return null;
    }
  };

  if (!selectedStudent) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Выберите ребёнка для просмотра расписания
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Расписание
          </h1>
          <p className="text-muted-foreground">
            {selectedStudent.first_name} {selectedStudent.last_name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {format(weekStart, "d MMM", { locale: ru })} - {format(weekEnd, "d MMM", { locale: ru })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-7 gap-4">
          {weekDays.map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-16"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-7 gap-4">
          {weekDays.map((day) => {
            const daySessions = getSessionsForDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <Card key={day.toISOString()} className={isToday ? "ring-2 ring-primary" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {format(day, "EEEEEE", { locale: ru })}
                    <span className="ml-1 text-muted-foreground">
                      {format(day, "d")}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {daySessions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Нет занятий
                    </p>
                  ) : (
                    daySessions.map((session) => (
                      <div
                        key={session.id}
                        className="p-2 bg-muted rounded-lg text-xs space-y-1"
                      >
                      <div className="font-medium">
                          {session.learning_groups?.[0]?.name}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {session.start_time?.slice(0, 5)}
                          {session.end_time && ` - ${session.end_time.slice(0, 5)}`}
                        </div>
                        {session.teachers?.[0] && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <User className="h-3 w-3" />
                            {session.teachers[0].first_name}
                          </div>
                        )}
                        {session.classroom && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {session.classroom}
                          </div>
                        )}
                        {getStatusBadge(session.status)}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
