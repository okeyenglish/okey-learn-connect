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
        console.log('Starting session rebalancing...');
        console.log('Individual lesson ID:', paymentData.individual_lesson_id);
        console.log('Lessons to pay:', paymentData.lessons_count);

        // ШАГ 1: Загружаем ВСЕ платежи для этого урока (чтобы пересортировать)
        const { data: allPayments, error: paymentsErr } = await supabase
          .from('payments')
          .select('id, lessons_count, payment_date')
          .eq('individual_lesson_id', paymentData.individual_lesson_id)
          .eq('status', 'completed')
          .order('payment_date', { ascending: true });

        if (paymentsErr) {
          console.error('Failed to load payments:', paymentsErr);
        }

        console.log('All payments for this lesson:', allPayments);

        // ШАГ 2: Загружаем все существующие сессии
        const { data: allSessions, error: fetchError } = await supabase
          .from('individual_lesson_sessions')
          .select('id, lesson_date, status, payment_id, is_additional')
          .eq('individual_lesson_id', paymentData.individual_lesson_id)
          .order('lesson_date', { ascending: true });

        console.log('Fetched sessions:', allSessions);
        if (fetchError) console.warn('Fetch sessions error:', fetchError);

        // ШАГ 3: Загружаем расписание урока
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

        // ШАГ 4: Строим список дат по расписанию
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

        // ШАГ 5: Собираем карту сессий и все даты с оплачиваемыми занятиями
        const sessionByDate = new Map<string, { id?: string; status?: string }>();
        const existingPayableDates: string[] = [];
        
        (allSessions || []).forEach((s) => {
          sessionByDate.set(s.lesson_date, { 
            id: s.id, 
            status: s.status
          });
          // Собираем все даты существующих занятий, которые можно оплатить
          if (!s.status || ['scheduled','completed','absent','attended'].includes(s.status)) {
            existingPayableDates.push(s.lesson_date);
          }
        });

        // Объединяем даты по расписанию и существующие оплачиваемые занятия
        const allPayableDates = [...scheduledDates, ...existingPayableDates]
          .filter((date, index, self) => self.indexOf(date) === index) // уникальные
          .sort(); // сортируем по дате

        const canBePaid = (s?: { status?: string }) => 
          !s?.status || ['scheduled','completed','absent','attended'].includes(s.status);

        // ШАГ 6: Фильтруем только те даты, которые можно оплатить
        const payableDatesOrdered = allPayableDates.filter((d) => {
          const s = sessionByDate.get(d);
          if (!s) return true; // нет сессии - можно создать и оплатить
          return canBePaid(s); // можно оплачивать
        });

        console.log('Total payable dates:', payableDatesOrdered.length);
        console.log('All payments count:', allPayments?.length || 0);

        // ШАГ 7: ПЕРЕРАСПРЕДЕЛЯЕМ оплату - снимаем payment_id со всех, затем распределяем заново
        // Сначала убираем payment_id у всех сессий
        if ((allSessions || []).length > 0) {
          const allSessionIds = (allSessions || []).map(s => s.id);
          const { error: clearErr } = await supabase
            .from('individual_lesson_sessions')
            .update({ payment_id: null, updated_at: new Date().toISOString() })
            .in('id', allSessionIds);
          if (clearErr) console.error('Error clearing payment_id:', clearErr);
          else console.log('Cleared payment_id from all sessions');
        }

        // ШАГ 8: Распределяем платежи в хронологическом порядке по датам занятий
        let currentDateIndex = 0;
        const updatesByPaymentId: Record<string, string[]> = {};

        for (const pmt of (allPayments || [])) {
          const lessonsForThisPayment = pmt.lessons_count || 0;
          const sessionIdsForThisPayment: string[] = [];

          for (let i = 0; i < lessonsForThisPayment && currentDateIndex < payableDatesOrdered.length; i++) {
            const date = payableDatesOrdered[currentDateIndex];
            const sess = sessionByDate.get(date);
            
            if (sess?.id) {
              sessionIdsForThisPayment.push(sess.id);
            } else {
              // Нет сессии - создаём новую
              const { data: newSess, error: insertErr } = await supabase
                .from('individual_lesson_sessions')
                .insert({
                  individual_lesson_id: paymentData.individual_lesson_id,
                  lesson_date: date,
                  status: 'scheduled',
                  payment_id: pmt.id,
                  created_by: user?.id,
                  updated_at: new Date().toISOString(),
                })
                .select('id')
                .single();
              
              if (!insertErr && newSess) {
                sessionByDate.set(date, { id: newSess.id, status: 'scheduled' });
              }
            }
            
            currentDateIndex++;
          }

          if (sessionIdsForThisPayment.length > 0) {
            updatesByPaymentId[pmt.id] = sessionIdsForThisPayment;
          }
        }

        // ШАГ 9: Проставляем payment_id для каждого платежа
        for (const [paymentId, sessionIds] of Object.entries(updatesByPaymentId)) {
          if (sessionIds.length > 0) {
            const { error: updErr } = await supabase
              .from('individual_lesson_sessions')
              .update({ payment_id: paymentId, updated_at: new Date().toISOString() })
              .in('id', sessionIds);
            
            if (updErr) {
              console.error(`Error updating sessions for payment ${paymentId}:`, updErr);
            } else {
              console.log(`Assigned ${sessionIds.length} sessions to payment ${paymentId}`);
            }
          }
        }

        console.log('Payment rebalancing completed');
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