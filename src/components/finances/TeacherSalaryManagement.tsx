import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTeacherAccruals, useTeacherSalaryStats, useMarkAccrualsPaid } from '@/hooks/useTeacherSalary';
import { TeacherRatesModal } from './TeacherRatesModal';
import { Loader2, DollarSign, Clock, CheckCircle, Settings, Calendar, TrendingUp } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';

export const TeacherSalaryManagement = () => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [showRatesModal, setShowRatesModal] = useState(false);
  const [selectedAccruals, setSelectedAccruals] = useState<string[]>([]);

  // Получаем список преподавателей
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers-list'],
    queryFn: async () => {
      // Сначала получаем user_id преподавателей
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');

      if (rolesError) throw rolesError;
      
      const teacherIds = userRoles?.map(r => r.user_id) || [];
      
      if (teacherIds.length === 0) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', teacherIds);

      if (error) throw error;
      return data || [];
    },
  });

  const periodStart = `${selectedPeriod}-01`;
  const periodEnd = format(endOfMonth(new Date(periodStart)), 'yyyy-MM-dd');

  const { data: accruals = [] } = useTeacherAccruals(selectedTeacherId, selectedPeriod);
  const { data: stats } = useTeacherSalaryStats(selectedTeacherId, periodStart, periodEnd);
  const markPaid = useMarkAccrualsPaid();

  const teacherName = teachers.find(t => t.id === selectedTeacherId)
    ? `${teachers.find(t => t.id === selectedTeacherId)?.first_name} ${teachers.find(t => t.id === selectedTeacherId)?.last_name}`.trim()
    : 'Преподаватель';

  const handleMarkPaid = async () => {
    if (selectedAccruals.length === 0) return;
    await markPaid.mutateAsync(selectedAccruals);
    setSelectedAccruals([]);
  };

  const handleToggleAccrual = (accrualId: string) => {
    setSelectedAccruals(prev =>
      prev.includes(accrualId)
        ? prev.filter(id => id !== accrualId)
        : [...prev, accrualId]
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Зарплаты преподавателей</CardTitle>
              <CardDescription>
                Управление ставками и начислениями за проведенные занятия
              </CardDescription>
            </div>
            {selectedTeacherId && (
              <Button
                onClick={() => setShowRatesModal(true)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Ставки
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Преподаватель</label>
              <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Период</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    const period = format(date, 'yyyy-MM');
                    return (
                      <SelectItem key={period} value={period}>
                        {format(date, 'LLLL yyyy', { locale: ru })}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedTeacherId && stats && (
            <div className="grid grid-cols-4 gap-4 mt-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Всего начислено
                    </p>
                    <p className="text-2xl font-bold">{stats.total_amount.toFixed(0)} ₽</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Академ. часов
                    </p>
                    <p className="text-2xl font-bold">{stats.total_hours.toFixed(1)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Занятий
                    </p>
                    <p className="text-2xl font-bold">{stats.total_lessons}</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.group_lessons} групп / {stats.individual_lessons} индив.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      К выплате
                    </p>
                    <p className="text-2xl font-bold text-green-600">{stats.unpaid_amount.toFixed(0)} ₽</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTeacherId && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Начисления за период</CardTitle>
              {selectedAccruals.length > 0 && (
                <Button onClick={handleMarkPaid} size="sm" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Отметить оплаченными ({selectedAccruals.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                    <input
                        type="checkbox"
                        checked={selectedAccruals.length === accruals.filter(a => a.status !== 'paid').length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAccruals(accruals.filter(a => a.status !== 'paid').map(a => a.id));
                          } else {
                            setSelectedAccruals([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Занятие</TableHead>
                    <TableHead>Часы</TableHead>
                    <TableHead>Ставка</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accruals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Нет начислений за выбранный период
                      </TableCell>
                    </TableRow>
                  ) : (
                    accruals.map((accrual) => (
                      <TableRow key={accrual.id} className={accrual.status === 'paid' ? 'opacity-50' : ''}>
                        <TableCell>
                          {accrual.status !== 'paid' && (
                            <input
                              type="checkbox"
                              checked={selectedAccruals.includes(accrual.id)}
                              onChange={() => handleToggleAccrual(accrual.id)}
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(accrual.earning_date), 'dd MMM', { locale: ru })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={accrual.lesson_session_id ? 'default' : 'secondary'}>
                            {accrual.lesson_session_id ? 'Группа' : 'Индивид.'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {accrual.notes || '—'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {accrual.academic_hours.toFixed(1)} ч
                        </TableCell>
                        <TableCell className="text-sm">
                          {accrual.rate_per_hour.toFixed(0)} ₽/ч
                        </TableCell>
                        <TableCell className="font-bold">
                          {accrual.amount.toFixed(0)} ₽
                        </TableCell>
                        <TableCell>
                          {accrual.status === 'paid' ? (
                            <Badge variant="outline" className="gap-1">
                              <CheckCircle className="h-3 w-3 text-green-600" />
                              Оплачено
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Не оплачено</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {selectedTeacherId && (
        <TeacherRatesModal
          open={showRatesModal}
          onOpenChange={setShowRatesModal}
          teacherId={selectedTeacherId}
          teacherName={teacherName}
        />
      )}
    </div>
  );
};