import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';

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

export interface HolihopeMetadata {
  Id?: number;
  ClientId?: number;
  // Other fields from HoliHope API are stored but not typed
  [key: string]: unknown;
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
  externalId?: string;
  holihopeMetadata?: HolihopeMetadata;
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

/** DB row for student */
interface StudentRow {
  id: string;
  student_number?: string | null;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  age?: number | null;
  date_of_birth?: string | null;
  gender?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  email?: string | null;
  lk_enabled?: boolean | null;
  lk_email?: string | null;
  status: string;
  notes?: string | null;
  branch?: string | null;
  created_at: string;
  family_group_id?: string | null;
  external_id?: string | null;
  holihope_metadata?: HolihopeMetadata | null;
}

/** DB row for family member with client join */
interface FamilyMemberRow {
  client_id: string;
  relationship_type: string;
  is_primary_contact: boolean;
  clients?: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
}

/** DB row for phone number */
interface PhoneNumberRow {
  id: string;
  phone: string;
  phone_type: string;
  is_whatsapp_enabled: boolean | null;
  is_telegram_enabled: boolean | null;
}

/** DB row for group student with learning_groups join */
interface GroupStudentRow {
  student_id: string;
  enrollment_date: string;
  status: string;
  learning_groups?: {
    id: string;
    name: string | null;
    subject: string | null;
    level: string | null;
    branch: string | null;
    status: string | null;
    category: string | null;
    group_number: string | null;
    responsible_teacher: string | null;
    course_id: string | null;
    total_lessons: number | null;
    course_start_date: string | null;
    zoom_link: string | null;
    courses?: { title: string | null } | null;
  } | null;
}

/** DB row for lesson session */
interface LessonSessionRow {
  id: string;
  lesson_date: string;
  status: string | null;
  lesson_number: number | null;
  duration?: number | null;
  paid_minutes: number | null;
  payment_id: string | null;
  payment_date: string | null;
  payment_amount: number | null;
  lessons_count: number | null;
  start_time: string | null;
  end_time: string | null;
}

/** DB row for payment */
interface PaymentRow {
  id: string;
  amount: number;
  payment_date: string;
  description: string | null;
  status: string;
  method: string | null;
  group_id: string | null;
  lessons_count: number | null;
  individual_lesson_id: string | null;
}

/** DB row for individual lesson */
interface IndividualLessonRow {
  id: string;
  lesson_number?: string | null;
  subject: string | null;
  level: string | null;
  teacher_name?: string | null;
  branch: string | null;
  duration: number | null;
  price_per_lesson: number | null;
  schedule_time: string | null;
  schedule_days: string[] | null;
  period_start: string | null;
  period_end: string | null;
  status: string | null;
  is_flexible_schedule: boolean | null;
  audit_location: string | null;
  payment_method: string | null;
  teacher_rate: number | null;
  break_minutes: number | null;
  responsible_manager: string | null;
}

/** DB row for individual lesson session */
interface IndividualLessonSessionRow {
  id: string;
  lesson_date: string;
  status: string | null;
  notes: string | null;
}

/** DB row for student payer */
interface StudentPayerRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  payment_method: string | null;
}

export const useStudentDetails = (studentId: string) => {
  // Helper function to calculate duration from time strings
  const calculateDuration = (startTime?: string | null, endTime?: string | null): number => {
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
      const { data: studentRaw, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;
      if (!studentRaw) return null;

      const studentData = studentRaw as unknown as StudentRow;

      // Fetch family members (parents/guardians)
      let parents: StudentParent[] = [];
      if (studentData.family_group_id) {
        const { data: familyMembersRaw, error: familyError } = await supabase
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

        if (!familyError && familyMembersRaw) {
          const familyMembers = familyMembersRaw as unknown as FamilyMemberRow[];

          // Дедупликация по client_id - убираем дубликаты родителей
          const uniqueFamilyMembers = Array.from(
            new Map(
              familyMembers
                .filter((member) => member.clients) // Только записи с валидными клиентами
                .map((member) => [member.client_id, member])
            ).values()
          );

          // Fetch phone numbers for each parent
          const parentsWithPhones = await Promise.all(
            uniqueFamilyMembers.map(async (member) => {
              const { data: phonesRaw } = await supabase
                .from('client_phone_numbers')
                .select('*')
                .eq('client_id', member.client_id);

              const phones = (phonesRaw || []) as unknown as PhoneNumberRow[];

              return {
                id: member.client_id,
                name: member.clients?.name || 'Не указано',
                phone: member.clients?.phone || '',
                email: member.clients?.email ?? undefined,
                relationship: member.relationship_type,
                isPrimary: member.is_primary_contact,
                phoneNumbers: phones.map(p => ({
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
      const { data: groupStudentsRaw } = await supabase
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

      const groupStudents = (groupStudentsRaw || []) as unknown as GroupStudentRow[];

      // Собираем оплаты по группам для расчета оплаченных занятий
      const { data: paymentsByGroupRaw } = await supabase
        .from('payments')
        .select('group_id, lessons_count')
        .eq('student_id', studentId)
        .not('group_id', 'is', null);

      const paymentsByGroup = (paymentsByGroupRaw || []) as unknown as PaymentRow[];
      const paidAcademicHoursMap = new Map<string, number>();
      paymentsByGroup.forEach((p) => {
        if (!p.group_id) return;
        const current = paidAcademicHoursMap.get(p.group_id) || 0;
        paidAcademicHoursMap.set(p.group_id, current + (p.lessons_count || 0));
      });

      // Fetch lesson sessions for each group
      const groups: StudentGroup[] = await Promise.all(
        groupStudents.map(async (gs) => {
          const groupId = gs.learning_groups?.id;
          let sessions: LessonSession[] = [];

          if (groupId) {
            const { data: sessionsDataRaw } = await supabase
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

            const sessionsData = (sessionsDataRaw || []) as unknown as LessonSessionRow[];

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
            const sortedSessions = sessionsData.sort((a, b) =>
              new Date(a.lesson_date).getTime() - new Date(b.lesson_date).getTime()
            );

            sessions = sortedSessions.map((s) => {
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
                lessonNumber: s.lesson_number ?? undefined,
                duration,
                paid_minutes,
                payment_id: s.payment_id ?? undefined,
                payment_date: s.payment_date ?? undefined,
                payment_amount: s.payment_amount ?? undefined,
                lessons_count: s.lessons_count ?? undefined,
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
            groupNumber: gs.learning_groups?.group_number ?? undefined,
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
            course_id: gs.learning_groups?.course_id ?? undefined,
            course_name: gs.learning_groups?.courses?.title ?? undefined,
            total_lessons: gs.learning_groups?.total_lessons ?? undefined,
            course_start_date: gs.learning_groups?.course_start_date ?? undefined,
            zoom_link: gs.learning_groups?.zoom_link ?? undefined,
          };
        })
      );

      // Fetch individual lessons
      const { data: individualLessonsDataRaw } = await supabase
        .from('individual_lessons')
        .select('*')
        .eq('student_id', studentId)
        .eq('is_active', true);

      const individualLessonsData = (individualLessonsDataRaw || []) as unknown as IndividualLessonRow[];

      // For individual lessons, we need to fetch sessions from individual_lesson_sessions
      const individualLessons: StudentIndividualLesson[] = await Promise.all(
        individualLessonsData.map(async (il) => {
          // Fetch sessions for this individual lesson
          const { data: lessonSessionsRaw } = await supabase
            .from('individual_lesson_sessions')
            .select('id, lesson_date, status, notes')
            .eq('individual_lesson_id', il.id)
            .order('lesson_date', { ascending: true });

          const lessonSessions = (lessonSessionsRaw || []) as unknown as IndividualLessonSessionRow[];

          const sessions: LessonSession[] = lessonSessions.map((ls) => ({
            id: ls.id,
            lessonDate: ls.lesson_date,
            status: ls.status || 'scheduled',
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
            lessonNumber: il.lesson_number ?? undefined,
            subject: il.subject || 'Не указан',
            level: il.level || 'Не указан',
            teacherName: il.teacher_name ?? undefined,
            branch: il.branch || 'Не указан',
            duration: il.duration || 60,
            pricePerLesson: il.price_per_lesson ?? undefined,
            scheduleTime: il.schedule_time ?? undefined,
            scheduleDays: il.schedule_days ?? undefined,
            periodStart: il.period_start ?? undefined,
            periodEnd: il.period_end ?? undefined,
            status: lessonStatus,
            nextLesson: undefined,
            format: 'Индивидуальное',
            sessions,
            isFlexibleSchedule: il.is_flexible_schedule ?? undefined,
            auditLocation: il.audit_location ?? undefined,
            paymentMethod: il.payment_method ?? undefined,
            teacherRate: il.teacher_rate ?? undefined,
            breakMinutes: il.break_minutes ?? undefined,
            responsibleManager: il.responsible_manager ?? undefined,
          };
        })
      );

      // Fetch payments
      const { data: paymentsDataRaw } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false })
        .limit(20);

      const paymentsData = (paymentsDataRaw || []) as unknown as PaymentRow[];

      const payments: StudentPayment[] = paymentsData.map(p => ({
        id: p.id,
        amount: p.amount,
        date: p.payment_date,
        description: p.description || 'Оплата обучения',
        status: p.status,
        paymentMethod: p.method ?? undefined,
        individualLessonId: p.individual_lesson_id ?? undefined,
        lessonsCount: p.lessons_count ?? undefined,
      }));

      // Fetch payer information
      const { data: payerDataRaw } = await supabase
        .from('student_payers')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();

      const payerData = payerDataRaw as unknown as StudentPayerRow | null;

      // Attendance - используем mock данные, так как таблица может не существовать
      const attendance: StudentAttendance[] = [];

      // Subscriptions - используем mock данные, так как структура может отличаться
      const subscriptions: StudentSubscription[] = [];

      return {
        id: studentData.id,
        studentNumber: studentData.student_number ?? undefined,
        name: studentData.name,
        firstName: studentData.first_name || studentData.name.split(' ')[1] || '',
        lastName: studentData.last_name || studentData.name.split(' ')[0] || '',
        middleName: studentData.middle_name || studentData.name.split(' ')[2] || '',
        age: studentData.age ?? undefined,
        dateOfBirth: studentData.date_of_birth ?? undefined,
        gender: studentData.gender as 'male' | 'female' | undefined,
        avatar_url: studentData.avatar_url ?? undefined,
        phone: studentData.phone ?? undefined,
        email: studentData.email ?? undefined,
        lkEnabled: studentData.lk_enabled ?? undefined,
        lkEmail: studentData.lk_email ?? undefined,
        status: studentData.status,
        notes: studentData.notes ?? undefined,
        branch: studentData.branch ?? undefined,
        category: undefined,
        level: undefined,
        createdAt: studentData.created_at,
        familyGroupId: studentData.family_group_id ?? undefined,
        externalId: studentData.external_id ?? undefined,
        holihopeMetadata: studentData.holihope_metadata ?? undefined,
        parents,
        groups,
        individualLessons: individualLessons || [],
        payments,
        attendance,
        subscriptions,
        payer: payerData ? {
          id: payerData.id,
          name: `${payerData.last_name || ''} ${payerData.first_name || ''}`.trim(),
          relationship: (payerData.relationship as 'parent' | 'guardian' | 'self' | 'other') ?? 'other',
          phone: payerData.phone ?? undefined,
          email: payerData.email ?? undefined,
          paymentMethod: (payerData.payment_method as 'cash' | 'card' | 'transfer' | 'online') ?? undefined,
        } : undefined,
      };
    },
    enabled: !!studentId,
  });
};
