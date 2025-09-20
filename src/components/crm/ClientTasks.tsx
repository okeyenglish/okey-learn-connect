import { AlertCircle, Clock, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  title: string;
  student?: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  description?: string;
}

interface ClientTasksProps {
  clientName: string;
  tasks: Task[];
}

export const ClientTasks = ({ clientName, tasks }: ClientTasksProps) => {
  if (tasks.length === 0) {
    return null;
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Card className="mb-4 border-orange-200 bg-orange-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          Активные задачи ({tasks.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-md p-2 border border-orange-200">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  {task.student && (
                    <div className="flex items-center gap-1 mt-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{task.student}</span>
                    </div>
                  )}
                  {task.dueDate && (
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{task.dueDate}</span>
                    </div>
                  )}
                </div>
                <Badge variant={getPriorityColor(task.priority)} className="shrink-0 text-xs">
                  {task.priority === 'high' ? 'Срочно' : task.priority === 'medium' ? 'Важно' : 'Обычно'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};