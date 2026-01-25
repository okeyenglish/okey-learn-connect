import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
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

/** DB row for payment */
interface PaymentRow {
  id: string;
  student_id: string;
  amount: number;
  method: string;
  payment_date: string;
  description: string | null;
  status: string;
  created_at: string;
  created_by: string | null;
  notes: string | null;
  session_ids: string[] | null;
  individual_lesson_id: string | null;
  group_id: string | null;
  lessons_count: number | null;
}

/** DB row for individual lesson */
interface IndividualLessonRow {
  duration: number | null;
  schedule_days: string[] | null;
  period_start: string | null;
  period_end: string | null;
}

/** DB row for individual lesson session */
interface IndividualLessonSessionRow {
  id: string;
  lesson_date: string;
  status: string | null;
  payment_id: string | null;
  duration: number | null;
  paid_minutes: number | null;
  is_additional: boolean | null;
}

/** Realtime payload type */
interface RealtimePayload {
  new?: { student_id?: string };
  old?: { student_id?: string };
}

export interface PaymentFilters {
  student_id?: string;
}

export interface CreatePaymentData {
  student_id: string;
  amount: number;
  method: 'cash' | 'card' | 'transfer' | 'online';
  payment_date: string;
  description?: string;
  notes?: string;
  individual_lesson_id?: string;
  group_id?: string;
  lessons_count?: number;
}

export const usePayments = (filters?: PaymentFilters) => {
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
      
      const rows = (data || []) as unknown as PaymentRow[];
      setPayments(rows.map(r => ({
        id: r.id,
        student_id: r.student_id,
        amount: r.amount,
        method: r.method as Payment['method'],
        payment_date: r.payment_date,
        description: r.description ?? undefined,
        status: r.status as Payment['status'],
        created_at: r.created_at,
        created_by: r.created_by ?? undefined,
        notes: r.notes ?? undefined,
        session_ids: r.session_ids ?? undefined,
        individual_lesson_id: r.individual_lesson_id ?? undefined,
        group_id: r.group_id ?? undefined,
        lessons_count: r.lessons_count ?? undefined,
      })));
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
            const typedPayload = payload as RealtimePayload;
            const sid = typedPayload.new?.student_id ?? typedPayload.old?.student_id;
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

  const createPayment = async (paymentData: CreatePaymentData) => {
    console.log('=== CREATE PAYMENT START ===');
    console.log('Payment data received:', paymentData);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: payment, error } = await supabase
        .from('payments')
        .insert([{
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
        }])
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
        const { data: lessonDataRaw } = await supabase
          .from('individual_lessons')
          .select('duration, schedule_days, period_start, period_end')
          .eq('id', paymentData.individual_lesson_id)
          .single();

        const lessonData = lessonDataRaw as unknown as IndividualLessonRow | null;
        const lessonDuration = lessonData?.duration || 60;
        console.log('Lesson duration:', lessonDuration);

        // Считаем сколько минут нужно распределить из платежа (а.ч. × 40)
        let remainingMinutesToDistribute = (paymentData.lessons_count || 0) * 40;

        console.log('Total minutes to distribute:', remainingMinutesToDistribute);

        // Загружаем все сессии урока (исключая дополнительные занятия)
        const { data: allSessionsRaw } = await supabase
          .from('individual_lesson_sessions')
          .select('id, lesson_date, status, payment_id, duration, paid_minutes, is_additional')
          .eq('individual_lesson_id', paymentData.individual_lesson_id)
          .order('lesson_date', { ascending: true });

        const allSessions = (allSessionsRaw || []) as unknown as IndividualLessonSessionRow[];

        console.log('All sessions:', allSessions);

        // ШАГ 1: Сначала заполняем частично оплаченные занятия
        const partiallyPaidSessions = allSessions.filter(s => {
          const sessionDuration = s.duration || lessonDuration;
          const paidMinutes = s.paid_minutes || 0;
          return paidMinutes > 0 && paidMinutes < sessionDuration && 
                 (!s.status || ['scheduled', 'completed', 'attended'].includes(s.status)) &&
                 !s.payment_id; // только без привязанного платежа
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

        // ШАГ 2: Распределяем оставшиеся минуты по самым ранним датам расписания
        if (remainingMinutesToDistribute > 0) {
          console.log('Distributing remaining minutes across earliest scheduled dates...');

          // Построим список всех дат расписания в периоде
          const DAY_MAP: Record<string, number> = {
            monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0,
          };

          const scheduleDays: string[] = lessonData?.schedule_days || [];
          const periodStart = lessonData?.period_start ? new Date(lessonData.period_start) : null;
          const periodEnd = lessonData?.period_end ? new Date(lessonData.period_end) : null;

          const scheduledDates: string[] = (() => {
            try {
              if (!scheduleDays || scheduleDays.length === 0 || !periodStart || !periodEnd) return [];
              const dayNums = scheduleDays.map(d => DAY_MAP[d?.toLowerCase?.() || '']).filter((n) => n !== undefined);
              const dates: string[] = [];
              const start = new Date(periodStart);
              const end = new Date(periodEnd);
              for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                if (dayNums.includes(d.getDay())) {
                  dates.push(d.toISOString().slice(0, 10));
                }
              }
              return dates;
            } catch (e) {
              console.warn('Failed to construct scheduled dates (createPayment):', e);
              return [];
            }
          })();

          const canBePaid = (s?: { status?: string | null }) => !s?.status || ['scheduled','completed','attended'].includes(s.status);

          // Карта существующих сессий по дате
          const sessionByDate = new Map<string, IndividualLessonSessionRow>();
          allSessions.forEach((s) => sessionByDate.set(s.lesson_date, s));

          // Объединяем даты расписания и уже существующие (на всякий случай)
          const existingPayableDates = allSessions
            .filter((s) => canBePaid(s))
            .map((s) => s.lesson_date);

          const allPayableDates = [...scheduledDates, ...existingPayableDates]
            .filter((date, index, self) => self.indexOf(date) === index)
            .sort();

          for (const date of allPayableDates) {
            if (remainingMinutesToDistribute <= 0) break;
            const sess = sessionByDate.get(date);

            if (sess) {
              // Обновляем только если нет привязанного платежа
              if (!sess.payment_id && canBePaid(sess)) {
                const sessionDuration = sess.duration || lessonDuration;
                const currentPaid = sess.paid_minutes || 0;
                const need = Math.max(0, sessionDuration - currentPaid);
                if (need > 0) {
                  const minutesToAdd = Math.min(need, remainingMinutesToDistribute);
                  console.log(`Session ${date}: adding ${minutesToAdd} minutes (had ${currentPaid}/${sessionDuration})`);
                  const { error: updErr } = await supabase
                    .from('individual_lesson_sessions')
                    .update({
                      paid_minutes: currentPaid + minutesToAdd,
                      payment_id: payment.id,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', sess.id);
                  if (!updErr) remainingMinutesToDistribute -= minutesToAdd;
                }
              }
            } else {
              // Создаем сессию на эту дату и сразу списываем минуты
              const minutesToAdd = Math.min(lessonDuration, remainingMinutesToDistribute);
              console.log(`Creating session for ${date} with ${minutesToAdd} minutes`);
              const { error: insErr } = await supabase
                .from('individual_lesson_sessions')
                .insert({
                  individual_lesson_id: paymentData.individual_lesson_id,
                  lesson_date: date,
                  status: 'scheduled',
                  duration: lessonDuration,
                  paid_minutes: minutesToAdd,
                  payment_id: payment.id,
                  created_by: user?.id,
                  updated_at: new Date().toISOString(),
                });
              if (!insErr) remainingMinutesToDistribute -= minutesToAdd;
            }
          }
        }

        console.log('Payment distribution completed. Remaining:', remainingMinutesToDistribute);
      } else if (paymentData.group_id) {
        // Группы оплачиваются академическими часами, распределение делает UI-логика
        console.log('Group payment recorded in academic hours; triggering UI refresh.');

        // Немедленно обновляем расписание и статистику группы для этого студента
        try {
          queryClient.invalidateQueries({ queryKey: ['student-group-lesson-sessions', paymentData.student_id, paymentData.group_id] });
          queryClient.invalidateQueries({ queryKey: ['student-group-payment-stats', paymentData.student_id, paymentData.group_id] });
          queryClient.refetchQueries({ queryKey: ['student-group-lesson-sessions', paymentData.student_id, paymentData.group_id] });
          queryClient.refetchQueries({ queryKey: ['student-group-payment-stats', paymentData.student_id, paymentData.group_id] });
        } catch (e) {
          console.warn('Failed to force refresh after group payment, will rely on realtime:', e);
        }
      }

      // Обновляем расписание и статистику урока немедленно (не ждём realtime)
      if (paymentData.individual_lesson_id) {
        queryClient.invalidateQueries({ queryKey: ['individual-lesson-sessions', paymentData.individual_lesson_id] });
        queryClient.invalidateQueries({ queryKey: ['individual-lesson-payment-stats', paymentData.individual_lesson_id] });
        queryClient.refetchQueries({ queryKey: ['individual-lesson-sessions', paymentData.individual_lesson_id] });
        queryClient.refetchQueries({ queryKey: ['individual-lesson-payment-stats', paymentData.individual_lesson_id] });
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
      const err = error as { message?: string; details?: string };
      const message = err.message || err.details || 'Не удалось добавить платеж';
      toast({
        title: "Ошибка",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updatePayment = async (id: string, updates: Partial<Payment>) => {
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
        const { data: allSessionsRaw, error: fetchError } = await supabase
          .from('individual_lesson_sessions')
          .select('id, lesson_date, status, payment_id')
          .eq('individual_lesson_id', individualLessonId)
          .eq('payment_id', paymentId)
          .order('lesson_date', { ascending: true });

        const allSessions = (allSessionsRaw || []) as unknown as IndividualLessonSessionRow[];

        console.log('Sessions with this payment:', allSessions);

        if (!fetchError && allSessions.length > 0) {
          const sessionIds = allSessions.map(s => s.id);
          console.log('Removing payment from sessions:', allSessions.map(s => ({
            id: s.id,
            date: s.lesson_date
          })));

          // Убираем payment_id и оплаченные минуты у занятий
          const { error: sessionError } = await supabase
            .from('individual_lesson_sessions')
            .update({ payment_id: null, paid_minutes: 0, updated_at: new Date().toISOString() })
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
        const { data: remainingPaymentsRaw, error: remErr } = await supabase
          .from('payments')
          .select('id, lessons_count, payment_date')
          .eq('individual_lesson_id', individualLessonId)
          .eq('status', 'completed')
          .order('payment_date', { ascending: true });

        if (!remErr && remainingPaymentsRaw && remainingPaymentsRaw.length > 0) {
          const remainingPayments = remainingPaymentsRaw as unknown as PaymentRow[];
          console.log('Remaining payments to redistribute:', remainingPayments.length);

          // Сбрасываем все paid_minutes для всех сессий урока
          const { error: resetErr } = await supabase
            .from('individual_lesson_sessions')
            .update({ paid_minutes: 0, payment_id: null, updated_at: new Date().toISOString() })
            .eq('individual_lesson_id', individualLessonId);

          if (resetErr) {
            console.error('Error resetting sessions:', resetErr);
          }

          // Загружаем информацию об уроке
          const { data: lessonDataRaw } = await supabase
            .from('individual_lessons')
            .select('duration, schedule_days, period_start, period_end')
            .eq('id', individualLessonId)
            .single();

          const lessonData = lessonDataRaw as unknown as IndividualLessonRow | null;
          const lessonDuration = lessonData?.duration || 60;

          // Загружаем все сессии
          const { data: allSessionsRaw } = await supabase
            .from('individual_lesson_sessions')
            .select('id, lesson_date, status, payment_id, duration, paid_minutes')
            .eq('individual_lesson_id', individualLessonId)
            .order('lesson_date', { ascending: true });

          const allSessions = (allSessionsRaw || []) as unknown as IndividualLessonSessionRow[];

          // Перераспределяем каждый платеж
          for (const pmt of remainingPayments) {
            let remainingMinutes = (pmt.lessons_count || 0) * 40;

            const canBePaid = (s?: { status?: string | null }) => !s?.status || ['scheduled','completed','attended'].includes(s.status);

            for (const sess of allSessions) {
              if (remainingMinutes <= 0) break;
              if (!canBePaid(sess)) continue;

              const sessionDuration = sess.duration || lessonDuration;
              const currentPaid = sess.paid_minutes || 0;
              const need = Math.max(0, sessionDuration - currentPaid);

              if (need > 0) {
                const minutesToAdd = Math.min(need, remainingMinutes);
                await supabase
                  .from('individual_lesson_sessions')
                  .update({
                    paid_minutes: currentPaid + minutesToAdd,
                    payment_id: pmt.id,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', sess.id);

                remainingMinutes -= minutesToAdd;
                // Update local session for next iteration
                sess.paid_minutes = currentPaid + minutesToAdd;
              }
            }
          }
        }

        // Принудительно обновляем кэши
        queryClient.invalidateQueries({ queryKey: ['individual-lesson-sessions', individualLessonId] });
        queryClient.invalidateQueries({ queryKey: ['individual-lesson-payment-stats', individualLessonId] });
        queryClient.refetchQueries({ queryKey: ['individual-lesson-sessions', individualLessonId] });
        queryClient.refetchQueries({ queryKey: ['individual-lesson-payment-stats', individualLessonId] });
      }

      toast({
        title: "Успешно",
        description: "Платеж удален",
      });

      // Invalidate payment stats cache
      queryClient.invalidateQueries({ queryKey: ['student-group-payment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['student-details'] });

      fetchPayments();
      console.log('Delete payment completed.');
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

  return {
    payments,
    loading,
    createPayment,
    updatePayment,
    deletePayment,
    refetch: fetchPayments,
  };
};
