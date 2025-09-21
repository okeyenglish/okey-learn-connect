import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserX, Plus } from "lucide-react";
import { useSessionStudents, useRemoveStudentsFromSession } from "@/hooks/useStudentScheduleConflicts";
import { useToast } from "@/hooks/use-toast";

interface SessionStudentsDisplayProps {
  sessionId: string;
  sessionInfo?: {
    lesson_date: string;
    start_time: string;
    end_time: string;
    branch: string;
  };
  onAddStudents?: () => void;
  isEditable?: boolean;
}

export const SessionStudentsDisplay = ({ 
  sessionId, 
  sessionInfo,
  onAddStudents, 
  isEditable = false 
}: SessionStudentsDisplayProps) => {
  const { data: students = [], isLoading } = useSessionStudents(sessionId);
  const removeStudents = useRemoveStudentsFromSession();
  const { toast } = useToast();

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    try {
      await removeStudents.mutateAsync({
        studentIds: [studentId],
        lessonSessionId: sessionId
      });
      
      toast({
        title: "Успешно",
        description: `Ученик ${studentName} удален из занятия`
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить ученика из занятия",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <div className="animate-pulse">Загрузка учеников...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            Ученики на занятии ({students.length})
          </CardTitle>
          {isEditable && onAddStudents && (
            <Button size="sm" variant="outline" onClick={onAddStudents}>
              <Plus className="h-3 w-3 mr-1" />
              Добавить
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {students.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Ученики не записаны на это занятие</p>
            {isEditable && onAddStudents && (
              <Button size="sm" variant="ghost" onClick={onAddStudents} className="mt-2">
                Добавить учеников
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {students.map((student: any) => (
              <div 
                key={student.id} 
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium">{student.name}</div>
                  <Badge variant="outline" className="text-xs">
                    {student.age} лет
                  </Badge>
                </div>
                {isEditable && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                    onClick={() => handleRemoveStudent(student.id, student.name)}
                    disabled={removeStudents.isPending}
                  >
                    <UserX className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};