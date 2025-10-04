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
  lessons_count?: number;
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
    console.log('=== CREATE PAYMENT START ===');
    console.log('Payment data received:', paymentData);
    
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
          created_by: user?.id,
          individual_lesson_id: paymentData.individual_lesson_id,
          lessons_count: paymentData.lessons_count || 0
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating payment record:', error);
        throw error;
      }

      console.log('Payment created successfully:', payment);

      // Update session statuses - mark next N earliest unpaid dates as attended
      if (paymentData.individual_lesson_id && paymentData.lessons_count) {
        console.log('Starting session status update...');
        console.log('Individual lesson ID:', paymentData.individual_lesson_id);
        console.log('Lessons to pay:', paymentData.lessons_count);

        // 1) Load existing session rows for this lesson
        const { data: allSessions, error: fetchError } = await supabase
          .from('individual_lesson_sessions')
          .select('id, lesson_date, status, payment_id')
          .eq('individual_lesson_id', paymentData.individual_lesson_id)
          .order('lesson_date', { ascending: true });

        console.log('Fetched sessions:', allSessions);
        if (fetchError) console.warn('Fetch sessions error:', fetchError);

        // 2) Load lesson to get schedule (days + period)
        const { data: lessonRow, error: lessonErr } = await supabase
          .from('individual_lessons')
          .select('schedule_days, period_start, period_end')
          .eq('id', paymentData.individual_lesson_id)
          .maybeSingle();

        if (lessonErr) {
          console.error('Failed to load individual lesson schedule:', lessonErr);
        }

        const DAY_MAP: Record<string, number> = {
          monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0,
        };

        // 3) Build full list of scheduled dates within period (inclusive)
        const scheduledDates: string[] = (() => {
          try {
            if (!lessonRow?.schedule_days || !lessonRow?.period_start || !lessonRow?.period_end) return [];
            const dayNums = (lessonRow.schedule_days as string[]).map(d => DAY_MAP[d?.toLowerCase?.() || '']).filter((n) => n !== undefined);
            const dates: string[] = [];
            const start = new Date(lessonRow.period_start as string);
            const end = new Date(lessonRow.period_end as string);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              if (dayNums.includes(d.getDay())) {
                dates.push(d.toISOString().slice(0, 10));
              }
            }
            return dates;
          } catch (e) {
            console.warn('Failed to construct scheduled dates:', e);
            return [];
          }
        })();

        // 4) Build maps for quick lookup
        const sessionByDate = new Map<string, { id?: string; status?: string; payment_id?: string }>();
        (allSessions || []).forEach((s) => sessionByDate.set(s.lesson_date, { id: s.id, status: s.status, payment_id: s.payment_id }));

        const isUnpaid = (s?: { payment_id?: string }) => !s?.payment_id;

        // 5) Determine earliest unpaid dates (either no row or no payment_id)
        const unpaidDatesOrdered = scheduledDates.filter((d) => {
          const s = sessionByDate.get(d);
          return !s ? true : isUnpaid(s);
        });

        console.log('Total scheduled dates:', scheduledDates.length);
        console.log('Existing sessions:', allSessions?.length || 0);
        console.log('Unpaid dates available:', unpaidDatesOrdered.length);

        const toCover = Math.max(0, paymentData.lessons_count);
        const targetDates = unpaidDatesOrdered.slice(0, toCover);
        console.log('Target dates to mark as paid:', targetDates);

        // Split into updates (existing rows) and inserts (no row yet)
        const updateIds: string[] = [];
        const insertRows: any[] = [];
        targetDates.forEach((d) => {
          const s = sessionByDate.get(d);
          if (s?.id) {
            updateIds.push(s.id);
          } else {
            insertRows.push({
              individual_lesson_id: paymentData.individual_lesson_id,
              lesson_date: d,
              status: 'scheduled',
              payment_id: payment.id,
              created_by: user?.id,
              updated_at: new Date().toISOString(),
            });
          }
        });

        // 6) Perform updates first, then inserts - set payment_id instead of status
        if (updateIds.length > 0) {
          const { error: updErr, data: updData } = await supabase
            .from('individual_lesson_sessions')
            .update({ payment_id: payment.id, updated_at: new Date().toISOString() })
            .in('id', updateIds)
            .select();
          if (updErr) console.error('Error updating existing session rows:', updErr); else console.log('Updated sessions:', updData);
        }

        if (insertRows.length > 0) {
          const { error: insErr, data: insData } = await supabase
            .from('individual_lesson_sessions')
            .insert(insertRows)
            .select();
          if (insErr) console.error('Error inserting new paid rows:', insErr); else console.log('Inserted sessions:', insData);
        }
      } else {
        console.log('Skipping session update - no individual_lesson_id or lessons_count');
      }

      toast({
        title: "Успешно",
        description: `Платеж на сумму ${paymentData.amount} руб. добавлен`,
      });

      console.log('=== CREATE PAYMENT END ===');
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

  const deletePayment = async (paymentId: string, individualLessonId?: string, lessonsCount?: number) => {
    try {
      console.log('Deleting payment:', { paymentId, individualLessonId, lessonsCount });
      const { data: { user } } = await supabase.auth.getUser();
      
      // Если платеж был связан с индивидуальными занятиями, возвращаем их статусы
      if (individualLessonId && lessonsCount && lessonsCount > 0) {
        console.log('Fetching sessions for lesson:', individualLessonId);
        
        // Получаем все сессии урока с этим payment_id
        const { data: allSessions, error: fetchError } = await supabase
          .from('individual_lesson_sessions')
          .select('id, lesson_date, status, payment_id')
          .eq('individual_lesson_id', individualLessonId)
          .eq('payment_id', paymentId)
          .order('lesson_date', { ascending: true });

        console.log('Sessions with this payment:', allSessions);

        if (!fetchError && allSessions && allSessions.length > 0) {
          const sessionIds = allSessions.map(s => s.id);
          console.log('Removing payment from sessions:', allSessions.map(s => ({
            id: s.id,
            date: s.lesson_date
          })));

          // Убираем payment_id у занятий
          const { error: sessionError } = await supabase
            .from('individual_lesson_sessions')
            .update({ payment_id: null, updated_at: new Date().toISOString() })
            .in('id', sessionIds);

          if (sessionError) {
            console.error('Error removing payment from sessions:', sessionError);
            throw sessionError;
          }
          
          console.log('Successfully removed payment from', allSessions.length, 'sessions');
        } else {
          console.log('No sessions found with this payment');
        }
      } else {
        console.log('Skipping session revert - no individualLessonId or lessonsCount');
      }

      // Удаляем платеж
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Платеж удален, статусы занятий восстановлены",
      });

      fetchPayments();
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить платеж",
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
    deletePayment,
    refetch: fetchPayments
  };
};