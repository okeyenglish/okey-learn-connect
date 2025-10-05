import React, { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StudentLessonStatusModal } from "./StudentLessonStatusModal";

interface StudentLessonScheduleStripProps {
  studentId: string;
  studentName: string;
  sessions: any[];
  onSessionUpdated?: () => void;
}

export const StudentLessonScheduleStrip = ({
  studentId,
  studentName,
  sessions,
  onSessionUpdated
}: StudentLessonScheduleStripProps) => {
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [showAll, setShowAll] = useState(false);

  // Сортируем сессии по дате
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(a.lesson_date).getTime() - new Date(b.lesson_date).getTime()
  );

  const displayedSessions = showAll ? sortedSessions : sortedSessions.slice(0, 20);

  const getSessionColor = (session: any) => {
    // Сначала проверяем персональную отмену
    if (session.is_cancelled_for_student) {
      return 'bg-gray-400 hover:bg-gray-500';
    }

    // Проверяем оплату
    if (session.payment_status === 'paid') {
      return 'bg-green-500 hover:bg-green-600';
    } else if (session.payment_status === 'free') {
      return 'bg-blue-500 hover:bg-blue-600';
    } else if (session.payment_status === 'bonus') {
      return 'bg-purple-500 hover:bg-purple-600';
    }

    // Проверяем посещаемость для прошедших занятий
    const isPast = new Date(session.lesson_date) < new Date();
    if (isPast) {
      if (session.attendance_status === 'present') {
        return 'bg-green-500 hover:bg-green-600';
      } else if (session.attendance_status === 'absent') {
        return 'bg-red-500 hover:bg-red-600';
      } else if (session.attendance_status === 'excused') {
        return 'bg-orange-500 hover:bg-orange-600';
      } else if (session.attendance_status === 'not_marked') {
        return 'bg-yellow-500 hover:bg-yellow-600'; // Требует внимания
      }
    }

    // Будущие занятия без оплаты
    return 'bg-gray-300 hover:bg-gray-400';
  };

  const getTooltipContent = (session: any) => {
    const parts = [];
    
    if (session.is_cancelled_for_student) {
      parts.push(`Отменено${session.cancellation_reason ? `: ${session.cancellation_reason}` : ''}`);
    } else {
      parts.push(`Посещаемость: ${getAttendanceLabel(session.attendance_status)}`);
      parts.push(`Оплата: ${getPaymentLabel(session.payment_status)}`);
      if (session.payment_amount > 0) {
        parts.push(`Сумма: ${session.payment_amount} ₽`);
      }
    }
    
    if (session.notes) {
      parts.push(`Заметки: ${session.notes}`);
    }
    
    return parts.join('\n');
  };

  const getAttendanceLabel = (status: string) => {
    const labels: Record<string, string> = {
      'not_marked': 'Не отмечено',
      'present': 'Присутствовал',
      'absent': 'Отсутствовал',
      'excused': 'Уважительная',
      'late': 'Опоздал'
    };
    return labels[status] || status;
  };

  const getPaymentLabel = (status: string) => {
    const labels: Record<string, string> = {
      'not_paid': 'Не оплачено',
      'paid': 'Оплачено',
      'free': 'Бесплатно',
      'bonus': 'Бонусами'
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {displayedSessions.map((session) => (
          <TooltipProvider key={session.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-12 min-w-[4rem] text-white ${getSessionColor(session)}`}
                  onClick={() => setSelectedSession(session)}
                >
                  <div className="text-center">
                    <div className="text-xs font-medium">
                      {format(new Date(session.lesson_date), 'd.MM', { locale: ru })}
                    </div>
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="whitespace-pre-line text-sm">
                  {getTooltipContent(session)}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        
        {sortedSessions.length > 20 && !showAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(true)}
            className="text-blue-600"
          >
            Показать все ({sortedSessions.length})
          </Button>
        )}
        
        {showAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(false)}
            className="text-blue-600"
          >
            Свернуть
          </Button>
        )}
      </div>

      {selectedSession && (
        <StudentLessonStatusModal
          isOpen={!!selectedSession}
          onClose={() => setSelectedSession(null)}
          studentLessonSessionId={selectedSession.id}
          studentName={studentName}
          lessonDate={selectedSession.lesson_date}
          onUpdate={() => {
            onSessionUpdated?.();
            setSelectedSession(null);
          }}
        />
      )}
    </div>
  );
};
