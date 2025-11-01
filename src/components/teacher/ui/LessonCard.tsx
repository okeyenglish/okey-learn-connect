import { Calendar, ClipboardCheck, NotebookPen, Video, MapPin, Clock, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface LessonCardProps {
  start: string;
  end: string;
  title: string;
  room?: string;
  online?: boolean;
  link?: string;
  status?: string;
  lessonDate?: string;
  onAttendance?: () => void;
  onHomework?: () => void;
  onOpenLink?: () => void;
  onStartLesson?: () => void;
  onRequestSubstitution?: () => void;
}

export function LessonCard({
  start,
  end,
  title,
  room,
  online,
  link,
  status,
  lessonDate,
  onAttendance,
  onHomework,
  onOpenLink,
  onStartLesson,
  onRequestSubstitution,
}: LessonCardProps) {
  const formatTime = (time: string) => {
    try {
      return new Date(`2000-01-01T${time}`).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return time;
    }
  };

  const isCompleted = status === 'completed';
  const isActive = status === 'scheduled' || status === 'ongoing';
  
  // Проверяем, что занятие в прошлом или сегодня (для кнопки посещаемости)
  const canMarkAttendance = lessonDate ? new Date(lessonDate) <= new Date(new Date().setHours(23, 59, 59, 999)) : false;
  
  // Проверяем, что занятие в прошлом (только для прошедших дат показываем кнопку "Провел")
  const isPastLesson = lessonDate ? new Date(lessonDate) < new Date(new Date().setHours(0, 0, 0, 0)) : false;

  return (
    <div className={`flex items-center justify-between border rounded-xl p-4 transition-all ${
      isActive ? 'hover:shadow-md hover:bg-surface/50' : 'opacity-75'
    }`}>
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span>{formatTime(start)} – {formatTime(end)}</span>
          <span className="text-muted-foreground">•</span>
          <span className="truncate">{title}</span>
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
          {online ? (
            <>
              <Video className="w-4 h-4" />
              <span>Онлайн-урок</span>
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4" />
              <span>Аудитория {room || "—"}</span>
            </>
          )}
          {status && (
            <>
              <span>•</span>
              <Badge variant={isCompleted ? "default" : "secondary"} className="text-xs">
                {status === 'scheduled' ? 'Запланировано' : 
                 status === 'ongoing' ? 'Идет урок' : 
                 status === 'completed' ? 'Завершено' : 'Отменено'}
              </Badge>
            </>
          )}
        </div>
      </div>
      
      {isActive && (
        <div className="flex items-center gap-1 ml-4">
          {link && onOpenLink && (
            <IconBtn tooltip="Открыть ссылку" onClick={onOpenLink}>
              <Video className="w-4 h-4" />
            </IconBtn>
          )}
          {onAttendance && canMarkAttendance && (
            <IconBtn tooltip="Посещаемость" onClick={onAttendance}>
              <ClipboardCheck className="w-4 h-4" />
            </IconBtn>
          )}
          {onHomework && (
            <IconBtn tooltip="Домашнее задание" onClick={onHomework}>
              <NotebookPen className="w-4 h-4" />
            </IconBtn>
          )}
          {onRequestSubstitution && (
            <IconBtn tooltip="Запросить замену" onClick={onRequestSubstitution}>
              <UserX className="w-4 h-4" />
            </IconBtn>
          )}
          {onStartLesson && isPastLesson && (
            <Button 
              onClick={onStartLesson} 
              size="sm"
              className="ml-1"
            >
              Провел
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function IconBtn({ 
  children, 
  onClick, 
  tooltip 
}: { 
  children: React.ReactNode; 
  onClick: () => void; 
  tooltip: string;
}) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg border hover:bg-white dark:hover:bg-surface group relative transition-colors"
      title={tooltip}
    >
      {children}
      <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[11px] bg-black text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
        {tooltip}
      </span>
    </button>
  );
}
