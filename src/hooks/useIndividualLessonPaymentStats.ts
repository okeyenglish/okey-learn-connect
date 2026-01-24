import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/typedClient";
import { useIndividualLessonSessions } from "./useIndividualLessonSessions";

export interface IndividualLessonPaymentStats {
  paidMinutes: number;
  paidAmount: number;
  usedMinutes: number;
  usedAmount: number;
  remainingMinutes: number;
  remainingAmount: number;
  totalCourseMinutes: number;
  unpaidMinutes: number;
  debtMinutes: number;
  debtAmount: number;
  pricePerMinute: number;
}

const fetchPaymentStats = async (
  lessonId: string,
  sessions: any[]
): Promise<IndividualLessonPaymentStats> => {
  // Получаем информацию о занятии и платежах
  const [lessonResponse, paymentsResponse, priceResponse] = await Promise.all([
    supabase
      .from('individual_lessons')
      .select('duration, student_id')
      .eq('id', lessonId)
      .single(),
    
    supabase
      .from('payments')
      .select('lessons_count, amount')
      .eq('individual_lesson_id', lessonId),
      
    supabase
      .from('course_prices')
      .select('price_per_40_min')
      .limit(1)
      .single()
  ]);

  const defaultDuration = lessonResponse.data?.duration || 60;
  const payments = paymentsResponse.data || [];
  const priceInfo = priceResponse.data;

  // Считаем общую оплаченную сумму и минуты
  // ВАЖНО: Оплата всегда в академических часах (1 а.ч. = 40 минут)
  const totalPaidMinutes = payments.reduce(
    (sum, p) => sum + (p.lessons_count || 0) * 40,
    0
  );
  const totalPaidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Цена за минуту (на основе академического часа 40 минут)
  const pricePerMinute = priceInfo?.price_per_40_min 
    ? priceInfo.price_per_40_min / 40 
    : totalPaidAmount / (totalPaidMinutes || 1);

  // Считаем использованные минуты (прошедшие или завершенные занятия)
  // Применяем коэффициенты оплаты
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let usedMinutes = 0;
  let totalCourseMinutes = 0;

  sessions.forEach(session => {
    const sessionDate = new Date(session.lesson_date);
    sessionDate.setHours(0, 0, 0, 0);
    const isPast = sessionDate < today;
    const duration = session.duration || defaultDuration;
    
    // Get payment coefficient (default 1.0)
    const paymentCoefficient = session.payment_coefficient ?? 1.0;
    const weightedDuration = duration * paymentCoefficient;

    // Не учитываем отмененные и бесплатные
    if (session.status === 'cancelled' || session.status === 'free' || session.status === 'rescheduled') {
      return;
    }

    totalCourseMinutes += weightedDuration;

    // Использованные минуты = прошедшие или завершенные
    if (isPast || session.status === 'completed') {
      usedMinutes += weightedDuration;
    }
  });

  const usedAmount = usedMinutes * pricePerMinute;
  const remainingMinutes = Math.max(0, totalPaidMinutes - usedMinutes);
  const remainingAmount = remainingMinutes * pricePerMinute;
  const unpaidMinutes = Math.max(0, totalCourseMinutes - totalPaidMinutes);
  
  // Долг = если использовано больше, чем оплачено
  const debtMinutes = Math.max(0, usedMinutes - totalPaidMinutes);
  const debtAmount = debtMinutes * pricePerMinute;

  return {
    paidMinutes: totalPaidMinutes,
    paidAmount: totalPaidAmount,
    usedMinutes,
    usedAmount,
    remainingMinutes,
    remainingAmount,
    totalCourseMinutes,
    unpaidMinutes,
    debtMinutes,
    debtAmount,
    pricePerMinute
  };
};

export const useIndividualLessonPaymentStats = (lessonId: string | undefined) => {
  const { data: sessions = [] } = useIndividualLessonSessions(lessonId);

  return useQuery({
    queryKey: ['individual-lesson-payment-stats', lessonId],
    queryFn: () => fetchPaymentStats(lessonId!, sessions),
    enabled: !!lessonId && sessions.length > 0,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });
};
