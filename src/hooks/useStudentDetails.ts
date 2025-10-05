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
  phone?: string;
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

      // Fetch family members (parents/guardians)
      let parents: StudentParent[] = [];
      if (student.family_group_id) {
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
          .eq('family_group_id', student.family_group_id);

        if (!familyError && familyMembers) {
          // Fetch phone numbers for each parent
          const parentsWithPhones = await Promise.all(
            familyMembers.map(async (member: any) => {
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

            console.log('Group enrollment check:', {
              groupId: groupId,
              studentId: studentId,
              enrollmentDate: gs.enrollment_date,
              enrollDate: enrollDate?.toISOString(),
            });

            sessions = (sessionsData || []).map((s: any) => {
              const sessionDate = new Date(s.lesson_date);
              sessionDate.setHours(0, 0, 0, 0);
              const beforeEnrollment = enrollDate && sessionDate < enrollDate;
              const computedStatus = beforeEnrollment
                ? 'cancelled' // до даты зачисления показываем как отмененные для этого ученика
                : (s.status || 'scheduled');
              
              if (beforeEnrollment) {
                console.log('Session before enrollment:', {
                  lessonDate: s.lesson_date,
                  sessionDate: sessionDate.toISOString(),
                  enrollDate: enrollDate?.toISOString(),
                  originalStatus: s.status,
                  newStatus: computedStatus
                });
              }
              
              return {
                id: s.id,
                lessonDate: s.lesson_date,
                status: computedStatus,
                lessonNumber: s.lesson_number,
                duration: s.duration || calculateDuration(s.start_time, s.end_time),
                paid_minutes: s.paid_minutes,
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

      // Attendance - использем mock данные, так как таблица может не существовать
      const attendance: StudentAttendance[] = [];

      // Subscriptions - используем mock данные, так как структура может отличаться
      const subscriptions: StudentSubscription[] = [];

      return {
        id: student.id,
        studentNumber: student.student_number,
        name: student.name,
        firstName: student.first_name || student.name.split(' ')[1] || '',
        lastName: student.last_name || student.name.split(' ')[0] || '',
        middleName: student.middle_name || student.name.split(' ')[2] || '',
        age: student.age,
        dateOfBirth: student.date_of_birth,
        phone: student.phone,
        status: student.status,
        notes: student.notes,
        branch: undefined,
        category: undefined,
        level: undefined,
        createdAt: student.created_at,
        familyGroupId: student.family_group_id,
        parents,
        groups,
        individualLessons: individualLessons || [],
        payments,
        attendance,
        subscriptions,
      };
    },
    enabled: !!studentId,
  });
};
