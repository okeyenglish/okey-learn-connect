import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StudentLessonSession {
  id: string;
  lesson_session_id: string;
  student_id: string;
  lesson_date: string;
  attendance_status: string;
  payment_status: 'paid' | 'not_paid' | 'free' | 'bonus';
  payment_amount: number;
  is_cancelled_for_student: boolean;
  cancellation_reason: string | null;
  notes: string | null;
  _isTemp?: boolean;
  // Добавляем информацию о занятии
  start_time?: string;
  end_time?: string;
  duration?: number;
  lesson_number?: number;
}

const calculateStudentSessions = async (
  studentId: string,
  groupId: string
): Promise<StudentLessonSession[]> => {
  // Параллельно получаем все нужные данные
  const [
    groupSessionsResponse,
    studentSessionsResponse,
    paymentsResponse,
    groupStudentResponse
  ] = await Promise.all([
    // Все занятия группы (включая отмененные)
    supabase
      .from('lesson_sessions')
      .select('id, lesson_date, status, start_time, end_time, lesson_number')
      .eq('group_id', groupId)
      .order('lesson_date', { ascending: true }),
    
    // Персональные записи студента
    supabase
      .from('student_lesson_sessions')
      .select('*')
      .eq('student_id', studentId),
    
    // Все платежи студента в группе
    supabase
      .from('payments')
      .select('lessons_count, created_at')
      .eq('student_id', studentId)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true }),
    
    // Дата зачисления студента
    supabase
      .from('group_students')
      .select('enrollment_date')
      .eq('student_id', studentId)
      .eq('group_id', groupId)
      .maybeSingle()
  ]);

  if (groupSessionsResponse.error) throw groupSessionsResponse.error;
  if (studentSessionsResponse.error) throw studentSessionsResponse.error;
  if (paymentsResponse.error) throw paymentsResponse.error;

  const allSessions = groupSessionsResponse.data || [];
  const personalSessions = studentSessionsResponse.data || [];
  const payments = paymentsResponse.data || [];
  const enrollmentDate = groupStudentResponse.data?.enrollment_date 
    ? new Date(groupStudentResponse.data.enrollment_date) 
    : null;

  if (enrollmentDate) {
    enrollmentDate.setHours(0, 0, 0, 0);
  }

  // Создаем Map для быстрого поиска персональных данных
  const personalDataMap = new Map();
  personalSessions.forEach(session => {
    personalDataMap.set(session.lesson_session_id, session);
  });

  // Считаем общее количество оплаченных минут
  let remainingPaidMinutes = payments.reduce(
    (sum, p) => sum + (p.lessons_count || 0) * 40,
    0
  );

  // Функция для расчета длительности занятия
  const getDuration = (session: any): number => {
    if (session.start_time && session.end_time) {
      try {
        const [sh, sm] = String(session.start_time).split(':').map(Number);
        const [eh, em] = String(session.end_time).split(':').map(Number);
        return (eh * 60 + em) - (sh * 60 + sm);
      } catch {
        return 80;
      }
    }
    return 80;
  };

  // Фильтруем занятия с даты зачисления
  const relevantSessions = allSessions.filter(session => {
    const sessionDate = new Date(session.lesson_date);
    sessionDate.setHours(0, 0, 0, 0);
    return !enrollmentDate || sessionDate >= enrollmentDate;
  });

  // Обрабатываем каждое занятие
  const result: StudentLessonSession[] = [];
  
  for (const session of relevantSessions) {
    const personalData = personalDataMap.get(session.id);
    const duration = getDuration(session);
    
    let payment_status: 'paid' | 'not_paid' | 'free' | 'bonus' = 'not_paid';
    let is_cancelled_for_student = personalData?.is_cancelled_for_student || false;
    let cancellation_reason = personalData?.cancellation_reason || null;

    // Если занятие отменено для всей группы
    if (session.status === 'cancelled' || session.status === 'rescheduled') {
      is_cancelled_for_student = true;
      if (!cancellation_reason) {
        cancellation_reason = session.status === 'cancelled'
          ? 'Занятие отменено для всей группы'
          : 'Занятие перенесено';
      }
    }

    // Определяем статус оплаты (не списываем при отмене/бесплатном)
    const groupIsFree = (session as any).status === 'free' || 
                        (session as any).is_free || 
                        (session as any).payment_type === 'free';

    if (groupIsFree) {
      payment_status = 'free';
    } else if (is_cancelled_for_student) {
      // При отмене не списываем, сохраняем статус если был
      payment_status = (personalData?.payment_status && personalData.payment_status !== 'not_paid')
        ? personalData.payment_status
        : 'not_paid';
    } else if (personalData?.payment_status && personalData.payment_status !== 'not_paid') {
      // Если уже есть явный статус - используем его
      payment_status = personalData.payment_status;
    } else {
      // Автоматическое распределение оплаты
      if (remainingPaidMinutes >= duration) {
        payment_status = 'paid';
        remainingPaidMinutes -= duration;
      }
    }

    result.push({
      id: personalData?.id || `temp_${studentId}_${session.id}`,
      lesson_session_id: session.id,
      student_id: studentId,
      lesson_date: session.lesson_date,
      attendance_status: personalData?.attendance_status || 'not_marked',
      payment_status,
      payment_amount: personalData?.payment_amount || 0,
      is_cancelled_for_student,
      cancellation_reason,
      notes: personalData?.notes || null,
      start_time: session.start_time,
      end_time: session.end_time,
      duration,
      lesson_number: session.lesson_number,
      _isTemp: !personalData
    });
  }

  return result;
};

export const useStudentGroupLessonSessions = (
  studentId: string | undefined,
  groupId: string | undefined
) => {
  return useQuery({
    queryKey: ['student-group-lesson-sessions', studentId, groupId],
    queryFn: () => calculateStudentSessions(studentId!, groupId!),
    enabled: !!studentId && !!groupId,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });
};
