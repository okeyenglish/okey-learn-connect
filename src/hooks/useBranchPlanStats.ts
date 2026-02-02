import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfMonth, endOfMonth, format, subDays, getDay, eachDayOfInterval, isWeekend, differenceInDays } from 'date-fns';

export interface BranchPlanStats {
  revenue: number;
  revenueTarget: number;
  revenuePercentage: number;
  newStudents: number;
  newStudentsTarget: number;
  newStudentsPercentage: number;
  drops: number;
  newInquiries: number;
  conversion: number;
  overallPercentage: number;
  // Salary stats
  baseSalary: number;
  earnedSalary: number;
  workingDaysInMonth: number;
  workedDays: number;
  bonusAmount: number;
  bonusUnlocked: boolean;
  isLoading: boolean;
  error: Error | null;
}

const DEFAULT_REVENUE_TARGET = 1000000;
const DEFAULT_STUDENTS_TARGET = 10;
const BASE_SALARY = 60000;
const BONUS_AMOUNT = 10000;
const STUDENTS_FOR_BONUS = 10;

function getWorkingDaysInMonth(date: Date): number {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const days = eachDayOfInterval({ start, end });
  return days.filter(d => !isWeekend(d)).length;
}

function getWorkedDays(date: Date): number {
  const start = startOfMonth(date);
  const today = new Date();
  const end = today < endOfMonth(date) ? today : endOfMonth(date);
  if (start > end) return 0;
  const days = eachDayOfInterval({ start, end });
  return days.filter(d => !isWeekend(d)).length;
}

export function useBranchPlanStats(): BranchPlanStats {
  const { profile, role, roles } = useAuth();
  
  const organizationId = profile?.organization_id;
  const userBranch = profile?.branch;
  const isAdmin = role === 'admin' || (Array.isArray(roles) && roles.includes('admin'));
  const isBranchManager = role === 'branch_manager' || (Array.isArray(roles) && roles.includes('branch_manager'));
  
  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  const thirtyDaysAgo = format(subDays(now, 30), 'yyyy-MM-dd');

  const { data, isLoading, error } = useQuery({
    queryKey: ['branch-plan-stats', organizationId, userBranch, isAdmin, monthStart],
    queryFn: async () => {
      if (!organizationId) return null;

      // Fetch plan targets
      let planQuery = supabase
        .from('branch_plans')
        .select('revenue_target, new_students_target, branch')
        .eq('organization_id', organizationId)
        .lte('period_start', monthStart)
        .gte('period_end', monthEnd);
      
      if (!isAdmin && userBranch) {
        planQuery = planQuery.eq('branch', userBranch);
      }
      
      const { data: plans } = await planQuery;

      // Calculate targets (sum for admin, single for branch)
      let revenueTarget = DEFAULT_REVENUE_TARGET;
      let studentsTarget = DEFAULT_STUDENTS_TARGET;
      
      if (plans && plans.length > 0) {
        if (isAdmin) {
          revenueTarget = plans.reduce((sum, p) => sum + (Number(p.revenue_target) || DEFAULT_REVENUE_TARGET), 0);
          studentsTarget = plans.reduce((sum, p) => sum + (Number(p.new_students_target) || DEFAULT_STUDENTS_TARGET), 0);
        } else {
          revenueTarget = Number(plans[0]?.revenue_target) || DEFAULT_REVENUE_TARGET;
          studentsTarget = Number(plans[0]?.new_students_target) || DEFAULT_STUDENTS_TARGET;
        }
      }

      // Fetch revenue from payments
      let revenueQuery = supabase
        .from('payments')
        .select('amount')
        .eq('organization_id', organizationId)
        .eq('status', 'completed')
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd + 'T23:59:59');
      
      if (!isAdmin && userBranch) {
        revenueQuery = revenueQuery.eq('branch', userBranch);
      }
      
      const { data: payments } = await revenueQuery;
      const revenue = payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;

      // Fetch new students this month (for bonus calculation)
      let studentsMonthQuery = supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd + 'T23:59:59');
      
      if (!isAdmin && userBranch) {
        studentsMonthQuery = studentsMonthQuery.eq('branch', userBranch);
      }
      
      const { count: newStudentsMonth } = await studentsMonthQuery;

      // Fetch new students last 30 days (for conversion)
      let students30Query = supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', thirtyDaysAgo);
      
      if (!isAdmin && userBranch) {
        students30Query = students30Query.eq('branch', userBranch);
      }
      
      const { count: newStudents30 } = await students30Query;

      // Fetch drops (students who finished/left this month)
      let dropsQuery = supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .in('status', ['archived', 'graduated', 'expelled', 'inactive'])
        .gte('updated_at', monthStart)
        .lte('updated_at', monthEnd + 'T23:59:59');
      
      if (!isAdmin && userBranch) {
        dropsQuery = dropsQuery.eq('branch', userBranch);
      }
      
      const { count: drops } = await dropsQuery;

      // Fetch new inquiries (clients) last 30 days (for conversion)
      let inquiries30Query = supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', thirtyDaysAgo);
      
      if (!isAdmin && userBranch) {
        inquiries30Query = inquiries30Query.eq('branch', userBranch);
      }
      
      const { count: newInquiries30 } = await inquiries30Query;

      return {
        revenue,
        revenueTarget,
        newStudentsMonth: newStudentsMonth || 0,
        newStudents30: newStudents30 || 0,
        newStudentsTarget: studentsTarget,
        drops: drops || 0,
        newInquiries30: newInquiries30 || 0,
      };
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000,
  });

  const revenue = data?.revenue || 0;
  const revenueTarget = data?.revenueTarget || DEFAULT_REVENUE_TARGET;
  const newStudents = data?.newStudentsMonth || 0;
  const newStudentsTarget = data?.newStudentsTarget || DEFAULT_STUDENTS_TARGET;
  const drops = data?.drops || 0;
  const newInquiries = data?.newInquiries30 || 0;
  const newStudents30 = data?.newStudents30 || 0;

  const revenuePercentage = Math.min(100, Math.round((revenue / revenueTarget) * 100));
  const newStudentsPercentage = Math.min(100, Math.round((newStudents / newStudentsTarget) * 100));
  // Conversion: new students last 30 days / new inquiries last 30 days
  const conversion = newInquiries > 0 ? Math.round((newStudents30 / newInquiries) * 100) : 0;
  const overallPercentage = Math.round((revenuePercentage + newStudentsPercentage) / 2);

  // Salary calculation
  const workingDaysInMonth = getWorkingDaysInMonth(now);
  const workedDays = getWorkedDays(now);
  const dailyRate = BASE_SALARY / workingDaysInMonth;
  const earnedSalary = Math.round(dailyRate * workedDays);
  const bonusUnlocked = newStudents >= STUDENTS_FOR_BONUS;

  return {
    revenue,
    revenueTarget,
    revenuePercentage,
    newStudents,
    newStudentsTarget,
    newStudentsPercentage,
    drops,
    newInquiries,
    conversion,
    overallPercentage,
    baseSalary: BASE_SALARY,
    earnedSalary,
    workingDaysInMonth,
    workedDays,
    bonusAmount: BONUS_AMOUNT,
    bonusUnlocked,
    isLoading,
    error: error as Error | null,
  };
}
