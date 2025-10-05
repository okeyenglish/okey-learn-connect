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
  const [groupResponse, paymentsResponse, pricingResponse, allSessionsResponse, studentSessionsResponse] = await Promise.all([
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
      .select('lesson_session_id, attendance_status, payment_status, payment_amount')
      .eq('student_id', studentId)
  ]);

  const group = groupResponse.data;
  const payments = paymentsResponse.data || [];
  const allSessions = allSessionsResponse.data || [];
  const studentSessions = studentSessionsResponse.data || [];

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
  const totalPaidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPaidLessons = payments.reduce((sum, p) => sum + (p.lessons_count || 0), 0);
  const totalPaidMinutes = totalPaidLessons * lessonDuration;

  // Calculate used sessions - sessions that have passed or are completed
  const today = new Date().toISOString().split('T')[0];
  const usedSessionsCount = allSessions.filter(session => {
    const sessionDate = session.lesson_date;
    return session.status === 'completed' || (sessionDate < today && session.status !== 'cancelled');
  }).length;

  const usedMinutes = usedSessionsCount * lessonDuration;

  // Calculate total course minutes based on total planned sessions
  const totalCourseLessons = allSessions.length || 0;
  const totalCourseMinutes = totalCourseLessons * lessonDuration;

  // Calculate remaining and unpaid
  const remainingMinutes = Math.max(0, totalPaidMinutes - usedMinutes);
  const remainingAmount = Math.max(0, remainingMinutes * pricePerMinute);
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
