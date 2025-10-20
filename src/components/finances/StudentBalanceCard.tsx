import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, TrendingDown, TrendingUp, AlertCircle, History } from 'lucide-react';
import { useBalanceTransactions } from '@/hooks/useStudentBalances';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface StudentBalanceCardProps {
  studentId: string;
  studentName: string;
  onAddBalance?: () => void;
}

export const StudentBalanceCard = ({ 
  studentId, 
  studentName,
  onAddBalance 
}: StudentBalanceCardProps) => {
  const { data: transactions } = useBalanceTransactions(studentId);
  const [showHistory, setShowHistory] = useState(false);

  // Рассчитываем текущий баланс
  const balance = transactions?.reduce((sum, t) => {
    return sum + (t.academic_hours || 0);
  }, 0) || 0;

  const balanceRub = transactions?.reduce((sum, t) => {
    return sum + (t.amount || 0);
  }, 0) || 0;

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      payment: 'Пополнение',
      lesson_charge: 'Списание за занятие',
      refund: 'Возврат',
      bonus: 'Бонус',
      adjustment: 'Корректировка',
    };
    return labels[type] || type;
  };

  const getTransactionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      payment: 'text-green-600',
      lesson_charge: 'text-red-600',
      refund: 'text-blue-600',
      bonus: 'text-purple-600',
      adjustment: 'text-orange-600',
    };
    return colors[type] || 'text-gray-600';
  };

  const getBalanceStatus = () => {
    if (balance <= 0) return { variant: 'destructive' as const, label: 'Нет баланса', icon: AlertCircle };
    if (balance <= 4) return { variant: 'destructive' as const, label: 'Критично низкий', icon: AlertCircle };
    if (balance <= 8) return { variant: 'default' as const, label: 'Низкий', icon: TrendingDown };
    return { variant: 'secondary' as const, label: 'Нормальный', icon: TrendingUp };
  };

  const status = getBalanceStatus();
  const StatusIcon = status.icon;

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Баланс студента</CardTitle>
          <Badge variant={status.variant} className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </div>
        <CardDescription>{studentName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Академ часы
            </p>
            <p className={`text-2xl font-bold ${
              balance <= 0 ? 'text-destructive' : 
              balance <= 4 ? 'text-orange-600' : 
              'text-foreground'
            }`}>
              {balance.toFixed(1)}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Рубли
            </p>
            <p className={`text-2xl font-bold ${
              balanceRub <= 0 ? 'text-destructive' : 'text-foreground'
            }`}>
              {balanceRub.toFixed(0)} ₽
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {balance <= 8 && (
            <Button 
              onClick={onAddBalance} 
              className="flex-1 gap-2"
              variant={balance <= 0 ? 'destructive' : 'default'}
            >
              <DollarSign className="h-4 w-4" />
              Пополнить баланс
            </Button>
          )}
          
          <Button 
            onClick={() => setShowHistory(true)} 
            variant="outline"
            className="gap-2"
          >
            <History className="h-4 w-4" />
            История
          </Button>
        </div>
      </CardContent>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>История транзакций - {studentName}</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[500px] pr-4">
            {transactions && transactions.length > 0 ? (
              <div className="space-y-2">
                {transactions.map((transaction) => (
                  <div 
                    key={transaction.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className={`font-medium ${getTransactionTypeColor(transaction.transaction_type)}`}>
                          {getTransactionTypeLabel(transaction.transaction_type)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(transaction.created_at), 'dd MMM yyyy, HH:mm', { locale: ru })}
                        </p>
                      </div>
                      
                      <div className="text-right space-y-1">
                        <p className={`text-lg font-bold ${transaction.academic_hours >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.academic_hours >= 0 ? '+' : ''}{transaction.academic_hours.toFixed(1)} ч
                        </p>
                        <p className={`text-sm ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.amount >= 0 ? '+' : ''}{transaction.amount.toFixed(0)} ₽
                        </p>
                        {transaction.price_per_hour && (
                          <p className="text-xs text-muted-foreground">
                            {transaction.price_per_hour.toFixed(0)} ₽/ч
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Нет транзакций
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
