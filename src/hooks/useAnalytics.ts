import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface FinancialReport {
  period: string;
  total_revenue: number;
  total_expenses: number;
  profit: number;
  profit_margin: number;
  payments_count: number;
  average_payment: number;
}

export interface StudentStats {
  total_students: number;
  active_students: number;
  new_students: number;
  churned_students: number;
  average_balance: number;
  low_balance_count: number;
  attendance_rate: number;
}

export interface TeacherStats {
  teacher_id: string;
  teacher_name: string;
  total_lessons: number;
  total_hours: number;
  completed_lessons: number;
  completion_rate: number;
  total_earnings: number;
  average_rate: number;
}

export interface GroupStats {
  group_id: string;
  group_name: string;
  subject: string;
  branch: string;
  students_count: number;
  lessons_held: number;
  attendance_rate: number;
  revenue: number;
}

// DB row types
interface PaymentRow {
  amount: number | null;
  payment_type: string | null;
  created_at: string;
}

interface SalaryAccrualRow {
  amount: number | null;
  teacher_id?: string;
  academic_hours?: number | null;
  rate_per_hour?: number | null;
}

interface ProfileRow {
  id: string;
  balance?: number | null;
  created_at: string;
  first_name?: string | null;
  last_name?: string | null;
}

interface UserRoleRow {
  user_id: string;
}

interface GroupStudentRow {
  student_id: string;
}

interface IndividualLessonRow {
  id: string;
  student_id?: string;
  teacher_id?: string;
}

interface AttendanceRow {
  status: string;
}

interface LessonSessionRow {
  id: string;
  group_id: string;
  status: string;
  lesson_date: string;
}

interface IndividualSessionRow {
  individual_lesson_id: string;
  status: string;
  lesson_date: string;
}

interface LearningGroupRow {
  id: string;
  name: string;
  subject: string;
  branch: string;
  teacher_id?: string;
}

// Финансовые отчёты
export const useFinancialReport = (startDate?: Date, endDate?: Date) => {
  return useQuery({
    queryKey: ['financial-report', startDate, endDate],
    queryFn: async (): Promise<FinancialReport> => {
      const start = startDate || startOfMonth(new Date());
      const end = endDate || endOfMonth(new Date());

      // Получаем все платежи за период
      const { data: paymentsRaw } = await supabase
        .from('payments')
        .select('amount, payment_type, created_at')
        .gte('created_at', format(start, 'yyyy-MM-dd'))
        .lte('created_at', format(end, 'yyyy-MM-dd'));

      // Получаем расходы (зарплаты преподавателей)
      const { data: salariesRaw } = await supabase
        .from('teacher_salary_accruals')
        .select('amount')
        .gte('accrual_date', format(start, 'yyyy-MM-dd'))
        .lte('accrual_date', format(end, 'yyyy-MM-dd'))
        .eq('is_paid', true);

      const payments = (paymentsRaw || []) as unknown as PaymentRow[];
      const salaries = (salariesRaw || []) as unknown as SalaryAccrualRow[];

      const totalRevenue = payments.reduce(
        (sum, p) => sum + (p.amount || 0),
        0
      );

      const totalExpenses = salaries.reduce(
        (sum, s) => sum + (s.amount || 0),
        0
      );

      const profit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      return {
        period: `${format(start, 'dd.MM.yyyy')} - ${format(end, 'dd.MM.yyyy')}`,
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        profit,
        profit_margin: profitMargin,
        payments_count: payments.length,
        average_payment: payments.length ? totalRevenue / payments.length : 0,
      };
    },
    enabled: !!startDate && !!endDate,
  });
};

// Статистика по студентам
export const useStudentStats = (startDate?: Date, endDate?: Date) => {
  return useQuery({
    queryKey: ['student-stats', startDate, endDate],
    queryFn: async (): Promise<StudentStats> => {
      const start = startDate || startOfMonth(new Date());
      const end = endDate || endOfMonth(new Date());

      // Получаем всех студентов
      const { data: studentRolesRaw } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      const studentRoles = (studentRolesRaw || []) as unknown as UserRoleRow[];
      const studentIds = studentRoles.map((r) => r.user_id);

      if (studentIds.length === 0) {
        return {
          total_students: 0,
          active_students: 0,
          new_students: 0,
          churned_students: 0,
          average_balance: 0,
          low_balance_count: 0,
          attendance_rate: 0,
        };
      }

      // Получаем профили студентов
      const { data: studentsRaw } = await supabase
        .from('profiles')
        .select('id, balance, created_at')
        .in('id', studentIds);

      const students = (studentsRaw || []) as unknown as ProfileRow[];

      // Активные студенты (есть занятия)
      const { data: activeGroupStudentsRaw } = await supabase
        .from('group_students')
        .select('student_id')
        .eq('status', 'active')
        .in('student_id', studentIds);

      const { data: activeIndividualLessonsRaw } = await supabase
        .from('individual_lessons')
        .select('student_id')
        .eq('is_active', true)
        .in('student_id', studentIds);

      const activeGroupStudents = (activeGroupStudentsRaw || []) as unknown as GroupStudentRow[];
      const activeIndividualLessons = (activeIndividualLessonsRaw || []) as unknown as IndividualLessonRow[];

      const activeStudentIds = new Set([
        ...activeGroupStudents.map((s) => s.student_id),
        ...activeIndividualLessons.map((l) => l.student_id).filter(Boolean),
      ]);

      // Новые студенты за период
      const newStudents = students.filter(
        (s) => new Date(s.created_at) >= start && new Date(s.created_at) <= end
      );

      // Средний баланс
      const totalBalance = students.reduce(
        (sum, s) => sum + (s.balance || 0),
        0
      );
      const averageBalance = students.length ? totalBalance / students.length : 0;

      // Студенты с низким балансом
      const lowBalanceStudents = students.filter((s) => (s.balance || 0) < 1000);

      // Посещаемость
      const { data: attendanceRaw } = await supabase
        .from('student_attendance')
        .select('status')
        .in('student_id', studentIds)
        .gte('created_at', format(start, 'yyyy-MM-dd'))
        .lte('created_at', format(end, 'yyyy-MM-dd'));

      const attendance = (attendanceRaw || []) as unknown as AttendanceRow[];
      const presentCount = attendance.filter(
        (a) => a.status === 'present'
      ).length;
      const attendanceRate =
        attendance.length ? (presentCount / attendance.length) * 100 : 0;

      return {
        total_students: students.length,
        active_students: activeStudentIds.size,
        new_students: newStudents.length,
        churned_students: students.length - activeStudentIds.size,
        average_balance: averageBalance,
        low_balance_count: lowBalanceStudents.length,
        attendance_rate: attendanceRate,
      };
    },
    enabled: !!startDate && !!endDate,
  });
};

// Статистика по преподавателям
export const useTeacherStatsReport = (startDate?: Date, endDate?: Date) => {
  return useQuery({
    queryKey: ['teacher-stats-report', startDate, endDate],
    queryFn: async (): Promise<TeacherStats[]> => {
      const start = startDate || startOfMonth(new Date());
      const end = endDate || endOfMonth(new Date());

      // Получаем всех преподавателей
      const { data: teacherRolesRaw } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');

      const teacherRoles = (teacherRolesRaw || []) as unknown as UserRoleRow[];
      const teacherIds = teacherRoles.map((r) => r.user_id);

      if (teacherIds.length === 0) return [];

      const { data: teachersRaw } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', teacherIds);

      const teachers = (teachersRaw || []) as unknown as ProfileRow[];

      // Получаем начисления за период
      const { data: accrualsRaw } = await supabase
        .from('teacher_salary_accruals')
        .select('teacher_id, amount, academic_hours, rate_per_hour')
        .in('teacher_id', teacherIds)
        .gte('accrual_date', format(start, 'yyyy-MM-dd'))
        .lte('accrual_date', format(end, 'yyyy-MM-dd'));

      const accruals = (accrualsRaw || []) as unknown as SalaryAccrualRow[];

      // Получаем занятия за период
      const { data: groupSessionsRaw } = await supabase
        .from('lesson_sessions')
        .select('group_id, status, lesson_date')
        .gte('lesson_date', format(start, 'yyyy-MM-dd'))
        .lte('lesson_date', format(end, 'yyyy-MM-dd'));

      const groupSessions = (groupSessionsRaw || []) as unknown as LessonSessionRow[];

      const { data: groupsRaw } = await supabase
        .from('learning_groups')
        .select('id, teacher_id')
        .in('teacher_id', teacherIds);

      const groups = (groupsRaw || []) as unknown as LearningGroupRow[];

      const { data: individualSessionsRaw } = await supabase
        .from('individual_lesson_sessions')
        .select('individual_lesson_id, status, lesson_date')
        .gte('lesson_date', format(start, 'yyyy-MM-dd'))
        .lte('lesson_date', format(end, 'yyyy-MM-dd'));

      const individualSessions = (individualSessionsRaw || []) as unknown as IndividualSessionRow[];

      const { data: individualLessonsRaw } = await supabase
        .from('individual_lessons')
        .select('id, teacher_id')
        .in('teacher_id', teacherIds);

      const individualLessons = (individualLessonsRaw || []) as unknown as IndividualLessonRow[];

      const stats: TeacherStats[] = teachers.map((teacher) => {
        const teacherAccruals = accruals.filter(
          (a) => a.teacher_id === teacher.id
        );

        const teacherGroupIds = groups
          .filter((g) => g.teacher_id === teacher.id)
          .map((g) => g.id);

        const teacherGroupSessions = groupSessions.filter((s) =>
          teacherGroupIds.includes(s.group_id)
        );

        const teacherLessonIds = individualLessons
          .filter((l) => l.teacher_id === teacher.id)
          .map((l) => l.id);

        const teacherIndividualSessions = individualSessions.filter((s) =>
          teacherLessonIds.includes(s.individual_lesson_id)
        );

        const totalLessons =
          teacherGroupSessions.length + teacherIndividualSessions.length;
        const completedLessons =
          teacherGroupSessions.filter((s) => s.status === 'completed').length +
          teacherIndividualSessions.filter((s) => s.status === 'completed').length;

        const totalEarnings = teacherAccruals.reduce(
          (sum, a) => sum + (a.amount || 0),
          0
        );
        const totalHours = teacherAccruals.reduce(
          (sum, a) => sum + (a.academic_hours || 0),
          0
        );
        const averageRate =
          teacherAccruals.length > 0
            ? teacherAccruals.reduce(
                (sum, a) => sum + (a.rate_per_hour || 0),
                0
              ) / teacherAccruals.length
            : 0;

        return {
          teacher_id: teacher.id,
          teacher_name: `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim(),
          total_lessons: totalLessons,
          total_hours: totalHours,
          completed_lessons: completedLessons,
          completion_rate: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0,
          total_earnings: totalEarnings,
          average_rate: averageRate,
        };
      });

      return stats.sort((a, b) => b.total_earnings - a.total_earnings);
    },
    enabled: !!startDate && !!endDate,
  });
};

// Статистика по группам
export const useGroupStatsReport = (startDate?: Date, endDate?: Date) => {
  return useQuery({
    queryKey: ['group-stats-report', startDate, endDate],
    queryFn: async (): Promise<GroupStats[]> => {
      const start = startDate || startOfMonth(new Date());
      const end = endDate || endOfMonth(new Date());

      // Получаем все группы
      const { data: groupsRaw } = await supabase
        .from('learning_groups')
        .select('id, name, subject, branch');

      const groups = (groupsRaw || []) as unknown as LearningGroupRow[];

      if (groups.length === 0) return [];

      const stats: GroupStats[] = await Promise.all(
        groups.map(async (group) => {
          // Количество студентов
          const { data: studentsRaw } = await supabase
            .from('group_students')
            .select('id')
            .eq('group_id', group.id)
            .eq('status', 'active');

          const students = studentsRaw || [];

          // Проведённые занятия
          const { data: sessionsRaw } = await supabase
            .from('lesson_sessions')
            .select('id, status, lesson_date')
            .eq('group_id', group.id)
            .gte('lesson_date', format(start, 'yyyy-MM-dd'))
            .lte('lesson_date', format(end, 'yyyy-MM-dd'));

          const sessions = (sessionsRaw || []) as unknown as LessonSessionRow[];

          const lessonsHeld = sessions.filter(
            (s) => s.status === 'completed'
          ).length;

          // Посещаемость
          const sessionIds = sessions.map((s) => s.id);
          const { data: attendanceRaw } = sessionIds.length > 0
            ? await supabase
                .from('student_attendance')
                .select('status')
                .in('lesson_session_id', sessionIds)
            : { data: [] };

          const attendance = (attendanceRaw || []) as unknown as AttendanceRow[];

          const presentCount = attendance.filter(
            (a) => a.status === 'present'
          ).length;
          const attendanceRate =
            attendance.length ? (presentCount / attendance.length) * 100 : 0;

          // Выручка (примерная, можно улучшить)
          const revenue = lessonsHeld * students.length * 1000; // Примерная цена

          return {
            group_id: group.id,
            group_name: group.name,
            subject: group.subject,
            branch: group.branch,
            students_count: students.length,
            lessons_held: lessonsHeld,
            attendance_rate: attendanceRate,
            revenue,
          };
        })
      );

      return stats.sort((a, b) => b.revenue - a.revenue);
    },
    enabled: !!startDate && !!endDate,
  });
};
