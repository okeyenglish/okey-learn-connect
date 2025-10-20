import { useState } from 'react';
import { useLearningGroups } from '@/hooks/useLearningGroups';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, MapPin, Users, UserPlus, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GroupDetailModal } from './GroupDetailModal';
import { LearningGroup } from '@/hooks/useLearningGroups';

export const RecruitmentSection = () => {
  const { groups, isLoading } = useLearningGroups({ 
    status: ['forming', 'reserve'] 
  });

  const [selectedGroup, setSelectedGroup] = useState<LearningGroup | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const formatSchedule = (days?: string[], time?: string) => {
    if (!days || !time) return 'Не указано';
    return `${days.join(', ')} ${time}`;
  };

  const calculateFillPercentage = (current: number, capacity: number) => {
    if (capacity === 0) return 0;
    return Math.round((current / capacity) * 100);
  };

  const getStatusColor = (status: string) => {
    return status === 'forming' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800';
  };

  const handleViewGroup = (group: LearningGroup) => {
    setSelectedGroup(group);
    setDetailModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка групп...</p>
        </div>
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
          Нет групп в наборе
        </h3>
        <p className="text-sm text-muted-foreground">
          Группы со статусом "Формируется" или "Резерв" будут отображаться здесь
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Набор в группы</h2>
            <p className="text-muted-foreground">
              Группы, открытые для записи новых студентов
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {groups.length} {groups.length === 1 ? 'группа' : 'групп'}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const fillPercentage = calculateFillPercentage(
              group.current_students,
              group.capacity
            );
            const spotsLeft = group.capacity - group.current_students;

            return (
              <Card 
                key={group.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleViewGroup(group)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {group.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Badge className={cn("text-xs", getStatusColor(group.status))}>
                          {group.status === 'forming' ? 'Набор' : 'Резерв'}
                        </Badge>
                        <span className="text-xs">
                          {group.subject} • {group.level}
                        </span>
                      </CardDescription>
                    </div>
                    {group.enrollment_url && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(group.enrollment_url, '_blank');
                        }}
                        className="flex-shrink-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Заполненность */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Заполненность</span>
                      <span className="font-medium">
                        {group.current_students} / {group.capacity}
                      </span>
                    </div>
                    <Progress value={fillPercentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {spotsLeft > 0 
                        ? `Осталось ${spotsLeft} ${spotsLeft === 1 ? 'место' : 'мест'}`
                        : 'Мест нет'
                      }
                    </p>
                  </div>

                  {/* Информация о группе */}
                  <div className="space-y-2 text-sm">
                    {group.branch && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{group.branch}</span>
                      </div>
                    )}
                    
                    {(group.schedule_days || group.schedule_time) && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {formatSchedule(group.schedule_days, group.schedule_time)}
                        </span>
                      </div>
                    )}

                    {group.responsible_teacher && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{group.responsible_teacher}</span>
                      </div>
                    )}

                    {group.period_start && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          Старт: {new Date(group.period_start).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Кнопка записи */}
                  <Button 
                    className="w-full gap-2"
                    variant={spotsLeft > 0 ? "default" : "secondary"}
                    disabled={spotsLeft === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewGroup(group);
                    }}
                  >
                    <UserPlus className="h-4 w-4" />
                    {spotsLeft > 0 ? 'Записать студента' : 'Мест нет'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Модальное окно деталей группы */}
      <GroupDetailModal
        group={selectedGroup}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />
    </>
  );
};
