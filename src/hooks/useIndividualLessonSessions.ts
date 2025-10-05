import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface IndividualLessonSession {
  id: string;
  individual_lesson_id: string;
  lesson_date: string;
  status: string;
  payment_id: string | null;
  is_additional: boolean;
  notes: string | null;
  duration: number;
  paid_minutes: number;
  _isTemp?: boolean;
  // Payment info
  payment_date?: string;
  payment_amount?: number;
  lessons_count?: number;
}

const calculateLessonSessions = async (
  lessonId: string
): Promise<IndividualLessonSession[]> => {
  // Параллельно получаем все нужные данные
  const [
    sessionsResponse,
    paymentsResponse,
    lessonInfoResponse
  ] = await Promise.all([
    // Все сессии индивидуального занятия
    supabase
      .from('individual_lesson_sessions')
      .select('id, lesson_date, status, payment_id, is_additional, notes, duration, paid_minutes, created_at')
      .eq('individual_lesson_id', lessonId)
      .order('lesson_date', { ascending: true }),
    
    // Все платежи для этого занятия
    supabase
      .from('payments')
      .select('id, lessons_count, amount, payment_date, created_at')
      .eq('individual_lesson_id', lessonId)
      .order('created_at', { ascending: true }),
    
    // Информация о занятии (длительность по умолчанию)
    supabase
      .from('individual_lessons')
      .select('duration')
      .eq('id', lessonId)
      .single()
  ]);

  if (sessionsResponse.error) throw sessionsResponse.error;
  if (paymentsResponse.error) throw paymentsResponse.error;

  const sessions = sessionsResponse.data || [];
  const payments = paymentsResponse.data || [];
  const defaultDuration = lessonInfoResponse.data?.duration || 60;

  // Создаем Map платежей для быстрого доступа
  const paymentsMap = new Map();
  payments.forEach(payment => {
    paymentsMap.set(payment.id, payment);
  });

  // Создаем массив платежей с их остатками для распределения по датам
  const paymentMinutesPool: Array<{payment: any, remainingMinutes: number}> = payments.map(p => ({
    payment: p,
    remainingMinutes: (p.lessons_count || 0) * 40
  }));

  // Обрабатываем каждую сессию
  const result: IndividualLessonSession[] = [];
  
  for (const session of sessions) {
    const duration = session.duration || defaultDuration;
    let paid_minutes = session.paid_minutes || 0;
    const sessionDate = new Date(session.lesson_date);

    // Если есть явная привязка к платежу
    if (session.payment_id && paymentsMap.has(session.payment_id)) {
      const payment = paymentsMap.get(session.payment_id);
      // Используем сохраненное значение или duration
      paid_minutes = session.paid_minutes || duration;
    } else if (!session.payment_id) {
      // Автоматическое распределение оплаты ТОЛЬКО на занятия ПОСЛЕ даты платежа
      // Только для неотмененных и не бесплатных занятий
      if (session.status !== 'cancelled' && session.status !== 'free' && session.status !== 'rescheduled') {
        // Ищем платежи, которые были сделаны ДО или В ДЕНЬ занятия
        for (const pool of paymentMinutesPool) {
          if (pool.remainingMinutes <= 0) continue;
          
          const paymentDate = new Date(pool.payment.payment_date || pool.payment.created_at);
          // Платеж может покрыть занятие только если он был сделан ДО или В ДЕНЬ занятия
          if (paymentDate <= sessionDate) {
            const minutesToTake = Math.min(pool.remainingMinutes, duration - paid_minutes);
            paid_minutes += minutesToTake;
            pool.remainingMinutes -= minutesToTake;
            
            if (paid_minutes >= duration) break;
          }
        }
      }
    }

    // Получаем информацию о платеже
    const payment = session.payment_id ? paymentsMap.get(session.payment_id) : null;

    result.push({
      id: session.id,
      individual_lesson_id: lessonId,
      lesson_date: session.lesson_date,
      status: session.status,
      payment_id: session.payment_id,
      is_additional: session.is_additional || false,
      notes: session.notes,
      duration,
      paid_minutes,
      payment_date: payment?.payment_date,
      payment_amount: payment?.amount,
      lessons_count: payment?.lessons_count,
      _isTemp: false
    });
  }

  return result;
};

export const useIndividualLessonSessions = (
  lessonId: string | undefined
) => {
  const queryClient = useQueryClient();

  // Realtime подписка на изменения в individual_lesson_sessions
  useEffect(() => {
    if (!lessonId) return;

    console.log('🔵 Subscribing to individual_lesson_sessions changes for lesson:', lessonId);

    const channel = supabase
      .channel(`individual_lesson_sessions_${lessonId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'individual_lesson_sessions',
          filter: `individual_lesson_id=eq.${lessonId}`
        },
        (payload) => {
          console.log('🔵 Realtime event for individual_lesson_sessions:', payload);
          // Инвалидируем и рефетчим кеш при любом изменении сессий
          queryClient.invalidateQueries({ 
            queryKey: ['individual-lesson-sessions', lessonId] 
          });
          queryClient.invalidateQueries({ 
            queryKey: ['individual-lesson-payment-stats', lessonId] 
          });
          queryClient.refetchQueries({ queryKey: ['individual-lesson-sessions', lessonId] });
          queryClient.refetchQueries({ queryKey: ['individual-lesson-payment-stats', lessonId] });
        }
      )
      .subscribe((status) => {
        console.log('🔵 Individual lesson sessions channel status:', status);
      });

    return () => {
      console.log('🔵 Unsubscribing from individual_lesson_sessions for lesson:', lessonId);
      supabase.removeChannel(channel);
    };
  }, [lessonId, queryClient]);

  // Realtime подписка на изменения платежей
  useEffect(() => {
    if (!lessonId) return;

    console.log('🟢 Subscribing to payments changes for lesson:', lessonId);

    const channel = supabase
      .channel(`payments_lesson_${lessonId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `individual_lesson_id=eq.${lessonId}`
        },
        (payload) => {
          console.log('🟢 Realtime event for payments:', payload);
          // Инвалидируем и рефетчим кеш при изменении платежей
          queryClient.invalidateQueries({ 
            queryKey: ['individual-lesson-sessions', lessonId] 
          });
          queryClient.invalidateQueries({ 
            queryKey: ['individual-lesson-payment-stats', lessonId] 
          });
          queryClient.refetchQueries({ queryKey: ['individual-lesson-sessions', lessonId] });
          queryClient.refetchQueries({ queryKey: ['individual-lesson-payment-stats', lessonId] });
        }
      )
      .subscribe((status) => {
        console.log('🟢 Payments channel status for lesson:', status);
      });

    return () => {
      console.log('🟢 Unsubscribing from payments for lesson:', lessonId);
      supabase.removeChannel(channel);
    };
  }, [lessonId, queryClient]);

  return useQuery({
    queryKey: ['individual-lesson-sessions', lessonId],
    queryFn: () => calculateLessonSessions(lessonId!),
    enabled: !!lessonId,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });
};
