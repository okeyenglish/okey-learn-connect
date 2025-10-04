import { HelpCircle } from 'lucide-react';
import { useAttendanceStatus } from '@/hooks/useAttendance';
import { isPast, isToday } from 'date-fns';

interface AttendanceIndicatorProps {
  lessonDate: Date;
  lessonId: string;
  sessionType: 'group' | 'individual';
  onClick?: (e: React.MouseEvent) => void;
}

export function AttendanceIndicator({ 
  lessonDate, 
  lessonId, 
  sessionType,
  onClick 
}: AttendanceIndicatorProps) {
  const dateStr = lessonDate.toISOString().split('T')[0];
  const { data: attendanceStatus } = useAttendanceStatus(dateStr, lessonId, sessionType);

  // Only show indicator for past lessons or today's lessons
  const shouldShow = (isPast(lessonDate) || isToday(lessonDate)) && !attendanceStatus?.isMarked;

  if (!shouldShow) return null;

  return (
    <button
      onClick={onClick}
      className="absolute -top-1 -right-1 bg-yellow-500 text-white rounded-full p-0.5 hover:bg-yellow-600 transition-colors z-10"
      title="Посещаемость не отмечена"
    >
      <HelpCircle className="h-3 w-3" />
    </button>
  );
}
