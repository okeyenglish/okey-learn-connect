import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useStudentGroupLessonSessions } from "@/hooks/useStudentGroupLessonSessions";
import { StudentLessonScheduleStrip } from "./StudentLessonScheduleStrip";
import { StudentPaymentInfo } from "./StudentPaymentInfo";
import { Loader2 } from "lucide-react";

interface StudentScheduleRowProps {
  studentId: string;
  studentName: string;
  groupId: string;
  defaultExpanded?: boolean;
  onRefetch: () => void;
}

export const StudentScheduleRow = ({
  studentId,
  studentName,
  groupId,
  defaultExpanded = true,
  onRefetch
}: StudentScheduleRowProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  // Используем централизованный хук
  const { data: sessions = [], isLoading } = useStudentGroupLessonSessions(studentId, groupId);

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between mb-3 gap-4">
        <div className="flex items-center gap-2 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0 h-auto"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-gray-900">
                {studentName}
              </span>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <span className="text-sm text-gray-500">
                  ({sessions.length} занятий)
                </span>
              )}
            </div>
            
            {/* Информация о платежах */}
            <div className="mt-2 p-3 bg-muted/30 rounded-lg">
              <StudentPaymentInfo 
                studentId={studentId}
                groupId={groupId}
              />
            </div>
          </div>
        </div>
      </div>

      {isExpanded && !isLoading && (
        <div className="mt-3">
          <StudentLessonScheduleStrip
            studentId={studentId}
            studentName={studentName}
            sessions={sessions}
            onSessionUpdated={onRefetch}
          />
        </div>
      )}
    </div>
  );
};
