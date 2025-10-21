import { Calendar, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { LessonCard } from '@/components/teacher/ui/LessonCard';
import { EmptyState } from '@/components/teacher/ui/EmptyState';
import { LessonPlanCard } from '@/components/teacher/LessonPlanCard';
import { getLessonNumberForGroup } from '@/utils/lessonCalculator';
import { Badge } from '@/components/ui/badge';

interface TodayLessonsSectionProps {
  todayLessons: any[];
  todayTotal: number;
  todayCompleted: number;
  weekTotal: number;
  onStartLesson: (lesson: any) => void;
  onAttendance: (lesson: any) => void;
  onHomework: (lesson: any) => void;
  onOpenOnline: (lesson: any) => void;
}

export const TodayLessonsSection = ({
  todayLessons,
  todayTotal,
  todayCompleted,
  weekTotal,
  onStartLesson,
  onAttendance,
  onHomework,
  onOpenOnline,
}: TodayLessonsSectionProps) => {
  return (
    <div className="card-elevated">
      {/* Шапка с прогрессом */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2 mb-1">
              <Calendar className="h-5 w-5 text-brand" />
              Сегодняшние занятия
            </h2>
            <p className="text-sm text-text-secondary">
              {format(new Date(), 'EEEE, d MMMM yyyy', { locale: ru })}
            </p>
          </div>

          {/* Статистика дня */}
          <div className="flex items-center gap-3 flex-wrap">
            {todayTotal > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 rounded-lg">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">
                  {todayCompleted} / {todayTotal} проведено
                </span>
              </div>
            )}
            {weekTotal > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-info/10 rounded-lg">
                <Calendar className="h-4 w-4 text-info" />
                <span className="text-sm font-medium">
                  {weekTotal} на неделю
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Прогресс бар */}
        {todayTotal > 0 && (
          <div className="mt-4">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-success transition-all duration-500"
                style={{ width: `${(todayCompleted / todayTotal) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {todayCompleted === todayTotal
                ? '🎉 Все занятия проведены!'
                : `Осталось ${todayTotal - todayCompleted} ${todayTotal - todayCompleted === 1 ? 'занятие' : 'занятий'}`}
            </p>
          </div>
        )}
      </div>

      {/* Список занятий */}
      {todayLessons && todayLessons.length > 0 ? (
        <div className="space-y-4">
          {todayLessons.map((lesson: any) => (
            <div key={lesson.id} className="space-y-3">
              <LessonCard
                start={lesson.start_time}
                end={lesson.end_time}
                title={lesson.learning_groups?.name || 'Индивидуальное занятие'}
                room={lesson.classroom}
                online={!!lesson.online_link}
                link={lesson.online_link}
                status={lesson.status}
                onAttendance={() => onAttendance(lesson)}
                onHomework={() => onHomework(lesson)}
                onOpenLink={() => onOpenOnline(lesson)}
                onStartLesson={() => onStartLesson(lesson)}
              />

              {/* Планирование урока */}
              {lesson.status !== 'completed' && lesson.status !== 'cancelled' && (
                <LessonPlanCard
                  lessonNumber={getLessonNumberForGroup(
                    lesson.learning_groups?.name || 'Индивидуальное занятие',
                    lesson.learning_groups?.level,
                    lesson.lesson_date
                  )}
                  groupName={lesson.learning_groups?.name || 'Индивидуальное занятие'}
                  level={lesson.learning_groups?.level}
                  subject={lesson.learning_groups?.subject}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Calendar}
          title="На сегодня занятий не запланировано"
          subtitle="Расписание на завтра и следующие дни можно посмотреть в разделе «Расписание»"
        />
      )}
    </div>
  );
};
