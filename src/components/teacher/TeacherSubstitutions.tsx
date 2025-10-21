import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCcw, Calendar, Plus, Clock, User, CheckCircle, XCircle, AlertCircle, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Teacher } from '@/hooks/useTeachers';
import { SubstitutionRequestModal } from './modals/SubstitutionRequestModal';

interface TeacherSubstitutionsProps {
  teacher: Teacher;
}

export const TeacherSubstitutions = ({ teacher }: TeacherSubstitutionsProps) => {
  const [requestModal, setRequestModal] = useState<{ open: boolean; type: 'substitution' | 'absence' } | null>(null);
  // Получаем заявки на замены для преподавателя
  const { data: substitutions, isLoading: substitutionsLoading } = useQuery({
    queryKey: ['teacher-substitutions', teacher.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_substitutions')
        .select(`
          *,
          lesson_sessions (
            id,
            lesson_date,
            start_time,
            end_time,
            learning_groups (name)
          )
        `)
        .or(`original_teacher_id.eq.${teacher.id},substitute_teacher_id.eq.${teacher.id}`)
        .order('substitution_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: 'Ожидает', variant: 'outline' as const, icon: AlertCircle },
      approved: { label: 'Одобрено', variant: 'secondary' as const, icon: CheckCircle },
      rejected: { label: 'Отклонено', variant: 'destructive' as const, icon: XCircle },
      completed: { label: 'Выполнено', variant: 'secondary' as const, icon: CheckCircle },
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

  if (substitutionsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5" />
            Замены и отпуска
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-pulse">Загрузка...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
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
              Замены ({substitutions?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="absences" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Отпуска
            </TabsTrigger>
          </TabsList>

          <TabsContent value="substitutions">
            <div className="mb-4">
              <Button onClick={() => setRequestModal({ open: true, type: 'substitution' })}>
                <Plus className="h-4 w-4 mr-2" />
                Запросить замену
              </Button>
            </div>

            {!substitutions || substitutions.length === 0 ? (
              <div className="text-center py-12">
                <RefreshCcw className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium mb-2">Нет заявок на замены</p>
                <p className="text-sm text-muted-foreground">
                  Создайте заявку, если вам нужна замена
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {substitutions.map((sub: any) => {
                  const isOriginalTeacher = sub.original_teacher_id === teacher.id;
                  const groupName = sub.lesson_sessions?.learning_groups?.name || 'Индивидуальное занятие';
                  
                  return (
                    <Card key={sub.id} className="card-elevated hover-scale">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{groupName}</h3>
                              {getStatusBadge(sub.status)}
                              {!isOriginalTeacher && (
                                <Badge variant="outline">Замена за коллегу</Badge>
                              )}
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{format(new Date(sub.substitution_date), 'd MMMM yyyy', { locale: ru })}</span>
                              </div>
                              {sub.lesson_sessions && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  <span>
                                    {sub.lesson_sessions.start_time.slice(0, 5)} - {sub.lesson_sessions.end_time.slice(0, 5)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {sub.reason && (
                          <div className="flex items-center justify-between pt-3 border-t">
                            <div className="text-sm">
                              <span className="text-muted-foreground">Причина: </span>
                              <span className="font-medium">{sub.reason}</span>
                            </div>
                            {sub.status === 'pending' && isOriginalTeacher && (
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
                        )}

                        {sub.notes && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm text-muted-foreground">{sub.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="absences">
            <div className="mb-4">
              <Button onClick={() => setRequestModal({ open: true, type: 'absence' })}>
                <Plus className="h-4 w-4 mr-2" />
                Запросить отпуск
              </Button>
            </div>

            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium mb-2">Нет запланированных отпусков</p>
              <p className="text-sm text-muted-foreground">
                Запланируйте отпуск заранее
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>

    {requestModal && (
      <SubstitutionRequestModal
        open={requestModal.open}
        onOpenChange={(open) => !open && setRequestModal(null)}
        teacherId={teacher.id}
        type={requestModal.type}
      />
    )}
    </>
  );
};
