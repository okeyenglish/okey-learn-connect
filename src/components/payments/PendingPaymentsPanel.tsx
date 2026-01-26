import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { useConfirmPayment } from '@/hooks/useIdempotentPayment';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CheckCircle, Clock } from 'lucide-react';

interface PendingPayment {
  id: string;
  amount: number;
  payment_date: string;
  method: string;
  description: string | null;
  student_id: string;
  students: { name: string } | { name: string }[];
  created_at: string;
}

export const PendingPaymentsPanel = () => {
  const { mutate: confirmPayment, isPending: isConfirming } = useConfirmPayment();

  const { data: pendingPayments, isLoading } = useQuery({
    queryKey: ['pending-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          method,
          description,
          student_id,
          created_at,
          students!inner(name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PendingPayment[];
    },
    refetchInterval: 60000, // OPTIMIZED: 30s → 60s to reduce DB load
  });

  const handleConfirm = (paymentId: string) => {
    confirmPayment(paymentId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Ожидающие подтверждения платежи
        </CardTitle>
        <CardDescription>
          Платежи в статусе "pending", требующие подтверждения для перехода в "completed"
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : pendingPayments && pendingPayments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата создания</TableHead>
                <TableHead>Дата платежа</TableHead>
                <TableHead>Студент</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Метод</TableHead>
                <TableHead>Действие</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingPayments.map((payment) => {
                const studentName = Array.isArray(payment.students) 
                  ? payment.students[0]?.name 
                  : payment.students?.name;
                return (
                <TableRow key={payment.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(payment.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(payment.payment_date), 'dd.MM.yyyy', { locale: ru })}
                  </TableCell>
                  <TableCell>{studentName || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {payment.description || '-'}
                  </TableCell>
                  <TableCell className="font-medium">
                    {payment.amount.toLocaleString('ru-RU')} ₽
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{payment.method}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => handleConfirm(payment.id)}
                      disabled={isConfirming}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Подтвердить
                    </Button>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Нет платежей, ожидающих подтверждения</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
