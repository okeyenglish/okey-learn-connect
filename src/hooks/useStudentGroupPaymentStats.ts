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
      .select('id, lesson_date, status')
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

  // Calculate price per minute
  let pricePerMinute = 0;
  if (pricing) {
    const avgPrice = (pricing.price_8_lessons / 8 + pricing.price_24_lessons / 24 + pricing.price_80_lessons / 80) / 3;
    pricePerMinute = avgPrice / pricing.duration_minutes;
  }

  // Get actual lesson duration from pricing, fallback to 80 if not found
  const lessonDuration = pricing?.duration_minutes || 80;
  
  // Calculate total paid
  // IMPORTANT: lessons_count in payments table stores ACADEMIC HOURS (40 min each), not number of lessons
  const totalPaidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPaidAcademicHours = payments.reduce((sum, p) => sum + (p.lessons_count || 0), 0);
  const totalPaidMinutes = totalPaidAcademicHours * 40; // Convert academic hours to minutes

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

  return {
    paidMinutes: totalPaidMinutes,
    paidAmount: totalPaidAmount,
    usedMinutes,
    remainingMinutes,
    remainingAmount,
    totalCourseMinutes,
    unpaidMinutes
  };
};

export const useStudentGroupPaymentStats = (studentId: string | undefined, groupId: string | undefined) => {
  return useQuery({
    queryKey: ['student-group-payment-stats', studentId, groupId],
    queryFn: () => fetchPaymentStats(studentId!, groupId!),
    enabled: !!studentId && !!groupId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });
};
