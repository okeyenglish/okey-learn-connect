import { Calendar, CheckCircle, PlayCircle, ClipboardCheck, Video, BookOpenCheck, UserX, Clock, MapPin } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LessonCard } from '@/components/teacher/ui/LessonCard';
import { EmptyState } from '@/components/teacher/ui/EmptyState';
import { LessonPlanCard } from '@/components/teacher/LessonPlanCard';
import { getLessonNumberForGroup } from '@/utils/lessonCalculator';

interface TodayDashboardProps {
  todayLessons: any[];
  weekLessons: any[];
  monthLessons: any[];
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
  weekLessons,
  monthLessons,
  todayTotal,
  todayCompleted,
  weekTotal,
  onStartLesson,
  onAttendance,
  onHomework,
  onOpenOnline,
  onRequestSubstitution,
}: TodayDashboardProps) => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  
  const getLessons = () => {
    switch (period) {
      case 'day': return todayLessons;
      case 'week': return weekLessons;
      case 'month': return monthLessons;
      default: return todayLessons;
    }
  };

  const getPeriodTitle = () => {
    switch (period) {
      case 'day': return 'Сегодняшние занятия';
      case 'week': return 'Занятия на неделю';
      case 'month': return 'Занятия на месяц';
      default: return 'Сегодняшние занятия';
    }
  };

  const getPeriodSubtitle = () => {
    const today = new Date();
    switch (period) {
      case 'day': 
        return format(today, 'EEEE, d MMMM yyyy', { locale: ru });
      case 'week': 
        const weekStart = startOfWeek(today, { locale: ru });
        const weekEnd = endOfWeek(today, { locale: ru });
        return `${format(weekStart, 'd MMM', { locale: ru })} — ${format(weekEnd, 'd MMM yyyy', { locale: ru })}`;
      case 'month':
        return format(today, 'LLLL yyyy', { locale: ru });
      default: 
        return format(today, 'EEEE, d MMMM yyyy', { locale: ru });
    }
  };

  const currentLessons = getLessons();
  const nextLesson = currentLessons?.find(
    (lesson) => lesson.status !== 'completed' && lesson.status !== 'cancelled'
  );

  // Группируем уроки по дням для недели и месяца
  const groupedLessons = period !== 'day' ? currentLessons?.reduce((acc: any, lesson: any) => {
    const date = lesson.lesson_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(lesson);
    return acc;
  }, {}) : null;

  return (
    <div className="card-elevated">
      {/* Шапка с переключателем периода */}
      <div className="mb-6 pb-6 border-b">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2 mb-1">
              <Calendar className="h-5 w-5 text-brand" />
              {getPeriodTitle()}
            </h2>
            <p className="text-sm text-text-secondary">
              {getPeriodSubtitle()}
            </p>
          </div>

          {/* Переключатель периода */}
          <Tabs value={period} onValueChange={(v) => setPeriod(v as 'day' | 'week' | 'month')}>
            <TabsList>
              <TabsTrigger value="day">День</TabsTrigger>
              <TabsTrigger value="week">Неделя</TabsTrigger>
              <TabsTrigger value="month">Месяц</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Статистика для дня */}
        {period === 'day' && (
          <>
            <div className="flex items-center gap-3 flex-wrap mb-4">
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
          </>
        )}
      </div>

      {/* Быстрые действия для следующего урока (только для дня) */}
      {period === 'day' && nextLesson && (
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

      {/* Список занятий */}
      {currentLessons && currentLessons.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-muted-foreground">
              {period === 'day' ? 'Все занятия' : `Всего занятий: ${currentLessons.length}`}
            </h3>
            <Button
              onClick={onRequestSubstitution}
              variant="ghost"
              size="sm"
            >
              <UserX className="h-3.5 w-3.5 mr-1.5" />
              Запросить замену
            </Button>
          </div>
          
          {period === 'day' ? (
            // Просто список для дня
            currentLessons.map((lesson: any) => (
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
                  onRequestSubstitution={onRequestSubstitution}
                />

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
            ))
          ) : (
            // Группировка по дням для недели/месяца
            Object.entries(groupedLessons || {}).map(([date, lessons]: [string, any]) => (
              <div key={date} className="border rounded-xl p-4 space-y-3">
                <h4 className="font-semibold text-text-primary">
                  {format(new Date(date), 'EEEE, d MMMM', { locale: ru })}
                </h4>
                <div className="space-y-3">
                  {lessons.map((lesson: any) => (
                    <LessonCard
                      key={lesson.id}
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
                      onRequestSubstitution={onRequestSubstitution}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <EmptyState
          icon={Calendar}
          title={`На ${period === 'day' ? 'сегодня' : period === 'week' ? 'эту неделю' : 'этот месяц'} занятий не запланировано`}
          subtitle="Расписание можно посмотреть в разделе «Расписание»"
        />
      )}
    </div>
  );
};
