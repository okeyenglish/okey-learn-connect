import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, PhoneMissed, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { selfHostedPost } from "@/lib/selfHostedApi";
import { startOfDay } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface CallStats {
  total: number;
  missedToday: number;
  avgDuration: number;
}

export const CallStatisticsWidget = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["call-stats"],
    queryFn: async (): Promise<CallStats> => {
      const todayStart = startOfDay(new Date()).toISOString();
      
      // Fetch all calls stats in one request
      const response = await selfHostedPost<{
        success: boolean;
        calls: Array<{
          status: string;
          started_at: string;
          duration_seconds: number | null;
        }>;
        total: number;
      }>('get-call-logs', { 
        action: 'list',
        limit: 1000
      });

      if (!response.success || !response.data) {
        return { total: 0, missedToday: 0, avgDuration: 0 };
      }

      const calls = response.data.calls || [];
      const total = response.data.total || 0;
      
      // Calculate missed today
      const missedToday = calls.filter(
        c => c.status === 'missed' && c.started_at >= todayStart
      ).length;
      
      // Calculate average duration
      const answeredCalls = calls.filter(
        c => c.status === 'answered' && c.duration_seconds && c.duration_seconds > 0
      );
      const avgDuration = answeredCalls.length > 0
        ? Math.round(
            answeredCalls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / 
            answeredCalls.length
          )
        : 0;

      return { total, missedToday, avgDuration };
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Статистика звонков
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
              <Phone className="h-3.5 w-3.5" />
              <span>Всего</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.total.toLocaleString("ru-RU")}</div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
              <PhoneMissed className="h-3.5 w-3.5 text-destructive" />
              <span>Пропущенные</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-destructive">{stats?.missedToday}</div>
            )}
            <p className="text-xs text-muted-foreground">сегодня</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
              <Clock className="h-3.5 w-3.5" />
              <span>Ср. время</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{formatDuration(stats?.avgDuration || 0)}</div>
            )}
            <p className="text-xs text-muted-foreground">разговора</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
