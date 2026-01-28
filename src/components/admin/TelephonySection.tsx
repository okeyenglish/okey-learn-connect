import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { CallDetailModal } from "@/components/crm/CallDetailModal";
import { OnlinePBXSettings } from "./OnlinePBXSettings";
import { selfHostedPost } from "@/lib/selfHostedApi";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import {
  RefreshCw,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  ChevronLeft,
  ChevronRight,
  User,
  Settings,
  History,
  Search,
  X,
  Tag,
  Sparkles,
  AlertCircle,
} from "lucide-react";

// Hangup cause options for filter
const HANGUP_CAUSES = [
  { value: "NORMAL_CLEARING", label: "Нормальное завершение" },
  { value: "USER_BUSY", label: "Абонент занят" },
  { value: "NO_ANSWER", label: "Нет ответа" },
  { value: "NO_USER_RESPONSE", label: "Абонент не ответил" },
  { value: "SUBSCRIBER_ABSENT", label: "Абонент не в сети" },
  { value: "CALL_REJECTED", label: "Вызов отклонен" },
  { value: "ORIGINATOR_CANCEL", label: "Вызов отменен" },
  { value: "UNALLOCATED_NUMBER", label: "Несуществующий номер" },
  { value: "NUMBER_CHANGED", label: "Номер изменился" },
  { value: "INVALID_NUMBER_FORMAT", label: "Ошибка в номере" },
  { value: "PROGRESS_TIMEOUT", label: "Время ожидания вышло" },
  { value: "GATEWAY_DOWN", label: "Внешний номер не зарегистрирован" },
];

// Tags for filter
const CALL_TAGS = [
  { value: "hot_lead", label: "🔥 Горячий лид", color: "bg-red-100 text-red-800" },
  { value: "warm_lead", label: "☀️ Тёплый лид", color: "bg-orange-100 text-orange-800" },
  { value: "cold_lead", label: "❄️ Холодный лид", color: "bg-blue-100 text-blue-800" },
  { value: "callback_requested", label: "📞 Перезвонить", color: "bg-purple-100 text-purple-800" },
  { value: "trial_booked", label: "✅ Пробный урок", color: "bg-green-100 text-green-800" },
  { value: "complaint", label: "😠 Жалоба", color: "bg-red-100 text-red-800" },
  { value: "price_objection", label: "💰 Возражение по цене", color: "bg-yellow-100 text-yellow-800" },
  { value: "no_contact", label: "📵 Не связались", color: "bg-gray-100 text-gray-800" },
  { value: "existing_client", label: "👤 Клиент школы", color: "bg-blue-100 text-blue-800" },
  { value: "wrong_number", label: "❌ Ошибочный номер", color: "bg-gray-100 text-gray-800" },
  { value: "spam_robot", label: "🤖 Спам", color: "bg-gray-100 text-gray-800" },
];

interface CallLog {
  id: string;
  phone_number: string;
  direction: "incoming" | "outgoing";
  status: "initiated" | "answered" | "missed" | "busy" | "failed";
  duration_seconds: number | null;
  started_at: string;
  manager_name: string | null;
  hangup_cause: string | null;
  tags: string[] | null;
  ai_evaluation: any | null;
  summary: string | null;
  clients?: { id: string; name: string; phone: string } | null;
}

interface CallLogsResponse {
  success: boolean;
  calls: CallLog[];
  total: number;
  limit: number;
  offset: number;
}

const ITEMS_PER_PAGE = 50;

function GlobalCallHistory() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [hangupCauseFilter, setHangupCauseFilter] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["global-call-logs", page, statusFilter, directionFilter, hangupCauseFilter, selectedTags, dateRange, phoneSearch],
    queryFn: async () => {
      const filters: Record<string, any> = {};
      
      if (statusFilter !== "all") {
        filters.status = statusFilter;
      }
      if (directionFilter !== "all") {
        filters.direction = directionFilter;
      }
      if (hangupCauseFilter !== "all") {
        filters.hangupCause = hangupCauseFilter;
      }
      if (selectedTags.length > 0) {
        filters.tags = selectedTags;
      }
      if (dateRange?.from) {
        filters.dateFrom = dateRange.from.toISOString();
      }
      if (dateRange?.to) {
        filters.dateTo = dateRange.to.toISOString();
      }

      // If phone search, use search action
      if (phoneSearch.trim()) {
        const response = await selfHostedPost<CallLogsResponse>("get-call-logs", {
          action: "search",
          phoneNumber: phoneSearch.trim(),
          limit: ITEMS_PER_PAGE,
        });
        if (!response.success) {
          throw new Error(response.error || "Ошибка поиска");
        }
        return { ...response.data, total: response.data?.calls?.length || 0, limit: ITEMS_PER_PAGE, offset: 0 };
      }

      const response = await selfHostedPost<CallLogsResponse>("get-call-logs", {
        action: "list",
        limit: ITEMS_PER_PAGE,
        offset: page * ITEMS_PER_PAGE,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
      });

      if (!response.success) {
        throw new Error(response.error || "Ошибка загрузки звонков");
      }

      return response.data;
    },
  });

  const handleFilterChange = () => {
    setPage(0);
  };

  const handleOpenCallDetail = (callId: string) => {
    setSelectedCallId(callId);
    setModalOpen(true);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
    handleFilterChange();
  };

  const clearAllFilters = () => {
    setStatusFilter("all");
    setDirectionFilter("all");
    setHangupCauseFilter("all");
    setSelectedTags([]);
    setDateRange(undefined);
    setPhoneSearch("");
    setPage(0);
  };

  const getDirectionIcon = (direction: string, status: string) => {
    if (status === "missed" || status === "failed") {
      return <PhoneMissed className="h-4 w-4 text-destructive" />;
    }
    if (direction === "incoming") {
      return <PhoneIncoming className="h-4 w-4 text-green-600" />;
    }
    return <PhoneOutgoing className="h-4 w-4 text-blue-600" />;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      answered: { label: "Отвечен", className: "bg-green-100 text-green-800 border-green-200" },
      missed: { label: "Пропущен", className: "bg-red-100 text-red-800 border-red-200" },
      busy: { label: "Занято", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
      failed: { label: "Не удался", className: "bg-red-100 text-red-800 border-red-200" },
      initiated: { label: "Инициирован", className: "bg-blue-100 text-blue-800 border-blue-200" },
    };
    const { label, className } = config[status] || { label: status, className: "bg-muted text-muted-foreground" };
    return <Badge variant="outline" className={className}>{label}</Badge>;
  };

  const getHangupCauseLabel = (cause: string | null) => {
    if (!cause) return null;
    const found = HANGUP_CAUSES.find(h => h.value === cause);
    return found?.label || cause;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}м ${secs}с` : `${secs}с`;
  };

  const totalPages = data?.total ? Math.ceil(data.total / ITEMS_PER_PAGE) : 0;
  const hasActiveFilters = statusFilter !== "all" || directionFilter !== "all" || hangupCauseFilter !== "all" || selectedTags.length > 0 || dateRange?.from || phoneSearch;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                История звонков организации
              </CardTitle>
              <CardDescription>
                Все звонки с фильтрацией по тегам, причине завершения и AI-анализу
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Сбросить
                </Button>
              )}
              <Button onClick={() => refetch()} disabled={isFetching} variant="outline">
                <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
                Обновить
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: Basic filters */}
          <div className="flex flex-wrap gap-4 items-end">
            {/* Phone search */}
            <div className="space-y-1 flex-1 min-w-[200px]">
              <label className="text-sm font-medium">Поиск по номеру</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Введите номер..."
                  value={phoneSearch}
                  onChange={(e) => {
                    setPhoneSearch(e.target.value);
                    handleFilterChange();
                  }}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Статус</label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); handleFilterChange(); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="answered">Отвеченные</SelectItem>
                  <SelectItem value="missed">Пропущенные</SelectItem>
                  <SelectItem value="busy">Занято</SelectItem>
                  <SelectItem value="failed">Не удались</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Направление</label>
              <Select value={directionFilter} onValueChange={(v) => { setDirectionFilter(v); handleFilterChange(); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="incoming">Входящие</SelectItem>
                  <SelectItem value="outgoing">Исходящие</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Период</label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={(range) => { setDateRange(range); handleFilterChange(); }}
              />
            </div>
          </div>

          {/* Row 2: Hangup cause filter */}
          <div className="space-y-1">
            <label className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Причина завершения
            </label>
            <Select value={hangupCauseFilter} onValueChange={(v) => { setHangupCauseFilter(v); handleFilterChange(); }}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Все причины" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все причины</SelectItem>
                {HANGUP_CAUSES.map(cause => (
                  <SelectItem key={cause.value} value={cause.value}>
                    {cause.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row 3: Tags filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Фильтр по тегам AI-анализа
            </label>
            <div className="flex flex-wrap gap-2">
              {CALL_TAGS.map(tag => (
                <Badge
                  key={tag.value}
                  variant={selectedTags.includes(tag.value) ? "default" : "outline"}
                  className={`cursor-pointer transition-all ${selectedTags.includes(tag.value) ? "ring-2 ring-primary" : ""}`}
                  onClick={() => toggleTag(tag.value)}
                >
                  {tag.label}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data?.calls && data.calls.length > 0 ? (
            <>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Дата/время</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Номер</TableHead>
                      <TableHead>Клиент</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Причина</TableHead>
                      <TableHead>Теги</TableHead>
                      <TableHead>Оценка</TableHead>
                      <TableHead>Длит.</TableHead>
                      <TableHead>Менеджер</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.calls.map((call) => (
                      <TableRow
                        key={call.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleOpenCallDetail(call.id)}
                      >
                        <TableCell className="font-medium text-sm">
                          {format(new Date(call.started_at), "dd MMM, HH:mm", { locale: ru })}
                        </TableCell>
                        <TableCell>
                          {getDirectionIcon(call.direction, call.status)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {call.phone_number}
                        </TableCell>
                        <TableCell>
                          {call.clients?.name || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>{getStatusBadge(call.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                          {getHangupCauseLabel(call.hangup_cause) || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {call.tags && call.tags.length > 0 ? (
                              call.tags.slice(0, 2).map(tag => {
                                const tagConfig = CALL_TAGS.find(t => t.value === tag);
                                return (
                                  <Badge key={tag} variant="secondary" className={`text-[10px] px-1 py-0 ${tagConfig?.color || ""}`}>
                                    {tagConfig?.label?.split(" ")[0] || tag}
                                  </Badge>
                                );
                              })
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                            {call.tags && call.tags.length > 2 && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                +{call.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {call.ai_evaluation?.overall_score !== undefined ? (
                            <Badge 
                              variant="secondary"
                              className={`text-xs ${
                                call.ai_evaluation.overall_score >= 8 
                                  ? 'bg-green-100 text-green-800'
                                  : call.ai_evaluation.overall_score >= 6
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              {call.ai_evaluation.overall_score}/10
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground text-xs">
                            <Clock className="h-3 w-3" />
                            {formatDuration(call.duration_seconds)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {call.manager_name ? (
                            <div className="flex items-center gap-1 text-sm">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate max-w-[100px]">{call.manager_name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-muted-foreground">
                  Показано {page * ITEMS_PER_PAGE + 1}–{Math.min((page + 1) * ITEMS_PER_PAGE, data.total)} из {data.total}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">{page + 1} / {totalPages || 1}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Phone className="h-12 w-12 mb-4 opacity-50" />
              <p>Звонки не найдены</p>
              <p className="text-sm">Попробуйте изменить фильтры</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Call Detail Modal */}
      <CallDetailModal
        callId={selectedCallId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}

export function TelephonySection() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Phone className="h-8 w-8 text-blue-600" />
          Телефония
        </h1>
        <p className="text-muted-foreground">Интеграция с OnlinePBX и история звонков</p>
      </div>

      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            История звонков
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Настройки
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <GlobalCallHistory />
        </TabsContent>

        <TabsContent value="settings">
          <OnlinePBXSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
