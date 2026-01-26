import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { selfHostedPost } from "@/lib/selfHostedApi";
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
} from "lucide-react";

interface CallLog {
  id: string;
  phone_number: string;
  direction: "incoming" | "outgoing";
  status: "initiated" | "answered" | "missed" | "busy" | "failed";
  duration_seconds: number | null;
  started_at: string;
  manager_name: string | null;
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

export function CallLogsTab() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["call-logs", page, statusFilter, directionFilter, dateRange],
    queryFn: async () => {
      const filters: Record<string, string | undefined> = {};
      
      if (statusFilter !== "all") {
        filters.status = statusFilter;
      }
      if (directionFilter !== "all") {
        filters.direction = directionFilter;
      }
      if (dateRange?.from) {
        filters.dateFrom = dateRange.from.toISOString();
      }
      if (dateRange?.to) {
        filters.dateTo = dateRange.to.toISOString();
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

  const handleRefresh = () => {
    refetch();
  };

  const handleOpenCallDetail = (callId: string) => {
    setSelectedCallId(callId);
    setModalOpen(true);
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
      answered: {
        label: "Отвечен",
        className: "bg-green-100 text-green-800 border-green-200",
      },
      missed: {
        label: "Пропущен",
        className: "bg-red-100 text-red-800 border-red-200",
      },
      busy: {
        label: "Занято",
        className: "bg-yellow-100 text-yellow-800 border-yellow-200",
      },
      failed: {
        label: "Не удался",
        className: "bg-red-100 text-red-800 border-red-200",
      },
      initiated: {
        label: "Инициирован",
        className: "bg-blue-100 text-blue-800 border-blue-200",
      },
    };

    const { label, className } = config[status] || {
      label: status,
      className: "bg-muted text-muted-foreground",
    };

    return (
      <Badge variant="outline" className={className}>
        {label}
      </Badge>
    );
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}м ${secs}с` : `${secs}с`;
  };

  const totalPages = data?.total ? Math.ceil(data.total / ITEMS_PER_PAGE) : 0;

  const handleFilterChange = () => {
    setPage(0);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Журнал звонков</CardTitle>
              <CardDescription>
                Просмотр последних звонков из self-hosted API
              </CardDescription>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isFetching}
              variant="outline"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
              />
              Обновить
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-sm font-medium">Статус</label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  handleFilterChange();
                }}
              >
                <SelectTrigger className="w-[150px]">
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
              <Select
                value={directionFilter}
                onValueChange={(value) => {
                  setDirectionFilter(value);
                  handleFilterChange();
                }}
              >
                <SelectTrigger className="w-[150px]">
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
                onDateChange={(range) => {
                  setDateRange(range);
                  handleFilterChange();
                }}
              />
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
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Дата/время</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Номер</TableHead>
                      <TableHead>Клиент</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Длительность</TableHead>
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
                        <TableCell className="font-medium">
                          {format(
                            new Date(call.started_at),
                            "dd MMM, HH:mm",
                            { locale: ru }
                          )}
                        </TableCell>
                        <TableCell>
                          {getDirectionIcon(call.direction, call.status)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {call.phone_number}
                        </TableCell>
                        <TableCell>
                          {call.clients?.name || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(call.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDuration(call.duration_seconds)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {call.manager_name ? (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{call.manager_name}</span>
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
                  Показано {page * ITEMS_PER_PAGE + 1}–
                  {Math.min((page + 1) * ITEMS_PER_PAGE, data.total)} из{" "}
                  {data.total}
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
                  <span className="text-sm">
                    {page + 1} / {totalPages || 1}
                  </span>
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
