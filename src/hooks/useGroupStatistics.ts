import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/typedClient";

interface GroupStatistics {
  totalReceived: number;
  balance: number;
  total: number;
  visits: number;
  paidVisits: number;
  skipped: number;
  paidSkipped: number;
  unpaidSkipped: number;
  rateForGroup: string;
  totalAcademicHours: number;
  teacherPayment: number;
}

export const useGroupStatistics = (groupId: string | undefined) => {
  const [statistics, setStatistics] = useState<GroupStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    const fetchStatistics = async () => {
      try {
        setLoading(true);

        // Get all payments for this group
        const { data: payments } = await supabase
          .from('payments')
          .select('amount, lessons_count')
          .eq('group_id', groupId);

        const totalReceived = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

        // Get all lesson sessions for this group
        const { data: sessions } = await supabase
          .from('lesson_sessions')
          .select(`
            id,
            status,
            start_time,
            end_time,
            payment_id,
            student_lesson_sessions(id, student_id)
          `)
          .eq('group_id', groupId);

        // Calculate visits (completed sessions)
        const completedSessions = sessions?.filter(s => s.status === 'completed') || [];
        const visits = completedSessions.length;
        
        // Calculate paid visits (sessions with payment_id)
        const paidVisits = completedSessions.filter(s => s.payment_id !== null).length;

        // Calculate skips (cancelled, free_skip, paid_skip)
        const skippedSessions = sessions?.filter(s => 
          s.status === 'cancelled' || s.status === 'free_skip' || s.status === 'paid_skip'
        ) || [];
        const skipped = skippedSessions.length;
        
        const paidSkipped = skippedSessions.filter(s => s.status === 'paid_skip').length;
        const unpaidSkipped = skippedSessions.filter(s => 
          s.status === 'free_skip' || s.status === 'cancelled'
        ).length;

        // Calculate academic hours (assuming 80 minutes per session = 2 academic hours)
        const totalAcademicHours = (sessions?.length || 0) * 2;

        // Get pricing info to calculate teacher payment
        const { data: group } = await supabase
          .from('learning_groups')
          .select('subject, responsible_teacher')
          .eq('id', groupId)
          .single();

        // For now, use a placeholder for teacher rate and payment
        const rateForGroup = "450,00-600,00/а.ч.";
        const teacherPayment = totalAcademicHours * 500; // Average rate

        // Calculate balance (total paid minus used)
        const totalPaidLessons = payments?.reduce((sum, p) => sum + (p.lessons_count || 0), 0) || 0;
        const usedLessons = visits;
        const remainingLessons = totalPaidLessons - usedLessons;
        
        // Calculate remaining amount (rough estimate)
        const avgPricePerLesson = totalReceived / (totalPaidLessons || 1);
        const balance = remainingLessons * avgPricePerLesson;

        setStatistics({
          totalReceived,
          balance,
          total: totalReceived,
          visits,
          paidVisits,
          skipped,
          paidSkipped,
          unpaidSkipped,
          rateForGroup,
          totalAcademicHours,
          teacherPayment
        });
      } catch (error) {
        console.error('Error fetching group statistics:', error);
        setStatistics(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [groupId]);

  return { statistics, loading };
};
