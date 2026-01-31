import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Phone, PhoneCall, PhoneIncoming, PhoneMissed, PhoneOutgoing, Clock, Calendar, Eye, MessageSquare, Sparkles, User, AlertCircle, CheckCheck, ArrowUp, ArrowDown, Loader2, WifiOff, RefreshCw, Wand2, Download, FileText, Handshake, Target, ChevronDown, ChevronUp, Pencil, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useInfiniteCallHistory } from "@/hooks/useInfiniteCallHistory";
import type { CallLog, CallLogActionItem } from "@/hooks/useCallHistory";
import { CallDetailModal } from "./CallDetailModal";
import { useUnviewedMissedCallsCount, useViewedMissedCalls } from "@/hooks/useViewedMissedCalls";
import { CallRecordingPlayer } from "./CallRecordingPlayer";
import { selfHostedPost } from "@/lib/selfHostedApi";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface EditingState {
  callId: string;
  field: 'summary' | 'agreements';
  value: string;
}

interface CallHistoryProps {
  clientId: string;
}

type StatusFilter = 'all' | 'answered' | 'missed';
type DirectionFilter = 'all' | 'incoming' | 'outgoing';
type SortOrder = 'newest' | 'oldest';

export const CallHistory: React.FC<CallHistoryProps> = ({ clientId }) => {
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isOfflineData,
    isError,
    isOnline,
    isSyncing,
    syncNow,
  } = useInfiniteCallHistory(clientId);
  
  // Flatten all pages into a single array
  const calls = useMemo(() => {
    return data?.pages.flatMap(page => page.calls) ?? [];
  }, [data]);
  
  const totalCalls = data?.pages[0]?.total ?? 0;
  
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all');
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [analyzingCallIds, setAnalyzingCallIds] = useState<Set<string>>(new Set());
  const [fetchingRecordingIds, setFetchingRecordingIds] = useState<Set<string>>(new Set());
  const [autoAnalyzedCallIds, setAutoAnalyzedCallIds] = useState<Set<string>>(new Set());
  const [autoFetchedRecordingIds, setAutoFetchedRecordingIds] = useState<Set<string>>(new Set());
  const [expandedTranscriptions, setExpandedTranscriptions] = useState<Set<string>>(new Set());
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const queryClient = useQueryClient();
  
  // Ref for intersection observer (infinite scroll)
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Get unviewed missed calls from server
  const { data: unviewedData } = useUnviewedMissedCallsCount(clientId);
  const { markCallsAsViewed } = useViewedMissedCalls(clientId);
  const unviewedCallIds = useMemo(() => new Set(unviewedData?.ids || []), [unviewedData?.ids]);
  
  // Check if a call is unviewed (missed and not yet viewed)
  const isCallUnviewed = (call: { id: string; status: string; is_viewed?: boolean | null }) => {
    if (call.status !== 'missed') return false;
    if (call.is_viewed === true) return false;
    return unviewedCallIds.has(call.id);
  };

  // Filter and sort calls
  const filteredCalls = useMemo(() => {
    const filtered = calls.filter(call => {
      const statusMatch = statusFilter === 'all' || call.status === statusFilter;
      const directionMatch = directionFilter === 'all' || call.direction === directionFilter;
      return statusMatch && directionMatch;
    });

    // Sort by date
    return filtered.sort((a, b) => {
      const dateA = new Date(a.started_at).getTime();
      const dateB = new Date(b.started_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [calls, statusFilter, directionFilter, sortOrder]);

  // Count calls by status and direction for badges
  const statusCounts = useMemo(() => ({
    all: calls.length,
    answered: calls.filter(c => c.status === 'answered').length,
    missed: calls.filter(c => c.status === 'missed').length,
  }), [calls]);

  const directionCounts = useMemo(() => ({
    all: calls.length,
    incoming: calls.filter(c => c.direction === 'incoming').length,
    outgoing: calls.filter(c => c.direction === 'outgoing').length,
  }), [calls]);

  // Group calls: unviewed missed calls first, then the rest
  const { unviewedCalls, viewedCalls } = useMemo(() => {
    const unviewed: CallLog[] = [];
    const viewed: CallLog[] = [];
    
    for (const call of filteredCalls) {
      if (isCallUnviewed(call)) {
        unviewed.push(call);
      } else {
        viewed.push(call);
      }
    }
    
    return { unviewedCalls: unviewed, viewedCalls: viewed };
  }, [filteredCalls, unviewedCallIds]);

  // Infinite scroll with intersection observer
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [handleLoadMore]);

  const getCallIcon = (call: CallLog) => {
    if (call.direction === 'incoming') {
      return call.status === 'answered' ? 
        <PhoneIncoming className="h-4 w-4 text-green-600" /> :
        <PhoneMissed className="h-4 w-4 text-red-600" />;
    } else {
      return call.status === 'answered' ?
        <PhoneCall className="h-4 w-4 text-blue-600" /> :
        <PhoneMissed className="h-4 w-4 text-orange-600" />;
    }
  };

  const getCallStatusBadge = (call: CallLog) => {
    const statusColors: Record<string, string> = {
      answered: "bg-green-100 text-green-800 border-green-200",
      missed: "bg-red-100 text-red-800 border-red-200", 
      busy: "bg-yellow-100 text-yellow-800 border-yellow-200",
      failed: "bg-red-100 text-red-800 border-red-200",
      initiated: "bg-blue-100 text-blue-800 border-blue-200"
    };

    const statusLabels: Record<string, string> = {
      answered: "Состоялся",
      missed: "Пропущен",
      busy: "Занято",
      failed: "Не удался",
      initiated: "Инициирован"
    };

    return (
      <Badge 
        variant="secondary" 
        className={`text-xs ${statusColors[call.status] || ''}`}
      >
        {statusLabels[call.status] || call.status}
      </Badge>
    );
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    if (mins === 0) {
      return `${secs}с`;
    }
    
    return `${mins}м ${secs}с`;
  };

  const getDirectionLabel = (direction: string) => {
    return direction === 'incoming' ? 'Входящий' : 'Исходящий';
  };

  const openCallDetail = (callId: string) => {
    setSelectedCallId(callId);
    setModalOpen(true);
  };

  // AI Analysis handler
  const handleAnalyzeCall = useCallback(async (callId: string) => {
    if (analyzingCallIds.has(callId)) return;
    
    setAnalyzingCallIds(prev => new Set(prev).add(callId));
    
    try {
      const response = await selfHostedPost('analyze-call', { callId });
      
      if (!response.success) {
        if (response.status === 429) {
          toast({
            title: "Превышен лимит запросов",
            description: "Попробуйте позже",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Ошибка анализа",
            description: response.error || "Не удалось проанализировать звонок",
            variant: "destructive"
          });
        }
        return;
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['call-logs', clientId] });
      queryClient.invalidateQueries({ queryKey: ['call-logs-infinite', clientId] });
      
      toast({
        title: "Анализ завершён",
        description: "AI-оценка добавлена к звонку",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось проанализировать звонок",
        variant: "destructive"
      });
    } finally {
      setAnalyzingCallIds(prev => {
        const next = new Set(prev);
        next.delete(callId);
        return next;
      });
    }
  }, [analyzingCallIds, clientId, queryClient]);

  // Fetch recording handler - auto-fetch if missing
  const handleFetchRecording = useCallback(async (callId: string) => {
    if (fetchingRecordingIds.has(callId)) return;
    
    setFetchingRecordingIds(prev => new Set(prev).add(callId));
    
    try {
      const response = await selfHostedPost('fetch-call-recording', { callId });
      
      if (response.success && (response.data as any)?.recording_url) {
        // Invalidate queries to refresh data with new recording URL
        queryClient.invalidateQueries({ queryKey: ['call-logs', clientId] });
        queryClient.invalidateQueries({ queryKey: ['call-logs-infinite', clientId] });
      }
    } catch (error) {
      console.error('Failed to fetch recording:', error);
    } finally {
      setFetchingRecordingIds(prev => {
        const next = new Set(prev);
        next.delete(callId);
        return next;
      });
    }
  }, [fetchingRecordingIds, clientId, queryClient]);

  // Auto-fetch recordings for answered calls missing recording_url
  useEffect(() => {
    if (!calls.length) return;

    const candidates = calls.filter(call =>
      call.status === 'answered' &&
      !call.recording_url &&
      !!call.duration_seconds &&
      call.duration_seconds > 0 &&
      !autoFetchedRecordingIds.has(call.id) &&
      !fetchingRecordingIds.has(call.id)
    );

    if (candidates.length === 0) return;

    const batch = candidates.slice(0, 3);
    setAutoFetchedRecordingIds(prev => {
      const next = new Set(prev);
      batch.forEach(c => next.add(c.id));
      return next;
    });

    const run = async () => {
      for (const call of batch) {
        try {
          await handleFetchRecording(call.id);
          await new Promise(resolve => setTimeout(resolve, 800));
        } catch {
          // keep silent; manual button still available
        }
      }
    };

    const timeoutId = setTimeout(run, 800);
    return () => clearTimeout(timeoutId);
  }, [calls, autoFetchedRecordingIds, fetchingRecordingIds, handleFetchRecording]);

  // Auto-analyze calls that have recordings but no AI evaluation
  useEffect(() => {
    if (!calls.length) return;
    
    // Find calls that need auto-analysis
    const callsToAnalyze = calls.filter(call => 
      call.status === 'answered' &&
      call.recording_url &&
      !call.ai_evaluation &&
      !autoAnalyzedCallIds.has(call.id) &&
      !analyzingCallIds.has(call.id)
    );
    
    if (callsToAnalyze.length === 0) return;
    
    const batch = callsToAnalyze.slice(0, 3);
    // Mark only the batch as queued to avoid blocking further calls
    setAutoAnalyzedCallIds(prev => {
      const next = new Set(prev);
      batch.forEach(c => next.add(c.id));
      return next;
    });
    
    // Analyze sequentially with delay to avoid rate limiting
    const analyzeSequentially = async () => {
      for (const call of batch) {
        try {
          console.log('[AutoAnalyze] Starting analysis for call:', call.id);
          await handleAnalyzeCall(call.id);
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('[AutoAnalyze] Failed:', error);
        }
      }
    };
    
    // Run after a short delay to not block initial render
    const timeoutId = setTimeout(analyzeSequentially, 2000);
    return () => clearTimeout(timeoutId);
  }, [calls, autoAnalyzedCallIds, analyzingCallIds, handleAnalyzeCall]);

  // Handle inline edit save
  const handleSaveInlineEdit = useCallback(async () => {
    if (!editingState) return;
    
    setIsSavingEdit(true);
    try {
      // Find the current call to get existing values
      const currentCall = calls.find(c => c.id === editingState.callId);
      if (!currentCall) throw new Error('Call not found');
      
      const updateData = {
        callId: editingState.callId,
        summary: editingState.field === 'summary' ? editingState.value.trim() || null : currentCall.summary,
        agreements: editingState.field === 'agreements' ? editingState.value.trim() || null : currentCall.agreements,
        manual_action_items: currentCall.manual_action_items || null
      };
      
      const response = await selfHostedPost<{ success: boolean }>('update-call-summary', updateData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to save');
      }
      
      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ['call-logs', clientId] });
      queryClient.invalidateQueries({ queryKey: ['call-logs-infinite', clientId] });
      
      toast({
        title: "Сохранено",
        description: editingState.field === 'summary' ? "Резюме обновлено" : "Договорённости обновлены",
      });
      
      setEditingState(null);
    } catch (error) {
      console.error('Error saving inline edit:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить",
        variant: "destructive",
      });
    } finally {
      setIsSavingEdit(false);
    }
  }, [editingState, calls, clientId, queryClient]);

  const startEditing = (callId: string, field: 'summary' | 'agreements', currentValue: string | null) => {
    setEditingState({
      callId,
      field,
      value: currentValue || ''
    });
  };

  const cancelEditing = () => {
    setEditingState(null);
  };

  const renderCallItem = (call: CallLog, showUnviewedIndicator: boolean = false) => {
    const hasAiEvaluation = call.ai_evaluation && typeof call.ai_evaluation === 'object' && (call.ai_evaluation as any).overall_score !== undefined;
    const canAnalyze = call.status === 'answered' && call.recording_url && !hasAiEvaluation;
    const isAnalyzing = analyzingCallIds.has(call.id);
    const isFetchingRecording = fetchingRecordingIds.has(call.id);
    const needsRecordingFetch = call.status === 'answered' && !call.recording_url && call.duration_seconds && call.duration_seconds > 0;
    const isTranscriptionExpanded = expandedTranscriptions.has(call.id);
    const hasTranscription = !!call.transcription;
    
    const toggleTranscription = (e: React.MouseEvent) => {
      e.stopPropagation();
      setExpandedTranscriptions(prev => {
        const next = new Set(prev);
        if (next.has(call.id)) {
          next.delete(call.id);
        } else {
          next.add(call.id);
        }
        return next;
      });
    };
    
    return (
      <div key={call.id} className="relative">
        {showUnviewedIndicator && (
          <span 
            className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-destructive rounded-full animate-pulse"
            title="Непросмотренный пропущенный звонок"
          />
        )}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div className="flex-shrink-0 pt-0.5 relative">
              {getCallIcon(call)}
              {showUnviewedIndicator && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-destructive rounded-full" />
              )}
            </div>
            
            <div className="flex-1 min-w-0 space-y-1.5">
              {/* Compact header: Direction + Status + Date + Duration */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground">
                  {getDirectionLabel(call.direction)}
                </span>
                {getCallStatusBadge(call)}
                {showUnviewedIndicator && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                    Новый
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {format(new Date(call.started_at), "dd MMM, HH:mm", { locale: ru })}
                </span>
                {call.duration_seconds !== null && call.status === 'answered' && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDuration(call.duration_seconds)}
                  </span>
                )}
                {call.manager_name && (
                  <span className="flex items-center gap-1 text-xs text-primary">
                    <User className="h-3 w-3" />
                    {call.manager_name}
                  </span>
                )}
              </div>

              {/* Audio Player with Transcription button */}
              {call.recording_url && call.status === 'answered' ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <CallRecordingPlayer 
                      recordingUrl={call.recording_url}
                      duration={call.duration_seconds}
                      compact
                    />
                  </div>
                  {hasTranscription && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleTranscription}
                      className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground flex-shrink-0"
                    >
                      <FileText className="h-3 w-3" />
                      {isTranscriptionExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  )}
                </div>
              ) : needsRecordingFetch && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFetchRecording(call.id);
                  }}
                  disabled={isFetchingRecording}
                  className="h-6 text-xs gap-1"
                >
                  {isFetchingRecording ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Загрузка...
                    </>
                  ) : (
                    <>
                      <Download className="h-3 w-3" />
                      Получить запись
                    </>
                  )}
                </Button>
              )}
              
              {/* Transcription (collapsible) */}
              {hasTranscription && isTranscriptionExpanded && (
                <div className="p-2 bg-muted/50 rounded-md">
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{call.transcription}</p>
                </div>
              )}

              {/* Inline Summary - Editable */}
              {(call.summary || call.status === 'answered') && (
                <div className="mt-2 p-2 bg-blue-50/50 dark:bg-blue-950/30 rounded-md">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                      <FileText className="h-3 w-3" />
                      Резюме
                    </div>
                    {editingState?.callId !== call.id || editingState?.field !== 'summary' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(call.id, 'summary', call.summary);
                        }}
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-blue-700"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    ) : null}
                  </div>
                  {editingState?.callId === call.id && editingState?.field === 'summary' ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingState.value}
                        onChange={(e) => setEditingState({ ...editingState, value: e.target.value })}
                        placeholder="Опишите основные моменты разговора..."
                        className="text-xs min-h-[60px] bg-white dark:bg-background resize-none"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEditing();
                          }}
                          disabled={isSavingEdit}
                          className="h-6 px-2 text-xs"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveInlineEdit();
                          }}
                          disabled={isSavingEdit}
                          className="h-6 px-2 text-xs"
                        >
                          {isSavingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {call.summary || <span className="italic text-muted-foreground/50">Нажмите ✏️ чтобы добавить</span>}
                    </p>
                  )}
                </div>
              )}

              {/* Inline Agreements - Editable */}
              {(call.agreements || call.status === 'answered') && (
                <div className="mt-2 p-2 bg-green-50/50 dark:bg-green-950/30 rounded-md">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400">
                      <Handshake className="h-3 w-3" />
                      Договорённости
                    </div>
                    {editingState?.callId !== call.id || editingState?.field !== 'agreements' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(call.id, 'agreements', call.agreements);
                        }}
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-green-700"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    ) : null}
                  </div>
                  {editingState?.callId === call.id && editingState?.field === 'agreements' ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingState.value}
                        onChange={(e) => setEditingState({ ...editingState, value: e.target.value })}
                        placeholder="Зафиксируйте достигнутые договорённости..."
                        className="text-xs min-h-[60px] bg-white dark:bg-background resize-none"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEditing();
                          }}
                          disabled={isSavingEdit}
                          className="h-6 px-2 text-xs"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveInlineEdit();
                          }}
                          disabled={isSavingEdit}
                          className="h-6 px-2 text-xs"
                        >
                          {isSavingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {call.agreements || <span className="italic text-muted-foreground/50">Нажмите ✏️ чтобы добавить</span>}
                    </p>
                  )}
                </div>
              )}

              {/* Inline Tasks */}
              {call.manual_action_items && call.manual_action_items.length > 0 && (
                <div className="mt-2 p-2 bg-orange-50/50 dark:bg-orange-950/30 rounded-md">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-orange-700 dark:text-orange-400 mb-1">
                    <Target className="h-3 w-3" />
                    Задачи ({call.manual_action_items.length})
                  </div>
                  <div className="space-y-1">
                    {call.manual_action_items.map((item: CallLogActionItem, idx: number) => (
                      <div key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          item.priority === 'high' ? 'bg-red-500' : 
                          item.priority === 'medium' ? 'bg-orange-500' : 'bg-green-500'
                        }`} />
                        <span>{item.task}</span>
                        {item.deadline && (
                          <span className="text-[10px] text-muted-foreground/70">до {item.deadline}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Evaluation badge OR Analyzing indicator OR Analyze button */}
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {hasAiEvaluation && (
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${
                      (call.ai_evaluation as any).overall_score >= 8 
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : (call.ai_evaluation as any).overall_score >= 6
                        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                        : 'bg-red-100 text-red-800 border-red-200'
                    }`}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI: {(call.ai_evaluation as any).overall_score}/10
                  </Badge>
                )}
                
                {/* Show analyzing indicator (auto or manual) */}
                {isAnalyzing && (
                  <Badge variant="outline" className="text-xs gap-1 animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Анализируем...
                  </Badge>
                )}
                
                {/* Manual analyze button - only if not already analyzing and no evaluation */}
                {canAnalyze && !isAnalyzing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnalyzeCall(call.id);
                    }}
                    className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Wand2 className="h-3 w-3" />
                    Анализ
                  </Button>
                )}
              </div>
              
              {call.notes && (
                <div className="flex items-start gap-1 text-xs text-muted-foreground mt-1">
                  <MessageSquare className="h-3 w-3 flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{call.notes}</span>
                </div>
              )}
            </div>
            
            <div className="flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openCallDetail(call.id)}
                className="h-8 w-8 p-0"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Phone className="h-4 w-4" />
            История звонков
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Загружаем историю звонков...</div>
        </CardContent>
      </Card>
    );
  }

  if (calls.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Phone className="h-4 w-4" />
            История звонков
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            Звонков пока не было
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Phone className="h-4 w-4" />
            История звонков ({calls.length}{totalCalls > calls.length ? ` из ${totalCalls}` : ''})
            {isOfflineData && (
              <Badge variant="secondary" className="gap-1 text-[10px] bg-amber-100 text-amber-700 border-amber-200">
                <WifiOff className="h-2.5 w-2.5" />
                Офлайн
              </Badge>
            )}
            {isError && !isOfflineData && calls.length > 0 && (
              <Badge variant="secondary" className="gap-1 text-[10px] bg-amber-100 text-amber-700 border-amber-200">
                Кэш
              </Badge>
            )}
            {unviewedCalls.length > 0 && (
              <Badge variant="destructive">
                {unviewedCalls.length} новых
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-1">
            {/* Sync button */}
            {(isOfflineData || isError) && isOnline && (
              <Button
                variant="ghost"
                size="sm"
                onClick={syncNow}
                disabled={isSyncing}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                title="Синхронизировать"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </Button>
            )}
            
            {/* Sort toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
              className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            >
              {sortOrder === 'newest' ? (
                <>
                  <ArrowDown className="h-3 w-3" />
                  Новые
                </>
              ) : (
                <>
                  <ArrowUp className="h-3 w-3" />
                  Старые
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Compact filters row */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {/* Status filter */}
          <ToggleGroup 
            type="single" 
            value={statusFilter} 
            onValueChange={(value) => value && setStatusFilter(value as StatusFilter)}
            className="justify-start"
          >
            <ToggleGroupItem value="all" size="sm" className="text-xs h-7 px-2">
              Все
              <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">
                {statusCounts.all}
              </Badge>
            </ToggleGroupItem>
            <ToggleGroupItem value="answered" size="sm" className="text-xs h-7 px-2">
              ✓
              <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px] bg-green-50 text-green-700 border-green-200">
                {statusCounts.answered}
              </Badge>
            </ToggleGroupItem>
            <ToggleGroupItem value="missed" size="sm" className="text-xs h-7 px-2">
              ✗
              <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px] bg-red-50 text-red-700 border-red-200">
                {statusCounts.missed}
              </Badge>
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Direction dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2">
                {directionFilter === 'all' ? (
                  <>Направление</>
                ) : directionFilter === 'incoming' ? (
                  <><PhoneIncoming className="h-3 w-3" /> Входящие</>
                ) : (
                  <><PhoneOutgoing className="h-3 w-3" /> Исходящие</>
                )}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setDirectionFilter('all')}>
                Все направления
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDirectionFilter('incoming')}>
                <PhoneIncoming className="h-3 w-3 mr-2" />
                Входящие ({directionCounts.incoming})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDirectionFilter('outgoing')}>
                <PhoneOutgoing className="h-3 w-3 mr-2" />
                Исходящие ({directionCounts.outgoing})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="px-0 pt-2">
        <ScrollArea className="h-64 px-4">
          <div className="space-y-3">
            {/* Unviewed missed calls section */}
            {unviewedCalls.length > 0 && (
              <>
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-xs font-medium text-destructive">
                      Непросмотренные пропущенные ({unviewedCalls.length})
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    disabled={isMarkingAll}
                    onClick={async () => {
                      setIsMarkingAll(true);
                      const allIds = unviewedCalls.map(c => c.id);
                      await markCallsAsViewed(allIds);
                      setIsMarkingAll(false);
                    }}
                  >
                    <CheckCheck className="h-3 w-3" />
                    {isMarkingAll ? 'Отмечаем...' : 'Отметить все'}
                  </Button>
                </div>
                <div className="space-y-3 pl-1 border-l-2 border-destructive/30">
                  {unviewedCalls.map((call) => renderCallItem(call, true))}
                </div>
                {viewedCalls.length > 0 && (
                  <div className="py-2">
                    <Separator />
                  </div>
                )}
              </>
            )}

            {/* Regular calls section */}
            {viewedCalls.length > 0 && (
              <div className="space-y-3">
                {unviewedCalls.length > 0 && (
                  <div className="flex items-center gap-2 pb-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Остальные звонки ({viewedCalls.length})
                    </span>
                  </div>
                )}
                {viewedCalls.map((call, index) => (
                  <div key={call.id}>
                    {renderCallItem(call, false)}
                    {index < viewedCalls.length - 1 && <Separator className="mt-3" />}
                  </div>
                ))}
              </div>
            )}

            {/* Infinite scroll trigger */}
            <div ref={loadMoreRef} className="h-8 flex items-center justify-center">
              {isFetchingNextPage && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {hasNextPage && !isFetchingNextPage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadMore}
                  className="text-xs text-muted-foreground"
                >
                  Загрузить ещё
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>
        
        <CallDetailModal 
          callId={selectedCallId}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      </CardContent>
    </Card>
  );
};
