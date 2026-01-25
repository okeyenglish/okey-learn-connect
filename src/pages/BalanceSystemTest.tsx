import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function BalanceSystemTest() {
  const { data: stats, refetch, isLoading } = useQuery({
    queryKey: ['balance-system-stats'],
    queryFn: async () => {
      // Проверяем балансы студентов
      const { data: balances } = await supabase
        .from('student_balances')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(10);

      // Проверяем транзакции балансов
      const { data: transactions } = await supabase
        .from('balance_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      // Проверяем семейные счета
      const { data: familyLedgers } = await supabase
        .from('family_ledger')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(10);

      // Проверяем транзакции семейных счетов
      const { data: familyTransactions } = await supabase
        .from('family_ledger_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      return {
        balances: balances || [],
        transactions: transactions || [],
        familyLedgers: familyLedgers || [],
        familyTransactions: familyTransactions || [],
      };
    },
  });

  const testResults = {
    balancesWork: (stats?.balances?.length || 0) > 0,
    transactionsWork: (stats?.transactions?.length || 0) > 0,
    familyLedgersWork: (stats?.familyLedgers?.length || 0) > 0,
    familyTransactionsWork: (stats?.familyTransactions?.length || 0) > 0,
  };

  const allTestsPass = Object.values(testResults).every((v) => v);
  const someTestsPass = Object.values(testResults).some((v) => v);

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
            <span>Тестирование системы балансов учеников</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <TestCard
              title="Балансы студентов"
              count={stats?.balances?.length || 0}
              passed={testResults.balancesWork}
            />
            <TestCard
              title="Транзакции"
              count={stats?.transactions?.length || 0}
              passed={testResults.transactionsWork}
            />
            <TestCard
              title="Семейные счета"
              count={stats?.familyLedgers?.length || 0}
              passed={testResults.familyLedgersWork}
            />
            <TestCard
              title="Транзакции семейных счетов"
              count={stats?.familyTransactions?.length || 0}
              passed={testResults.familyTransactionsWork}
            />
          </div>

          <Button onClick={() => refetch()} variant="outline">
            Обновить данные
          </Button>

          {/* Балансы студентов */}
          {stats?.balances && stats.balances.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Балансы студентов:</h3>
              <div className="space-y-2">
                {stats.balances.map((b: any) => (
                  <Card key={b.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">ID: {b.student_id.slice(0, 8)}...</p>
                          <p className="text-sm text-muted-foreground">
                            Обновлен: {format(new Date(b.updated_at), 'dd MMM yyyy, HH:mm', { locale: ru })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${b.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {b.balance.toFixed(2)} ₽
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Транзакции балансов */}
          {stats?.transactions && stats.transactions.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Последние транзакции балансов:</h3>
              <div className="space-y-2">
                {stats.transactions.map((t: any) => (
                  <Card key={t.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1 flex-1">
                          <Badge variant="outline">{t.transaction_type}</Badge>
                          <p className="text-sm text-muted-foreground">{t.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(t.created_at), 'dd MMM yyyy, HH:mm', { locale: ru })}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className={`text-lg font-bold ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {t.amount >= 0 ? '+' : ''}
                            {t.amount.toFixed(2)} ₽
                          </p>
                          {t.academic_hours && (
                            <p className="text-sm text-muted-foreground">{t.academic_hours} а.ч.</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Семейные счета */}
          {stats?.familyLedgers && stats.familyLedgers.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Семейные счета:</h3>
              <div className="space-y-2">
                {stats.familyLedgers.map((fl: any) => (
                  <Card key={fl.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">
                            {fl.family_group_id ? 'Семейная группа' : 'Клиент'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ID: {(fl.family_group_id || fl.client_id).slice(0, 8)}...
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Обновлен: {format(new Date(fl.updated_at), 'dd MMM yyyy, HH:mm', { locale: ru })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${fl.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {fl.balance.toFixed(2)} {fl.currency}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Транзакции семейных счетов */}
          {stats?.familyTransactions && stats.familyTransactions.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Транзакции семейных счетов:</h3>
              <div className="space-y-2">
                {stats.familyTransactions.map((ft: any) => (
                  <Card key={ft.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <Badge variant="outline">{ft.transaction_type}</Badge>
                          <p className="text-sm text-muted-foreground">{ft.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(ft.created_at), 'dd MMM yyyy, HH:mm', { locale: ru })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${ft.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {ft.amount >= 0 ? '+' : ''}
                            {ft.amount.toFixed(2)} ₽
                          </p>
                        </div>
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
          {passed ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4 text-orange-600" />}
        </div>
        <p className="text-3xl font-bold">{count}</p>
        <Badge variant={passed ? 'default' : 'secondary'} className="w-full justify-center">
          {passed ? 'OK' : 'Нет данных'}
        </Badge>
      </div>
    </CardContent>
  </Card>
);
