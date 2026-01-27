import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format, parseISO, isPast, isToday } from "date-fns";
import { ru } from "date-fns/locale";
import { BookOpen, Calendar, Clock, CheckCircle, AlertCircle, Send } from "lucide-react";
import { toast } from "sonner";

interface PortalContext {
  selectedStudent: any;
}

interface Homework {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  student_answer: string | null;
  teacher_feedback: string | null;
  grade: string | null;
  assigned_at: string;
  submitted_at: string | null;
  learning_groups: {
    name: string;
  }[] | null;
  teachers: {
    first_name: string;
    last_name: string | null;
  }[] | null;
}

export default function ParentHomework() {
  const { selectedStudent } = useOutletContext<PortalContext>();
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "completed" | "all">("active");
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (selectedStudent?.id) {
      loadHomework();
    }
  }, [selectedStudent?.id, filter]);

  const loadHomework = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("homework")
        .select(`
          id,
          title,
          description,
          due_date,
          status,
          student_answer,
          teacher_feedback,
          grade,
          assigned_at,
          submitted_at,
          learning_groups(name),
          teachers(first_name, last_name)
        `)
        .eq("student_id", selectedStudent.id)
        .order("due_date", { ascending: true, nullsFirst: false });

      if (filter === "active") {
        query = query.in("status", ["assigned", "in_progress"]);
      } else if (filter === "completed") {
        query = query.in("status", ["submitted", "reviewed", "completed"]);
      }

      const { data } = await query;
      setHomework((data as Homework[]) || []);
    } catch (err) {
      console.error("Error loading homework:", err);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (homeworkId: string) => {
    const answer = answers[homeworkId];
    if (!answer?.trim()) {
      toast.error("Напишите ответ");
      return;
    }

    setSubmittingId(homeworkId);
    try {
      const { error } = await supabase
        .from("homework")
        .update({
          student_answer: answer,
          status: "submitted",
          submitted_at: new Date().toISOString()
        })
        .eq("id", homeworkId);

      if (error) throw error;

      toast.success("Ответ отправлен!");
      loadHomework();
      setAnswers({ ...answers, [homeworkId]: "" });
    } catch (err: any) {
      toast.error(err.message || "Ошибка отправки");
    } finally {
      setSubmittingId(null);
    }
  };

  const getStatusBadge = (hw: Homework) => {
    switch (hw.status) {
      case "assigned":
        if (hw.due_date && isPast(parseISO(hw.due_date)) && !isToday(parseISO(hw.due_date))) {
          return <Badge variant="destructive">Просрочено</Badge>;
        }
        return <Badge variant="secondary">Назначено</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500">В работе</Badge>;
      case "submitted":
        return <Badge className="bg-amber-500">Отправлено</Badge>;
      case "reviewed":
        return <Badge className="bg-purple-500">Проверено</Badge>;
      case "completed":
        return <Badge className="bg-green-500">Выполнено</Badge>;
      default:
        return null;
    }
  };

  if (!selectedStudent) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Выберите ребёнка для просмотра домашних заданий
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Домашние задания
          </h1>
          <p className="text-muted-foreground">
            {selectedStudent.first_name} {selectedStudent.last_name}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={filter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("active")}
          >
            Активные
          </Button>
          <Button
            variant={filter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("completed")}
          >
            Выполненные
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            Все
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-1/3"></div>
              </CardHeader>
              <CardContent>
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : homework.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="font-medium">Нет заданий</h3>
            <p className="text-muted-foreground">
              {filter === "active" ? "Все задания выполнены!" : "Заданий пока нет"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {homework.map((hw) => (
            <Card key={hw.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{hw.title}</CardTitle>
                  <CardDescription>
                      {hw.learning_groups?.[0]?.name}
                      {hw.teachers?.[0] && ` • ${hw.teachers[0].first_name} ${hw.teachers[0].last_name || ""}`}
                    </CardDescription>
                  </div>
                  {getStatusBadge(hw)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {hw.description && (
                  <p className="text-sm whitespace-pre-wrap">{hw.description}</p>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Назначено: {format(parseISO(hw.assigned_at), "d MMM", { locale: ru })}
                  </span>
                  {hw.due_date && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Срок: {format(parseISO(hw.due_date), "d MMM", { locale: ru })}
                    </span>
                  )}
                </div>

                {/* Student answer section */}
                {hw.status === "assigned" || hw.status === "in_progress" ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Напишите ответ..."
                      value={answers[hw.id] || ""}
                      onChange={(e) => setAnswers({ ...answers, [hw.id]: e.target.value })}
                      rows={3}
                    />
                    <Button
                      onClick={() => submitAnswer(hw.id)}
                      disabled={submittingId === hw.id}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Отправить ответ
                    </Button>
                  </div>
                ) : hw.student_answer ? (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Ваш ответ:</p>
                    <p className="text-sm">{hw.student_answer}</p>
                  </div>
                ) : null}

                {/* Teacher feedback */}
                {hw.teacher_feedback && (
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-xs font-medium text-primary mb-1">
                      Комментарий преподавателя:
                    </p>
                    <p className="text-sm">{hw.teacher_feedback}</p>
                    {hw.grade && (
                      <p className="text-sm font-medium mt-2">Оценка: {hw.grade}</p>
                    )}
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
