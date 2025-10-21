import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  PlayCircle, 
  ClipboardCheck, 
  Video, 
  BookOpenCheck, 
  Calendar, 
  UserX,
  Clock,
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface QuickActionsPanelProps {
  todayLessons: any[];
  onStartLesson: (lesson: any) => void;
  onMarkAttendance: (lesson: any) => void;
  onAddHomework: (lesson: any) => void;
  onOpenOnline: (lesson: any) => void;
  onRequestSubstitution: () => void;
}

export const QuickActionsPanel = ({
  todayLessons,
  onStartLesson,
  onMarkAttendance,
  onAddHomework,
  onOpenOnline,
  onRequestSubstitution,
}: QuickActionsPanelProps) => {
  const nextLesson = todayLessons?.find(
    (lesson) => lesson.status === 'scheduled' || lesson.status === 'in_progress'
  );

  const completedToday = todayLessons?.filter(
    (lesson) => lesson.status === 'completed'
  ).length || 0;

  const scheduledToday = todayLessons?.filter(
    (lesson) => lesson.status === 'scheduled'
  ).length || 0;

  return (
    <Card className="border-brand/20 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlayCircle className="h-5 w-5 text-brand" />
          Быстрые действия
        </CardTitle>
        <CardDescription>
          Управление текущими занятиями одним кликом
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Следующее занятие */}
        {nextLesson ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Следующее занятие</p>
                <h3 className="text-lg font-semibold mt-1">
                  {nextLesson.learning_groups?.name || 'Индивидуальное занятие'}
                </h3>
              </div>
              <Badge variant={nextLesson.status === 'in_progress' ? 'default' : 'secondary'}>
                {nextLesson.status === 'in_progress' ? 'Идёт сейчас' : 'Запланировано'}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{nextLesson.start_time} - {nextLesson.end_time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{nextLesson.classroom}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => onStartLesson(nextLesson)}
                className="w-full"
                variant={nextLesson.status === 'in_progress' ? 'default' : 'outline'}
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                {nextLesson.status === 'in_progress' ? 'Продолжить' : 'Начать урок'}
              </Button>

              {nextLesson.online_link && (
                <Button
                  onClick={() => onOpenOnline(nextLesson)}
                  className="w-full"
                  variant="outline"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Онлайн
                </Button>
              )}

              <Button
                onClick={() => onMarkAttendance(nextLesson)}
                className="w-full"
                variant="outline"
              >
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Посещаемость
              </Button>

              <Button
                onClick={() => onAddHomework(nextLesson)}
                className="w-full"
                variant="outline"
              >
                <BookOpenCheck className="h-4 w-4 mr-2" />
                Задать ДЗ
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              Нет запланированных занятий на сегодня
            </p>
          </div>
        )}

        {/* Статистика дня */}
        {todayLessons && todayLessons.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Статистика дня</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-brand">{scheduledToday}</p>
                <p className="text-xs text-muted-foreground mt-1">Запланировано</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-success">{completedToday}</p>
                <p className="text-xs text-muted-foreground mt-1">Проведено</p>
              </div>
            </div>
          </div>
        )}

        {/* Дополнительные действия */}
        <div className="border-t pt-4 space-y-2">
          <p className="text-sm font-medium mb-3">Дополнительно</p>
          <Button
            onClick={onRequestSubstitution}
            variant="outline"
            className="w-full"
          >
            <UserX className="h-4 w-4 mr-2" />
            Запросить замену
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
