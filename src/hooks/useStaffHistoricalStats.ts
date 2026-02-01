import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

export interface DailyStats {
  stat_date: string;
  user_id: string;
  user_name?: string;
  total_online_minutes: number;
  active_minutes: number;
  idle_minutes: number;
  call_minutes: number;
  efficiency_score: number;
}

export interface AggregatedDailyStats {
  date: string;
  totalOnlineMinutes: number;
  activeMinutes: number;
  idleMinutes: number;
  callMinutes: number;
  avgEfficiency: number;
  userCount: number;
}

interface UseStaffHistoricalStatsOptions {
  days?: number;
  userId?: string;
  branch?: string;
}

export const useStaffHistoricalStats = (options: UseStaffHistoricalStatsOptions = {}) => {
  const { days = 14, userId, branch } = options;
  const [stats, setStats] = useState<DailyStats[]>([]);
  const [aggregatedStats, setAggregatedStats] = useState<AggregatedDailyStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
        const endDate = format(new Date(), 'yyyy-MM-dd');

        // Build query for staff_daily_stats
        let query = supabase
          .from('staff_daily_stats')
          .select(`
            stat_date,
            user_id,
            total_online_minutes,
            active_minutes,
            idle_minutes,
            call_minutes,
            efficiency_score
          `)
          .gte('stat_date', startDate)
          .lte('stat_date', endDate)
          .order('stat_date', { ascending: true });

        if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          console.error('[useStaffHistoricalStats] Error:', fetchError);
          setError(fetchError.message);
          return;
        }

        // Fetch user profiles to get names and branches
        const userIds = [...new Set((data || []).map(d => d.user_id))];
        
        let profilesMap: Record<string, { name: string; branch: string | null }> = {};
        
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, branch')
            .in('id', userIds);

          if (profiles) {
            profilesMap = profiles.reduce((acc, p) => {
              acc[p.id] = {
                name: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Сотрудник',
                branch: p.branch
              };
              return acc;
            }, {} as Record<string, { name: string; branch: string | null }>);
          }
        }

        // Filter by branch if specified
        let filteredData = data || [];
        if (branch && branch !== 'all') {
          filteredData = filteredData.filter(d => 
            profilesMap[d.user_id]?.branch === branch
          );
        }

        // Enrich with user names
        const enrichedStats: DailyStats[] = filteredData.map(d => ({
          ...d,
          user_name: profilesMap[d.user_id]?.name || 'Сотрудник'
        }));

        setStats(enrichedStats);

        // Aggregate by date
        const aggregated = aggregateByDate(filteredData);
        setAggregatedStats(aggregated);

      } catch (err) {
        console.error('[useStaffHistoricalStats] Exception:', err);
        setError('Ошибка загрузки данных');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [days, userId, branch]);

  return { stats, aggregatedStats, isLoading, error };
};

function aggregateByDate(data: DailyStats[]): AggregatedDailyStats[] {
  const byDate: Record<string, DailyStats[]> = {};

  data.forEach(d => {
    if (!byDate[d.stat_date]) {
      byDate[d.stat_date] = [];
    }
    byDate[d.stat_date].push(d);
  });

  return Object.entries(byDate)
    .map(([date, items]) => {
      const totalOnline = items.reduce((sum, i) => sum + (i.total_online_minutes || 0), 0);
      const active = items.reduce((sum, i) => sum + (i.active_minutes || 0), 0);
      const idle = items.reduce((sum, i) => sum + (i.idle_minutes || 0), 0);
      const call = items.reduce((sum, i) => sum + (i.call_minutes || 0), 0);
      const efficiencySum = items.reduce((sum, i) => sum + (i.efficiency_score || 0), 0);

      return {
        date,
        totalOnlineMinutes: totalOnline,
        activeMinutes: active,
        idleMinutes: idle,
        callMinutes: call,
        avgEfficiency: items.length > 0 ? Math.round(efficiencySum / items.length) : 0,
        userCount: items.length
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
