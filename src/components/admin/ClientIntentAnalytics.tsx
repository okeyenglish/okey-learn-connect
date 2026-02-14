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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  RefreshCw,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  HelpCircle,
  ShieldAlert,
  Calendar,
  DollarSign,
  Clock,
  BookOpen,
  UserPlus,
  Star,
  AlertTriangle,
  Phone,
  MapPin,
  ThumbsUp,
  Info,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────
interface IntentDistribution {
  intent: string;
  count: number;
}

interface TrendDay {
  date: string;
  total: number;
  [key: string]: string | number;
}

interface IntentConversion {
  intent: string;
  total: number;
  converted: number;
  conversion_rate: number;
}

interface IntentData {
  distribution: IntentDistribution[];
  total_incoming: number;
  trends: TrendDay[];
  top_messages: Record<string, Array<{ text: string; date: string; client_id: string }>>;
  intent_conversion: IntentConversion[];
}

// ─── Constants ───────────────────────────────────────────────
const INTENT_CONFIG: Record<string, { label: string; icon: typeof MessageSquare; color: string }> = {
  price_inquiry: { label: "Вопрос о цене", icon: DollarSign, color: "hsl(38, 92%, 50%)" },
  schedule_inquiry: { label: "Запрос расписания", icon: Calendar, color: "hsl(199, 89%, 48%)" },
  trial_request: { label: "Запрос пробного", icon: UserPlus, color: "hsl(142, 76%, 36%)" },
  enrollment: { label: "Запись на курс", icon: BookOpen, color: "hsl(262, 83%, 58%)" },
  complaint: { label: "Жалоба", icon: AlertTriangle, color: "hsl(0, 84%, 60%)" },
  question: { label: "Общий вопрос", icon: HelpCircle, color: "hsl(210, 40%, 60%)" },
  positive_feedback: { label: "Позитивный отзыв", icon: ThumbsUp, color: "hsl(150, 60%, 45%)" },
  schedule_change: { label: "Смена расписания", icon: Clock, color: "hsl(280, 60%, 55%)" },
  absence_notice: { label: "Уведомление об отсутствии", icon: Info, color: "hsl(45, 80%, 50%)" },
  payment_question: { label: "Вопрос об оплате", icon: DollarSign, color: "hsl(20, 85%, 55%)" },
  teacher_question: { label: "Вопрос о преподавателе", icon: Star, color: "hsl(330, 70%, 55%)" },
  location_inquiry: { label: "Вопрос о филиале", icon: MapPin, color: "hsl(170, 65%, 45%)" },
  callback_request: { label: "Запрос обратного звонка", icon: Phone, color: "hsl(220, 70%, 55%)" },
  greeting: { label: "Приветствие", icon: MessageSquare, color: "hsl(190, 50%, 55%)" },
  unknown: { label: "Не определено", icon: HelpCircle, color: "hsl(0, 0%, 60%)" },
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(262, 83%, 58%)",
  "hsl(199, 89%, 48%)",
  "hsl(330, 70%, 55%)",
  "hsl(170, 65%, 45%)",
  "hsl(20, 85%, 55%)",
  "hsl(45, 80%, 50%)",
  "hsl(280, 60%, 55%)",
  "hsl(210, 40%, 60%)",
  "hsl(150, 60%, 45%)",
  "hsl(220, 70%, 55%)",
  "hsl(190, 50%, 55%)",
];

const TOP_INTENTS_FOR_TRENDS = [
  "price_inquiry",
  "schedule_inquiry",
  "trial_request",
  "complaint",
  "enrollment",
  "question",
];

const TREND_COLORS: Record<string, string> = {
  price_inquiry: "hsl(38, 92%, 50%)",
  schedule_inquiry: "hsl(199, 89%, 48%)",
  trial_request: "hsl(142, 76%, 36%)",
  complaint: "hsl(0, 84%, 60%)",
  enrollment: "hsl(262, 83%, 58%)",
  question: "hsl(210, 40%, 60%)",
};

function getIntentLabel(intent: string): string {
  return INTENT_CONFIG[intent]?.label || intent;
}

function getIntentColor(intent: string): string {
  return INTENT_CONFIG[intent]?.color || "hsl(0, 0%, 60%)";
}

// ─── Component ───────────────────────────────────────────────
export function ClientIntentAnalytics() {
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;
  const [data, setData] = useState<IntentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");

  const fetchData = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const res = await selfHostedPost("get-client-intents", {
        organization_id: organizationId,
        days: parseInt(days),
        mode: "all",
      });
      if (res.success && res.data) {
        setData(res.data as IntentData);
      }
    } catch (err) {
      console.error("[ClientIntentAnalytics] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [organizationId, days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pieData = (data?.distribution || []).map((d, idx) => ({
    name: getIntentLabel(d.intent),
    value: d.count,
    fill: PIE_COLORS[idx % PIE_COLORS.length],
  }));

  const conversionData = (data?.intent_conversion || [])
    .filter((d) => d.total >= 3)
    .map((d) => ({
      name: getIntentLabel(d.intent),
      intent: d.intent,
      total: d.total,
      converted: d.converted,
      rate: Math.round(d.conversion_rate * 100),
    }));

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-primary animate-pulse" />
          <div>
            <h1 className="text-3xl font-bold">Client Intent Analytics</h1>
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

  const topIntent = data?.distribution?.[0];
  const totalIncoming = data?.total_incoming || 0;
  const uniqueIntents = data?.distribution?.length || 0;
  const complaintsCount = data?.distribution?.find((d) => d.intent === "complaint")?.count || 0;
  const trialRequests = data?.distribution?.find((d) => d.intent === "trial_request")?.count || 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Client Intent Analytics</h1>
            <p className="text-muted-foreground">
              Анализ намерений клиентов — что спрашивают, чем интересуются
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 дней</SelectItem>
              <SelectItem value="14">14 дней</SelectItem>
              <SelectItem value="30">30 дней</SelectItem>
              <SelectItem value="60">60 дней</SelectItem>
              <SelectItem value="90">90 дней</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Обновить
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Входящих сообщений</p>
                <p className="text-2xl font-bold">{totalIncoming}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <PieChartIcon className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Уникальных интентов</p>
                <p className="text-2xl font-bold">{uniqueIntents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <UserPlus className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Запросы пробного</p>
                <p className="text-2xl font-bold">{trialRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <ShieldAlert className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Жалобы</p>
                <p className="text-2xl font-bold">{complaintsCount}</p>
                {totalIncoming > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {Math.round((complaintsCount / totalIncoming) * 100)}% от всех
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="distribution">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="distribution" className="gap-1">
            <PieChartIcon className="h-4 w-4" />
            Распределение
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-1">
            <TrendingUp className="h-4 w-4" />
            Тренды
          </TabsTrigger>
          <TabsTrigger value="conversion" className="gap-1">
            <BarChart3 className="h-4 w-4" />
            Конверсия
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-1">
            <MessageSquare className="h-4 w-4" />
            Сообщения
          </TabsTrigger>
        </TabsList>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Распределение интентов</CardTitle>
                <CardDescription>Доля каждого типа запроса за {days} дней</CardDescription>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <EmptyState text="Нет данных об интентах" />
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        innerRadius={60}
                        paddingAngle={2}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {pieData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => [v, "Сообщений"]}
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Рейтинг интентов</CardTitle>
                <CardDescription>Топ запросов клиентов по количеству</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[350px]">
                  <div className="space-y-3">
                    {(data?.distribution || []).map((d, idx) => {
                      const config = INTENT_CONFIG[d.intent];
                      const Icon = config?.icon || HelpCircle;
                      const pct = totalIncoming > 0 ? Math.round((d.count / totalIncoming) * 100) : 0;
                      return (
                        <div
                          key={d.intent}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: `${getIntentColor(d.intent)}20` }}
                          >
                            <Icon
                              className="h-4 w-4"
                              style={{ color: getIntentColor(d.intent) }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm truncate">
                                {getIntentLabel(d.intent)}
                              </p>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {d.count}
                                </Badge>
                                <span className="text-xs text-muted-foreground w-10 text-right">
                                  {pct}%
                                </span>
                              </div>
                            </div>
                            <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: getIntentColor(d.intent),
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Тренды интентов по дням</CardTitle>
              <CardDescription>Динамика топ-интентов за {days} дней</CardDescription>
            </CardHeader>
            <CardContent>
              {!data?.trends?.length ? (
                <EmptyState text="Нет данных о трендах" />
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={data.trends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      className="text-xs"
                      tickFormatter={(d) => {
                        const parts = d.split("-");
                        return `${parts[2]}.${parts[1]}`;
                      }}
                    />
                    <YAxis className="text-xs" />
                    <Tooltip
                      labelFormatter={(d) => {
                        const parts = String(d).split("-");
                        return `${parts[2]}.${parts[1]}.${parts[0]}`;
                      }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend
                      formatter={(value) => getIntentLabel(value)}
                    />
                    {TOP_INTENTS_FOR_TRENDS.map((intent) => (
                      <Area
                        key={intent}
                        type="monotone"
                        dataKey={intent}
                        name={intent}
                        stackId="1"
                        stroke={TREND_COLORS[intent] || "hsl(0,0%,60%)"}
                        fill={TREND_COLORS[intent] || "hsl(0,0%,60%)"}
                        fillOpacity={0.3}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Total daily volume */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Общий объём входящих</CardTitle>
              <CardDescription>Количество входящих сообщений с определённым интентом по дням</CardDescription>
            </CardHeader>
            <CardContent>
              {!data?.trends?.length ? (
                <EmptyState text="Нет данных" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.trends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      className="text-xs"
                      tickFormatter={(d) => {
                        const parts = d.split("-");
                        return `${parts[2]}.${parts[1]}`;
                      }}
                    />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Всего" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conversion Tab */}
        <TabsContent value="conversion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Конверсия по интентам</CardTitle>
              <CardDescription>
                Какие интенты клиентов чаще всего приводят к конверсии (≥3 диалогов)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {conversionData.length === 0 ? (
                <EmptyState text="Нет данных о конверсии по интентам" />
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={conversionData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" domain={[0, 100]} unit="%" className="text-xs" />
                    <YAxis type="category" dataKey="name" width={160} className="text-xs" />
                    <Tooltip
                      formatter={(v: number, name: string) => {
                        if (name === "rate") return [`${v}%`, "Конверсия"];
                        return [v, name];
                      }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar
                      dataKey="rate"
                      fill="hsl(var(--primary))"
                      radius={[0, 4, 4, 0]}
                      name="rate"
                    >
                      {conversionData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={
                            entry.rate >= 30
                              ? "hsl(142, 76%, 36%)"
                              : entry.rate >= 15
                              ? "hsl(38, 92%, 50%)"
                              : "hsl(0, 84%, 60%)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Conversion table */}
          {conversionData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Детали по конверсии</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium text-muted-foreground">Интент</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Диалогов</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Конвертировано</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Конверсия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conversionData.map((d) => (
                        <tr key={d.intent} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="p-2 font-medium">{d.name}</td>
                          <td className="p-2 text-right">{d.total}</td>
                          <td className="p-2 text-right">{d.converted}</td>
                          <td className="p-2 text-right">
                            <Badge
                              variant={d.rate >= 30 ? "default" : d.rate >= 15 ? "secondary" : "destructive"}
                              className="text-xs"
                            >
                              {d.rate}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          {!data?.top_messages || Object.keys(data.top_messages).length === 0 ? (
            <EmptyState text="Нет примеров сообщений" />
          ) : (
            <ScrollArea className="h-[700px]">
              <div className="space-y-4 pr-4">
                {Object.entries(data.top_messages)
                  .sort((a, b) => b[1].length - a[1].length)
                  .map(([intent, messages]) => {
                    const config = INTENT_CONFIG[intent];
                    const Icon = config?.icon || HelpCircle;
                    return (
                      <Card key={intent}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Icon
                              className="h-4 w-4"
                              style={{ color: getIntentColor(intent) }}
                            />
                            {getIntentLabel(intent)}
                            <Badge variant="secondary" className="text-xs ml-auto">
                              {messages.length} примеров
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {messages.map((msg, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-lg bg-muted/50 border text-sm"
                            >
                              {msg.text ? (
                                <p className="text-foreground">{msg.text}</p>
                              ) : (
                                <p className="text-muted-foreground italic">
                                  (текст не сохранён в метаданных)
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(msg.date).toLocaleDateString("ru-RU", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
      <p>{text}</p>
      <p className="text-xs mt-1">Данные появятся после обработки входящих сообщений триггером</p>
    </div>
  );
}
