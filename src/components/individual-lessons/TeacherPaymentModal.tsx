import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';

interface TeacherPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: {
    id: string;
    teacher_name?: string;
    teacher_rate?: number;
    duration?: number;
  };
}

export function TeacherPaymentModal({ open, onOpenChange, lesson }: TeacherPaymentModalProps) {
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && lesson.id) {
      loadStats();
    }
  }, [open, lesson.id]);

  const loadStats = async () => {
    try {
      // Подсчитываем статистику вручную из сессий
      const { data: sessions, error } = await supabase
        .from('individual_lesson_sessions')
        .select('*')
        .eq('individual_lesson_id', lesson.id)
        .eq('status', 'completed');

      if (error) throw error;

      const hoursTaught = sessions?.length || 0;
      const rate = lesson.teacher_rate || 500;
      const amountDue = hoursTaught * (lesson.duration || 60) / 60 * rate;

      setStats({
        hours_taught: hoursTaught * (lesson.duration || 60) / 60,
        amount_due: amountDue,
      });
    } catch (error) {
      console.error('Error loading teacher payment stats:', error);
    }
  };

  const handlePayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({
        title: 'Ошибка',
        description: 'Укажите сумму выплаты',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Используем существующую таблицу payments вместо teacher_group_payments
      const { error } = await supabase
        .from('payments')
        .insert([{
          individual_lesson_id: lesson.id,
          amount: parseFloat(paymentAmount),
          method: 'cash',
          payment_date: new Date().toISOString().split('T')[0],
          notes: `Оплата преподавателю ${lesson.teacher_name}: ${paymentNotes}`,
        }]);

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Выплата преподавателю зарегистрирована',
      });

      onOpenChange(false);
      setPaymentAmount('');
      setPaymentNotes('');
      loadStats();
    } catch (error) {
      console.error('Error creating teacher payment:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось зарегистрировать выплату',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Оплата преподавателю
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Преподаватель: {lesson.teacher_name || 'Не назначен'}
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Статистика */}
          {stats && (
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Часов проведено
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.hours_taught || 0}</div>
                  <div className="text-xs text-muted-foreground">За последний месяц</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    К выплате
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.amount_due?.toFixed(2) || 0} ₽
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Ставка: {lesson.teacher_rate || 500} ₽/час
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Форма выплаты */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Сумма выплаты *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Комментарий</Label>
              <Input
                id="notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Примечание к выплате..."
              />
            </div>
          </div>

          {/* Действия */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button onClick={handlePayment} disabled={loading || !paymentAmount}>
              {loading ? 'Сохранение...' : 'Выплатить'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
