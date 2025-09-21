import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CalendarIcon, Plus, Clock, User, Edit } from 'lucide-react';
import { useTasksByDate, useAllTasks } from '@/hooks/useTasks';
import { TaskDayView } from './TaskDayView';
import { AddTaskModal } from './AddTaskModal';
import { EditTaskModal } from './EditTaskModal';
import { cn } from '@/lib/utils';

interface TaskCalendarProps {
  onDateSelect?: (date: Date) => void;
  onTaskClick?: (taskId: string) => void;
  activeClientId?: string;
  activeClientName?: string;
}

export const TaskCalendar: React.FC<TaskCalendarProps> = ({
  onDateSelect,
  onTaskClick,
  activeClientId,
  activeClientName
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDayView, setShowDayView] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  
  const { tasks: allTasks } = useAllTasks();
  const { tasks: dayTasks } = useTasksByDate(format(selectedDate, 'yyyy-MM-dd'));
  
  // Создаем карту дат с количеством задач
  const tasksCountByDate = React.useMemo(() => {
    const countMap = new Map();
    allTasks.forEach(task => {
      if (task.due_date) {
        const date = format(new Date(task.due_date), 'yyyy-MM-dd');
        countMap.set(date, (countMap.get(date) || 0) + 1);
      }
    });
    return countMap;
  }, [allTasks]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      onDateSelect?.(date);
    }
  };

  const handleAddTask = () => {
    setShowAddModal(true);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Календарь задач</h2>
        <Button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleAddTask();
          }} 
          className="gap-2"
          type="button"
        >
          <Plus className="h-4 w-4" />
          Добавить задачу
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Календарь */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {format(selectedDate, 'LLLL yyyy', { locale: ru })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              locale={ru}
              className="rounded-md border p-3 pointer-events-auto"
            />
          </CardContent>
        </Card>

        {/* Задачи на выбранный день */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{format(selectedDate, 'dd MMMM', { locale: ru })}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDayView(true);
                }}
                type="button"
              >
                Подробнее
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dayTasks.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {dayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 border rounded-md cursor-pointer hover:shadow-md transition-shadow relative group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0" onClick={() => onTaskClick?.(task.id)}>
                        <p className="font-medium text-sm truncate">{task.title}</p>
                        {task.due_time && (
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {task.due_time.slice(0, 5)}
                            </span>
                          </div>
                        )}
                        {task.clients && (
                          <div className="flex items-center gap-1 mt-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate">
                              {task.clients.name}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-start gap-1">
                        <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                          {task.priority === 'high' ? 'Высокий' : 
                           task.priority === 'medium' ? 'Средний' : 'Низкий'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTaskId(task.id);
                          }}
                          title="Редактировать"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Нет задач на этот день</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddTask();
                  }}
                  type="button"
                >
                  Создать задачу
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Модальные окна */}
      <AddTaskModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        preselectedDate={format(selectedDate, 'yyyy-MM-dd')}
        clientId={activeClientId}
        clientName={activeClientName}
      />

      <TaskDayView
        open={showDayView}
        onOpenChange={setShowDayView}
        date={selectedDate}
        onTaskClick={onTaskClick}
        activeClientId={activeClientId}
        activeClientName={activeClientName}
      />

      {editingTaskId && (
        <EditTaskModal
          open={!!editingTaskId}
          onOpenChange={(open) => !open && setEditingTaskId(null)}
          taskId={editingTaskId}
        />
      )}
    </div>
  );
};