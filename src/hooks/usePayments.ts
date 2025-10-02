import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Payment {
  id: string;
  student_id: string;
  amount: number;
  method: 'cash' | 'card' | 'transfer' | 'online';
  payment_date: string;
  description?: string;
  status: 'completed' | 'pending' | 'refunded' | 'failed';
  created_at: string;
  created_by?: string;
  notes?: string;
  session_ids?: string[];
  individual_lesson_id?: string;
}

export const usePayments = (filters?: any) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchPayments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false });

      if (filters?.student_id) {
        query = query.eq('student_id', filters.student_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const createPayment = async (paymentData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: payment, error } = await supabase
        .from('payments')
        .insert({
          student_id: paymentData.student_id,
          amount: paymentData.amount,
          method: paymentData.method,
          payment_date: paymentData.payment_date,
          description: paymentData.description,
          notes: paymentData.notes,
          status: 'completed',
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Update session statuses - mark next N unpaid sessions as attended
      if (paymentData.individual_lesson_id && paymentData.lessons_count) {
        // Получаем все сессии урока в порядке дат
        const { data: allSessions, error: fetchError } = await supabase
          .from('individual_lesson_sessions')
          .select('id, lesson_date, status')
          .eq('individual_lesson_id', paymentData.individual_lesson_id)
          .order('lesson_date', { ascending: true });

        if (!fetchError && allSessions && allSessions.length > 0) {
          // Фильтруем только базовые неоплаченные занятия 
          // Исключаем: оплаченные, отмененные, бесплатные
          // Включаем: scheduled, rescheduled_out, rescheduled (перенесенные также оплачиваются)
          const unpaidSessions = allSessions.filter(s => 
            ['scheduled', 'rescheduled_out', 'rescheduled'].includes(s.status) || !s.status
          );

          console.log('Unpaid sessions available for payment:', unpaidSessions);
          console.log('Paying for:', paymentData.lessons_count, 'lessons');

          // Берем первые N неоплаченных занятий
          const sessionsToUpdate = unpaidSessions.slice(0, paymentData.lessons_count);
          
          if (sessionsToUpdate.length > 0) {
            const sessionIds = sessionsToUpdate.map(s => s.id);
            console.log('Updating session IDs to attended:', sessionIds);
            
            const { error: sessionError } = await supabase
              .from('individual_lesson_sessions')
              .update({ status: 'attended' })
              .in('id', sessionIds);

            if (sessionError) {
              console.error('Error updating sessions:', sessionError);
            } else {
              console.log('Successfully updated', sessionsToUpdate.length, 'sessions to attended');
            }
          }
        }
      }

      toast({
        title: "Успешно",
        description: `Платеж на сумму ${paymentData.amount} руб. добавлен`,
      });

      fetchPayments();
      return payment;
    } catch (error) {
      console.error('Error creating payment:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить платеж",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updatePayment = async (id: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Платеж обновлен",
      });

      fetchPayments();
      return data;
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить платеж",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [filters]);

  return {
    payments,
    loading,
    createPayment,
    updatePayment,
    refetch: fetchPayments
  };
};