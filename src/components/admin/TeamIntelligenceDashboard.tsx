import { useState, useEffect, useCallback } from "react";
import { selfHostedPost } from "@/lib/selfHostedApi";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Users,
  Lightbulb,
  Target,
  Clock,
  MessageSquare,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Route,
  BarChart3,
  Zap,
  Eye,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────
interface TeamInsight {
  id: string;
  insight_type: string;
  severity: string;
  title: string;
  description: string;
  recommendation?: string;
  evidence?: Record<string, any>;
  potential_impact_pct?: number;
  confidence?: number;
  status: string;
  period_start?: string;
  period_end?: string;
  created_at: string;
}

interface CoachingTip {
  id: string;
  manager_id: string;
  manager_name?: string;
  category: string;
  title: string;
  tip: string;
  example_good?: string;
  example_bad?: string;
  comparison_with?: string;
  metric_current?: number;
  metric_target?: number;
  status: string;
  created_at: string;
}

interface ConversationPath {
  stage_path: string[];
  count: number;
  conversion_rate: number;
  avg_response_time_sec?: number;
}

interface ManagerComparison {
  manager_id: string;
  manager_name: string;
  total_conversations: number;
  conversion_rate: number;
  avg_response_time_sec: number;
  avg_messages_per_conversation: number;
  most_common_path?: string[];
}

interface TeamMetrics {
  total_conversations: number;
  avg_conversion_rate: number;
  avg_response_time_sec: number;
  active_managers: number;
  total_insights: number;
  pending_tips: number;
}

// ─── Constants ───────────────────────────────────────────────
const SEVERITY_CONFIG: Record<string, { color: string; icon: typeof AlertTriangle; label: string }> = {
  critical: { color: "text-red-600 bg-red-500/10", icon: AlertTriangle, label: "Критично" },
  warning: { color: "text-amber-600 bg-amber-500/10", icon: AlertTriangle, label: "Внимание" },
  opportunity: { color: "text-emerald-600 bg-emerald-500/10", icon: TrendingUp, label: "Возможность" },
  info: { color: "text-blue-600 bg-blue-500/10", icon: Lightbulb, label: "Инфо" },
};

const INSIGHT_TYPE_LABELS: Record<string, string> = {
  path_efficiency: "Эффективность путей",
  timing_pattern: "Паттерны времени",
  team_bottleneck: "Узкие места",
  behavior_drift: "Дрейф поведения",
  conversion_driver: "Драйверы конверсии",
  loss_pattern: "Паттерны потерь",
  best_practice: "Лучшие практики",
  anomaly: "Аномалия",
};

const CATEGORY_LABELS: Record<string, string> = {
  speed: "⚡ Скорость",
  qualification: "🎯 Квалификация",
  objection: "🛡 Возражения",
  closing: "🏁 Закрытие",
  follow_up: "🔄 Follow-up",
  tone: "💬 Тон",
  timing: "🕐 Время",
  general: "📋 Общее",
};

const STAGE_LABELS: Record<string, string> = {
  greeting: "Приветствие",
  qualification: "Квалификация",
  presentation: "Презентация",
  price: "Цена",
  objection: "Возражения",
  trial: "Пробное",
  close: "Закрытие",
  follow_up: "Follow-up",
  lost: "Потеря",
  general: "Общее",
};

const PATH_COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(262, 83%, 58%)",
  "hsl(199, 89%, 48%)",
];

// ─── Component ───────────────────────────────────────────────
export function TeamIntelligenceDashboard() {
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;
  const [insights, setInsights] = useState<TeamInsight[]>([]);
  const [tips, setTips] = useState<CoachingTip[]>([]);
  const [paths, setPaths] = useState<ConversationPath[]>([]);
  const [managers, setManagers] = useState<ManagerComparison[]>([]);
  const [metrics, setMetrics] = useState<TeamMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningAnalysis, setRunningAnalysis] = useState(false);

  const fetchData = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      const [insightsRes, tipsRes, pathsRes, managersRes, metricsRes] = await Promise.allSettled([
        selfHostedPost("get-team-insights", { organization_id: organizationId, limit: 20 }),
        selfHostedPost("get-coaching-tips", { organization_id: organizationId, limit: 30 }),
        selfHostedPost("get-top-paths", { organization_id: organizationId, limit: 10 }),
        selfHostedPost("get-manager-comparison", { organization_id: organizationId }),
        selfHostedPost("get-team-metrics", { organization_id: organizationId }),
      ]);

      if (insightsRes.status === "fulfilled" && (insightsRes.value as any)?.data) {
        setInsights(((insightsRes.value as any).data as any[]) || []);
      }
      if (tipsRes.status === "fulfilled" && (tipsRes.value as any)?.data) {
        setTips(((tipsRes.value as any).data as any[]) || []);
      }
      if (pathsRes.status === "fulfilled" && (pathsRes.value as any)?.data) {
        setPaths(((pathsRes.value as any).data as any[]) || []);
      }
      if (managersRes.status === "fulfilled" && (managersRes.value as any)?.data) {
        setManagers(((managersRes.value as any).data as any[]) || []);
      }
      if (metricsRes.status === "fulfilled" && (metricsRes.value as any)?.data) {
        setMetrics((metricsRes.value as any).data as TeamMetrics);
      }
    } catch (err: any) {
      console.error("[TeamIntelligence] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const runAnalysis = async () => {
    if (!organizationId) return;
    setRunningAnalysis(true);
    try {
      await selfHostedPost("team-intelligence", { organization_id: organizationId });
      toast({ title: "Анализ запущен", description: "Результаты появятся через 1-2 минуты" });
      setTimeout(fetchData, 30000);
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    } finally {
      setRunningAnalysis(false);
    }
  };

  const updateInsightStatus = async (id: string, status: string) => {
    try {
      await selfHostedPost("update-insight-status", { id, status });
      setInsights((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    } catch { /* ignore */ }
  };

  const updateTipStatus = async (id: string, status: string) => {
    try {
      await selfHostedPost("update-coaching-tip-status", { id, status });
      setTips((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    } catch { /* ignore */ }
  };

  // ─── Render helpers ─────────────────────────────────────────
  const activeInsights = insights.filter((i) => i.status === "active");
  const criticalInsights = activeInsights.filter((i) => i.severity === "critical");
  const pendingTips = tips.filter((t) => t.status === "pending");

  const pathChartData = paths.map((p, idx) => ({
    name: p.stage_path.map((s) => STAGE_LABELS[s] || s).join(" → "),
    shortName: p.stage_path.map((s) => (STAGE_LABELS[s] || s).slice(0, 4)).join("→"),
    count: p.count,
    conversion: Math.round((p.conversion_rate || 0) * 100),
    fill: PATH_COLORS[idx % PATH_COLORS.length],
  }));

  const managerChartData = managers.map((m) => ({
    name: m.manager_name || m.manager_id.slice(0, 8),
    conversion: Math.round((m.conversion_rate || 0) * 100),
    avgResponse: Math.round(m.avg_response_time_sec || 0),
    conversations: m.total_conversations,
  }));

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary animate-pulse" />
          <div>
            <h1 className="text-3xl font-bold">Team Intelligence</h1>
            <p className="text-muted-foreground">Загрузка данных...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Team Intelligence</h1>
            <p className="text-muted-foreground">
              Коллективный интеллект команды — паттерны, инсайты, коучинг
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Обновить
          </Button>
          <Button size="sm" onClick={runAnalysis} disabled={runningAnalysis}>
            <Sparkles className="h-4 w-4 mr-1" />
            {runningAnalysis ? "Анализ..." : "Запустить AI-анализ"}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Users}
          label="Активных менеджеров"
          value={metrics?.active_managers ?? managers.length}
        />
        <MetricCard
          icon={MessageSquare}
          label="Диалогов (30д)"
          value={metrics?.total_conversations ?? 0}
        />
        <MetricCard
          icon={Target}
          label="Ср. конверсия"
          value={`${Math.round((metrics?.avg_conversion_rate ?? 0) * 100)}%`}
          trend={metrics?.avg_conversion_rate && metrics.avg_conversion_rate > 0.2 ? "up" : "down"}
        />
        <MetricCard
          icon={Clock}
          label="Ср. время ответа"
          value={formatTime(metrics?.avg_response_time_sec ?? 0)}
          trend={metrics?.avg_response_time_sec && metrics.avg_response_time_sec < 120 ? "up" : "down"}
        />
      </div>

      {/* Critical alerts */}
      {criticalInsights.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Критические инсайты ({criticalInsights.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {criticalInsights.map((insight) => (
              <div
                key={insight.id}
                className="flex items-start justify-between p-3 rounded-lg bg-background border"
              >
                <div className="flex-1">
                  <p className="font-medium">{insight.title}</p>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateInsightStatus(insight.id, "acknowledged")}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="insights">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights" className="gap-1">
            <Lightbulb className="h-4 w-4" />
            Инсайты
            {activeInsights.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {activeInsights.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="coaching" className="gap-1">
            <Sparkles className="h-4 w-4" />
            Коучинг
            {pendingTips.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {pendingTips.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="paths" className="gap-1">
            <Route className="h-4 w-4" />
            Пути
          </TabsTrigger>
          <TabsTrigger value="managers" className="gap-1">
            <BarChart3 className="h-4 w-4" />
            Менеджеры
          </TabsTrigger>
        </TabsList>

        {/* ─── Insights Tab ─── */}
        <TabsContent value="insights" className="space-y-4">
          {activeInsights.length === 0 ? (
            <EmptyState
              icon={Lightbulb}
              title="Нет активных инсайтов"
              description="Запустите AI-анализ для генерации инсайтов команды"
            />
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-3 pr-4">
                {activeInsights.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    onAcknowledge={() => updateInsightStatus(insight.id, "acknowledged")}
                    onDismiss={() => updateInsightStatus(insight.id, "dismissed")}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* ─── Coaching Tab ─── */}
        <TabsContent value="coaching" className="space-y-4">
          {tips.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Нет рекомендаций"
              description="AI Coach пока не сгенерировал персональные советы"
            />
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-3 pr-4">
                {tips.map((tip) => (
                  <CoachingTipCard
                    key={tip.id}
                    tip={tip}
                    onApply={() => updateTipStatus(tip.id, "applied")}
                    onDismiss={() => updateTipStatus(tip.id, "dismissed")}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* ─── Paths Tab ─── */}
        <TabsContent value="paths" className="space-y-4">
          {paths.length === 0 ? (
            <EmptyState
              icon={Route}
              title="Нет данных о путях"
              description="Пути диалогов появятся после агрегации поведенческих событий"
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Топ путей по конверсии</CardTitle>
                  <CardDescription>Какие последовательности стадий приводят к успеху</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={pathChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" domain={[0, 100]} unit="%" className="text-xs" />
                      <YAxis
                        type="category"
                        dataKey="shortName"
                        width={120}
                        className="text-xs"
                      />
                      <Tooltip
                        formatter={(v: number) => [`${v}%`, "Конверсия"]}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""}
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="conversion" radius={[0, 4, 4, 0]}>
                        {pathChartData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Детали путей</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {paths.map((path, idx) => (
                        <div key={idx} className="p-3 rounded-lg border bg-card">
                          <div className="flex items-center gap-1 flex-wrap mb-2">
                            {path.stage_path.map((stage, sIdx) => (
                              <span key={sIdx} className="flex items-center gap-1">
                                <Badge variant="outline" className="text-xs">
                                  {STAGE_LABELS[stage] || stage}
                                </Badge>
                                {sIdx < path.stage_path.length - 1 && (
                                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                )}
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>{path.count} диалогов</span>
                            <span className="font-medium text-foreground">
                              {Math.round((path.conversion_rate || 0) * 100)}% конверсия
                            </span>
                            {path.avg_response_time_sec && (
                              <span>⏱ {formatTime(path.avg_response_time_sec)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ─── Managers Tab ─── */}
        <TabsContent value="managers" className="space-y-4">
          {managers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Нет данных по менеджерам"
              description="Данные появятся после накопления поведенческих событий"
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Конверсия менеджеров</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={managerChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis unit="%" className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar
                        dataKey="conversion"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                        name="Конверсия %"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Сравнение менеджеров</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {managers.map((m) => (
                        <div key={m.manager_id} className="p-3 rounded-lg border bg-card">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">
                              {m.manager_name || m.manager_id.slice(0, 8)}
                            </span>
                            <Badge
                              variant={m.conversion_rate > 0.25 ? "default" : "secondary"}
                            >
                              {Math.round((m.conversion_rate || 0) * 100)}%
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                            <div>
                              <span className="block text-foreground font-medium">
                                {m.total_conversations}
                              </span>
                              диалогов
                            </div>
                            <div>
                              <span className="block text-foreground font-medium">
                                {formatTime(m.avg_response_time_sec)}
                              </span>
                              ответ
                            </div>
                            <div>
                              <span className="block text-foreground font-medium">
                                {Math.round(m.avg_messages_per_conversation || 0)}
                              </span>
                              сообщ/диалог
                            </div>
                          </div>
                          {m.most_common_path && (
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              <span className="text-xs text-muted-foreground">Путь:</span>
                              {m.most_common_path.map((s, i) => (
                                <Badge key={i} variant="outline" className="text-[10px] px-1">
                                  {STAGE_LABELS[s] || s}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  trend?: "up" | "down";
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground truncate">{label}</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold">{value}</p>
            {trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-500" />}
            {trend === "down" && <TrendingDown className="h-4 w-4 text-red-500" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightCard({
  insight,
  onAcknowledge,
  onDismiss,
}: {
  insight: TeamInsight;
  onAcknowledge: () => void;
  onDismiss: () => void;
}) {
  const config = SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.info;
  const SevIcon = config.icon;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${config.color}`}>
            <SevIcon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="font-medium">{insight.title}</h4>
              <Badge variant="outline" className="text-xs">
                {INSIGHT_TYPE_LABELS[insight.insight_type] || insight.insight_type}
              </Badge>
              {insight.confidence != null && (
                <span className="text-xs text-muted-foreground">
                  {Math.round(insight.confidence)}% уверенность
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
            {insight.recommendation && (
              <div className="p-2 rounded bg-muted text-sm flex items-start gap-2">
                <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>{insight.recommendation}</span>
              </div>
            )}
            {insight.potential_impact_pct != null && insight.potential_impact_pct > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Потенциал:</span>
                <Progress value={insight.potential_impact_pct} className="flex-1 h-2" />
                <span className="text-xs font-medium">+{insight.potential_impact_pct}%</span>
              </div>
            )}
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" onClick={onAcknowledge} title="Принято">
              <CheckCircle2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDismiss} title="Отклонить">
              <ThumbsDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CoachingTipCard({
  tip,
  onApply,
  onDismiss,
}: {
  tip: CoachingTip;
  onApply: () => void;
  onDismiss: () => void;
}) {
  return (
    <Card className={tip.status === "pending" ? "border-primary/30" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="font-medium">{tip.title}</h4>
              <Badge variant="outline" className="text-xs">
                {CATEGORY_LABELS[tip.category] || tip.category}
              </Badge>
              {tip.manager_name && (
                <span className="text-xs text-muted-foreground">
                  для {tip.manager_name}
                </span>
              )}
              <Badge variant={tip.status === "pending" ? "default" : "secondary"} className="text-xs">
                {tip.status === "pending" ? "Новый" : tip.status === "applied" ? "Применён" : tip.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{tip.tip}</p>

            {(tip.example_good || tip.example_bad) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {tip.example_good && (
                  <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/20 text-sm">
                    <div className="flex items-center gap-1 text-emerald-600 mb-1">
                      <ThumbsUp className="h-3 w-3" />
                      <span className="text-xs font-medium">Хорошо</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{tip.example_good}</p>
                  </div>
                )}
                {tip.example_bad && (
                  <div className="p-2 rounded bg-red-500/5 border border-red-500/20 text-sm">
                    <div className="flex items-center gap-1 text-red-600 mb-1">
                      <ThumbsDown className="h-3 w-3" />
                      <span className="text-xs font-medium">Избегать</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{tip.example_bad}</p>
                  </div>
                )}
              </div>
            )}

            {tip.metric_current != null && tip.metric_target != null && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Текущее: {tip.metric_current}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium text-primary">Цель: {tip.metric_target}</span>
              </div>
            )}
          </div>
          {tip.status === "pending" && (
            <div className="flex gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon" onClick={onApply} title="Применить">
                <ThumbsUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onDismiss} title="Отклонить">
                <ThumbsDown className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Lightbulb;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md">{description}</p>
      </CardContent>
    </Card>
  );
}

// ─── Utils ───────────────────────────────────────────────────
function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return "—";
  if (seconds < 60) return `${Math.round(seconds)}с`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}м`;
  return `${(seconds / 3600).toFixed(1)}ч`;
}
