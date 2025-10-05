import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import { GroupLessonStatusModal } from './GroupLessonStatusModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface GroupLessonScheduleStripProps {
  sessions: any[];
  className?: string;
  onSessionUpdated?: () => void;
}

export function GroupLessonScheduleStrip({ 
  sessions, 
  className,
  onSessionUpdated
}: GroupLessonScheduleStripProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Сортируем занятия по дате
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => 
      new Date(a.lesson_date).getTime() - new Date(b.lesson_date).getTime()
    );
  }, [sessions]);

  const displayedSessions = showAll ? sortedSessions : sortedSessions.slice(0, 30);
  const hasMore = sortedSessions.length > 30;

  const handleDateClick = (sessionId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedSessionId(sessionId);
    setIsModalOpen(true);
  };

  const getSessionColor = (session: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sessionDate = new Date(session.lesson_date);
    sessionDate.setHours(0, 0, 0, 0);

    // Бесплатное занятие - оранжевый
    if (session.payment_amount === 0 || session.payment_amount === '0' || session.payment_amount === null) {
      return 'bg-orange-500 text-white border-orange-500';
    }

    switch (session.status) {
      case 'completed':
        // Проведенное занятие - серый
        return 'bg-gray-500 text-white border-gray-500';
      case 'cancelled':
        return 'bg-black text-white border-black';
      case 'rescheduled':
        return 'bg-orange-500 text-white border-orange-500';
      case 'scheduled':
        // Если дата прошла, но статус еще scheduled - желтый
        if (sessionDate < today) {
          return 'bg-yellow-500 text-white border-yellow-500';
        }
        return 'bg-blue-500 text-white border-blue-500';
      default:
        return 'bg-gray-300 text-gray-700 border-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Запланировано';
      case 'completed': return 'Проведено';
      case 'cancelled': return 'Отменено';
      case 'rescheduled': return 'Перенесено';
      default: return status;
    }
  };

  const handleStatusUpdated = () => {
    onSessionUpdated?.();
    setIsModalOpen(false);
    setSelectedSessionId(null);
  };

  if (sessions.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        Нет запланированных занятий
      </div>
    );
  }

  return (
    <>
      <TooltipProvider>
        <div className={cn("space-y-3", className)}>
          <div className="flex gap-1 flex-wrap">
            {displayedSessions.map((session, index) => {
              const colorClass = getSessionColor(session);
              const lessonNumber = index + 1;
              
              return (
                <Tooltip key={session.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => handleDateClick(session.id, e)}
                      className={cn(
                        "h-8 px-2 rounded border flex items-center justify-center hover:opacity-80 transition-all cursor-pointer",
                        colorClass
                      )}
                    >
                      <span className="text-xs font-medium whitespace-nowrap">
                        {format(new Date(session.lesson_date), 'dd.MM', { locale: ru })}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs space-y-1">
                      <div className="font-semibold">Занятие №{lessonNumber}</div>
                      <div className="text-muted-foreground">
                        {format(new Date(session.lesson_date), 'dd MMMM yyyy', { locale: ru })}
                      </div>
                      <div className="text-muted-foreground">
                        {session.start_time} - {session.end_time}
                      </div>
                      <div className="text-muted-foreground">
                        {session.teacher_name}
                      </div>
                      <div className="text-muted-foreground">
                        Аудитория: {session.classroom}
                      </div>
                      <div className="font-medium">
                        Статус: {getStatusLabel(session.status)}
                      </div>
                      {session.lessons && (
                        <div className="text-muted-foreground">
                          Урок {session.lessons.lesson_number}: {session.lessons.title}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="w-full"
            >
              {showAll ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Скрыть ({sortedSessions.length - 30} занятий)
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Показать все ({sortedSessions.length} занятий)
                </>
              )}
            </Button>
          )}
        </div>
      </TooltipProvider>

      <GroupLessonStatusModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        sessionId={selectedSessionId}
        onStatusUpdated={handleStatusUpdated}
      />
    </>
  );
}
