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

  // Get actual lesson duration from pricing, fallback to 60 if not found
  const lessonDuration = pricing?.duration_minutes || 60;
  
  // Calculate total paid
  const totalPaidAmount = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const totalPaidLessons = payments?.reduce((sum, p) => sum + (p.lessons_count || 0), 0) || 0;
  const totalPaidMinutes = totalPaidLessons * lessonDuration;

  // Get all lesson sessions for this group to calculate total course
  const { data: allSessions } = await supabase
    .from('lesson_sessions')
    .select('id, status, payment_id')
    .eq('group_id', groupId)
    .neq('status', 'cancelled');

  // Get sessions that should be counted as "used" for this student
  // Include: completed sessions OR sessions with past dates (already happened)
  const { data: completedSessions } = await supabase
    .from('lesson_sessions')
    .select(`
      id,
      lesson_date,
      status,
      student_lesson_sessions!inner(student_id)
    `)
    .eq('group_id', groupId)
    .eq('student_lesson_sessions.student_id', studentId)
    .or(`status.eq.completed,and(lesson_date.lt.${new Date().toISOString().split('T')[0]},status.neq.cancelled)`);
  
  // Filter out cancelled sessions
  const usedSessions = completedSessions?.filter(s => s.status !== 'cancelled') || [];

  // Calculate used minutes (completed or past-date lessons with actual duration)
  const usedMinutes = usedSessions.length * lessonDuration;

  // Calculate total course minutes based on total planned sessions
  const totalCourseLessons = allSessions?.length || 80;
  const totalCourseMinutes = totalCourseLessons * lessonDuration;

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
