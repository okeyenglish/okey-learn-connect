import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AlertCircle, Clock, DollarSign } from 'lucide-react';
import { BalanceCheckResult } from '@/hooks/useStudentBalances';

interface BalanceWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balanceCheck: BalanceCheckResult | null;
  studentName: string;
  onConfirm: () => void;
  onAddBalance?: () => void;
}

export const BalanceWarningDialog = ({
  open,
  onOpenChange,
  balanceCheck,
  studentName,
  onConfirm,
  onAddBalance,
}: BalanceWarningDialogProps) => {
  if (!balanceCheck) return null;

  const { has_sufficient_balance, current_balance_hours, current_balance_rub, message } = balanceCheck;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <AlertDialogTitle>
              {has_sufficient_balance ? 'Подтвердите действие' : 'Недостаточный баланс'}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 pt-4">
            <p>
              Студент: <strong>{studentName}</strong>
            </p>
            
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Текущий баланс часов
                </p>
                <p className={`text-2xl font-bold ${
                  current_balance_hours <= 0 ? 'text-destructive' : 
                  current_balance_hours <= 4 ? 'text-orange-600' : 
                  'text-foreground'
                }`}>
                  {current_balance_hours.toFixed(1)} ч
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Текущий баланс рублей
                </p>
                <p className={`text-2xl font-bold ${
                  current_balance_rub <= 0 ? 'text-destructive' : 'text-foreground'
                }`}>
                  {current_balance_rub.toFixed(0)} ₽
                </p>
              </div>
            </div>

            <div className={`p-3 rounded-lg ${
              has_sufficient_balance ? 'bg-blue-50 text-blue-900' : 'bg-red-50 text-red-900'
            }`}>
              <p className="text-sm">{message}</p>
            </div>

            {!has_sufficient_balance && (
              <p className="text-sm text-muted-foreground">
                Рекомендуется пополнить баланс перед добавлением студента в группу или на индивидуальные занятия.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          
          {!has_sufficient_balance && onAddBalance && (
            <AlertDialogAction onClick={onAddBalance} className="bg-blue-600 hover:bg-blue-700">
              Пополнить баланс
            </AlertDialogAction>
          )}
          
          <AlertDialogAction 
            onClick={onConfirm}
            className={has_sufficient_balance ? '' : 'bg-orange-600 hover:bg-orange-700'}
          >
            {has_sufficient_balance ? 'Продолжить' : 'Добавить все равно'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
