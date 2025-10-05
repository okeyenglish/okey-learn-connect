import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
    
    // Get all lesson sessions for this group
    supabase
      .from('lesson_sessions')
      .select('id, lesson_date, status, start_time, end_time')
      .eq('group_id', groupId)
      .neq('status', 'cancelled'),
    
    // Get student's session records
    supabase
      .from('student_lesson_sessions')
      .select('lesson_session_id, attendance_status, payment_status, payment_amount, is_cancelled_for_student')
      .eq('student_id', studentId),

    // Get student's enrollment date in the group
    supabase
      .from('group_students')
      .select('enrollment_date, status')
      .eq('student_id', studentId)
      .eq('group_id', groupId)
      .maybeSingle()
  ]);

  const group = groupResponse.data;
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

  // Consider only sessions after enrollment and not cancelled for student
  const effectiveSessions = (allSessions as any[]).filter((session: any) => {
    const d = new Date(session.lesson_date);
    d.setHours(0, 0, 0, 0);
    if (enrollmentDate && d < enrollmentDate) return false;
    if (cancelledForStudent.has(session.id)) return false;
    return true;
  });
  // Now fetch pricing if we have a subject
  const { data: pricing } = await supabase
    .from('group_course_prices')
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
    const avgPrice = (pricing.price_8_lessons / 8 + pricing.price_24_lessons / 24 + pricing.price_80_lessons / 80) / 3;
    const durationForPrice = pricing.duration_minutes || derivedDuration || 80;
    pricePerMinute = avgPrice / durationForPrice;
  }

  // Determine lesson duration priority: derived from sessions -> pricing -> fallback 80
  const lessonDuration = derivedDuration || pricing?.duration_minutes || 80;
  
  const totalPaidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPaidLessons = payments.reduce((sum, p) => sum + (p.lessons_count || 0), 0);
  const totalPaidMinutes = totalPaidLessons * lessonDuration;

  // Calculate used sessions - only after enrollment, not cancelled for student, and actually conducted
  const todayObj = new Date();
  todayObj.setHours(0, 0, 0, 0);
  
  // Count only sessions that are completed OR past date and not cancelled
  const usedSessionsCount = (effectiveSessions as any[]).filter((session: any) => {
    const sessionDate = new Date(session.lesson_date);
    sessionDate.setHours(0, 0, 0, 0);
    
    // Session is used if it's completed OR (past date AND not cancelled)
    return session.status === 'completed' || (sessionDate < todayObj && session.status !== 'cancelled');
  }).length;

  const usedMinutes = usedSessionsCount * lessonDuration;

  // Calculate total course minutes based on all effective sessions (after enrollment)
  const totalCourseLessons = (effectiveSessions as any[]).length || 0;
  const totalCourseMinutes = totalCourseLessons * lessonDuration;

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
  return useQuery({
    queryKey: ['student-group-payment-stats', studentId, groupId],
    queryFn: () => fetchPaymentStats(studentId!, groupId!),
    enabled: !!studentId && !!groupId,
    staleTime: 0, // Always consider stale to recalc latest balances
    gcTime: 10 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });
};
