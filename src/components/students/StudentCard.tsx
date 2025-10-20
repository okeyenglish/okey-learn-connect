import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Phone,
  Calendar,
  Edit,
  Trash2,
  Archive
} from "lucide-react";

interface StudentCardProps {
  student: any;
  onEdit?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
}

export const StudentCard = ({ student, onEdit, onDelete, onArchive }: StudentCardProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-500/10 text-green-700 dark:text-green-400",
      not_started: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      archived: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
      expelled: "bg-red-500/10 text-red-700 dark:text-red-400",
      on_pause: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
      trial: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
    };
    return colors[status] || "bg-secondary";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: "Активный",
      not_started: "Не начал",
      archived: "Архивный",
      expelled: "Отчислен",
      on_pause: "На паузе",
      trial: "Пробный",
    };
    return labels[status] || status;
  };

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={(student as any).avatar_url} />
            <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{student.name}</h3>
              <Badge className={getStatusColor(student.status as string)}>
                {getStatusLabel(student.status as string)}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {student.age && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {student.age} лет
                </span>
              )}
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {student.phone}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
