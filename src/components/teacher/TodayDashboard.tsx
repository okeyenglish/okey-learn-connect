import { Calendar, CheckCircle, PlayCircle, ClipboardCheck, Video, BookOpenCheck, UserX, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LessonCard } from '@/components/teacher/ui/LessonCard';
import { EmptyState } from '@/components/teacher/ui/EmptyState';
import { LessonPlanCard } from '@/components/teacher/LessonPlanCard';
import { getLessonNumberForGroup } from '@/utils/lessonCalculator';

interface TodayDashboardProps {
  todayLessons: any[];
  todayTotal: number;
  todayCompleted: number;
  weekTotal: number;
  onStartLesson: (lesson: any) => void;
  onAttendance: (lesson: any) => void;
  onHomework: (lesson: any) => void;
  onOpenOnline: (lesson: any) => void;
  onRequestSubstitution: () => void;
}

export const TodayDashboard = ({
  todayLessons,
  todayTotal,
  todayCompleted,
  weekTotal,
  onStartLesson,
  onAttendance,
  onHomework,
  onOpenOnline,
  onRequestSubstitution,
}: TodayDashboardProps) => {
  const nextLesson = todayLessons?.find(
    (lesson) => lesson.status !== 'completed' && lesson.status !== 'cancelled'
  );

  return (
    <div className="card-elevated">
      {/* Шапка с датой и прогрессом */}
      <div className="mb-6 pb-6 border-b">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2 mb-1">
              <Calendar className="h-5 w-5 text-brand" />
              Сегодняшние занятия
            </h2>
            <p className="text-sm text-text-secondary">
              {format(new Date(), 'EEEE, d MMMM yyyy', { locale: ru })}
            </p>
          </div>

          {/* Статистика */}
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
          <div>
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

      {/* Быстрые действия для следующего урока */}
      {nextLesson && (
        <div className="mb-6 p-4 bg-brand/5 border border-brand/20 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <PlayCircle className="h-5 w-5 text-brand" />
            <h3 className="font-semibold">Следующее занятие</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">
                  {nextLesson.learning_groups?.name || 'Индивидуальное занятие'}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{nextLesson.start_time} - {nextLesson.end_time}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{nextLesson.classroom}</span>
                  </div>
                </div>
              </div>
              <Badge variant="secondary">
                {nextLesson.status === 'completed' ? 'Завершено' : 
                 nextLesson.status === 'cancelled' ? 'Отменено' : 'Запланировано'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button
                onClick={() => onStartLesson(nextLesson)}
                size="sm"
                className="w-full"
              >
                <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
                Начать
              </Button>

              {nextLesson.online_link && (
                <Button
                  onClick={() => onOpenOnline(nextLesson)}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  <Video className="h-3.5 w-3.5 mr-1.5" />
                  Онлайн
                </Button>
              )}

              <Button
                onClick={() => onAttendance(nextLesson)}
                size="sm"
                variant="outline"
                className="w-full"
              >
                <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />
                Посещ.
              </Button>

              <Button
                onClick={() => onHomework(nextLesson)}
                size="sm"
                variant="outline"
                className="w-full"
              >
                <BookOpenCheck className="h-3.5 w-3.5 mr-1.5" />
                ДЗ
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Список всех занятий */}
      {todayLessons && todayLessons.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Все занятия</h3>
            <Button
              onClick={onRequestSubstitution}
              variant="ghost"
              size="sm"
            >
              <UserX className="h-3.5 w-3.5 mr-1.5" />
              Запросить замену
            </Button>
          </div>
          
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
          action={
            <Button onClick={onRequestSubstitution} variant="outline">
              <UserX className="h-4 w-4 mr-2" />
              Запросить замену
            </Button>
          }
        />
      )}
    </div>
  );
};
