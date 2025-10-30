import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Clock, Calendar } from 'lucide-react';
import { useTeacherRates } from '@/hooks/useTeacherSalary';
import { Teacher } from '@/hooks/useTeachers';

interface TeacherSalaryCardProps {
  teacher: Teacher;
}

export const TeacherSalaryCard = ({ teacher }: TeacherSalaryCardProps) => {
  const { data: rates, isLoading } = useTeacherRates(teacher.id);

  if (isLoading) {
    return (
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-brand" />
            Ставки и зарплата
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-text-secondary">
            Загрузка...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rates || rates.length === 0) {
    return (
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-brand" />
            Ставки и зарплата
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-text-muted opacity-50" />
            <p className="text-text-secondary">
              Ставки не настроены. Обратитесь к администратору.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-brand" />
          Ставки и зарплата
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {rates.map((rate) => (
            <div
              key={rate.id}
              className="p-4 border rounded-xl bg-surface space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={rate.rate_type === 'group' ? 'default' : 'secondary'}>
                    {rate.rate_type === 'group' ? 'Групповые' : 'Индивидуальные'}
                  </Badge>
                  {rate.is_active && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Активна
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-text-primary">
                    {rate.rate_per_academic_hour.toLocaleString('ru-RU')} ₽
                  </div>
                  <div className="text-xs text-text-secondary">за академический час</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {rate.branch && (
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-text-muted mt-0.5" />
                    <div>
                      <p className="text-text-secondary">Филиал</p>
                      <p className="font-medium text-text-primary">{rate.branch}</p>
                    </div>
                  </div>
                )}
                {rate.subject && (
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-text-muted mt-0.5" />
                    <div>
                      <p className="text-text-secondary">Предмет</p>
                      <p className="font-medium text-text-primary">{rate.subject}</p>
                    </div>
                  </div>
                )}
              </div>

              {rate.notes && (
                <div className="text-sm text-text-secondary pt-2 border-t">
                  <p>{rate.notes}</p>
                </div>
              )}
            </div>
          ))}

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Расчет зарплаты
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Зарплата рассчитывается автоматически по проведённым занятиям. 
                  Итоговая сумма зависит от количества академических часов и установленных ставок.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
