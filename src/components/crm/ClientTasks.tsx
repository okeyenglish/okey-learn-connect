import { AlertCircle, Clock, User, Check, X, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

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
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (tasks.length === 0) {
    return null;
  }

  const handleCompleteTask = (taskId: string) => {
    console.log('Complete task:', taskId);
  };

  const handleCloseTask = (taskId: string) => {
    console.log('Close task:', taskId);
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
    <Card className="mb-4 border-orange-200 bg-orange-50/50">
      <CardHeader 
        className="pb-2 cursor-pointer" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-sm flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-orange-600" />
          ) : (
            <ChevronRight className="h-4 w-4 text-orange-600" />
          )}
          <AlertCircle className="h-4 w-4 text-orange-600" />
          Активные задачи ({tasks.length})
        </CardTitle>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-2">
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
                  <div className="flex items-center gap-1">
                    <Badge variant={getPriorityColor(task.priority)} className="shrink-0 text-xs">
                      {task.priority === 'high' ? 'Срочно' : task.priority === 'medium' ? 'Важно' : 'Обычно'}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 w-6 p-0 text-green-600 hover:bg-green-50"
                      onClick={() => handleCompleteTask(task.id)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                      onClick={() => handleCloseTask(task.id)}
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
    </Card>
  );
};