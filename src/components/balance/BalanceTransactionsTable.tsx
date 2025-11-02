import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBalanceTransactions } from '@/hooks/useOrganizationBalance';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ArrowDownCircle, ArrowUpCircle, RefreshCw } from 'lucide-react';

interface BalanceTransactionsTableProps {
  organizationId: string;
}

const transactionTypeLabels: Record<string, string> = {
  topup: 'Пополнение',
  ai_usage: 'Использование AI',
  refund: 'Возврат',
  adjustment: 'Корректировка',
};

const transactionTypeIcons: Record<string, any> = {
  topup: ArrowUpCircle,
  ai_usage: ArrowDownCircle,
  refund: ArrowUpCircle,
  adjustment: RefreshCw,
};

export function BalanceTransactionsTable({ organizationId }: BalanceTransactionsTableProps) {
  const { data: transactions, isLoading } = useBalanceTransactions(organizationId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>История транзакций</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">Загрузка...</div>
        </CardContent>
      </Card>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>История транзакций</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Нет транзакций
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>История транзакций</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {transactions.map((transaction) => {
            const Icon = transactionTypeIcons[transaction.transaction_type];
            const isPositive = transaction.amount > 0;

            return (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-5 w-5 ${
                      isPositive ? 'text-green-500' : 'text-red-500'
                    }`}
                  />
                  <div>
                    <div className="font-medium">
                      {transactionTypeLabels[transaction.transaction_type] || transaction.transaction_type}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {transaction.description}
                    </div>
                    {transaction.ai_requests_count && (
                      <div className="text-xs text-muted-foreground">
                        Запросов: {transaction.ai_requests_count}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-semibold ${
                      isPositive ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {isPositive ? '+' : ''}
                    {transaction.amount.toFixed(2)} ₽
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(transaction.created_at), 'dd MMM yyyy HH:mm', {
                      locale: ru,
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
