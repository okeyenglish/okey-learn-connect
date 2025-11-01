import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { LessonCard } from '@/components/teacher/ui/LessonCard';

interface VirtualizedLessonListProps {
  lessons: any[];
  onAttendance: (lesson: any) => void;
  onHomework: (lesson: any) => void;
  onOpenOnline: (lesson: any) => void;
  onStartLesson: (lesson: any) => void;
  onRequestSubstitution: () => void;
}

export const VirtualizedLessonList = ({
  lessons,
  onAttendance,
  onHomework,
  onOpenOnline,
  onStartLesson,
  onRequestSubstitution,
}: VirtualizedLessonListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: lessons.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 180,
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const lesson = lessons[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="pb-3">
                <LessonCard
                  start={lesson.start_time}
                  end={lesson.end_time}
                  title={lesson.learning_groups?.name || 'Индивидуальное занятие'}
                  room={lesson.classroom}
                  online={!!lesson.online_link}
                  link={lesson.online_link}
                  status={lesson.status}
                  lessonDate={lesson.lesson_date}
                  onAttendance={() => onAttendance(lesson)}
                  onHomework={() => onHomework(lesson)}
                  onOpenLink={() => onOpenOnline(lesson)}
                  onStartLesson={() => onStartLesson(lesson)}
                  onRequestSubstitution={onRequestSubstitution}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
