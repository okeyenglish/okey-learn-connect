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

export interface StudentGroup {
  id: string;
  name: string;
  subject: string;
  level: string;
  teacher: string;
  teacherId: string;
  branch: string;
  schedule: string;
  status: string;
  enrollmentDate: string;
}

export interface StudentIndividualLesson {
  id: string;
  subject: string;
  level: string;
  teacherName?: string;
  branch: string;
  pricePerLesson?: number;
  scheduleTime?: string;
  scheduleDays?: string[];
  status: string;
  nextLesson?: string;
}

export interface StudentPayment {
  id: string;
  amount: number;
  date: string;
  description: string;
  status: string;
  paymentMethod?: string;
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
          learning_groups:group_id (
            id,
            name,
            subject,
            level,
            branch,
            status,
            teacher:teacher_id (
              id,
              name
            )
          )
        `)
        .eq('student_id', studentId);

      const groups: StudentGroup[] = (groupStudents || []).map((gs: any) => ({
        id: gs.learning_groups?.id || '',
        name: gs.learning_groups?.name || '',
        subject: gs.learning_groups?.subject || '',
        level: gs.learning_groups?.level || '',
        teacher: gs.learning_groups?.teacher?.name || 'Не назначен',
        teacherId: gs.learning_groups?.teacher?.id || '',
        branch: gs.learning_groups?.branch || '',
        schedule: '', // TODO: fetch from schedule
        status: gs.status,
        enrollmentDate: gs.enrollment_date,
      }));

      // Fetch individual lessons
      const { data: individualLessonsData } = await supabase
        .from('individual_lessons')
        .select('*')
        .eq('student_id', studentId)
        .eq('is_active', true);

      const individualLessons: StudentIndividualLesson[] = (individualLessonsData || []).map((il: any) => ({
        id: il.id,
        subject: il.subject || 'Не указан',
        level: il.level || 'Не указан',
        teacherName: il.teacher_name,
        branch: il.branch || 'Не указан',
        pricePerLesson: il.price_per_lesson,
        scheduleTime: il.schedule_time,
        scheduleDays: il.schedule_days,
        status: il.status || 'active',
        nextLesson: undefined, // TODO: get from lesson_sessions
      }));

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
      }));

      // Attendance - использем mock данные, так как таблица может не существовать
      const attendance: StudentAttendance[] = [];

      // Subscriptions - используем mock данные, так как структура может отличаться
      const subscriptions: StudentSubscription[] = [];

      return {
        id: student.id,
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
