import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Pencil, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/typedClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AdditionalLesson {
  id?: string;
  lesson_date: string;
  notes?: string;
  status: string;
}

interface AdditionalLessonsListProps {
  lessons: AdditionalLesson[];
  onDelete?: () => void;
  onEdit?: (lesson: AdditionalLesson) => void;
}

export function AdditionalLessonsList({
  lessons,
  onDelete,
  onEdit,
}: AdditionalLessonsListProps) {
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('individual_lesson_sessions')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Дополнительное занятие удалено",
      });

      onDelete?.();
    } catch (error: any) {
      console.error('Error deleting lesson:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить занятие",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  if (lessons.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-2 mt-4">
        <h4 className="text-sm font-medium text-muted-foreground">
          Дополнительные занятия ({lessons.length})
        </h4>
        <div className="space-y-2">
          {lessons.filter(l => l.id).map((lesson) => (
            <div
              key={lesson.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {format(new Date(lesson.lesson_date), 'dd MMMM yyyy', { locale: ru })}
                  </p>
                  {lesson.notes && (
                    <p className="text-xs text-muted-foreground">
                      {lesson.notes}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit?.(lesson)}
                  className="h-8 w-8"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => lesson.id && setDeleteId(lesson.id)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить дополнительное занятие?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Занятие будет удалено навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Удаление..." : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
