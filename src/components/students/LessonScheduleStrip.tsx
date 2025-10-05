import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AttendanceIndicator } from './AttendanceIndicator';
import { MarkAttendanceModal } from './MarkAttendanceModal';

interface LessonSession {
  id: string;
  lessonDate: string;
  status: string;
  lessonNumber?: number;
}

interface LessonScheduleStripProps {
  sessions: LessonSession[];
  className?: string;
  groupId?: string;
}

export function LessonScheduleStrip({ sessions, className, groupId }: LessonScheduleStripProps) {
  const [startIndex, setStartIndex] = useState(0);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const visibleCount = 50;
  
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(a.lessonDate).getTime() - new Date(b.lessonDate).getTime()
  );

  const visibleSessions = sortedSessions.slice(startIndex, startIndex + visibleCount);
  const canGoBack = startIndex > 0;
  const canGoForward = startIndex + visibleCount < sortedSessions.length;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-500 hover:bg-green-600';
      case 'scheduled':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'cancelled':
        return 'bg-red-500 hover:bg-red-600';
      case 'in_progress':
        return 'bg-yellow-500 hover:bg-yellow-600';
      default:
        return 'bg-gray-300 hover:bg-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'Проведено';
      case 'scheduled':
        return 'Запланировано';
      case 'cancelled':
        return 'Отменено';
      case 'in_progress':
        return 'В процессе';
      default:
        return 'Не определено';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const handleAttendanceClick = (dateString: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedDate(new Date(dateString));
    setAttendanceModalOpen(true);
  };

  if (sortedSessions.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground text-center py-2", className)}>
        Нет запланированных занятий
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => setStartIndex(Math.max(0, startIndex - visibleCount))}
        disabled={!canGoBack}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex-1 overflow-hidden">
        <div className="flex gap-1">
          <TooltipProvider>
            {visibleSessions.map((session, index) => (
              <Tooltip key={session.id}>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      "h-8 w-14 rounded shrink-0 transition-colors relative flex items-center justify-center",
                      getStatusColor(session.status)
                    )}
                    aria-label={`Занятие ${formatDate(session.lessonDate)}`}
                  >
                    <span className="text-[10px] text-white font-medium leading-none">
                      {formatShortDate(session.lessonDate)}
                    </span>
                    {groupId && (
                      <AttendanceIndicator
                        lessonDate={new Date(session.lessonDate)}
                        lessonId={groupId}
                        sessionType="group"
                        onClick={(e) => handleAttendanceClick(session.lessonDate, e)}
                      />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    <div className="font-medium">Занятие №{session.lessonNumber || startIndex + index + 1}</div>
                    <div>{formatDate(session.lessonDate)}</div>
                    <div className="text-muted-foreground">{getStatusLabel(session.status)}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => setStartIndex(startIndex + visibleCount)}
        disabled={!canGoForward}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <div className="text-xs text-muted-foreground shrink-0 ml-2">
        {sortedSessions.length} занятий
      </div>

      {selectedDate && groupId && (
        <MarkAttendanceModal
          open={attendanceModalOpen}
          onOpenChange={setAttendanceModalOpen}
          lessonDate={selectedDate}
          lessonId={groupId}
          sessionType="group"
        />
      )}
    </div>
  );
}
