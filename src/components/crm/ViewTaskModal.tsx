import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, FileText, Edit, CheckCircle, XCircle } from "lucide-react";
import { useTasks, useAllTasks, useCompleteTask, useCancelTask } from "@/hooks/useTasks";
import { EditTaskModal } from "./EditTaskModal";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface ViewTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
}

export const ViewTaskModal = ({ open, onOpenChange, taskId }: ViewTaskModalProps) => {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { tasks } = useTasks();
  const { tasks: allTasksList } = useAllTasks();
  const completeTask = useCompleteTask();
  const cancelTask = useCancelTask();

  // Find task in both task lists
  const task = tasks?.find(t => t.id === taskId) || allTasksList?.find(t => t.id === taskId);

  if (!task) {
    return null;
  }

  const getPriorityBadge = () => {
    switch (task.priority) {
      case 'high':
        return <Badge variant="destructive">Срочно</Badge>;
      case 'medium':
        return <Badge variant="default">Важно</Badge>;
      default:
        return <Badge variant="secondary">Обычно</Badge>;
    }
  };

  const getStatusBadge = () => {
    switch (task.status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Выполнена</Badge>;
      case 'cancelled':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Отменена</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Активна</Badge>;
    }
  };

  const handleComplete = async () => {
    try {
      await completeTask.mutateAsync(taskId);
      onOpenChange(false);
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelTask.mutateAsync(taskId);
      onOpenChange(false);
    } catch (error) {
      console.error('Error cancelling task:', error);
    }
  };

  const handleEdit = () => {
    setEditModalOpen(true);
  };

  const formattedDate = task.due_date 
    ? format(new Date(task.due_date), 'dd MMMM yyyy', { locale: ru })
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-start gap-2">
              <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <span className="break-words">{task.title}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Status and Priority */}
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge()}
              {getPriorityBadge()}
            </div>

            {/* Description */}
            {task.description && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Описание</div>
                <p className="text-sm whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {/* Details */}
            <div className="space-y-2">
              {task.responsible && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Ответственный:</span>
                  <span>{task.responsible}</span>
                </div>
              )}

              {formattedDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Дата:</span>
                  <span>{formattedDate}</span>
                </div>
              )}

              {task.due_time && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Время:</span>
                  <span>{task.due_time}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {task.status === 'active' && (
                <>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={handleComplete}
                    disabled={completeTask.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Выполнить
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    onClick={handleCancel}
                    disabled={cancelTask.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Отменить
                  </Button>
                </>
              )}
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleEdit}
              >
                <Edit className="h-4 w-4 mr-1" />
                Редактировать
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {editModalOpen && (
        <EditTaskModal
          open={editModalOpen}
          onOpenChange={(isOpen) => {
            setEditModalOpen(isOpen);
            if (!isOpen) {
              // Optionally close parent modal too
            }
          }}
          taskId={taskId}
        />
      )}
    </>
  );
};
