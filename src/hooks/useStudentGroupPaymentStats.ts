import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/typedClient";
import { useStudentGroupLessonSessions } from "./useStudentGroupLessonSessions";
import { useEffect } from "react";

interface PaymentStats {
  paidMinutes: number;
  paidAmount: number;
  usedMinutes: number;
  remainingMinutes: number;
  remainingAmount: number;
  totalCourseMinutes: number;
  unpaidMinutes: number;
  debtMinutes: number;
  debtAmount: number;
}

const fetchPaymentStats = async (studentId: string, groupId: string): Promise<PaymentStats> => {
  // Single query to get all data at once
  const [groupResponse, paymentsResponse, pricingResponse, allSessionsResponse, studentSessionsResponse, groupStudentResponse] = await Promise.all([
    // Get group info
    supabase
      .from('learning_groups')
      .select('subject, capacity')
      .eq('id', groupId)
      .single(),
    
    // Get all payments for this student in this group
    supabase
      .from('payments')
      .select('amount, lessons_count')
      .eq('student_id', studentId)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true }),
    
    // Defer pricing fetch - will do conditionally
    Promise.resolve({ data: null }),
    
    // Get all lesson sessions for this group (including cancelled)
    supabase
      .from('lesson_sessions')
      .select('id, lesson_date, status, start_time, end_time')
      .eq('group_id', groupId),
    
    // Get student's session records
    supabase
      .from('student_lesson_sessions')
      .select('lesson_session_id, attendance_status, payment_status, payment_amount, is_cancelled_for_student, payment_coefficient')
      .eq('student_id', studentId),

    // Get student's enrollment date in the group
    supabase
      .from('group_students')
      .select('enrollment_date, status')
      .eq('student_id', studentId)
      .eq('group_id', groupId)
      .maybeSingle()
  ]);

  const group = groupResponse.data as any;
  const payments = paymentsResponse.data || [];
  const allSessions = allSessionsResponse.data || [];
  const studentSessions = studentSessionsResponse.data || [];
  const groupStudent = groupStudentResponse.data as { enrollment_date?: string } | null;

  // Enrollment date normalization
  const enrollmentDate = groupStudent?.enrollment_date ? new Date(groupStudent.enrollment_date) : null;
  if (enrollmentDate) enrollmentDate.setHours(0, 0, 0, 0);

  // Build a set of sessions cancelled for this student
  const cancelledForStudent = new Set(
    (studentSessions as any[]).filter(s => s.is_cancelled_for_student).map(s => s.lesson_session_id)
  );

  // Build a set of sessions marked free/bonus for this student
  const freeForStudent = new Set(
    (studentSessions as any[])
      .filter(s => s.payment_status === 'free' || s.payment_status === 'bonus')
      .map(s => s.lesson_session_id)
  );

  // Build a map of session payment coefficients
  const sessionCoefficients = new Map<string, number>(
    (studentSessions as any[])
      .filter(s => s.payment_coefficient != null)
      .map(s => [s.lesson_session_id, Number(s.payment_coefficient)])
  );

  // Consider only sessions after enrollment and not cancelled (global or for student) and not free
  const effectiveSessions = (allSessions as any[]).filter((session: any) => {
    const d = new Date(session.lesson_date);
    d.setHours(0, 0, 0, 0);
    if (enrollmentDate && d < enrollmentDate) return false;
    if (session.status === 'cancelled' || cancelledForStudent.has(session.id)) return false;
    if ((session as any).status === 'free' || freeForStudent.has(session.id)) return false;
    return true;
  });
  // Now fetch pricing if we have a subject
  const { data: pricing } = await (supabase
    .from('group_course_prices' as any) as any)
    .select('duration_minutes, price_8_lessons, price_24_lessons, price_80_lessons')
    .eq('course_name', group?.subject || '')
    .maybeSingle();

  // Try to derive actual lesson duration from sessions (start/end time)
  const sessionDurations = (effectiveSessions as any[])
    .map((s: any) => {
      if (!s.start_time || !s.end_time) return null;
      try {
        const [sh, sm] = String(s.start_time).split(':').map(Number);
        const [eh, em] = String(s.end_time).split(':').map(Number);
        return (eh * 60 + em) - (sh * 60 + sm);
      } catch {
        return null;
      }
    })
    .filter((v: number | null): v is number => typeof v === 'number' && v > 0);
  const derivedDuration = sessionDurations.length
    ? Math.round(sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length)
    : undefined;

  // Calculate price per minute
  let pricePerMinute = 0;
  if (pricing) {
    const pricingData = pricing as any;
    const avgPrice = (pricingData.price_8_lessons / 8 + pricingData.price_24_lessons / 24 + pricingData.price_80_lessons / 80) / 3;
    const durationForPrice = pricingData.duration_minutes || derivedDuration || 80;
    pricePerMinute = avgPrice / durationForPrice;
  }

  // Determine lesson duration priority: derived from sessions -> pricing -> fallback 80
  const lessonDuration = derivedDuration || (pricing as any)?.duration_minutes || 80;
  
  const totalPaidAmount = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const totalPaidAcademicHours = payments.reduce((sum: number, p: any) => sum + (p.lessons_count || 0), 0);
  const totalPaidMinutes = totalPaidAcademicHours * 40;

  // Calculate used sessions - only after enrollment, not cancelled for student, and actually conducted
  const todayObj = new Date();
  todayObj.setHours(0, 0, 0, 0);
  
  // Count only sessions that are completed OR past date and not cancelled
  // Apply payment coefficients when calculating usage
  let usedMinutesWeighted = 0;
  let totalCourseMinutesWeighted = 0;
  
  (effectiveSessions as any[]).forEach((session: any) => {
    const sessionDate = new Date(session.lesson_date);
    sessionDate.setHours(0, 0, 0, 0);
    
    // Get coefficient for this session (default 1.0)
    const coefficient = sessionCoefficients.get(session.id) ?? 1.0;
    const weightedDuration = lessonDuration * coefficient;
    
    totalCourseMinutesWeighted += weightedDuration;
    
    // Session is used if it's completed OR (past date AND not cancelled)
    if (session.status === 'completed' || (sessionDate < todayObj && session.status !== 'cancelled')) {
      usedMinutesWeighted += weightedDuration;
    }
  });

  const usedMinutes = usedMinutesWeighted;
  const totalCourseMinutes = totalCourseMinutesWeighted;

  // Calculate remaining academic hours and money
  // Remaining = paid - used
  const remainingMinutes = Math.max(0, totalPaidMinutes - usedMinutes);
  
  // Remaining amount = (total paid / paid minutes) * remaining minutes
  const remainingAmount = totalPaidMinutes > 0 
    ? Math.max(0, (totalPaidAmount / totalPaidMinutes) * remainingMinutes)
    : 0;
    
  const unpaidMinutes = Math.max(0, totalCourseMinutes - totalPaidMinutes);

  // Calculate debt: if used more than paid, student owes money
  const debtMinutes = Math.max(0, usedMinutes - totalPaidMinutes);
  // For debt, always use course price from price list, not actual paid price
  const debtAmount = debtMinutes * pricePerMinute;

  return {
    paidMinutes: totalPaidMinutes,
    paidAmount: totalPaidAmount,
    usedMinutes,
    remainingMinutes,
    remainingAmount,
    totalCourseMinutes,
    unpaidMinutes,
    debtMinutes,
    debtAmount
  };
};

export const useStudentGroupPaymentStats = (studentId: string | undefined, groupId: string | undefined) => {
  const queryClient = useQueryClient();
  
  // Используем централизованный хук для получения занятий
  const { data: sessions } = useStudentGroupLessonSessions(studentId, groupId);
  
  // Realtime подписка на изменения платежей для этого студента и группы
  useEffect(() => {
    if (!studentId || !groupId) return;

    console.log('💰 Subscribing to payments changes for payment stats:', { studentId, groupId });

    const channel = supabase
      .channel(`payment_stats_${studentId}_${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `student_id=eq.${studentId}`
        },
        (payload) => {
          console.log('💰 Realtime payment event for stats:', payload);
          // Немедленно инвалидируем и рефетчим при изменении платежей
          queryClient.invalidateQueries({ 
            queryKey: ['student-group-payment-stats', studentId, groupId] 
          });
          queryClient.refetchQueries({ 
            queryKey: ['student-group-payment-stats', studentId, groupId] 
          });
        }
      )
      .subscribe((status) => {
        console.log('💰 Payment stats channel status:', status);
      });

    return () => {
      console.log('💰 Unsubscribing from payments for stats:', { studentId, groupId });
      supabase.removeChannel(channel);
    };
  }, [studentId, groupId, queryClient]);
  
  return useQuery({
    queryKey: ['student-group-payment-stats', studentId, groupId],
    queryFn: () => fetchPaymentStats(studentId!, groupId!),
    enabled: !!studentId && !!groupId,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });
};
