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

  // Get group info
  const { data: group } = await supabase
    .from('learning_groups')
    .select('subject, capacity')
    .eq('id', groupId)
    .single();

  // Get all payments for this student in this group
  const { data: payments } = await supabase
    .from('payments')
    .select('amount, lessons_count')
    .eq('student_id', studentId)
    .eq('group_id', groupId);

  // Get pricing for this course (assume subject is the course name)
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

  // Calculate total paid
  const totalPaidAmount = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const totalPaidLessons = payments?.reduce((sum, p) => sum + (p.lessons_count || 0), 0) || 0;
  const totalPaidMinutes = totalPaidLessons * (pricing?.duration_minutes || 80);

  // Get all lesson sessions for this group to calculate total course
  const { data: allSessions } = await supabase
    .from('lesson_sessions')
    .select('id, status, payment_id')
    .eq('group_id', groupId)
    .neq('status', 'cancelled');

  // Get completed sessions for this student
  const { data: completedSessions } = await supabase
    .from('lesson_sessions')
    .select(`
      id,
      student_lesson_sessions!inner(student_id)
    `)
    .eq('group_id', groupId)
    .eq('student_lesson_sessions.student_id', studentId)
    .eq('status', 'completed');

  // Calculate used minutes (completed lessons)
  const usedMinutes = (completedSessions?.length || 0) * (pricing?.duration_minutes || 80);

  // Calculate total course minutes based on total planned sessions
  const totalCourseLessons = allSessions?.length || 80;
  const totalCourseMinutes = totalCourseLessons * (pricing?.duration_minutes || 80);

  // Calculate remaining and unpaid
  const remainingMinutes = totalPaidMinutes - usedMinutes;
  const remainingAmount = remainingMinutes * pricePerMinute;
  const unpaidMinutes = totalCourseMinutes - totalPaidMinutes;

  return {
    paidMinutes: totalPaidMinutes,
    paidAmount: totalPaidAmount,
    usedMinutes,
    remainingMinutes: Math.max(0, remainingMinutes),
    remainingAmount: Math.max(0, remainingAmount),
    totalCourseMinutes,
    unpaidMinutes: Math.max(0, unpaidMinutes)
  };
};

export const useStudentGroupPaymentStats = (studentId: string | undefined, groupId: string | undefined) => {
  return useQuery({
    queryKey: ['student-group-payment-stats', studentId, groupId],
    queryFn: () => fetchPaymentStats(studentId!, groupId!),
    enabled: !!studentId && !!groupId,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });
};
