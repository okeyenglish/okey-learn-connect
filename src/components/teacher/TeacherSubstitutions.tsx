import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCcw, Calendar, Plus, Clock, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export const TeacherSubstitutions = () => {
  const mockSubstitutions = [
    {
      id: '1',
      date: new Date(2025, 0, 25),
      time: '17:00 - 18:20',
      group: 'Kids Box 1',
      originalTeacher: 'Иванова М.А.',
      status: 'pending',
      reason: 'Больничный',
    },
    {
      id: '2',
      date: new Date(2025, 0, 28),
      time: '18:30 - 19:50',
      group: 'Prepare 4',
      originalTeacher: 'Петров И.С.',
      status: 'approved',
      reason: 'Отпуск',
    },
  ];

  const mockAbsences = [
    {
      id: '1',
      startDate: new Date(2025, 1, 10),
      endDate: new Date(2025, 1, 14),
      reason: 'Отпуск',
      status: 'approved',
    },
  ];

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: 'Ожидает', variant: 'outline' as const, icon: AlertCircle },
      approved: { label: 'Одобрено', variant: 'secondary' as const, icon: CheckCircle },
      rejected: { label: 'Отклонено', variant: 'destructive' as const, icon: XCircle },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    const Icon = statusInfo.icon;

    return (
      <Badge variant={statusInfo.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {statusInfo.label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCcw className="h-5 w-5" />
          Замены и отпуска
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="substitutions" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="substitutions" className="flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" />
              Замены ({mockSubstitutions.length})
            </TabsTrigger>
            <TabsTrigger value="absences" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Отпуска ({mockAbsences.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="substitutions">
            <div className="mb-4">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Запросить замену
              </Button>
            </div>

            {mockSubstitutions.length === 0 ? (
              <div className="text-center py-12">
                <RefreshCcw className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium mb-2">Нет заявок на замены</p>
                <p className="text-sm text-muted-foreground">
                  Создайте заявку, если вам нужна замена
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {mockSubstitutions.map((sub) => (
                  <Card key={sub.id} className="card-elevated hover-scale">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{sub.group}</h3>
                            {getStatusBadge(sub.status)}
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{format(sub.date, 'd MMMM yyyy', { locale: ru })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>{sub.time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>Замена для: {sub.originalTeacher}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Причина: </span>
                          <span className="font-medium">{sub.reason}</span>
                        </div>
                        {sub.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              Редактировать
                            </Button>
                            <Button size="sm" variant="destructive">
                              Отменить
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="absences">
            <div className="mb-4">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Запросить отпуск
              </Button>
            </div>

            {mockAbsences.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium mb-2">Нет запланированных отпусков</p>
                <p className="text-sm text-muted-foreground">
                  Запланируйте отпуск заранее
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {mockAbsences.map((absence) => (
                  <Card key={absence.id} className="card-elevated hover-scale">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{absence.reason}</h3>
                            {getStatusBadge(absence.status)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {format(absence.startDate, 'd MMMM', { locale: ru })} 
                                {' — '}
                                {format(absence.endDate, 'd MMMM yyyy', { locale: ru })}
                              </span>
                            </div>
                          </div>
                        </div>
                        {absence.status === 'pending' && (
                          <Button size="sm" variant="outline">
                            Отменить
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
