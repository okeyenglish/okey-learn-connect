import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar,
} from 'recharts';
import {
  ShieldAlert, AlertTriangle, Shield, RefreshCw, Activity, TrendingDown, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthLogEntry {
  id: string;
  client_id: string;
  health_score: number;
  risk_level: string;
  dominant_signal: string;
  signals: Record<string, any>;
  recommendation: string;
  reason: string;
  created_at: string;
  client_name?: string;
  client_phone?: string;
}

const SIGNAL_LABELS: Record<string, string> = {
  short_replies: 'Короткие ответы',
  slow_response: 'Медленные ответы',
  declining_engagement: 'Падение вовлечённости',
  stage_stagnation: 'Застой на стадии',
  manager_monologue: 'Монолог менеджера',
  no_questions: 'Нет вопросов',
  ok: 'Норма',
  insufficient_data: 'Мало данных',
};

const RISK_CONFIG = {
  critical: { label: 'Критический', icon: ShieldAlert, className: 'bg-destructive/10 text-destructive border-destructive/20' },
  warning: { label: 'Внимание', icon: AlertTriangle, className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20' },
  ok: { label: 'Норма', icon: Shield, className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20' },
};

export function HealthScoreDashboard() {
  const [days, setDays] = useState('7');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['health-score-dashboard', days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - parseInt(days));

      // Get latest health per client (top critical/warning)
      const { data: latest, error: latestErr } = await supabase
        .from('conversation_health_log')
        .select('*')
        .gte('created_at', since.toISOString())
        .in('risk_level', ['critical', 'warning'])
        .order('health_score', { ascending: true })
        .limit(20);

      if (latestErr) throw latestErr;

      // Get client names for these entries
      const clientIds = [...new Set((latest || []).map((l: any) => l.client_id))];
      let clientMap = new Map<string, any>();
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from('clients')
          .select('id, name, phone')
          .in('id', clientIds);
        clientMap = new Map((clients || []).map((c: any) => [c.id, c]));
      }

      const enriched: HealthLogEntry[] = (latest || []).map((l: any) => ({
        ...l,
        client_name: clientMap.get(l.client_id)?.name || 'Неизвестный',
        client_phone: clientMap.get(l.client_id)?.phone || '',
      }));

      // Deduplicate: keep only the latest entry per client
      const byClient = new Map<string, HealthLogEntry>();
      for (const entry of enriched) {
        const existing = byClient.get(entry.client_id);
        if (!existing || new Date(entry.created_at) > new Date(existing.created_at)) {
          byClient.set(entry.client_id, entry);
        }
      }
      const topRisk = [...byClient.values()].sort((a, b) => a.health_score - b.health_score);

      // Aggregate daily stats for trend chart
      const { data: allLogs } = await supabase
        .from('conversation_health_log')
        .select('health_score, risk_level, dominant_signal, created_at')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true });

      // Group by day
      const dailyMap = new Map<string, { scores: number[]; critical: number; warning: number; ok: number }>();
      for (const log of allLogs || []) {
        const day = (log as any).created_at.slice(0, 10);
        if (!dailyMap.has(day)) dailyMap.set(day, { scores: [], critical: 0, warning: 0, ok: 0 });
        const d = dailyMap.get(day)!;
        d.scores.push((log as any).health_score);
        if ((log as any).risk_level === 'critical') d.critical++;
        else if ((log as any).risk_level === 'warning') d.warning++;
        else d.ok++;
      }

      const dailyTrend = [...dailyMap.entries()].map(([date, d]) => ({
        date,
        avgScore: Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length),
        critical: d.critical,
        warning: d.warning,
        ok: d.ok,
        total: d.scores.length,
      }));

      // Signal distribution
      const signalCounts = new Map<string, number>();
      for (const log of allLogs || []) {
        const sig = (log as any).dominant_signal || 'ok';
        signalCounts.set(sig, (signalCounts.get(sig) || 0) + 1);
      }
      const signalDistribution = [...signalCounts.entries()]
        .filter(([k]) => k !== 'ok' && k !== 'insufficient_data')
        .map(([signal, count]) => ({ signal, label: SIGNAL_LABELS[signal] || signal, count }))
        .sort((a, b) => b.count - a.count);

      // Summary stats
      const totalChecks = (allLogs || []).length;
      const criticalCount = (allLogs || []).filter((l: any) => l.risk_level === 'critical').length;
      const warningCount = (allLogs || []).filter((l: any) => l.risk_level === 'warning').length;
      const avgScore = totalChecks > 0
        ? Math.round((allLogs || []).reduce((s: number, l: any) => s + l.health_score, 0) / totalChecks)
        : 0;

      return { topRisk, dailyTrend, signalDistribution, totalChecks, criticalCount, warningCount, avgScore };
    },
    refetchInterval: 120000,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Health Score — Early Warning System
          </h3>
          <p className="text-sm text-muted-foreground">Предсказание ухода клиентов по микросигналам</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">24 часа</SelectItem>
              <SelectItem value="7">7 дней</SelectItem>
              <SelectItem value="30">30 дней</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MiniKPI label="Проверок" value={data?.totalChecks ?? 0} isLoading={isLoading} />
        <MiniKPI label="Средний score" value={data?.avgScore ?? 0} suffix="%" isLoading={isLoading}
          className={cn(
            (data?.avgScore ?? 100) < 50 && 'text-destructive',
            (data?.avgScore ?? 100) >= 50 && (data?.avgScore ?? 100) < 80 && 'text-amber-600',
          )} />
        <MiniKPI label="Критических" value={data?.criticalCount ?? 0} isLoading={isLoading} className="text-destructive" />
        <MiniKPI label="Предупреждений" value={data?.warningCount ?? 0} isLoading={isLoading} className="text-amber-600" />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top risk clients */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              Клиенты с наибольшим риском
            </CardTitle>
            <CardDescription>Последние проверки с критическим или повышенным риском</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : data?.topRisk && data.topRisk.length > 0 ? (
              <ScrollArea className="h-[350px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Клиент</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Сигнал</TableHead>
                      <TableHead>Причина</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topRisk.map((entry) => {
                      const risk = RISK_CONFIG[entry.risk_level as keyof typeof RISK_CONFIG] || RISK_CONFIG.warning;
                      return (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm truncate max-w-[140px]">{entry.client_name}</p>
                              {entry.client_phone && (
                                <p className="text-xs text-muted-foreground">{entry.client_phone}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-xs font-mono', risk.className)}>
                              {entry.health_score}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {SIGNAL_LABELS[entry.dominant_signal] || entry.dominant_signal}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground line-clamp-2 max-w-[200px]">
                              {entry.reason}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Shield className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Нет клиентов с высоким риском</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Signal distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-amber-500" />
              Распределение сигналов
            </CardTitle>
            <CardDescription>Какие сигналы чаще приводят к риску</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : data?.signalDistribution && data.signalDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data.signalDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="label" type="category" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => [value, 'Случаев']} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Activity className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Нет данных по сигналам</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily trend */}
      {data?.dailyTrend && data.dailyTrend.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Тренд Health Score
            </CardTitle>
            <CardDescription>Средний score и количество алертов по дням</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d) => new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                />
                <YAxis yAxisId="score" domain={[0, 100]} />
                <YAxis yAxisId="count" orientation="right" />
                <Tooltip
                  labelFormatter={(d) => new Date(d as string).toLocaleDateString('ru-RU')}
                  formatter={(value, name) => {
                    const labels: Record<string, string> = {
                      avgScore: 'Ср. score',
                      critical: 'Критических',
                      warning: 'Предупреждений',
                    };
                    return [value, labels[name as string] || name];
                  }}
                />
                <Legend formatter={(name) => {
                  const labels: Record<string, string> = {
                    avgScore: 'Ср. Health Score',
                    critical: 'Критических',
                    warning: 'Предупреждений',
                  };
                  return labels[name] || name;
                }} />
                <Line yAxisId="score" type="monotone" dataKey="avgScore" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line yAxisId="count" type="monotone" dataKey="critical" stroke="hsl(var(--destructive))" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                <Line yAxisId="count" type="monotone" dataKey="warning" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MiniKPI({ label, value, suffix, isLoading, className }: {
  label: string;
  value: number;
  suffix?: string;
  isLoading: boolean;
  className?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn('text-2xl font-bold', className)}>{value}{suffix}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
