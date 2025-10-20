import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBalanceTransactions } from '@/hooks/useStudentBalances';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowDownCircle, ArrowUpCircle, Clock, DollarSign } from 'lucide-react';

interface BalanceTransactionsHistoryProps {
  studentId: string;
}

export const BalanceTransactionsHistory = ({ studentId }: BalanceTransactionsHistoryProps) => {
  const { data: transactions, isLoading } = useBalanceTransactions(studentId);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'payment':
      case 'refund':
      case 'bonus':
        return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
      case 'lesson_charge':
        return <ArrowDownCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    const labels: Record<string, string> = {
      payment: 'Платёж',
      lesson_charge: 'Списание за занятие',
      refund: 'Возврат',
      bonus: 'Бонус',
      adjustment: 'Корректировка',
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>История транзакций</CardTitle>
        <CardDescription>
          Все операции по балансу студента
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!transactions || transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Нет транзакций</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <Card key={transaction.id} className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        {getTransactionIcon(transaction.transaction_type)}
                        
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {getTransactionLabel(transaction.transaction_type)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(transaction.created_at).toLocaleString('ru-RU')}
                            </span>
                          </div>
                          
                          <p className="text-sm">{transaction.description}</p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {transaction.academic_hours !== 0 && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {transaction.academic_hours > 0 ? '+' : ''}
                                  {transaction.academic_hours} ак. часов
                                </span>
                              </div>
                            )}
                            
                            {transaction.price_per_hour && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                <span>{transaction.price_per_hour} ₽/час</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-lg font-semibold ${
                          transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}
                          {transaction.amount.toFixed(2)} ₽
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
