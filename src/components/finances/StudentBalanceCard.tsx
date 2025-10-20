import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';
import { useBalanceTransactions } from '@/hooks/useStudentBalances';

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

  // Рассчитываем текущий баланс
  const balance = transactions?.reduce((sum, t) => {
    return sum + (t.academic_hours || 0);
  }, 0) || 0;

  const balanceRub = transactions?.reduce((sum, t) => {
    return sum + (t.amount || 0);
  }, 0) || 0;

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

        {balance <= 8 && (
          <Button 
            onClick={onAddBalance} 
            className="w-full gap-2"
            variant={balance <= 0 ? 'destructive' : 'default'}
          >
            <DollarSign className="h-4 w-4" />
            Пополнить баланс
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
