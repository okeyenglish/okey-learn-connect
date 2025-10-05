import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

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
  group_id?: string;
  lessons_count?: number;
}

export const usePayments = (filters?: any) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Realtime: initial fetch and subscribe to payments changes
  useEffect(() => {
    fetchPayments();
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        (payload) => {
          try {
            const sid = (payload as any)?.new?.student_id ?? (payload as any)?.old?.student_id;
            if (!filters?.student_id || sid === filters.student_id) {
              fetchPayments();
            }
          } catch {
            fetchPayments();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters?.student_id]);

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
          group_id: paymentData.group_id,
          lessons_count: paymentData.lessons_count || 0
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating payment record:', error);
        throw error;
      }

      console.log('Payment created successfully:', payment);

      // Update session statuses and distribute minutes
      if (paymentData.individual_lesson_id) {
        console.log('Starting payment distribution...');
        console.log('Individual lesson ID:', paymentData.individual_lesson_id);
        console.log('Amount:', paymentData.amount);

        // Загружаем duration урока для расчета минут
        const { data: lessonData } = await supabase
          .from('individual_lessons')
          .select('duration, schedule_days, period_start, period_end')
          .eq('id', paymentData.individual_lesson_id)
          .single();

        const lessonDuration = lessonData?.duration || 60;
        console.log('Lesson duration:', lessonDuration);

        // Считаем сколько минут нужно распределить из платежа (а.ч. × 40)
        let remainingMinutesToDistribute = (paymentData.lessons_count || 0) * 40;

        console.log('Total minutes to distribute:', remainingMinutesToDistribute);

        // Загружаем все сессии урока (исключая дополнительные занятия)
        const { data: allSessions } = await supabase
          .from('individual_lesson_sessions')
          .select('id, lesson_date, status, payment_id, duration, paid_minutes, is_additional')
          .eq('individual_lesson_id', paymentData.individual_lesson_id)
          .order('lesson_date', { ascending: true });

        console.log('All sessions:', allSessions);

        // ШАГ 1: Сначала заполняем частично оплаченные занятия
        const partiallyPaidSessions = (allSessions || []).filter(s => {
          const sessionDuration = s.duration || lessonDuration;
          const paidMinutes = s.paid_minutes || 0;
          return paidMinutes > 0 && paidMinutes < sessionDuration && 
                 (!s.status || ['scheduled', 'completed', 'attended'].includes(s.status));
        });

        console.log('Partially paid sessions found:', partiallyPaidSessions.length);

        for (const session of partiallyPaidSessions) {
          if (remainingMinutesToDistribute <= 0) break;

          const sessionDuration = session.duration || lessonDuration;
          const currentPaidMinutes = session.paid_minutes || 0;
          const neededMinutes = sessionDuration - currentPaidMinutes;
          const minutesToAdd = Math.min(neededMinutes, remainingMinutesToDistribute);

          console.log(`Session ${session.lesson_date}: adding ${minutesToAdd} minutes (had ${currentPaidMinutes}/${sessionDuration})`);

          const { error: updateErr } = await supabase
            .from('individual_lesson_sessions')
            .update({ 
              paid_minutes: currentPaidMinutes + minutesToAdd,
              payment_id: payment.id, // Привязываем к новому платежу
              updated_at: new Date().toISOString() 
            })
            .eq('id', session.id);

          if (updateErr) {
            console.error('Error updating session:', updateErr);
          } else {
            remainingMinutesToDistribute -= minutesToAdd;
            console.log('Remaining minutes after partial fill:', remainingMinutesToDistribute);
          }
        }

        // ШАГ 2: Распределяем оставшиеся минуты на неоплаченные занятия
        if (remainingMinutesToDistribute > 0) {
          console.log('Distributing remaining minutes to unpaid sessions...');

          const unpaidSessions = (allSessions || []).filter(s => {
            const paidMinutes = s.paid_minutes || 0;
            return paidMinutes === 0 && 
                   (!s.status || ['scheduled', 'completed', 'attended'].includes(s.status));
          });

          console.log('Unpaid sessions found:', unpaidSessions.length);

          for (const session of unpaidSessions) {
            if (remainingMinutesToDistribute <= 0) break;

            const sessionDuration = session.duration || lessonDuration;
            const minutesToAdd = Math.min(sessionDuration, remainingMinutesToDistribute);

            console.log(`Session ${session.lesson_date}: adding ${minutesToAdd} minutes`);

            const { error: updateErr } = await supabase
              .from('individual_lesson_sessions')
              .update({ 
                paid_minutes: minutesToAdd,
                payment_id: payment.id,
                updated_at: new Date().toISOString() 
              })
              .eq('id', session.id);

            if (updateErr) {
              console.error('Error updating session:', updateErr);
            } else {
              remainingMinutesToDistribute -= minutesToAdd;
              console.log('Remaining minutes:', remainingMinutesToDistribute);
            }
          }
        }

        console.log('Payment distribution completed. Remaining:', remainingMinutesToDistribute);
      } else if (paymentData.group_id) {
        // Группы оплачиваются только в академических часах, распределение по занятиям не выполняем
        console.log('Group payment recorded in academic hours; no session linking performed.');
      }

      toast({
        title: "Успешно",
        description: `Платеж на сумму ${paymentData.amount} руб. добавлен`,
      });

      // Invalidate payment stats cache
      queryClient.invalidateQueries({ queryKey: ['student-group-payment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['student-details'] });

      console.log('=== CREATE PAYMENT END ===');
      fetchPayments();
      return payment;
    } catch (error) {
      console.error('Error creating payment:', error);
      // Показываем детали ошибки, если они доступны
      const message = (error as any)?.message || (error as any)?.details || 'Не удалось добавить платеж';
      toast({
        title: "Ошибка",
        description: message,
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

      // Invalidate payment stats cache
      queryClient.invalidateQueries({ queryKey: ['student-group-payment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['student-details'] });

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

      // Перераспределяем оставшиеся платежи по самым ранним датам
      if (individualLessonId) {
        console.log('Rebalancing payments after deletion for lesson:', individualLessonId);

        // Загружаем оставшиеся платежи
        const { data: remainingPayments, error: remErr } = await supabase
          .from('payments')
          .select('id, lessons_count, payment_date')
          .eq('individual_lesson_id', individualLessonId)
          .eq('status', 'completed')
          .order('payment_date', { ascending: true });
        if (remErr) console.error('Failed to load remaining payments:', remErr);

        // Загружаем все сессии урока
        const { data: allSessions, error: sessErr } = await supabase
          .from('individual_lesson_sessions')
          .select('id, lesson_date, status, payment_id')
          .eq('individual_lesson_id', individualLessonId)
          .order('lesson_date', { ascending: true });
        if (sessErr) console.error('Failed to load sessions for rebalance:', sessErr);

        // Загружаем расписание
        const { data: lessonRow } = await supabase
          .from('individual_lessons')
          .select('schedule_days, period_start, period_end')
          .eq('id', individualLessonId)
          .maybeSingle();

        const DAY_MAP: Record<string, number> = {
          monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0,
        };

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
            console.warn('Failed to construct scheduled dates (rebalance):', e);
            return [];
          }
        })();

        const sessionByDate = new Map<string, { id?: string; status?: string }>();
        const existingPayableDates: string[] = [];
        (allSessions || []).forEach((s) => {
          sessionByDate.set(s.lesson_date, { id: s.id, status: s.status });
          if (!s.status || ['scheduled','completed','absent','attended'].includes(s.status)) {
            existingPayableDates.push(s.lesson_date);
          }
        });

        const allPayableDates = [...scheduledDates, ...existingPayableDates]
          .filter((date, index, self) => self.indexOf(date) === index)
          .sort();

        const canBePaid = (s?: { status?: string }) => !s?.status || ['scheduled','completed','absent','attended'].includes(s.status);
        const payableDatesOrdered = allPayableDates.filter((d) => {
          const s = sessionByDate.get(d);
          if (!s) return true;
          return canBePaid(s);
        });

        // Сбрасываем payment_id у всех сессий перед распределением
        if ((allSessions || []).length > 0) {
          const allIds = (allSessions || []).map(s => s.id);
          const { error: clearErr } = await supabase
            .from('individual_lesson_sessions')
            .update({ payment_id: null, updated_at: new Date().toISOString() })
            .in('id', allIds);
          if (clearErr) console.error('Error clearing payments prior to rebalance:', clearErr);
        }

        let currentDateIndex = 0;
        const updatesByPaymentId: Record<string, string[]> = {};

        for (const pmt of (remainingPayments || [])) {
          const cnt = pmt.lessons_count || 0;
          const sessionIds: string[] = [];
          for (let i = 0; i < cnt && currentDateIndex < payableDatesOrdered.length; i++) {
            const date = payableDatesOrdered[currentDateIndex];
            const sess = sessionByDate.get(date);
            if (sess?.id) {
              sessionIds.push(sess.id);
            } else {
              const { data: newSess } = await supabase
                .from('individual_lesson_sessions')
                .insert({
                  individual_lesson_id: individualLessonId,
                  lesson_date: date,
                  status: 'scheduled',
                  payment_id: pmt.id,
                  created_by: user?.id,
                  updated_at: new Date().toISOString(),
                })
                .select('id')
                .single();
              if (newSess) sessionByDate.set(date, { id: newSess.id, status: 'scheduled' });
            }
            currentDateIndex++;
          }
          if (sessionIds.length > 0) updatesByPaymentId[pmt.id] = sessionIds;
        }

        for (const [pId, sIds] of Object.entries(updatesByPaymentId)) {
          if (sIds.length > 0) {
            await supabase
              .from('individual_lesson_sessions')
              .update({ payment_id: pId, updated_at: new Date().toISOString() })
              .in('id', sIds);
          }
        }

        console.log('Rebalance after deletion complete');
      }

      toast({
        title: "Успешно",
        description: "Платеж удален, средства перераспределены на самые ранние занятия",
      });

      // Invalidate payment stats cache
      queryClient.invalidateQueries({ queryKey: ['student-group-payment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['student-details'] });

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