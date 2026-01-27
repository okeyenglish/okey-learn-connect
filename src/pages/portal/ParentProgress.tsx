import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ru } from "date-fns/locale";
import { ClipboardList, Calendar, Star, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface PortalContext {
  selectedStudent: any;
}

interface StudentProgress {
  id: string;
  lesson_date: string;
  attendance: string;
  grade: string | null;
  teacher_notes: string | null;
  homework_done: boolean;
  activity_score: number | null;
  topics_covered: string[] | null;
  lesson_sessions: {
    learning_groups: {
      name: string;
      subject: string | null;
    }[] | null;
  }[] | null;
  teachers: {
    first_name: string;
    last_name: string | null;
  }[] | null;
}

export default function ParentProgress() {
  const { selectedStudent } = useOutletContext<PortalContext>();
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  useEffect(() => {
    if (selectedStudent?.id) {
      loadProgress();
    }
  }, [selectedStudent?.id, currentMonth]);

  const loadProgress = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("student_progress")
        .select(`
          id,
          lesson_date,
          attendance,
          grade,
          teacher_notes,
          homework_done,
          activity_score,
          topics_covered,
          lesson_sessions(learning_groups(name, subject)),
          teachers(first_name, last_name)
        `)
        .eq("student_id", selectedStudent.id)
        .gte("lesson_date", format(monthStart, "yyyy-MM-dd"))
        .lte("lesson_date", format(monthEnd, "yyyy-MM-dd"))
        .order("lesson_date", { ascending: false });

      setProgress((data as StudentProgress[]) || []);
    } catch (err) {
      console.error("Error loading progress:", err);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceIcon = (attendance: string) => {
    switch (attendance) {
      case "present":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "absent":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "late":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "excused":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getAttendanceLabel = (attendance: string) => {
    switch (attendance) {
      case "present": return "Присутствовал";
      case "absent": return "Отсутствовал";
      case "late": return "Опоздал";
      case "excused": return "Уважительная причина";
      default: return attendance;
    }
  };

  // Calculate stats
  const stats = {
    total: progress.length,
    present: progress.filter(p => p.attendance === "present").length,
    absent: progress.filter(p => p.attendance === "absent").length,
    homeworkDone: progress.filter(p => p.homework_done).length,
    avgActivity: progress.filter(p => p.activity_score).length > 0
      ? (progress.reduce((sum, p) => sum + (p.activity_score || 0), 0) / progress.filter(p => p.activity_score).length).toFixed(1)
      : null
  };

  const attendanceRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
  const homeworkRate = stats.total > 0 ? Math.round((stats.homeworkDone / stats.total) * 100) : 0;

  if (!selectedStudent) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Выберите ребёнка для просмотра дневника
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            Дневник
          </h1>
          <p className="text-muted-foreground">
            {selectedStudent.first_name} {selectedStudent.last_name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[100px] text-center">
            {format(currentMonth, "LLLL yyyy", { locale: ru })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, -1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Занятий в месяце</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{attendanceRate}%</div>
            <p className="text-xs text-muted-foreground">Посещаемость</p>
            <Progress value={attendanceRate} className="mt-2 h-1" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{homeworkRate}%</div>
            <p className="text-xs text-muted-foreground">ДЗ выполнено</p>
            <Progress value={homeworkRate} className="mt-2 h-1" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600 flex items-center gap-1">
              {stats.avgActivity || "—"}
              <Star className="h-5 w-5" />
            </div>
            <p className="text-xs text-muted-foreground">Средняя активность</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress entries */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-4">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : progress.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium">Нет записей</h3>
            <p className="text-muted-foreground">За этот месяц записей нет</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {progress.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {format(parseISO(entry.lesson_date), "d MMMM, EEEE", { locale: ru })}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {getAttendanceIcon(entry.attendance)}
                    <span className="text-sm">{getAttendanceLabel(entry.attendance)}</span>
                  </div>
                </div>
                <CardDescription>
                  {entry.lesson_sessions?.[0]?.learning_groups?.[0]?.name}
                  {entry.teachers?.[0] && ` • ${entry.teachers[0].first_name}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {entry.grade && (
                    <Badge variant="outline">Оценка: {entry.grade}</Badge>
                  )}
                  {entry.homework_done && (
                    <Badge className="bg-green-500">ДЗ выполнено</Badge>
                  )}
                  {entry.activity_score && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      Активность: {entry.activity_score}/5
                    </Badge>
                  )}
                </div>

                {entry.topics_covered && entry.topics_covered.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Темы:</p>
                    <p className="text-sm">{entry.topics_covered.join(", ")}</p>
                  </div>
                )}

                {entry.teacher_notes && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Комментарий преподавателя:
                    </p>
                    <p className="text-sm">{entry.teacher_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
