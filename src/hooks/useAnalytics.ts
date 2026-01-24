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

// Финансовые отчёты
export const useFinancialReport = (startDate?: Date, endDate?: Date) => {
  return useQuery({
    queryKey: ['financial-report', startDate, endDate],
    queryFn: async () => {
      const start = startDate || startOfMonth(new Date());
      const end = endDate || endOfMonth(new Date());

      // Получаем все платежи за период
      const { data: payments } = await supabase
        .from('payments' as any)
        .select('amount, payment_type, created_at')
        .gte('created_at', format(start, 'yyyy-MM-dd'))
        .lte('created_at', format(end, 'yyyy-MM-dd'));

      // Получаем расходы (зарплаты преподавателей)
      const { data: salaries } = await supabase
        .from('teacher_salary_accruals' as any)
        .select('amount')
        .gte('accrual_date', format(start, 'yyyy-MM-dd'))
        .lte('accrual_date', format(end, 'yyyy-MM-dd'))
        .eq('is_paid', true);

      const totalRevenue = (payments || []).reduce(
        (sum: number, p: any) => sum + (p.amount || 0),
        0
      );

      const totalExpenses = (salaries || []).reduce(
        (sum: number, s: any) => sum + (s.amount || 0),
        0
      );

      const profit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      const report: FinancialReport = {
        period: `${format(start, 'dd.MM.yyyy')} - ${format(end, 'dd.MM.yyyy')}`,
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        profit,
        profit_margin: profitMargin,
        payments_count: payments?.length || 0,
        average_payment: payments?.length ? totalRevenue / payments.length : 0,
      };

      return report;
    },
    enabled: !!startDate && !!endDate,
  });
};

// Статистика по студентам
export const useStudentStats = (startDate?: Date, endDate?: Date) => {
  return useQuery({
    queryKey: ['student-stats', startDate, endDate],
    queryFn: async () => {
      const start = startDate || startOfMonth(new Date());
      const end = endDate || endOfMonth(new Date());

      // Получаем всех студентов
      const { data: studentRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      const studentIds = studentRoles?.map((r: any) => r.user_id) || [];

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
      const { data: students } = await supabase
        .from('profiles' as any)
        .select('id, balance, created_at')
        .in('id', studentIds);

      // Активные студенты (есть занятия)
      const { data: activeGroupStudents } = await supabase
        .from('group_students')
        .select('student_id')
        .eq('status', 'active')
        .in('student_id', studentIds);

      const { data: activeIndividualLessons } = await supabase
        .from('individual_lessons')
        .select('student_id')
        .eq('is_active', true)
        .in('student_id', studentIds);

      const activeStudentIds = new Set([
        ...(activeGroupStudents?.map((s: any) => s.student_id) || []),
        ...(activeIndividualLessons?.map((l: any) => l.student_id) || []),
      ]);

      // Новые студенты за период
      const newStudents = (students || []).filter(
        (s: any) => new Date(s.created_at) >= start && new Date(s.created_at) <= end
      );

      // Средний баланс
      const totalBalance = (students || []).reduce(
        (sum: number, s: any) => sum + (s.balance || 0),
        0
      );
      const averageBalance = students?.length ? totalBalance / students.length : 0;

      // Студенты с низким балансом
      const lowBalanceStudents = (students || []).filter((s: any) => (s.balance || 0) < 1000);

      // Посещаемость
      const { data: attendance } = await supabase
        .from('student_attendance' as any)
        .select('status')
        .in('student_id', studentIds)
        .gte('created_at', format(start, 'yyyy-MM-dd'))
        .lte('created_at', format(end, 'yyyy-MM-dd'));

      const presentCount = (attendance || []).filter(
        (a: any) => a.status === 'present'
      ).length;
      const attendanceRate =
        attendance?.length ? (presentCount / attendance.length) * 100 : 0;

      const stats: StudentStats = {
        total_students: students?.length || 0,
        active_students: activeStudentIds.size,
        new_students: newStudents.length,
        churned_students: (students?.length || 0) - activeStudentIds.size,
        average_balance: averageBalance,
        low_balance_count: lowBalanceStudents.length,
        attendance_rate: attendanceRate,
      };

      return stats;
    },
    enabled: !!startDate && !!endDate,
  });
};

// Статистика по преподавателям
export const useTeacherStatsReport = (startDate?: Date, endDate?: Date) => {
  return useQuery({
    queryKey: ['teacher-stats-report', startDate, endDate],
    queryFn: async () => {
      const start = startDate || startOfMonth(new Date());
      const end = endDate || endOfMonth(new Date());

      // Получаем всех преподавателей
      const { data: teacherRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');

      const teacherIds = teacherRoles?.map((r: any) => r.user_id) || [];

      if (teacherIds.length === 0) return [];

      const { data: teachers } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', teacherIds);

      // Получаем начисления за период
      const { data: accruals } = await supabase
        .from('teacher_salary_accruals' as any)
        .select('teacher_id, amount, academic_hours, rate_per_hour')
        .in('teacher_id', teacherIds)
        .gte('accrual_date', format(start, 'yyyy-MM-dd'))
        .lte('accrual_date', format(end, 'yyyy-MM-dd'));

      // Получаем занятия за период
      const { data: groupSessions } = await supabase
        .from('lesson_sessions' as any)
        .select('group_id, status, lesson_date')
        .gte('lesson_date', format(start, 'yyyy-MM-dd'))
        .lte('lesson_date', format(end, 'yyyy-MM-dd'));

      const { data: groups } = await supabase
        .from('learning_groups' as any)
        .select('id, teacher_id')
        .in('teacher_id', teacherIds);

      const { data: individualSessions } = await supabase
        .from('individual_lesson_sessions' as any)
        .select('individual_lesson_id, status, lesson_date')
        .gte('lesson_date', format(start, 'yyyy-MM-dd'))
        .lte('lesson_date', format(end, 'yyyy-MM-dd'));

      const { data: individualLessons } = await supabase
        .from('individual_lessons' as any)
        .select('id, teacher_id')
        .in('teacher_id', teacherIds);

      const stats: TeacherStats[] = (teachers || []).map((teacher: any) => {
        const teacherAccruals = (accruals || []).filter(
          (a: any) => a.teacher_id === teacher.id
        );

        const teacherGroupIds = (groups || [])
          .filter((g: any) => g.teacher_id === teacher.id)
          .map((g: any) => g.id);

        const teacherGroupSessions = (groupSessions || []).filter((s: any) =>
          teacherGroupIds.includes(s.group_id)
        );

        const teacherLessonIds = (individualLessons || [])
          .filter((l: any) => l.teacher_id === teacher.id)
          .map((l: any) => l.id);

        const teacherIndividualSessions = (individualSessions || []).filter((s: any) =>
          teacherLessonIds.includes(s.individual_lesson_id)
        );

        const totalLessons =
          teacherGroupSessions.length + teacherIndividualSessions.length;
        const completedLessons =
          teacherGroupSessions.filter((s: any) => s.status === 'completed').length +
          teacherIndividualSessions.filter((s: any) => s.status === 'completed').length;

        const totalEarnings = teacherAccruals.reduce(
          (sum: number, a: any) => sum + (a.amount || 0),
          0
        );
        const totalHours = teacherAccruals.reduce(
          (sum: number, a: any) => sum + (a.academic_hours || 0),
          0
        );
        const averageRate =
          teacherAccruals.length > 0
            ? teacherAccruals.reduce(
                (sum: number, a: any) => sum + (a.rate_per_hour || 0),
                0
              ) / teacherAccruals.length
            : 0;

        return {
          teacher_id: teacher.id,
          teacher_name: `${teacher.first_name} ${teacher.last_name}`.trim(),
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
    queryFn: async () => {
      const start = startDate || startOfMonth(new Date());
      const end = endDate || endOfMonth(new Date());

      // Получаем все группы
      const { data: groups } = await supabase
        .from('learning_groups' as any)
        .select('id, name, subject, branch');

      if (!groups || groups.length === 0) return [];

      const stats: GroupStats[] = await Promise.all(
        groups.map(async (group: any) => {
          // Количество студентов
          const { data: students } = await supabase
            .from('group_students')
            .select('id')
            .eq('group_id', group.id)
            .eq('status', 'active');

          // Проведённые занятия
          const { data: sessions } = await supabase
            .from('lesson_sessions' as any)
            .select('id, status, lesson_date')
            .eq('group_id', group.id)
            .gte('lesson_date', format(start, 'yyyy-MM-dd'))
            .lte('lesson_date', format(end, 'yyyy-MM-dd'));

          const lessonsHeld = (sessions || []).filter(
            (s: any) => s.status === 'completed'
          ).length;

          // Посещаемость
          const { data: attendance } = await supabase
            .from('student_attendance' as any)
            .select('status')
            .in(
              'lesson_session_id',
              (sessions || []).map((s: any) => s.id)
            );

          const presentCount = (attendance || []).filter(
            (a: any) => a.status === 'present'
          ).length;
          const attendanceRate =
            attendance?.length ? (presentCount / attendance.length) * 100 : 0;

          // Выручка (примерная, можно улучшить)
          const revenue = lessonsHeld * (students?.length || 0) * 1000; // Примерная цена

          return {
            group_id: group.id,
            group_name: group.name,
            subject: group.subject,
            branch: group.branch,
            students_count: students?.length || 0,
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
