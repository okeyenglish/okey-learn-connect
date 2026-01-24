import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, PhoneMissed, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/typedClient";
import { startOfDay } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export const CallStatisticsWidget = () => {
  // Total calls count
  const { data: totalCalls, isLoading: loadingTotal } = useQuery({
    queryKey: ["call-stats-total"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("call_logs")
        .select("*", { count: "exact", head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Missed calls today
  const { data: missedToday, isLoading: loadingMissed } = useQuery({
    queryKey: ["call-stats-missed-today"],
    queryFn: async () => {
      const todayStart = startOfDay(new Date()).toISOString();
      
      const { count, error } = await supabase
        .from("call_logs")
        .select("*", { count: "exact", head: true })
        .eq("status", "missed")
        .gte("started_at", todayStart);
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Average call duration (in seconds)
  const { data: avgDuration, isLoading: loadingAvg } = useQuery({
    queryKey: ["call-stats-avg-duration"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_logs")
        .select("duration_seconds")
        .eq("status", "answered")
        .not("duration_seconds", "is", null)
        .gt("duration_seconds", 0);
      
      if (error) throw error;
      if (!data || data.length === 0) return 0;
      
      const totalSeconds = data.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);
      return Math.round(totalSeconds / data.length);
    },
  });

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isLoading = loadingTotal || loadingMissed || loadingAvg;

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
              <div className="text-2xl font-bold">{totalCalls?.toLocaleString("ru-RU")}</div>
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
              <div className="text-2xl font-bold text-destructive">{missedToday}</div>
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
              <div className="text-2xl font-bold">{formatDuration(avgDuration || 0)}</div>
            )}
            <p className="text-xs text-muted-foreground">разговора</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
