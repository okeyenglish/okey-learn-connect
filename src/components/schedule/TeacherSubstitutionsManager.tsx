import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  useTeacherSubstitutions,
  useFindAvailableTeachers,
  useCreateSubstitution,
  useUpdateSubstitutionStatus,
  useDeleteSubstitution,
} from '@/hooks/useTeacherSubstitutions';
import { Calendar, User, UserCheck, AlertCircle, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';

const statusMap = {
  pending: { label: 'Ожидает', variant: 'secondary' as const, icon: AlertCircle },
  approved: { label: 'Одобрено', variant: 'default' as const, icon: CheckCircle },
  completed: { label: 'Завершено', variant: 'outline' as const, icon: CheckCircle },
  cancelled: { label: 'Отменено', variant: 'destructive' as const, icon: XCircle },
};

export const TeacherSubstitutionsManager = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [originalTeacherId, setOriginalTeacherId] = useState<string>('');
  const [substituteTeacherId, setSubstituteTeacherId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Получаем список преподавателей
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers-list-substitutions'],
    queryFn: async () => {
      const { data: teacherRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');

      const teacherIds = teacherRoles?.map((r: any) => r.user_id) || [];

      if (teacherIds.length === 0) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, branch')
        .in('id', teacherIds)
        .order('first_name');

      if (error) throw error;
      return data || [];
    },
  });

  const { data: substitutions = [] } = useTeacherSubstitutions({
    status: filterStatus !== 'all' ? filterStatus : undefined,
  });

  const { data: availableTeachers = [] } = useFindAvailableTeachers(
    selectedDate,
    selectedTime,
    selectedSubject,
    selectedBranch
  );

  const createSubstitution = useCreateSubstitution();
  const updateStatus = useUpdateSubstitutionStatus();
  const deleteSubstitution = useDeleteSubstitution();

  const handleCreateSubstitution = async () => {
    if (!originalTeacherId || !substituteTeacherId || !selectedDate) {
      return;
    }

    await createSubstitution.mutateAsync({
      original_teacher_id: originalTeacherId,
      substitute_teacher_id: substituteTeacherId,
      substitution_date: selectedDate,
      reason,
      status: 'pending',
    });

    setShowCreateDialog(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedDate('');
    setSelectedTime('');
    setSelectedSubject('');
    setSelectedBranch('');
    setOriginalTeacherId('');
    setSubstituteTeacherId('');
    setReason('');
  };

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    return teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Преподаватель';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Замены преподавателей</CardTitle>
              <CardDescription>Управление заменами и поиск доступных преподавателей</CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать замену
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Новая замена преподавателя</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Дата занятия</Label>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Время занятия</Label>
                      <Input
                        type="time"
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Предмет</Label>
                      <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите предмет" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Английский">Английский</SelectItem>
                          <SelectItem value="Китайский">Китайский</SelectItem>
                          <SelectItem value="Корейский">Корейский</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Филиал</Label>
                      <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите филиал" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Окская">Окская</SelectItem>
                          <SelectItem value="Центр">Центр</SelectItem>
                          <SelectItem value="Онлайн">Онлайн</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Оригинальный преподаватель</Label>
                    <Select value={originalTeacherId} onValueChange={setOriginalTeacherId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите преподавателя" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {`${teacher.first_name} ${teacher.last_name}`.trim()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedDate && selectedTime && selectedSubject && selectedBranch && (
                    <div className="space-y-2">
                      <Label>Преподаватель на замену</Label>
                      <Select value={substituteTeacherId} onValueChange={setSubstituteTeacherId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите преподавателя" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTeachers.map((teacher) => (
                            <SelectItem key={teacher.teacher_id} value={teacher.teacher_id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{`${teacher.first_name} ${teacher.last_name}`.trim()}</span>
                                {teacher.has_conflict ? (
                                  <Badge variant="destructive" className="ml-2">
                                    Занят
                                  </Badge>
                                ) : (
                                  <Badge variant="default" className="ml-2">
                                    Свободен
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {availableTeachers.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Нет доступных преподавателей для выбранных параметров
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Причина замены</Label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Укажите причину замены..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Отмена
                    </Button>
                    <Button onClick={handleCreateSubstitution} disabled={createSubstitution.isPending}>
                      Создать замену
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label>Фильтр по статусу:</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все замены</SelectItem>
                  <SelectItem value="pending">Ожидают</SelectItem>
                  <SelectItem value="approved">Одобрено</SelectItem>
                  <SelectItem value="completed">Завершено</SelectItem>
                  <SelectItem value="cancelled">Отменено</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <ScrollArea className="h-[600px]">
            {substitutions.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">Нет замен</div>
            ) : (
              <div className="space-y-3">
                {substitutions.map((substitution) => {
                  const StatusIcon = statusMap[substitution.status]?.icon || AlertCircle;
                  return (
                    <Card key={substitution.id}>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {format(new Date(substitution.substitution_date), 'dd MMMM yyyy, EEEE', {
                                    locale: ru,
                                  })}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-sm">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-muted-foreground">Оригинал:</span>
                                  </div>
                                  <p className="font-medium">
                                    {getTeacherName(substitution.original_teacher_id)}
                                  </p>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-sm">
                                    <UserCheck className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-muted-foreground">Замена:</span>
                                  </div>
                                  <p className="font-medium text-green-600">
                                    {getTeacherName(substitution.substitute_teacher_id)}
                                  </p>
                                </div>
                              </div>

                              {substitution.reason && (
                                <div className="text-sm text-muted-foreground pt-2 border-t">
                                  <span className="font-medium">Причина: </span>
                                  {substitution.reason}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge
                                variant={statusMap[substitution.status]?.variant || 'secondary'}
                                className="gap-1"
                              >
                                <StatusIcon className="h-3 w-3" />
                                {statusMap[substitution.status]?.label || substitution.status}
                              </Badge>
                              {substitution.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() =>
                                      updateStatus.mutate({ id: substitution.id, status: 'approved' })
                                    }
                                  >
                                    Одобрить
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => deleteSubstitution.mutate(substitution.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
