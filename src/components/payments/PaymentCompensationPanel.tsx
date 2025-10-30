import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCompensatePayment } from '@/hooks/useCompensation';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_date: string;
  method: string;
  student_id: string;
  students: {
    name: string;
  };
}

export const PaymentCompensationPanel = () => {
  const [paymentId, setPaymentId] = useState('');
  const [reason, setReason] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  
  const { mutate: compensate, isPending } = useCompensatePayment();

  const { data: recentPayments, isLoading } = useQuery({
    queryKey: ['recent-payments-for-compensation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          status,
          payment_date,
          method,
          student_id,
          students!inner(name)
        `)
        .in('status', ['pending', 'completed'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  const handleCompensate = () => {
    if (!paymentId || !reason) return;
    
    compensate(
      { paymentId, reason },
      {
        onSuccess: () => {
          setPaymentId('');
          setReason('');
          setConfirmDialogOpen(false);
        },
      }
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      pending: 'secondary',
      completed: 'default',
      failed: 'destructive',
      refunded: 'destructive',
    };
    return variants[status] || 'default';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Компенсация платежа (откат)
          </CardTitle>
          <CardDescription>
            Ручная компенсация платежа с откатом всех связанных изменений в занятиях
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment-id">ID платежа</Label>
            <Input
              id="payment-id"
              placeholder="Введите UUID платежа"
              value={paymentId}
              onChange={(e) => setPaymentId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Причина компенсации</Label>
            <Textarea
              id="reason"
              placeholder="Опишите причину отката платежа..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <Button
            onClick={() => setConfirmDialogOpen(true)}
            disabled={!paymentId || !reason || isPending}
            variant="destructive"
            className="w-full"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Откатить платеж
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Последние платежи</CardTitle>
          <CardDescription>
            Платежи, которые можно откатить (pending, completed)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Студент</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Метод</TableHead>
                  <TableHead>Действие</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayments?.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(payment.payment_date), 'dd.MM.yyyy', { locale: ru })}
                    </TableCell>
                    <TableCell>{payment.students.name}</TableCell>
                    <TableCell>{payment.amount.toLocaleString('ru-RU')} ₽</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadge(payment.status)}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{payment.method}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPaymentId(payment.id);
                          setReason(`Откат платежа от ${format(new Date(payment.payment_date), 'dd.MM.yyyy', { locale: ru })}`);
                        }}
                      >
                        Выбрать
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Подтвердите компенсацию
            </AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите откатить этот платеж? Это действие:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Изменит статус платежа на "failed"</li>
                <li>Откатит все связанные изменения в занятиях</li>
                <li>Запишет событие в журнал аудита</li>
              </ul>
              <div className="mt-4 p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">Причина:</p>
                <p className="text-sm">{reason}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCompensate}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Подтвердить откат
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
