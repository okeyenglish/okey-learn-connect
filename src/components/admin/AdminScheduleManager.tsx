import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, User, Users } from "lucide-react";
import { useLessonSessions } from "@/hooks/useLessonSessions";
import { useLearningGroups } from "@/hooks/useLearningGroups";
import { useAuth } from "@/hooks/useAuth";
import { format, isToday, isTomorrow, parseISO, addDays } from "date-fns";
import { ru } from "date-fns/locale";
import { getBranchesForSelect } from "@/lib/branches";

export function AdminScheduleManager() {
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const { profile } = useAuth();
  const today = new Date();
  const tomorrow = addDays(today, 1);
  
  // Get date range for today and tomorrow
  const dateRange = {
    startDate: format(today, 'yyyy-MM-dd'),
    endDate: format(tomorrow, 'yyyy-MM-dd')
  };

  const { data: sessions, isLoading: sessionsLoading } = useLessonSessions({
    branch: selectedBranch || undefined,
    date_from: dateRange.startDate,
    date_to: dateRange.endDate
  });

  const { groups } = useLearningGroups();
  const branches = getBranchesForSelect();

  // Group sessions by date
  const sessionsByDate = useMemo(() => {
    if (!sessions) return { today: [], tomorrow: [] };
    
    const todayStr = format(today, 'yyyy-MM-dd');
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
    
    return {
      today: sessions.filter(session => session.lesson_date === todayStr),
      tomorrow: sessions.filter(session => session.lesson_date === tomorrowStr)
    };
  }, [sessions, today, tomorrow]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      case 'rescheduled': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Запланировано';
      case 'completed': return 'Проведено';
      case 'cancelled': return 'Отменено';
      case 'rescheduled': return 'Перенесено';
      default: return status;
    }
  };

  const renderSessionCard = (session: any) => {
    const group = groups?.find(g => g.id === session.group_id);
    
    return (
      <Card key={session.id} className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-medium text-lg">
                {group?.name || `Урок #${session.lesson_number}`}
              </h3>
              {group && (
                <p className="text-sm text-muted-foreground">
                  {group.level} • {group.subject}
                </p>
              )}
            </div>
            <Badge variant={getStatusBadgeVariant(session.status)}>
              {getStatusText(session.status)}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{session.start_time} - {session.end_time}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span>{session.teacher_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{session.classroom}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>{session.branch}</span>
            </div>
          </div>
          
          {session.notes && (
            <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
              {session.notes}
            </p>
          )}
        </div>
      </Card>
    );
  };

  if (sessionsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Расписание занятий</h1>
          <p className="text-muted-foreground">Просмотр расписания на сегодня и завтра</p>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Загрузка расписания...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Расписание занятий</h1>
        <p className="text-muted-foreground">Просмотр расписания на сегодня и завтра</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Все филиалы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Все филиалы</SelectItem>
                {branches.map(branch => (
                  <SelectItem key={branch.value} value={branch.label}>
                    {branch.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              Сегодня
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {format(today, 'd MMMM', { locale: ru })}
              </span>
            </CardTitle>
            <CardDescription>
              {sessionsByDate.today.length} занятий запланировано
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessionsByDate.today.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Занятий нет
              </p>
            ) : (
              sessionsByDate.today.map(renderSessionCard)
            )}
          </CardContent>
        </Card>

        {/* Tomorrow's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>
              Завтра
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {format(tomorrow, 'd MMMM', { locale: ru })}
              </span>
            </CardTitle>
            <CardDescription>
              {sessionsByDate.tomorrow.length} занятий запланировано
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessionsByDate.tomorrow.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Занятий нет
              </p>
            ) : (
              sessionsByDate.tomorrow.map(renderSessionCard)
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}