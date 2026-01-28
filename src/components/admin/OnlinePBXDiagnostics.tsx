import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Loader2, 
  Search, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight,
  Phone,
  Webhook,
  CheckCircle,
  XCircle,
  FileAudio,
  Brain,
  Eye
} from "lucide-react";
import { selfHostedPost } from "@/lib/selfHostedApi";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface WebhookLog {
  id: string;
  created_at: string;
  event_type: string;
  source: string;
  processed: boolean;
  webhook_data: Record<string, unknown>;
  error_message?: string;
}

interface CallLog {
  id: string;
  phone_number: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  status: string;
  direction: string;
  recording_url?: string;
  transcription?: string;
  ai_evaluation?: Record<string, unknown>;
  notes?: string;
  summary?: string;
  client_id?: string;
  manager_id?: string;
  created_at: string;
}

interface DiagnosticsResponse {
  success: boolean;
  webhooks?: WebhookLog[];
  calls?: CallLog[];
  searchedPhone?: string;
  error?: string;
}

export function OnlinePBXDiagnostics() {
  const [searchPhone, setSearchPhone] = useState("");
  const [webhooks, setWebhooks] = useState<WebhookLog[]>([]);
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedWebhooks, setExpandedWebhooks] = useState<Set<string>>(new Set());
  const [selectedJson, setSelectedJson] = useState<Record<string, unknown> | null>(null);
  const [analyzingCallId, setAnalyzingCallId] = useState<string | null>(null);

  const loadData = async (action: 'webhooks' | 'calls' | 'search') => {
    try {
      setLoading(true);
      
      const response = await selfHostedPost<DiagnosticsResponse>('onlinepbx-diagnostics', {
        action,
        phone: action === 'search' ? searchPhone : undefined,
        limit: 20
      });

      if (!response.success || !response.data?.success) {
        throw new Error(response.error || response.data?.error || 'Ошибка загрузки');
      }

      if (response.data.webhooks) {
        setWebhooks(response.data.webhooks);
      }
      if (response.data.calls) {
        setCalls(response.data.calls);
      }

      if (action === 'search') {
        toast.success(`Найдено: ${response.data.webhooks?.length || 0} webhooks, ${response.data.calls?.length || 0} звонков`);
      }
    } catch (error) {
      console.error('Error loading diagnostics:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!searchPhone.trim()) {
      toast.error('Введите номер телефона');
      return;
    }
    loadData('search');
  };

  const handleRefresh = () => {
    loadData('webhooks');
    loadData('calls');
  };

  const toggleWebhookExpanded = (id: string) => {
    setExpandedWebhooks(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAnalyzeCall = async (callId: string) => {
    try {
      setAnalyzingCallId(callId);
      
      const response = await selfHostedPost<{ success: boolean; error?: string }>('analyze-call', {
        callId
      });

      if (response.success && response.data?.success) {
        toast.success('AI-анализ запущен');
        // Reload calls to see updated status
        setTimeout(() => loadData('calls'), 2000);
      } else {
        throw new Error(response.error || response.data?.error || 'Ошибка анализа');
      }
    } catch (error) {
      console.error('Error analyzing call:', error);
      toast.error('Ошибка запуска анализа');
    } finally {
      setAnalyzingCallId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd.MM.yyyy HH:mm:ss', { locale: ru });
    } catch {
      return dateStr;
    }
  };

  const extractPhoneFromWebhook = (data: Record<string, unknown>): string => {
    // Try common field names for phone numbers in OnlinePBX webhooks
    const phoneFields = ['caller_id', 'callerid', 'from', 'phone', 'number', 'ani', 'caller'];
    for (const field of phoneFields) {
      if (data[field] && typeof data[field] === 'string') {
        return data[field] as string;
      }
    }
    return '—';
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Поиск по номеру телефона
          </CardTitle>
          <CardDescription>
            Введите номер для поиска в webhook логах и истории звонков
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="79269084335"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="max-w-xs"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Искать
            </Button>
            <Button variant="outline" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
              Обновить всё
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webhooks Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhook логи OnlinePBX
            </CardTitle>
            <Badge variant="secondary">{webhooks.length} записей</Badge>
          </div>
          <CardDescription>
            Входящие запросы от OnlinePBX (последние 20)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Нет данных. Нажмите "Обновить всё" для загрузки.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Время</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Номер</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((webhook) => (
                  <Collapsible key={webhook.id} asChild>
                    <>
                      <TableRow className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => toggleWebhookExpanded(webhook.id)}
                            >
                              {expandedWebhooks.has(webhook.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatDate(webhook.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{webhook.event_type || webhook.source || '—'}</Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          {extractPhoneFromWebhook(webhook.webhook_data || {})}
                        </TableCell>
                        <TableCell>
                          {webhook.processed ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              OK
                            </Badge>
                          ) : webhook.error_message ? (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Ошибка
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Не обработан</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedJson(webhook.webhook_data)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/30">
                            <pre className="text-xs overflow-x-auto max-h-48 p-2 rounded bg-muted">
                              {JSON.stringify(webhook.webhook_data, null, 2)}
                            </pre>
                            {webhook.error_message && (
                              <p className="text-sm text-destructive mt-2">
                                Ошибка: {webhook.error_message}
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Calls Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              История звонков (call_logs)
            </CardTitle>
            <Badge variant="secondary">{calls.length} записей</Badge>
          </div>
          <CardDescription>
            Звонки, сохранённые в базе данных (последние 20)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {calls.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Нет данных. Нажмите "Обновить всё" для загрузки.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Время</TableHead>
                  <TableHead>Номер</TableHead>
                  <TableHead>Направление</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Длительность</TableHead>
                  <TableHead>Запись</TableHead>
                  <TableHead>AI-анализ</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell className="font-mono text-sm">
                      {formatDate(call.started_at)}
                    </TableCell>
                    <TableCell className="font-mono">{call.phone_number || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {call.direction === 'incoming' ? '← Входящий' : '→ Исходящий'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={call.status === 'answered' ? 'default' : 'secondary'}
                      >
                        {call.status || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {call.duration_seconds ? `${call.duration_seconds} сек` : '—'}
                    </TableCell>
                    <TableCell>
                      {call.recording_url ? (
                        <Badge className="bg-green-100 text-green-800">
                          <FileAudio className="h-3 w-3 mr-1" />
                          Есть
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Нет</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {call.ai_evaluation || call.summary ? (
                        <Badge className="bg-purple-100 text-purple-800">
                          <Brain className="h-3 w-3 mr-1" />
                          Есть
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Нет</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {call.recording_url && !call.ai_evaluation && !call.summary && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAnalyzeCall(call.id)}
                            disabled={analyzingCallId === call.id}
                          >
                            {analyzingCallId === call.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Brain className="h-3 w-3" />
                            )}
                            Анализ
                          </Button>
                        )}
                        {(call.ai_evaluation || call.summary) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedJson({ 
                              summary: call.summary,
                              ai_evaluation: call.ai_evaluation,
                              transcription: call.transcription,
                              notes: call.notes
                            })}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* JSON Viewer Dialog */}
      <Dialog open={!!selectedJson} onOpenChange={() => setSelectedJson(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Данные JSON</DialogTitle>
          </DialogHeader>
          <pre className="text-xs overflow-x-auto p-4 rounded bg-muted">
            {JSON.stringify(selectedJson, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
