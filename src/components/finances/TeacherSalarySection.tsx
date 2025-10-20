import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTeacherRates, useTeacherPayments, useSetTeacherRate, useCreateTeacherPayment } from '@/hooks/useTeacherSalary';
import { Loader2, DollarSign, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export const TeacherSalarySection = () => {
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [rateAmount, setRateAmount] = useState('');
  const [rateType, setRateType] = useState<'global' | 'branch' | 'subject' | 'personal'>('global');
  const [rateBranch, setRateBranch] = useState('');
  const [rateSubject, setRateSubject] = useState('');

  const { data: rates, isLoading: ratesLoading } = useTeacherRates();
  const { data: payments, isLoading: paymentsLoading } = useTeacherPayments();
  const setRate = useSetTeacherRate();
  const createPayment = useCreateTeacherPayment();

  const handleSetRate = async () => {
    if (!selectedTeacher || !rateAmount) return;

    await setRate.mutateAsync({
      teacherId: selectedTeacher,
      rateType: rateType,
      branch: rateType === 'branch' ? rateBranch : undefined,
      subject: rateType === 'subject' ? rateSubject : undefined,
      ratePerAcademicHour: parseFloat(rateAmount),
    });

    setRateAmount('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Зарплаты преподавателей</CardTitle>
          <CardDescription>
            Управление ставками и выплатами преподавателям
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="rates" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rates">Ставки</TabsTrigger>
          <TabsTrigger value="payments">Выплаты</TabsTrigger>
          <TabsTrigger value="earnings">Начисления</TabsTrigger>
        </TabsList>

        <TabsContent value="rates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Установить ставку</CardTitle>
              <CardDescription>
                Установите академическую ставку для преподавателя
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Преподаватель (ID)</Label>
                  <Input
                    placeholder="UUID преподавателя"
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ставка (руб./ак. час)</Label>
                  <Input
                    type="number"
                    placeholder="500"
                    value={rateAmount}
                    onChange={(e) => setRateAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Тип ставки</Label>
                  <Select value={rateType} onValueChange={(v: any) => setRateType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Глобальная</SelectItem>
                      <SelectItem value="branch">По филиалу</SelectItem>
                      <SelectItem value="subject">По предмету</SelectItem>
                      <SelectItem value="personal">Персональная</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {rateType === 'branch' && (
                  <div className="space-y-2">
                    <Label>Филиал</Label>
                    <Select value={rateBranch} onValueChange={setRateBranch}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите филиал" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Центральный">Центральный</SelectItem>
                        <SelectItem value="Северный">Северный</SelectItem>
                        <SelectItem value="Южный">Южный</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {rateType === 'subject' && (
                  <div className="space-y-2">
                    <Label>Предмет</Label>
                    <Input
                      placeholder="Английский язык"
                      value={rateSubject}
                      onChange={(e) => setRateSubject(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <Button onClick={handleSetRate} disabled={!selectedTeacher || !rateAmount || setRate.isPending}>
                {setRate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <DollarSign className="mr-2 h-4 w-4" />
                Установить ставку
              </Button>
            </CardContent>
          </Card>

          {ratesLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Текущие ставки</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {rates?.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Нет установленных ставок</p>
                  ) : (
                    rates?.map((rate) => (
                      <div key={rate.id} className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <p className="font-medium">{rate.rate_type}</p>
                          <p className="text-sm text-muted-foreground">
                            {rate.branch && `Филиал: ${rate.branch}`}
                            {rate.subject && `Предмет: ${rate.subject}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{rate.rate_per_academic_hour} ₽/ч</p>
                          <p className="text-xs text-muted-foreground">
                            с {format(new Date(rate.valid_from), 'dd.MM.yyyy', { locale: ru })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          {paymentsLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">История выплат</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {payments?.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Нет выплат</p>
                  ) : (
                    payments?.map((payment) => (
                      <div key={payment.id} className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <p className="font-medium">
                            {payment.payment_type === 'salary' && 'Зарплата'}
                            {payment.payment_type === 'advance' && 'Аванс'}
                            {payment.payment_type === 'bonus' && 'Бонус'}
                            {payment.payment_type === 'penalty' && 'Штраф'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {payment.period_start && payment.period_end &&
                              `${format(new Date(payment.period_start), 'dd.MM', { locale: ru })} - ${format(new Date(payment.period_end), 'dd.MM.yyyy', { locale: ru })}`
                            }
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{payment.final_amount} {payment.currency}</p>
                          <p className="text-xs text-muted-foreground">{payment.total_hours}ч</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="earnings">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Автоматические начисления</CardTitle>
              <CardDescription>
                Начисления формируются автоматически при проведении занятий
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Начисления преподавателям происходят автоматически когда занятие помечается как "Проведено".
                Система учитывает ставку преподавателя и продолжительность занятия.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
