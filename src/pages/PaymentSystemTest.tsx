import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function PaymentSystemTest() {
  const { data: stats, refetch, isLoading } = useQuery({
    queryKey: ['payment-system-stats'],
    queryFn: async () => {
      // Проверяем платежи
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      // Проверяем начисления преподавателям
      const { data: earnings } = await supabase
        .from('teacher_earnings')
        .select(`
          *,
          teacher:profiles!teacher_id(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      // Проверяем транзакции баланса
      const { data: transactions } = await supabase
        .from('balance_transactions')
        .select(`
          *,
          student:students!student_id(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      // Проверяем завершенные занятия
      const { data: completedSessions } = await supabase
        .from('individual_lesson_sessions')
        .select('*')
        .eq('status', 'completed')
        .order('lesson_date', { ascending: false })
        .limit(10);

      // Проверяем ставки преподавателей
      const { data: rates } = await supabase
        .from('teacher_rates')
        .select(`
          *,
          teacher:profiles!teacher_id(first_name, last_name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      return {
        payments: payments || [],
        earnings: earnings || [],
        transactions: transactions || [],
        completedSessions: completedSessions || [],
        rates: rates || [],
      };
    },
  });

  const testResults = {
    paymentsWork: (stats?.payments?.length || 0) > 0,
    earningsWork: (stats?.earnings?.length || 0) > 0,
    transactionsWork: (stats?.transactions?.length || 0) > 0,
    sessionsWork: (stats?.completedSessions?.length || 0) > 0,
    ratesWork: (stats?.rates?.length || 0) > 0,
  };

  const allTestsPass = Object.values(testResults).every(v => v);
  const someTestsPass = Object.values(testResults).some(v => v);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="loading-spinner rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {allTestsPass ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : someTestsPass ? (
              <AlertCircle className="h-6 w-6 text-orange-600" />
            ) : (
              <XCircle className="h-6 w-6 text-red-600" />
            )}
            <span>Тестирование системы оплат</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <TestCard
              title="Платежи"
              count={stats?.payments?.length || 0}
              passed={testResults.paymentsWork}
            />
            <TestCard
              title="Начисления"
              count={stats?.earnings?.length || 0}
              passed={testResults.earningsWork}
            />
            <TestCard
              title="Транзакции"
              count={stats?.transactions?.length || 0}
              passed={testResults.transactionsWork}
            />
            <TestCard
              title="Завершенные занятия"
              count={stats?.completedSessions?.length || 0}
              passed={testResults.sessionsWork}
            />
            <TestCard
              title="Ставки"
              count={stats?.rates?.length || 0}
              passed={testResults.ratesWork}
            />
          </div>

          <Button onClick={() => refetch()} variant="outline">
            Обновить данные
          </Button>

          {!allTestsPass && (
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="pt-6">
                <p className="text-sm text-orange-800">
                  <strong>Предупреждение:</strong> Некоторые компоненты системы не содержат данных. 
                  Это может быть нормальным, если система еще не используется, или указывает на проблемы с созданием данных.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Детали платежей */}
          {stats?.payments && stats.payments.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Последние платежи:</h3>
              <div className="space-y-2">
                {stats.payments.map((p: any) => (
                  <Card key={p.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="font-medium">{p.amount} ₽</p>
                          <p className="text-sm text-muted-foreground">
                            {p.lessons_count} а.ч. • {p.method} • {p.status}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(p.payment_date), 'dd MMM yyyy', { locale: ru })}
                          </p>
                        </div>
                        <Badge>{p.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Детали начислений */}
          {stats?.earnings && stats.earnings.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Последние начисления преподавателям:</h3>
              <div className="space-y-2">
                {stats.earnings.map((e: any) => (
                  <Card key={e.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="font-medium">
                            {e.teacher?.first_name} {e.teacher?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {e.amount} ₽ • {e.academic_hours} а.ч. • {e.rate_per_hour} ₽/ч
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(e.earning_date), 'dd MMM yyyy', { locale: ru })}
                          </p>
                        </div>
                        <Badge variant={e.status === 'paid' ? 'default' : 'secondary'}>
                          {e.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Детали транзакций */}
          {stats?.transactions && stats.transactions.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Последние транзакции баланса:</h3>
              <div className="space-y-2">
                {stats.transactions.map((t: any) => (
                  <Card key={t.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="font-medium">
                            {t.student?.first_name} {t.student?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(t.created_at), 'dd MMM yyyy, HH:mm', { locale: ru })}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className={`font-bold ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {t.amount >= 0 ? '+' : ''}{t.amount} ₽
                          </p>
                          <Badge variant="outline">{t.transaction_type}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Детали ставок */}
          {stats?.rates && stats.rates.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Активные ставки преподавателей:</h3>
              <div className="space-y-2">
                {stats.rates.map((r: any) => (
                  <Card key={r.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="font-medium">
                            {r.teacher?.first_name} {r.teacher?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {r.rate_per_academic_hour} ₽/а.ч. • {r.rate_type}
                          </p>
                          {r.branch && (
                            <p className="text-xs text-muted-foreground">
                              Филиал: {r.branch}
                            </p>
                          )}
                          {r.subject && (
                            <p className="text-xs text-muted-foreground">
                              Предмет: {r.subject}
                            </p>
                          )}
                        </div>
                        <Badge variant="default">Активна</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const TestCard = ({ title, count, passed }: { title: string; count: number; passed: boolean }) => (
  <Card className="border-2">
    <CardContent className="pt-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          {passed ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <Clock className="h-4 w-4 text-orange-600" />
          )}
        </div>
        <p className="text-3xl font-bold">{count}</p>
        <Badge variant={passed ? 'default' : 'secondary'} className="w-full justify-center">
          {passed ? 'OK' : 'Нет данных'}
        </Badge>
      </div>
    </CardContent>
  </Card>
);
