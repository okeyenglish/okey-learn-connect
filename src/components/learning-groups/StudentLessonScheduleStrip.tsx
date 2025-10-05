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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lessonDate = new Date(session.lesson_date);
    lessonDate.setHours(0, 0, 0, 0);
    
    const isPast = lessonDate < today;
    
    // Сначала проверяем персональную отмену
    if (session.is_cancelled_for_student) {
      return 'bg-black hover:bg-gray-900 text-white'; // Отменено - черный
    }

    // Проверяем бесплатное занятие
    if (session.payment_status === 'free' || session.payment_status === 'bonus') {
      return 'bg-orange-500 hover:bg-orange-600 text-white'; // Бесплатное - оранжевый
    }

    // Проверяем оплату
    if (session.payment_status === 'paid') {
      if (isPast) {
        return 'bg-gray-500 hover:bg-gray-600 text-white'; // Серый - оплачено и прошло
      }
      return 'bg-green-500 hover:bg-green-600 text-white'; // Зеленый - оплачено
    }

    // Не оплачено
    if (isPast) {
      // Прошедшее и не оплаченное - красный (задолженность)
      return 'bg-red-500 hover:bg-red-600 text-white';
    } else {
      // Будущее и не оплаченное - белый
      return 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-300';
    }
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
          studentId={studentId}
          lessonSessionId={selectedSession.lesson_session_id}
          studentName={studentName}
          lessonDate={selectedSession.lesson_date}
          isTemp={selectedSession._isTemp}
          onUpdate={() => {
            onSessionUpdated?.();
            setSelectedSession(null);
          }}
        />
      )}
    </div>
  );
};
