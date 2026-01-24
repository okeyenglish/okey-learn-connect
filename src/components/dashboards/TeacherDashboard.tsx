import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, BookOpen, Users, Clock, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/typedClient";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfMonth } from "date-fns";
import { ru } from "date-fns/locale";

export const TeacherDashboard = () => {
  const { user } = useAuth();

  // Get teacher's profile
  const { data: profile } = useQuery({
    queryKey: ["teacher-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const teacherFullName = profile 
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    : '';

  // Today's lessons
  const { data: todayLessons } = useQuery({
    queryKey: ["teacher-today-lessons", teacherFullName],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("lesson_sessions")
        .select("*, learning_groups(name)")
        .eq("teacher_name", teacherFullName)
        .eq("lesson_date", today)
        .order("start_time");
      
      if (error) throw error;
      return data;
    },
    enabled: !!teacherFullName,
  });

  // Active groups
  const { data: activeGroups } = useQuery({
    queryKey: ["teacher-active-groups", teacherFullName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_groups")
        .select("*")
        .eq("responsible_teacher", teacherFullName)
        .eq("is_active", true);
      
      if (error) throw error;
      return data;
    },
    enabled: !!teacherFullName,
  });

  // Lessons this month
  const { data: monthLessons } = useQuery({
    queryKey: ["teacher-month-lessons", teacherFullName],
    queryFn: async () => {
      const start = startOfMonth(new Date());
      const { data, error } = await supabase
        .from("lesson_sessions")
        .select("*")
        .eq("teacher_name", teacherFullName)
        .gte("lesson_date", start.toISOString())
        .eq("status", "completed");
      
      if (error) throw error;
      return data;
    },
    enabled: !!teacherFullName,
  });

  // Calculate total hours
  const totalHours = monthLessons?.reduce((sum, lesson) => {
    if (lesson.start_time && lesson.end_time) {
      const [startH, startM] = lesson.start_time.split(':').map(Number);
      const [endH, endM] = lesson.end_time.split(':').map(Number);
      const hours = (endH * 60 + endM - startH * 60 - startM) / 60;
      return sum + hours;
    }
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Дашборд преподавателя</h2>
        <p className="text-muted-foreground">
          Обзор вашей работы и ключевые показатели
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Занятий сегодня</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayLessons?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {todayLessons && todayLessons.length > 0
                ? todayLessons.map(l => l.start_time).join(', ')
                : 'Нет занятий'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активных групп</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeGroups?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {activeGroups?.reduce((sum, g) => sum + (g.current_students || 0), 0) || 0} учеников всего
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Проведено уроков</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthLessons?.length || 0}</div>
            <p className="text-xs text-muted-foreground">За текущий месяц</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего часов</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours?.toFixed(1) || 0}</div>
            <p className="text-xs text-muted-foreground">За текущий месяц</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Lessons */}
      <Card>
        <CardHeader>
          <CardTitle>Ближайшие занятия</CardTitle>
        </CardHeader>
        <CardContent>
          {todayLessons && todayLessons.length > 0 ? (
            <div className="space-y-4">
              {todayLessons.map((lesson) => (
                <div key={lesson.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {lesson.learning_groups?.name || 'Группа'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {lesson.start_time} - {lesson.end_time} | {lesson.classroom}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">Сегодня</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Нет занятий на сегодня
            </p>
          )}
        </CardContent>
      </Card>

      {/* Performance Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ваши группы</CardTitle>
          </CardHeader>
          <CardContent>
            {activeGroups && activeGroups.length > 0 ? (
              <div className="space-y-3">
                {activeGroups.map((group) => (
                  <div key={group.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{group.name}</span>
                      <span className="text-sm font-medium">
                        {group.current_students}/{group.capacity || 10}
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ 
                          width: `${((group.current_students || 0) / (group.capacity || 10)) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Нет активных групп
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Статистика за месяц</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Проведено уроков</p>
                  <p className="text-sm text-muted-foreground">Всего занятий</p>
                </div>
                <span className="text-2xl font-bold">{monthLessons?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Преподавательских часов</p>
                  <p className="text-sm text-muted-foreground">Академических часов</p>
                </div>
                <span className="text-2xl font-bold">{totalHours?.toFixed(1) || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
