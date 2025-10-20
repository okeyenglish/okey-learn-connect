import { useGroupFinances, useTeacherPayments } from '@/hooks/useGroupFinances';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  AlertCircle,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface GroupFinancesTabProps {
  groupId: string;
}

export const GroupFinancesTab = ({ groupId }: GroupFinancesTabProps) => {
  const { data: finances, isLoading: financesLoading } = useGroupFinances(groupId);
  const { data: payments, isLoading: paymentsLoading } = useTeacherPayments(groupId);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (financesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка финансов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Финансовая статистика */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Всего студентов
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{finances?.total_students || 0}</div>
            <p className="text-xs text-muted-foreground">
              Активных студентов в группе
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Всего оплачено
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatMoney(finances?.total_paid || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Положительные балансы
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Всего долг
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatMoney(finances?.total_debt || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {finances?.students_with_debt || 0} студентов с долгом
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Средний баланс
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMoney(finances?.average_balance || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              На одного студента
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Выплаты преподавателям */}
      <Card>
        <CardHeader>
          <CardTitle>Выплаты преподавателям</CardTitle>
          <CardDescription>
            История начисления зарплаты за групповые занятия
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !payments || payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">
                Нет записей о выплатах преподавателям
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {payments.map((payment: any) => (
                  <Card key={payment.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {payment.teacher?.first_name} {payment.teacher?.last_name}
                          </p>
                          <Badge variant={payment.paid ? "default" : "secondary"}>
                            {payment.paid ? 'Оплачено' : 'Не оплачено'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(payment.period_start), 'dd MMM', { locale: ru })} - 
                            {format(new Date(payment.period_end), 'dd MMM yyyy', { locale: ru })}
                          </div>
                          <Separator orientation="vertical" className="h-4" />
                          <span>{payment.lessons_count} занятий</span>
                          <Separator orientation="vertical" className="h-4" />
                          <span>{formatMoney(payment.rate_per_lesson)} за занятие</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {formatMoney(payment.total_amount)}
                        </div>
                        {payment.paid && payment.paid_at && (
                          <p className="text-xs text-muted-foreground">
                            Оплачено: {format(new Date(payment.paid_at), 'dd MMM yyyy', { locale: ru })}
                          </p>
                        )}
                      </div>
                    </div>
                    {payment.notes && (
                      <div className="mt-3 text-sm text-muted-foreground">
                        {payment.notes}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
