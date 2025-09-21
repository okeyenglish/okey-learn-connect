import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Clock, User, Check, X, Plus } from 'lucide-react';
import { useTasksByDate, useCompleteTask, useCancelTask } from '@/hooks/useTasks';
import { AddTaskModal } from './AddTaskModal';

interface TaskDayViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  onTaskClick?: (taskId: string) => void;
}

export const TaskDayView: React.FC<TaskDayViewProps> = ({
  open,
  onOpenChange,
  date,
  onTaskClick
}) => {
  const [showAddModal, setShowAddModal] = React.useState(false);
  const { tasks, isLoading } = useTasksByDate(format(date, 'yyyy-MM-dd'));
  const { mutate: completeTask } = useCompleteTask();
  const { mutate: cancelTask } = useCancelTask();

  const handleCompleteTask = (taskId: string) => {
    completeTask(taskId);
  };

  const handleCancelTask = (taskId: string) => {
    cancelTask(taskId);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  // Группируем задачи по времени
  const tasksByTime = React.useMemo(() => {
    const withTime = tasks.filter(task => task.due_time);
    const withoutTime = tasks.filter(task => !task.due_time);
    
    withTime.sort((a, b) => (a.due_time || '').localeCompare(b.due_time || ''));
    
    return { withTime, withoutTime };
  }, [tasks]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Задачи на {format(date, 'dd MMMM yyyy', { locale: ru })}</span>
              <Button 
                onClick={() => setShowAddModal(true)}
                size="sm"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Добавить
              </Button>
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="text-center py-8">Загрузка...</div>
          ) : tasks.length > 0 ? (
            <div className="space-y-6">
              {/* Задачи с указанным временем */}
              {tasksByTime.withTime.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 text-sm text-muted-foreground">
                    С указанным временем
                  </h3>
                  <div className="space-y-3">
                    {tasksByTime.withTime.map((task) => (
                      <div
                        key={task.id}
                        className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => onTaskClick?.(task.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="h-4 w-4 text-primary" />
                              <span className="font-medium text-sm">
                                {task.due_time?.slice(0, 5)}
                              </span>
                              <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                                {task.priority === 'high' ? 'Высокий' : 
                                 task.priority === 'medium' ? 'Средний' : 'Низкий'}
                              </Badge>
                            </div>
                            <h4 className="font-medium mb-1">{task.title}</h4>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {task.description}
                              </p>
                            )}
                            {task.clients && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  {task.clients.name}
                                </span>
                              </div>
                            )}
                            {task.responsible && (
                              <p className="text-sm text-muted-foreground">
                                Ответственный: {task.responsible}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompleteTask(task.id);
                              }}
                              title="Отметить выполненной"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelTask(task.id);
                              }}
                              title="Отменить задачу"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Задачи без указанного времени */}
              {tasksByTime.withoutTime.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 text-sm text-muted-foreground">
                    Без указанного времени
                  </h3>
                  <div className="space-y-3">
                    {tasksByTime.withoutTime.map((task) => (
                      <div
                        key={task.id}
                        className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => onTaskClick?.(task.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                                {task.priority === 'high' ? 'Высокий' : 
                                 task.priority === 'medium' ? 'Средний' : 'Низкий'}
                              </Badge>
                            </div>
                            <h4 className="font-medium mb-1">{task.title}</h4>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {task.description}
                              </p>
                            )}
                            {task.clients && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  {task.clients.name}
                                </span>
                              </div>
                            )}
                            {task.responsible && (
                              <p className="text-sm text-muted-foreground">
                                Ответственный: {task.responsible}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompleteTask(task.id);
                              }}
                              title="Отметить выполненной"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelTask(task.id);
                              }}
                              title="Отменить задачу"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Нет задач на этот день</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setShowAddModal(true)}
              >
                Создать первую задачу
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AddTaskModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        preselectedDate={format(date, 'yyyy-MM-dd')}
      />
    </>
  );
};