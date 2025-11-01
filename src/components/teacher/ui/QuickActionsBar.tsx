import { Button } from '@/components/ui/button';
import { Play, ClipboardCheck, NotebookPen, CheckCircle, Video } from 'lucide-react';

interface QuickActionsBarProps {
  onStart?: () => void;
  onAttendance?: () => void;
  onHomework?: () => void;
  onComplete?: () => void;
  onJoinClass?: () => void;
  showJoinClass?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'default';
}

export const QuickActionsBar = ({
  onStart,
  onAttendance,
  onHomework,
  onComplete,
  onJoinClass,
  showJoinClass = false,
  disabled = false,
  size = 'default',
}: QuickActionsBarProps) => {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {onStart && (
        <Button
          onClick={onStart}
          disabled={disabled}
          size={size}
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          <span className="hidden sm:inline">Начать</span>
        </Button>
      )}

      {onAttendance && (
        <Button
          onClick={onAttendance}
          disabled={disabled}
          variant="outline"
          size={size}
          className="gap-2"
          title="Горячая клавиша: P"
        >
          <ClipboardCheck className="h-4 w-4" />
          <span className="hidden sm:inline">Посещаемость</span>
        </Button>
      )}

      {onHomework && (
        <Button
          onClick={onHomework}
          disabled={disabled}
          variant="outline"
          size={size}
          className="gap-2"
          title="Горячая клавиша: D"
        >
          <NotebookPen className="h-4 w-4" />
          <span className="hidden sm:inline">ДЗ</span>
        </Button>
      )}

      {showJoinClass && onJoinClass && (
        <Button
          onClick={onJoinClass}
          disabled={disabled}
          variant="outline"
          size={size}
          className="gap-2"
        >
          <Video className="h-4 w-4" />
          <span className="hidden sm:inline">Войти в класс</span>
        </Button>
      )}

      {onComplete && (
        <Button
          onClick={onComplete}
          disabled={disabled}
          variant="secondary"
          size={size}
          className="gap-2"
          title="Горячая клавиша: ⌘↵"
        >
          <CheckCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Провёл</span>
        </Button>
      )}
    </div>
  );
};