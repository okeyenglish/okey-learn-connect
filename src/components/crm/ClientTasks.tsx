import { AlertCircle, Clock, User, Check, X, ChevronDown, ChevronRight, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useTasks, useCompleteTask, useCancelTask } from "@/hooks/useTasks";
import { EditTaskModal } from "./EditTaskModal";
import { toast } from "@/hooks/use-toast";

interface ClientTasksProps {
  clientId: string;
  clientName: string;
}

export const ClientTasks = ({ clientId, clientName }: ClientTasksProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const { tasks, isLoading } = useTasks(clientId);
  const completeTask = useCompleteTask();
  const cancelTask = useCancelTask();
  
  // Filter only active tasks
  const activeTasks = tasks.filter(task => task.status === 'active');
  
  if (isLoading || activeTasks.length === 0) {
    return null;
  }

  const handleCompleteTask = async (taskId: string) => {
    const task = activeTasks.find(t => t.id === taskId);
    try {
      await completeTask.mutateAsync(taskId);
      if (task) {
        toast({
          title: "Задача завершена",
          description: `Задача "${task.title}" успешно завершена`,
        });
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleCloseTask = async (taskId: string) => {
    const task = activeTasks.find(t => t.id === taskId);
    try {
      await cancelTask.mutateAsync(taskId);
      if (task) {
        toast({
          title: "Задача отменена",
          description: `Задача "${task.title}" отменена`,
        });
      }
    } catch (error) {
      console.error('Error cancelling task:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Card className="mb-0 border-orange-200 bg-orange-50/30 border-b-0 rounded-b-none">
      <CardHeader 
        className="pb-2 pt-3 cursor-pointer" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-sm flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-orange-600" />
          ) : (
            <ChevronRight className="h-4 w-4 text-orange-600" />
          )}
          <AlertCircle className="h-4 w-4 text-orange-600" />
          Активные задачи ({activeTasks.length})
        </CardTitle>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-1 pb-3">
          <div className="space-y-2">
            {activeTasks.map((task) => (
              <div key={task.id} className="bg-white rounded-md p-2 border border-orange-200/60">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-tight">{task.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {task.responsible && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{task.responsible}</span>
                        </div>
                      )}
                      {task.due_date && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {new Date(task.due_date).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={getPriorityColor(task.priority)} className="shrink-0 text-xs px-1.5 py-0.5">
                      {task.priority === 'high' ? 'Срочно' : task.priority === 'medium' ? 'Важно' : 'Обычно'}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTaskId(task.id);
                      }}
                      title="Редактировать"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 w-6 p-0 text-green-600 hover:bg-green-50"
                      onClick={() => handleCompleteTask(task.id)}
                      title="Завершить"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                      onClick={() => handleCloseTask(task.id)}
                      title="Отменить"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
      
      {editingTaskId && (
        <EditTaskModal
          open={!!editingTaskId}
          onOpenChange={(open) => !open && setEditingTaskId(null)}
          taskId={editingTaskId}
        />
      )}
    </Card>
  );
};