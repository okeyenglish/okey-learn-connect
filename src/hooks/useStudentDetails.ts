import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StudentParent {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship: string;
  isPrimary: boolean;
  phoneNumbers: Array<{
    id: string;
    phone: string;
    type: string;
    isWhatsappEnabled: boolean;
    isTelegramEnabled: boolean;
  }>;
}

export interface LessonSession {
  id: string;
  lessonDate: string;
  status: string;
  lessonNumber?: number;
  duration?: number;
  paid_minutes?: number;
  payment_id?: string;
  payment_date?: string;
  payment_amount?: number;
  lessons_count?: number;
  lesson_time?: string;
}

export interface StudentGroup {
  id: string;
  groupNumber?: string;
  name: string;
  subject: string;
  level: string;
  teacher: string;
  teacherId: string;
  branch: string;
  schedule: string;
  status: string;
  enrollmentDate: string;
  format?: string;
  sessions: LessonSession[];
  course_id?: string;
  course_name?: string;
  total_lessons?: number;
  course_start_date?: string;
  zoom_link?: string;
}

export interface StudentIndividualLesson {
  id: string;
  lessonNumber?: string;
  subject: string;
  level: string;
  teacherName?: string;
  branch: string;
  duration?: number;
  pricePerLesson?: number;
  scheduleTime?: string;
  scheduleDays?: string[];
  periodStart?: string;
  periodEnd?: string;
  status: string;
  nextLesson?: string;
  format?: string;
  sessions: LessonSession[];
  isFlexibleSchedule?: boolean;
  auditLocation?: string;
  paymentMethod?: string;
  teacherRate?: number;
  breakMinutes?: number;
  responsibleManager?: string;
}

export interface StudentPayment {
  id: string;
  amount: number;
  date: string;
  description: string;
  status: string;
  paymentMethod?: string;
  individualLessonId?: string;
  lessonsCount?: number;
}

export interface StudentAttendance {
  id: string;
  date: string;
  lessonTitle: string;
  status: 'attended' | 'absent' | 'late' | 'excused';
  absenceReason?: string;
  groupName: string;
}

export interface StudentSubscription {
  id: string;
  planName: string;
  lessonsTotal: number;
  lessonsUsed: number;
  lessonsRemaining: number;
  startDate: string;
  endDate: string;
  status: string;
  price: number;
}

export interface StudentFullDetails {
  id: string;
  studentNumber?: string;
  name: string;
  firstName: string;
  lastName: string;
  middleName: string;
  age?: number;
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  avatar_url?: string;
  phone?: string;
  email?: string;
  lkEnabled?: boolean;
  lkEmail?: string;
  status: string;
  notes?: string;
  branch?: string;
  category?: string;
  level?: string;
  createdAt: string;
  familyGroupId?: string;
  parents: StudentParent[];
  groups: StudentGroup[];
  individualLessons: StudentIndividualLesson[];
  payments: StudentPayment[];
  attendance: StudentAttendance[];
  subscriptions: StudentSubscription[];
  payer?: {
    id: string;
    name: string;
    relationship: 'parent' | 'guardian' | 'self' | 'other';
    phone?: string;
    email?: string;
    paymentMethod?: 'cash' | 'card' | 'transfer' | 'online';
  };
}

export const useStudentDetails = (studentId: string) => {
  // Helper function to calculate duration from time strings
  const calculateDuration = (startTime?: string, endTime?: string): number => {
    if (!startTime || !endTime) return 60;
    
    try {
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      return (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    } catch {
      return 60;
    }
  };

  return useQuery({
    queryKey: ['student-details', studentId],
    queryFn: async (): Promise<StudentFullDetails | null> => {
      if (!studentId) return null;

      // Fetch student basic info
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;
      if (!student) return null;

      const studentData = student as any;

      // Fetch family members (parents/guardians)
      let parents: StudentParent[] = [];
      if (studentData.family_group_id) {
        const { data: familyMembers, error: familyError } = await supabase
          .from('family_members')
          .select(`
            *,
            clients:client_id (
              id,
              name,
              phone,
              email
            )
          `)
          .eq('family_group_id', studentData.family_group_id);

        if (!familyError && familyMembers) {
          // Дедупликация по client_id - убираем дубликаты родителей
          const uniqueFamilyMembers = Array.from(
            new Map(
              familyMembers
                .filter((member: any) => member.clients) // Только записи с валидными клиентами
                .map((member: any) => [member.client_id, member])
            ).values()
          );

          // Fetch phone numbers for each parent
          const parentsWithPhones = await Promise.all(
            uniqueFamilyMembers.map(async (member: any) => {
              const { data: phones } = await supabase
                .from('client_phone_numbers')
                .select('*')
                .eq('client_id', member.client_id);

              return {
                id: member.client_id,
                name: member.clients?.name || 'Не указано',
                phone: member.clients?.phone || '',
                email: member.clients?.email,
                relationship: member.relationship_type,
                isPrimary: member.is_primary_contact,
                phoneNumbers: (phones || []).map(p => ({
                  id: p.id,
                  phone: p.phone,
                  type: p.phone_type,
                  isWhatsappEnabled: p.is_whatsapp_enabled || false,
                  isTelegramEnabled: p.is_telegram_enabled || false,
                })),
              };
            })
          );
          parents = parentsWithPhones;
        }
      }

      // Fetch student groups
      const { data: groupStudents } = await supabase
        .from('group_students')
        .select(`
          *,
          learning_groups (
            id,
            name,
            subject,
            level,
            branch,
            status,
            category,
            group_number,
            responsible_teacher,
            course_id,
            total_lessons,
            course_start_date,
            zoom_link,
            courses:course_id (
              title
            )
          )
        `)
        .eq('student_id', studentId);

      // Собираем оплаты по группам для расчета оплаченных занятий
      const { data: paymentsByGroup } = await supabase
        .from('payments')
        .select('group_id, lessons_count')
        .eq('student_id', studentId)
        .not('group_id', 'is', null);
      const paidAcademicHoursMap = new Map<string, number>();
      (paymentsByGroup || []).forEach((p: any) => {
        if (!p.group_id) return;
        const current = paidAcademicHoursMap.get(p.group_id) || 0;
        paidAcademicHoursMap.set(p.group_id, current + (p.lessons_count || 0));
      });

      // Fetch lesson sessions for each group
      const groups: StudentGroup[] = await Promise.all(
        (groupStudents || []).map(async (gs: any) => {
          const groupId = gs.learning_groups?.id;
          let sessions: LessonSession[] = [];

          if (groupId) {
            const { data: sessionsData } = await supabase
              .from('lesson_sessions')
              .select(`
                id, 
                lesson_date, 
                status, 
                lesson_number, 
                paid_minutes,
                payment_id,
                payment_date,
                payment_amount,
                lessons_count,
                start_time,
                end_time
              `)
              .eq('group_id', groupId)
              .order('lesson_date', { ascending: true });

            const enrollDate = gs.enrollment_date ? new Date(gs.enrollment_date) : null;
            if (enrollDate) enrollDate.setHours(0, 0, 0, 0);

            // Сумма оплаченных академических часов по группе
            const totalPaidAcademicHours = paidAcademicHoursMap.get(groupId) || 0;
            let remainingPaidMinutes = totalPaidAcademicHours * 40;

            console.log('Group enrollment check:', {
              groupId: groupId,
              studentId: studentId,
              enrollmentDate: gs.enrollment_date,
              enrollDate: enrollDate?.toISOString(),
              totalPaidAcademicHours
            });

            // Сортируем занятия и распределяем оплаченные минуты после зачисления
            const sortedSessions = (sessionsData || []).sort((a: any, b: any) =>
              new Date(a.lesson_date).getTime() - new Date(b.lesson_date).getTime()
            );

            sessions = sortedSessions.map((s: any) => {
              const sessionDate = new Date(s.lesson_date);
              sessionDate.setHours(0, 0, 0, 0);
              const beforeEnrollment = enrollDate && sessionDate < enrollDate;
              const duration = s.duration || calculateDuration(s.start_time, s.end_time);
              const computedStatus = beforeEnrollment ? 'cancelled' : (s.status || 'scheduled');

              // Распределяем оплаченные минуты последовательно после даты зачисления
              let paid_minutes = 0;
              if (!beforeEnrollment && remainingPaidMinutes > 0) {
                paid_minutes = Math.min(duration, remainingPaidMinutes);
                remainingPaidMinutes -= paid_minutes;
              }

              return {
                id: s.id,
                lessonDate: s.lesson_date,
                status: computedStatus,
                lessonNumber: s.lesson_number,
                duration,
                paid_minutes,
                payment_id: s.payment_id,
                payment_date: s.payment_date,
                payment_amount: s.payment_amount,
                lessons_count: s.lessons_count,
                lesson_time: s.start_time && s.end_time ? `${s.start_time}-${s.end_time}` : undefined,
              };
            });
          }

          const category = gs.learning_groups?.category || 'group';
          let format = 'Групповое';
          if (category === 'mini') format = 'Мини-группа';
          else if (category === 'individual') format = 'Индивидуальное';

          return {
            id: groupId || '',
            groupNumber: gs.learning_groups?.group_number,
            name: gs.learning_groups?.name || '',
            subject: gs.learning_groups?.subject || '',
            level: gs.learning_groups?.level || '',
            teacher: gs.learning_groups?.responsible_teacher || 'Не назначен',
            teacherId: '',
            branch: gs.learning_groups?.branch || '',
            schedule: '',
            status: gs.status,
            enrollmentDate: gs.enrollment_date,
            format,
            sessions,
            course_id: gs.learning_groups?.course_id,
            course_name: gs.learning_groups?.courses?.title || null,
            total_lessons: gs.learning_groups?.total_lessons,
            course_start_date: gs.learning_groups?.course_start_date,
            zoom_link: gs.learning_groups?.zoom_link,
          };
        })
      );

      // Fetch individual lessons
      const { data: individualLessonsData } = await supabase
        .from('individual_lessons')
        .select('*')
        .eq('student_id', studentId)
        .eq('is_active', true);

      // For individual lessons, we need to fetch sessions from individual_lesson_sessions
      const individualLessons: StudentIndividualLesson[] = await Promise.all(
        (individualLessonsData || []).map(async (il: any) => {
          // Fetch sessions for this individual lesson
          const { data: lessonSessions } = await supabase
            .from('individual_lesson_sessions')
            .select('id, lesson_date, status, notes')
            .eq('individual_lesson_id', il.id)
            .order('lesson_date', { ascending: true });

          const sessions: LessonSession[] = (lessonSessions || []).map((ls: any) => ({
            id: ls.id,
            lessonDate: ls.lesson_date,
            status: ls.status,
          }));

          // Определяем статус: приоритет у статуса из БД (ручная архивация/разархивация)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Проверяем наличие запланированных занятий в будущем
          const hasFutureLessons = sessions.some((session) => {
            const lessonDate = new Date(session.lessonDate);
            lessonDate.setHours(0, 0, 0, 0);
            return lessonDate >= today && session.status === 'scheduled';
          });

          let lessonStatus: string;

          // 1) Если явно архивирован в БД
          if (il.status === 'finished') {
            lessonStatus = 'finished';
          // 2) Если явно активен в БД — считаем активным даже без будущих занятий
          } else if (il.status === 'active') {
            lessonStatus = 'active';
          // 3) Если в БД "формируется", уважаем это состояние
          } else if (il.status === 'forming') {
            lessonStatus = 'forming';
          // 4) Если есть будущие занятия — активен
          } else if (hasFutureLessons) {
            lessonStatus = 'active';
          } else {
            // 5) Иначе определяем по дате начала
            if (il.period_start) {
              const startDate = new Date(il.period_start);
              startDate.setHours(0, 0, 0, 0);
              lessonStatus = (today < startDate) ? 'forming' : 'finished';
            } else {
              lessonStatus = 'finished';
            }
          }

          return {
            id: il.id,
            lessonNumber: il.lesson_number,
            subject: il.subject || 'Не указан',
            level: il.level || 'Не указан',
            teacherName: il.teacher_name,
            branch: il.branch || 'Не указан',
            duration: il.duration || 60,
            pricePerLesson: il.price_per_lesson,
            scheduleTime: il.schedule_time,
            scheduleDays: il.schedule_days,
            periodStart: il.period_start,
            periodEnd: il.period_end,
            status: lessonStatus,
            nextLesson: undefined,
            format: 'Индивидуальное',
            sessions,
            isFlexibleSchedule: il.is_flexible_schedule,
            auditLocation: il.audit_location,
            paymentMethod: il.payment_method,
            teacherRate: il.teacher_rate,
            breakMinutes: il.break_minutes,
            responsibleManager: il.responsible_manager,
          };
        })
      );

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false })
        .limit(20);

      const payments: StudentPayment[] = (paymentsData || []).map(p => ({
        id: p.id,
        amount: p.amount,
        date: p.payment_date,
        description: p.description || 'Оплата обучения',
        status: p.status,
        paymentMethod: p.method,
        individualLessonId: (p as any).individual_lesson_id,
        lessonsCount: (p as any).lessons_count,
      }));

      // Fetch payer information
      const { data: payerData } = await supabase
        .from('student_payers')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();

      // Attendance - использем mock данные, так как таблица может не существовать
      const attendance: StudentAttendance[] = [];

      // Subscriptions - используем mock данные, так как структура может отличаться
      const subscriptions: StudentSubscription[] = [];

      return {
        id: studentData.id,
        studentNumber: studentData.student_number,
        name: studentData.name,
        firstName: studentData.first_name || studentData.name.split(' ')[1] || '',
        lastName: studentData.last_name || studentData.name.split(' ')[0] || '',
        middleName: studentData.middle_name || studentData.name.split(' ')[2] || '',
        age: studentData.age,
        dateOfBirth: studentData.date_of_birth,
        gender: studentData.gender as 'male' | 'female' | undefined,
        avatar_url: studentData.avatar_url,
        phone: studentData.phone,
        email: (studentData as any).email,
        lkEnabled: (studentData as any).lk_enabled,
        lkEmail: studentData.lk_email,
        status: studentData.status,
        notes: studentData.notes,
        branch: (studentData as any).branch,
        category: undefined,
        level: undefined,
        createdAt: studentData.created_at,
        familyGroupId: studentData.family_group_id,
        parents,
        groups,
        individualLessons: individualLessons || [],
        payments,
        attendance,
        subscriptions,
        payer: payerData ? {
          id: (payerData as any).id,
          name: `${(payerData as any).last_name} ${(payerData as any).first_name}`,
          relationship: (payerData as any).relationship,
          phone: (payerData as any).phone,
          email: (payerData as any).email,
          paymentMethod: (payerData as any).payment_method,
        } : undefined,
      };
    },
    enabled: !!studentId,
  });
};
