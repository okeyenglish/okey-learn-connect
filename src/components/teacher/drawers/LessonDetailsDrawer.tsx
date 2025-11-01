import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, MapPin, Users, Video } from 'lucide-react';
import { QuickActionsBar } from '../ui/QuickActionsBar';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface LessonDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    date: string;
    room?: string;
    isOnline?: boolean;
    onlineLink?: string;
    studentsCount?: number;
    status?: string;
    level?: string;
    groupType?: string;
  };
  onStart?: () => void;
  onAttendance?: () => void;
  onHomework?: () => void;
  onComplete?: () => void;
  onJoinClass?: () => void;
}

export const LessonDetailsDrawer = ({
  open,
  onOpenChange,
  lesson,
  onStart,
  onAttendance,
  onHomework,
  onComplete,
  onJoinClass,
}: LessonDetailsDrawerProps) => {
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

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="secondary">Запланировано</Badge>;
      case 'ongoing':
        return <Badge className="bg-green-500">Идёт урок</Badge>;
      case 'completed':
        return <Badge variant="default">Завершено</Badge>;
      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">{lesson.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Основная информация */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <div className="font-medium">
                  {formatTime(lesson.startTime)} – {formatTime(lesson.endTime)}
                </div>
                <div className="text-muted-foreground">
                  {format(new Date(lesson.date), 'dd MMMM yyyy, EEEEEE', { locale: ru })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              {lesson.isOnline ? (
                <>
                  <Video className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>Онлайн-урок</span>
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>Аудитория {lesson.room || '—'}</span>
                </>
              )}
            </div>

            {lesson.studentsCount !== undefined && (
              <div className="flex items-center gap-3 text-sm">
                <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>{lesson.studentsCount} студентов</span>
              </div>
            )}
          </div>

          {/* Статус и метаданные */}
          <div className="flex flex-wrap gap-2">
            {getStatusBadge(lesson.status)}
            {lesson.level && <Badge variant="outline">{lesson.level}</Badge>}
            {lesson.groupType && <Badge variant="outline">{lesson.groupType}</Badge>}
          </div>

          <Separator />

          {/* Быстрые действия */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Быстрые действия</h3>
            <QuickActionsBar
              onStart={onStart}
              onAttendance={onAttendance}
              onHomework={onHomework}
              onComplete={onComplete}
              onJoinClass={onJoinClass}
              showJoinClass={lesson.isOnline && !!lesson.onlineLink}
              size="default"
            />
          </div>

          {/* Дополнительная информация */}
          {lesson.isOnline && lesson.onlineLink && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-2">Ссылка на урок</h3>
                <div className="bg-muted rounded-lg p-3">
                  <a
                    href={lesson.onlineLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline break-all"
                  >
                    {lesson.onlineLink}
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};