import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, Clock, MapPin, Building2 } from "lucide-react";
import { StudentConflict } from "@/hooks/useStudentScheduleConflicts";

interface StudentConflictAlertProps {
  studentName: string;
  conflicts: StudentConflict[];
  className?: string;
}

export const StudentConflictAlert = ({ studentName, conflicts, className }: StudentConflictAlertProps) => {
  if (!conflicts || conflicts.length === 0) return null;

  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-3">
          <div className="font-medium">
            Конфликт расписания для ученика <span className="font-semibold">{studentName}</span>
          </div>
          
          <div className="space-y-2">
            {conflicts.map((conflict, index) => (
              <div key={index} className="bg-red-50 p-3 rounded-lg border border-red-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="font-medium text-red-800">
                    {conflict.conflicting_group_name}
                  </div>
                  <Badge variant={conflict.lesson_type === 'group' ? 'default' : 'secondary'} className="text-xs">
                    {conflict.lesson_type === 'group' ? 'Группа' : 'Индивидуальное'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm text-red-700">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{conflict.conflicting_time_range}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{conflict.conflicting_teacher}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{conflict.conflicting_classroom}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    <span>{conflict.conflicting_branch}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-sm text-red-600">
            Выберите другое время или уберите ученика из существующих занятий
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};