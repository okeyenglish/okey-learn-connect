import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface LessonCountdownProps {
  startTime: string; // ISO string
  onTimeUp?: () => void;
}

export const LessonCountdown = ({ startTime, onTimeUp }: LessonCountdownProps) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const start = new Date(startTime).getTime();
      const diff = start - now;

      if (diff <= 0) {
        setIsStarted(true);
        if (onTimeUp) onTimeUp();
        return 'Урок начался';
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        return `${hours}ч ${minutes}м`;
      } else if (minutes > 0) {
        return `${minutes}м ${seconds}с`;
      } else {
        return `${seconds}с`;
      }
    };

    const updateTimer = () => {
      setTimeLeft(calculateTimeLeft());
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startTime, onTimeUp]);

  return (
    <div className={`flex items-center gap-2 text-sm ${isStarted ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'}`}>
      <Clock className="h-4 w-4" />
      <span>{timeLeft}</span>
    </div>
  );
};