import { useState, useEffect, useRef } from 'react';
import { supabaseTyped as supabase } from '@/integrations/supabase/typedClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw, Database, MessageSquare, Users, Clock, Pause, Play, Upload, FileSpreadsheet, MapPin } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrganization } from '@/hooks/useOrganization';
import { getInvokeErrorMessage } from '@/lib/functionsInvokeError';

interface SalebotProgress {
  totalClientsProcessed: number;
  totalImported: number;
  totalMessagesImported: number;
  currentOffset: number;
  startTime: Date | null;
  lastRunAt: Date | null;
  updatedAt: Date | null;
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  requiresManualRestart: boolean;
  // Resync fields
  resyncMode: boolean;
  resyncOffset: number;
  resyncTotalClients: number;
  resyncNewMessages: number;
  // Fill IDs fields
  fillIdsMode: boolean;
  fillIdsOffset: number;
  fillIdsTotalProcessed: number;
  fillIdsTotalMatched: number;
}

interface ApiUsage {
  used: number;
  limit: number;
  remaining: number;
  date: string;
}

interface DbStats {
  clients: number;
  students: number;
  messages: number;
  familyGroups: number;
  clientsWithSalebotId: number;
  clientsWithoutSalebotId: number;
}

interface HolihopeProgress {
  isRunning: boolean;
  isPaused: boolean;
  requiresManualRestart: boolean;
  currentStep: number;
  currentOffset: number;
  lastSyncTimestamp: Date | null;
  lastRunAt: Date | null;
  updatedAt: Date | null;
  totalBranchesImported: number;
  totalTeachersImported: number;
  totalLeadsImported: number;
  totalStudentsImported: number;
  totalGroupsImported: number;
  lastError: string | null;
}

// Типы для edge function responses
interface SalebotStopResponse {
  success?: boolean;
  message?: string;
}

interface SalebotImportBatchResponse {
  skipped?: boolean;
  apiLimitReached?: boolean;
  message?: string;
  totalClients?: number;
  messagesImported?: number;
  processedClients?: number;
  newMessages?: number;
  totalNewMessages?: number;
  completed?: boolean;
}

interface SalebotFillIdsResponse {
  success?: boolean;
  message?: string;
  totalProcessed?: number;
  totalMatched?: number;
  processedThisBatch?: number;
  matchedThisBatch?: number;
}

interface CsvImportResponse {
  success?: boolean;
  error?: string;
  updated?: number;
  created?: number;
  errors?: number;
}

// Расширенный тип для salebot_import_progress с fill_ids полями
interface SalebotProgressRow {
  id: string;
  total_clients_processed: number;
  total_imported: number;
  total_messages_imported: number;
  current_offset: number;
  start_time: string | null;
  last_run_at: string | null;
  updated_at: string | null;
  is_running: boolean;
  is_paused: boolean;
  requires_manual_restart: boolean;
  resync_mode: boolean;
  resync_offset: number;
  resync_total_clients: number;
  resync_new_messages: number;
  fill_ids_mode?: boolean;
  fill_ids_offset?: number;
  fill_ids_total_processed?: number;
  fill_ids_total_matched?: number;
}

// Тип для ошибок с контекстом
interface InvokeErrorWithContext {
  message: string;
  context?: {
    status?: number;
    body?: string | Record<string, unknown>;
  };
}

export function SyncDashboard() {
  const { toast } = useToast();
  const { branches, organizationId } = useOrganization();
  const [importProgress, setImportProgress] = useState<SalebotProgress | null>(null);
  const [holihopeProgress, setHolihopeProgress] = useState<HolihopeProgress | null>(null);
  const [apiUsage, setApiUsage] = useState<ApiUsage | null>(null);
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [salebotListId, setSalebotListId] = useState<string>('740756');
  const [isImporting, setIsImporting] = useState(false);
  const [isRunningBatch, setIsRunningBatch] = useState(false);
  const [isSyncingNew, setIsSyncingNew] = useState(false);
  const [isResyncingAll, setIsResyncingAll] = useState(false);
  const [isFillingIds, setIsFillingIds] = useState(false);
  const [isSyncingWithIds, setIsSyncingWithIds] = useState(false);
  const [isSyncingNewClientsOnly, setIsSyncingNewClientsOnly] = useState(false);
  const [clientsWithoutMessages, setClientsWithoutMessages] = useState<number | null>(null);
  const [isFullReimporting, setIsFullReimporting] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [selectedBranchForCsv, setSelectedBranchForCsv] = useState<string>('');
  const [csvImportProgress, setCsvImportProgress] = useState<{
    current: number;
    total: number;
    phase: 'parsing' | 'matching' | 'updating' | 'creating';
  } | null>(null);
  const [csvImportResult, setCsvImportResult] = useState<{
    matched: number;
    updated: number;
    created?: number;
    notFound: number;
    errors?: number;
    branchAssigned?: number;
  } | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const [newApiLimit, setNewApiLimit] = useState<string>('6000');
  const [isSavingLimit, setIsSavingLimit] = useState(false);
  
  // HolyHope specific states
  const [isHolihopeUnlocking, setIsHolihopeUnlocking] = useState(false);

  // Smart polling: only fetch when tab is visible, with backoff on errors
  const [pollInterval, setPollInterval] = useState(10000); // Start at 10s
  const [lastStatsRefresh, setLastStatsRefresh] = useState<number>(0);

  const fetchProgressOnly = async () => {
    try {
      // Get Salebot progress (lightweight)
      const { data: progressDataRaw } = await supabase
        .from('salebot_import_progress')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (progressDataRaw) {
        const progressData = progressDataRaw as unknown as SalebotProgressRow;
        const isCompleted = !progressData.is_running && 
          !progressData.is_paused && 
          progressData.total_clients_processed > 0 &&
          progressData.current_offset > 0;
        
        setImportProgress({
          totalClientsProcessed: progressData.total_clients_processed || 0,
          totalImported: progressData.total_imported || 0,
          totalMessagesImported: progressData.total_messages_imported || 0,
          currentOffset: progressData.current_offset || 0,
          startTime: progressData.start_time ? new Date(progressData.start_time) : null,
          lastRunAt: progressData.last_run_at ? new Date(progressData.last_run_at) : null,
          updatedAt: progressData.updated_at ? new Date(progressData.updated_at) : null,
          isRunning: progressData.is_running || false,
          isPaused: progressData.is_paused || false,
          isCompleted,
          requiresManualRestart: progressData.requires_manual_restart || false,
          resyncMode: progressData.resync_mode || false,
          resyncOffset: progressData.resync_offset || 0,
          resyncTotalClients: progressData.resync_total_clients || 0,
          resyncNewMessages: progressData.resync_new_messages || 0,
          fillIdsMode: progressData.fill_ids_mode || false,
          fillIdsOffset: progressData.fill_ids_offset || 0,
          fillIdsTotalProcessed: progressData.fill_ids_total_processed || 0,
          fillIdsTotalMatched: progressData.fill_ids_total_matched || 0
        });

        // If import is running, poll faster (5s), otherwise slow down (30s)
        setPollInterval(progressData.is_running ? 5000 : 30000);
      }

      // Get HolyHope progress
      const { data: holihopeData } = await supabase
        .from('holihope_import_progress')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (holihopeData) {
        setHolihopeProgress({
          isRunning: holihopeData.is_running || false,
          isPaused: holihopeData.is_paused || false,
          requiresManualRestart: holihopeData.requires_manual_restart || false,
          currentStep: holihopeData.current_step || 1,
          currentOffset: holihopeData.current_offset || 0,
          lastSyncTimestamp: holihopeData.last_sync_timestamp ? new Date(holihopeData.last_sync_timestamp) : null,
          lastRunAt: holihopeData.last_run_at ? new Date(holihopeData.last_run_at) : null,
          updatedAt: holihopeData.updated_at ? new Date(holihopeData.updated_at) : null,
          totalBranchesImported: holihopeData.total_branches_imported || 0,
          totalTeachersImported: holihopeData.total_teachers_imported || 0,
          totalLeadsImported: holihopeData.total_leads_imported || 0,
          totalStudentsImported: holihopeData.total_students_imported || 0,
          totalGroupsImported: holihopeData.total_groups_imported || 0,
          lastError: holihopeData.last_error || null,
        });
        
        // If holihope import is running, poll faster
        if (holihopeData.is_running) {
          setPollInterval(5000);
        }
      }

      // Get API usage (lightweight)
      const today = new Date().toISOString().split('T')[0];
      const { data: usageData } = await supabase
        .from('salebot_api_usage')
        .select('*')
        .eq('date', today)
        .maybeSingle();

      const currentLimit = usageData?.max_daily_limit || 6000;
      setApiUsage({
        used: usageData?.api_requests_count || 0,
        limit: currentLimit,
        remaining: currentLimit - (usageData?.api_requests_count || 0),
        date: today
      });
      setNewApiLimit(currentLimit.toString());
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching progress:', error);
      // Backoff on error: increase interval up to 60s
      setPollInterval(prev => Math.min(prev * 2, 60000));
      setIsLoading(false);
    }
  };

  // Fetch DB stats manually (heavy queries) - not on auto-refresh
  const fetchDbStats = async () => {
    try {
      const [clientsRes, studentsRes, messagesRes, familyRes, clientsWithIdRes, clientsWithoutIdRes, clientsWithoutMessagesRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('chat_messages').select('id', { count: 'exact', head: true }),
        supabase.from('family_groups').select('id', { count: 'exact', head: true }),
        supabase.from('clients').select('id', { count: 'exact', head: true }).not('salebot_client_id', 'is', null),
        supabase.from('clients').select('id', { count: 'exact', head: true }).is('salebot_client_id', null),
        // Get count of clients with salebot_id but without imported messages
        organizationId 
          ? supabase.rpc('count_clients_without_imported_messages', { p_org_id: organizationId })
          : Promise.resolve({ data: 0, error: null })
      ]);

      setDbStats({
        clients: clientsRes.count || 0,
        students: studentsRes.count || 0,
        messages: messagesRes.count || 0,
        familyGroups: familyRes.count || 0,
        clientsWithSalebotId: clientsWithIdRes.count || 0,
        clientsWithoutSalebotId: clientsWithoutIdRes.count || 0
      });
      
      // Set clients without messages count
      if (clientsWithoutMessagesRes.data !== null && !clientsWithoutMessagesRes.error) {
        setClientsWithoutMessages(clientsWithoutMessagesRes.data as number);
      }
      
      setLastStatsRefresh(Date.now());
    } catch (error) {
      console.error('Error fetching DB stats:', error);
    }
  };

  // Quick refresh of clients without messages count (separate from full stats)
  const refreshClientsWithoutMessagesCount = async () => {
    if (!organizationId) return;
    try {
      const { data, error } = await supabase.rpc('count_clients_without_imported_messages', { p_org_id: organizationId });
      if (!error && data !== null) {
        setClientsWithoutMessages(data as number);
      }
    } catch (error) {
      console.error('Error refreshing clients without messages count:', error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchProgressOnly();
    fetchDbStats(); // Fetch stats once on mount

    let intervalId: NodeJS.Timeout;
    let statsIntervalId: NodeJS.Timeout;

    const startPolling = () => {
      // Only poll if tab is visible
      if (document.visibilityState === 'visible') {
        intervalId = setInterval(() => {
          if (document.visibilityState === 'visible') {
            fetchProgressOnly();
          }
        }, pollInterval);
        
        // Refresh clientsWithoutMessages count every 30 seconds
        statsIntervalId = setInterval(() => {
          if (document.visibilityState === 'visible') {
            refreshClientsWithoutMessagesCount();
          }
        }, 30000);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Resume polling when tab becomes visible
        fetchProgressOnly();
        refreshClientsWithoutMessagesCount();
        startPolling();
      } else {
        // Stop polling when tab is hidden
        if (intervalId) clearInterval(intervalId);
        if (statsIntervalId) clearInterval(statsIntervalId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    startPolling();

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (statsIntervalId) clearInterval(statsIntervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pollInterval, organizationId]);

  const [isStopping, setIsStopping] = useState(false);
  const [isResettingStuck, setIsResettingStuck] = useState(false);

  // Helper to check if process might be stuck (running but not updated for > 2 min)
  const getStuckStatus = (): { isStuck: boolean; minutesAgo: number } => {
    if (!importProgress?.isRunning || !importProgress?.updatedAt) {
      return { isStuck: false, minutesAgo: 0 };
    }
    const now = Date.now();
    const updatedAt = importProgress.updatedAt.getTime();
    const minutesAgo = Math.floor((now - updatedAt) / 60000);
    return { isStuck: minutesAgo >= 2, minutesAgo };
  };

  const handleResetStuckProcess = async () => {
    try {
      setIsResettingStuck(true);
      
      const { data, error } = await supabase.functions.invoke('salebot-stop', {
        body: { force_reset: true },
      });

      if (error) {
        throw new Error(await getInvokeErrorMessage(error));
      }

      const result = data as SalebotStopResponse;
      
      // Reset local state
      setIsSyncingWithIds(false);
      setIsFillingIds(false);
      setIsResyncingAll(false);
      setIsSyncingNew(false);
      setIsRunningBatch(false);
      setIsImporting(false);
      
      toast({
        title: '✅ Процесс сброшен',
        description: result.message || 'Все флаги очищены. Можно запустить новый импорт.',
      });
      
      await fetchProgressOnly();
    } catch (error: any) {
      console.error('Reset error:', error);
      const msg = await getInvokeErrorMessage(error);
      toast({
        title: 'Ошибка сброса',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsResettingStuck(false);
    }
  };

  // Manual restart after API limit was reached
  const [isManualRestarting, setIsManualRestarting] = useState(false);
  
  const handleManualRestartAfterLimit = async () => {
    try {
      setIsManualRestarting(true);
      
      const { data: progress } = await supabase
        .from('salebot_import_progress')
        .select('id, resync_offset, total_clients_processed')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (progress?.id) {
        // Clear the requires_manual_restart flag and prepare to resume
        // Use resync_offset if available, otherwise use total_clients_processed as starting point
        const resumeOffset = progress.resync_offset || progress.total_clients_processed || 0;
        
        await supabase
          .from('salebot_import_progress')
          .update({ 
            requires_manual_restart: false,
            is_running: true,
            is_paused: false,
            resync_mode: true,
            resync_offset: resumeOffset,
            resync_total_clients: progress.total_clients_processed || 0
          })
          .eq('id', progress.id);
        
        // Auto-trigger background chain to continue import
        const { error } = await supabase.functions.invoke('import-salebot-chats-auto', {
          body: { mode: 'background_chain' }
        });
        
        if (error) {
          console.error('Error triggering background chain:', error);
          throw new Error(await getInvokeErrorMessage(error));
        }
        
        toast({
          title: '🚀 Импорт продолжен',
          description: `Импорт возобновлён с позиции ${resumeOffset}. Цепочка запущена автоматически.`,
        });
      }
      
      await fetchProgressOnly();
    } catch (error: any) {
      const msg = await getInvokeErrorMessage(error);
      toast({
        title: 'Ошибка',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsManualRestarting(false);
    }
  };

  // Resume stuck chain - just triggers background_chain without resetting offset
  const [isResumingChain, setIsResumingChain] = useState(false);
  
  const handleResumeChain = async () => {
    try {
      setIsResumingChain(true);
      
      const { data: progress } = await supabase
        .from('salebot_import_progress')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (progress?.id) {
        // Just mark as running and unpause - don't reset offset!
        await supabase
          .from('salebot_import_progress')
          .update({ 
            is_running: true,
            is_paused: false,
            resync_mode: true
          })
          .eq('id', progress.id);
      }
      
      // Trigger background_chain mode
      const { data, error } = await supabase.functions.invoke('import-salebot-chats-auto', {
        body: { mode: 'background_chain' }
      });
      
      if (error) throw new Error(await getInvokeErrorMessage(error));
      
      toast({
        title: '🔄 Импорт продолжен',
        description: 'Цепочка импорта возобновлена с текущей позиции.',
      });
      
      await fetchProgressOnly();
    } catch (error: any) {
      const msg = await getInvokeErrorMessage(error);
      toast({
        title: 'Ошибка',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsResumingChain(false);
    }
  };

  // HolyHope: Manual unlock after API limit was reached
  const handleHolihopeUnlock = async () => {
    try {
      setIsHolihopeUnlocking(true);
      
      const { data: progress } = await supabase
        .from('holihope_import_progress')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (progress?.id) {
        await supabase
          .from('holihope_import_progress')
          .update({ 
            requires_manual_restart: false,
            is_running: false,
            is_paused: false,
            last_error: null
          })
          .eq('id', progress.id);
      }
      
      toast({
        title: 'HolyHope разблокирован',
        description: 'Импорт разблокирован. Теперь можно запустить синхронизацию.',
      });
      
      await fetchProgressOnly();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsHolihopeUnlocking(false);
    }
  };

  const handleStopImport = async () => {
    try {
      setIsStopping(true);
      
      // Stop by updating the progress record directly
      const { data: progress } = await supabase
        .from('salebot_import_progress')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (progress?.id) {
        await supabase
          .from('salebot_import_progress')
          .update({ 
            is_running: false, 
            is_paused: true,
            resync_mode: false,
            fill_ids_mode: false
          })
          .eq('id', progress.id);
      }
      
      // Also reset local state
      setIsSyncingWithIds(false);
      setIsFillingIds(false);
      setIsResyncingAll(false);
      setIsSyncingNew(false);
      setIsRunningBatch(false);
      setIsImporting(false);
      
      toast({
        title: 'Импорт остановлен',
        description: 'Загрузка чатов остановлена. Можете продолжить позже.',
      });
      
      // Refresh progress
      await fetchProgressOnly();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsStopping(false);
    }
  };

  const handleResumeImport = async () => {
    try {
      setIsImporting(true);
      
      // Remove pause flag
      const { data: progress } = await supabase
        .from('salebot_import_progress')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (progress?.id) {
        await supabase
          .from('salebot_import_progress')
          .update({ is_paused: false })
          .eq('id', progress.id);
      }
      
      // Trigger import
      const { error } = await supabase.functions.invoke('import-salebot-chats-auto');
      if (error) throw new Error(await getInvokeErrorMessage(error));
      
      toast({
        title: 'Импорт возобновлён',
        description: 'Автоматический импорт Salebot успешно запущен',
      });
    } catch (error: any) {
      const msg = await getInvokeErrorMessage(error);
      toast({
        title: 'Ошибка',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleRunBatch = async () => {
    try {
      setIsRunningBatch(true);
      
      const { data, error } = await supabase.functions.invoke('import-salebot-chats-auto');
      if (error) throw new Error(await getInvokeErrorMessage(error));
      
      const result = data as SalebotImportBatchResponse;
      
      if (result?.skipped) {
        toast({
          title: result.apiLimitReached ? 'Лимит API' : 'Пропущено',
          description: result.message || 'Батч пропущен',
          variant: result.apiLimitReached ? 'destructive' : 'default',
        });
      } else {
        toast({
          title: 'Батч выполнен',
          description: `Обработано клиентов: ${result?.totalClients || 0}, сообщений: ${result?.messagesImported || 0}`,
        });
      }
    } catch (error: any) {
      const msg = await getInvokeErrorMessage(error);
      toast({
        title: 'Ошибка',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsRunningBatch(false);
    }
  };

  const handleSyncNew = async () => {
    try {
      setIsSyncingNew(true);
      
      // Reset offset to 0 and trigger incremental sync
      const { data: progress } = await supabase
        .from('salebot_import_progress')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (progress?.id) {
        await supabase
          .from('salebot_import_progress')
          .update({ current_offset: 0, is_paused: false })
          .eq('id', progress.id);
      }
      
      const { data, error } = await supabase.functions.invoke('import-salebot-chats-auto', {
        body: { mode: 'sync_new' }
      });
      if (error) throw new Error(await getInvokeErrorMessage(error));
      
      toast({
        title: 'Синхронизация запущена',
        description: 'Поиск новых сообщений у существующих клиентов',
      });
    } catch (error: any) {
      const msg = await getInvokeErrorMessage(error);
      toast({
        title: 'Ошибка',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsSyncingNew(false);
    }
  };

  const handleResyncAllDialogs = async () => {
    try {
      setIsResyncingAll(true);
      
      // Reset resync offset and trigger resync mode
      const { data: progress } = await supabase
        .from('salebot_import_progress')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (progress?.id) {
        await supabase
          .from('salebot_import_progress')
          .update({ 
            resync_offset: 0, 
            resync_total_clients: 0,
            resync_new_messages: 0,
            resync_mode: true,
            is_paused: false 
          })
          .eq('id', progress.id);
      }
      
      const { data, error } = await supabase.functions.invoke('import-salebot-chats-auto', {
        body: { mode: 'resync_messages' }
      });
      if (error) throw new Error(await getInvokeErrorMessage(error));
      
      const result = data as SalebotImportBatchResponse;
      toast({
        title: 'Синхронизация диалогов запущена',
        description: `Обработано: ${result?.processedClients || 0} клиентов, новых сообщений: ${result?.newMessages || 0}`,
      });
    } catch (error: any) {
      const msg = await getInvokeErrorMessage(error);
      toast({
        title: 'Ошибка',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsResyncingAll(false);
    }
  };

  // Фоновый импорт - можно закрыть страницу (self-invoking chain)
  const handleBackgroundSync = async () => {
    try {
      setIsSyncingWithIds(true);
      
      const { data: progress } = await supabase
        .from('salebot_import_progress')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (progress?.id) {
        // Reset progress and start fresh
        await supabase
          .from('salebot_import_progress')
          .update({ 
            resync_offset: 0, 
            resync_total_clients: 0,
            resync_new_messages: 0,
            resync_mode: true,
            is_running: true,
            is_paused: false 
          })
          .eq('id', progress.id);
      }
      
      // Use background_chain mode - self-invoking for unlimited processing
      const { data, error } = await supabase.functions.invoke('import-salebot-chats-auto', {
        body: { mode: 'background_chain' }
      });
      if (error) throw new Error(await getInvokeErrorMessage(error));
      
      toast({
        title: '🚀 Фоновый импорт запущен!',
        description: 'Self-invoking chain активирована. Можно закрыть страницу — импорт продолжится автоматически.',
      });
      
      // Don't set isSyncingWithIds to false immediately - let polling show real status
    } catch (error: any) {
      const msg = await getInvokeErrorMessage(error);
      toast({
        title: 'Ошибка',
        description: msg,
        variant: 'destructive',
      });
      setIsSyncingWithIds(false);
    }
  };

  const handleSyncWithSalebotIds = async (continueSync = false) => {
    try {
      setIsSyncingWithIds(true);
      
      // Check if stopped before continuing
      const { data: currentProgress } = await supabase
        .from('salebot_import_progress')
        .select('is_paused, resync_mode')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      // If paused, don't continue
      if (continueSync && currentProgress?.is_paused) {
        console.log('⏸️ Синхронизация остановлена пользователем');
        setIsSyncingWithIds(false);
        return;
      }
      
      const { data: progress } = await supabase
        .from('salebot_import_progress')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (progress?.id) {
        // Only reset if not continuing
        if (!continueSync) {
          await supabase
            .from('salebot_import_progress')
            .update({ 
              resync_offset: 0, 
              resync_total_clients: 0,
              resync_new_messages: 0,
              resync_mode: true,
              is_running: true,
              is_paused: false 
            })
            .eq('id', progress.id);
        } else {
          // Just mark as running
          await supabase
            .from('salebot_import_progress')
            .update({ 
              resync_mode: true,
              is_running: true,
              is_paused: false 
            })
            .eq('id', progress.id);
        }
      }
      
      const { data, error } = await supabase.functions.invoke('import-salebot-chats-auto', {
        body: { mode: 'sync_with_salebot_ids' }
      });
      if (error) throw new Error(await getInvokeErrorMessage(error));
      
      const result = data as SalebotImportBatchResponse;
      
      // Check if stopped during this batch
      const { data: checkPaused } = await supabase
        .from('salebot_import_progress')
        .select('is_paused')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (checkPaused?.is_paused) {
        console.log('⏸️ Синхронизация остановлена пользователем');
        setIsSyncingWithIds(false);
        return;
      }
      
      // Auto-continue if not completed
      if (result?.completed === false) {
        toast({
          title: 'Батч завершён, продолжаем...',
          description: `Обработано: ${result?.totalClients || 0} клиентов, новых сообщений: ${result?.totalNewMessages || 0}`,
        });
        // Continue after short delay
        setTimeout(() => handleSyncWithSalebotIds(true), 2000);
        return;
      }
      
      toast({
        title: result?.completed ? 'Синхронизация завершена!' : 'Синхронизация запущена',
        description: `Обработано: ${result?.totalClients || result?.processedClients || 0} клиентов, новых сообщений: ${result?.totalNewMessages || result?.newMessages || 0}`,
      });
      
      // Mark as not running when completed
      if (progress?.id) {
        await supabase
          .from('salebot_import_progress')
          .update({ is_running: false })
          .eq('id', progress.id);
      }
    } catch (error: any) {
      const msg = await getInvokeErrorMessage(error);
      toast({
        title: 'Ошибка',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsSyncingWithIds(false);
    }
  };

  const handleFillSalebotIds = async () => {
    try {
      setIsFillingIds(true);
      
      // Reset fill progress and trigger fill mode
      const { data: progress } = await supabase
        .from('salebot_import_progress')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (progress?.id) {
        await supabase
          .from('salebot_import_progress')
          .update({ 
            fill_ids_offset: 0, 
            fill_ids_total_processed: 0,
            fill_ids_total_matched: 0,
            fill_ids_mode: true,
            is_paused: false 
          } as Partial<SalebotProgressRow>)
          .eq('id', progress.id);
      }
      
      const { data, error } = await supabase.functions.invoke('import-salebot-chats-auto', {
        body: { mode: 'fill_salebot_ids' }
      });
      if (error) throw new Error(await getInvokeErrorMessage(error));
      
      const result = data as SalebotFillIdsResponse;
      toast({
        title: 'Заполнение Salebot IDs запущено',
        description: `Обработано: ${result?.processedThisBatch || 0}, связано: ${result?.matchedThisBatch || 0}`,
      });
    } catch (error: any) {
      const msg = await getInvokeErrorMessage(error);
      toast({
        title: 'Ошибка',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsFillingIds(false);
    }
  };

  // Handler for importing only new clients (without imported messages)
  const handleSyncNewClientsOnly = async (continueSync = false) => {
    try {
      setIsSyncingNewClientsOnly(true);
      
      // Check if stopped before continuing
      const { data: currentProgress } = await supabase
        .from('salebot_import_progress')
        .select('is_paused, resync_mode')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (continueSync && currentProgress?.is_paused) {
        console.log('⏸️ Импорт остановлен пользователем');
        setIsSyncingNewClientsOnly(false);
        return;
      }
      
      const { data: progress } = await supabase
        .from('salebot_import_progress')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (progress?.id) {
        if (!continueSync) {
          await supabase
            .from('salebot_import_progress')
            .update({ 
              resync_offset: 0, 
              resync_total_clients: 0,
              resync_new_messages: 0,
              resync_mode: true,
              is_running: true,
              is_paused: false 
            })
            .eq('id', progress.id);
        } else {
          await supabase
            .from('salebot_import_progress')
            .update({ 
              resync_mode: true,
              is_running: true,
              is_paused: false 
            })
            .eq('id', progress.id);
        }
      }
      
      const { data, error } = await supabase.functions.invoke('import-salebot-chats-auto', {
        body: { mode: 'sync_new_clients_only' }
      });
      if (error) throw new Error(await getInvokeErrorMessage(error));
      
      const result = data as SalebotImportBatchResponse;
      
      // Check if stopped during this batch
      const { data: checkPaused } = await supabase
        .from('salebot_import_progress')
        .select('is_paused')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (checkPaused?.is_paused) {
        console.log('⏸️ Импорт остановлен пользователем');
        setIsSyncingNewClientsOnly(false);
        return;
      }
      
      // Auto-continue if not completed
      if (result?.completed === false) {
        toast({
          title: '🆕 Батч завершён, продолжаем...',
          description: `Обработано: ${result?.totalClients || 0} клиентов, новых сообщений: ${result?.totalNewMessages || 0}`,
        });
        setTimeout(() => handleSyncNewClientsOnly(true), 2000);
        return;
      }
      
      toast({
        title: '🎉 Импорт новых клиентов завершён!',
        description: `Обработано: ${result?.totalClients || 0} клиентов, новых сообщений: ${result?.totalNewMessages || 0}`,
      });
      
      // Refresh stats to update the counter
      fetchDbStats();
      
      if (progress?.id) {
        await supabase
          .from('salebot_import_progress')
          .update({ is_running: false })
          .eq('id', progress.id);
      }
    } catch (error: any) {
      const msg = await getInvokeErrorMessage(error);
      toast({
        title: 'Ошибка',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsSyncingNewClientsOnly(false);
    }
  };

  const handleFullReimport = async () => {
    if (!confirm('⚠️ ПОЛНЫЙ РЕИМПОРТ С НУЛЯ\n\nЭто сбросит весь прогресс и начнёт импорт заново:\n- Существующие клиенты будут пропущены (без дублей)\n- Все сообщения будут проверены (дубликаты пропущены)\n- Новые клиенты будут созданы\n- Это займёт много времени и API запросов!\n\nПродолжить?')) return;
    
    try {
      setIsFullReimporting(true);
      
      const { data, error } = await supabase.functions.invoke('import-salebot-chats-auto', {
        body: { mode: 'full_reimport' }
      });
      if (error) throw new Error(await getInvokeErrorMessage(error));
      
      const result = data as SalebotImportBatchResponse;
      toast({
        title: 'Полный реимпорт запущен',
        description: `Прогресс сброшен, импорт начнётся с начала списка. Клиентов: ${result?.totalClients || 0}, сообщений: ${result?.messagesImported || 0}`,
      });
    } catch (error: any) {
      const msg = await getInvokeErrorMessage(error);
      toast({
        title: 'Ошибка',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsFullReimporting(false);
    }
  };

  const handleCsvFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Неверный формат',
        description: 'Пожалуйста, выберите CSV файл',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsImportingCsv(true);
      setCsvImportResult(null);
      setCsvImportProgress({ current: 0, total: 0, phase: 'parsing' });

      // STEP 0: Verify user is admin before proceeding
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Ошибка авторизации',
          description: 'Вы не авторизованы. Пожалуйста, обновите страницу и войдите снова.',
          variant: 'destructive',
        });
        return;
      }

      console.log('🔍 Текущий пользователь:', user.id, user.email);

      // Fetch ALL user roles for diagnostics
      const { data: allRoles, error: allRolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      console.log('📋 Все роли пользователя:', allRoles, 'ошибка:', allRolesError);

      // Check specifically for admin role (will find it even if user has multiple roles like manager + admin)
      const { data: adminCheck, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      console.log('📋 Результат проверки admin роли:', { adminCheck, roleError });

      if (roleError) {
        console.error('Ошибка проверки роли:', roleError);
        toast({
          title: 'Ошибка проверки прав',
          description: 'Не удалось проверить ваши права доступа',
          variant: 'destructive',
        });
        return;
      }

      // Check if admin role exists (regardless of other roles like manager)
      const hasAdminRole = !!adminCheck;
      console.log('🎯 Есть роль admin:', hasAdminRole);

      if (!hasAdminRole) {
        toast({
          title: 'Доступ запрещён',
          description: 'Импорт Salebot IDs доступен только администраторам',
          variant: 'destructive',
        });
        return;
      }

      console.log('✅ Права администратора подтверждены (роль admin найдена)');

      // Read and parse CSV file on client
      const csvData = await file.text();
      console.log('📁 CSV файл загружен:', file.name, 'размер:', csvData.length);

      // Parse CSV on client side
      const lines = csvData.split('\n').filter(line => line.trim());
      const startIndex = lines[0].toLowerCase().includes('id') || 
                         lines[0].toLowerCase().includes('имя') || 
                         lines[0].toLowerCase().includes('name') ? 1 : 0;
      
      const parsedRows: { salebotId: string; name: string; phone: string }[] = [];
      
      // Helper function to normalize phone (matching the utility)
      const normalizePhoneLocal = (phone: string): string => {
        let digits = phone.replace(/\D/g, '');
        if (digits.startsWith('8') && digits.length === 11) {
          digits = '7' + digits.substring(1);
        }
        if (digits.length === 10) {
          digits = '7' + digits;
        }
        return digits;
      };
      
      for (let i = startIndex; i < lines.length; i++) {
        const fields = lines[i].split(';').map(f => f.trim().replace(/^["']|["']$/g, ''));
        if (fields.length >= 3) {
          const salebotId = fields[0];
          const name = fields[1] || 'Без имени';
          const phone = fields[2] || fields[3];
          
          if (salebotId && phone) {
            parsedRows.push({ salebotId, name, phone: normalizePhoneLocal(phone) });
          }
        }
      }

      console.log(`📊 Распознано записей CSV: ${parsedRows.length}`);
      setCsvImportProgress({ current: 0, total: parsedRows.length, phase: 'matching' });

      // STEP 1: Load ALL phone numbers from database ONCE (with pagination)
      console.log('📥 Загрузка телефонов из базы данных...');
      const allPhoneRecords: { client_id: string; phone: string }[] = [];
      let page = 0;
      const pageSize = 1000;

      while (true) {
        const { data: pageRecords, error: phoneError } = await supabase
          .from('client_phone_numbers')
          .select('client_id, phone')
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (phoneError) {
          throw new Error(`Ошибка загрузки телефонов: ${phoneError.message}`);
        }
        
        if (!pageRecords || pageRecords.length === 0) break;
        allPhoneRecords.push(...pageRecords);
        console.log(`📊 Загружено телефонов: ${allPhoneRecords.length}`);
        
        if (pageRecords.length < pageSize) break;
        page++;
      }

      console.log(`✅ Всего телефонов в базе: ${allPhoneRecords.length}`);

      // STEP 2: Build phone->clientId lookup map on client
      const phoneToClientMap = new Map<string, string>();
      for (const record of allPhoneRecords) {
        const normalized = normalizePhoneLocal(record.phone);
        phoneToClientMap.set(normalized, record.client_id);
      }

      // STEP 3: Match CSV rows to clients on client-side
      const updates: { clientId: string; salebotId: string }[] = [];
      const newClients: { salebotId: string; name: string; phone: string }[] = [];

      for (const row of parsedRows) {
        const clientId = phoneToClientMap.get(row.phone);
        if (clientId) {
          updates.push({ clientId, salebotId: row.salebotId });
        } else {
          newClients.push(row);
        }
      }

      console.log(`✅ Найдено совпадений: ${updates.length}, новых клиентов: ${newClients.length}`);
      
      if (updates.length === 0 && newClients.length === 0) {
        setCsvImportProgress(null);
        setCsvImportResult({
          matched: 0,
          updated: 0,
          created: 0,
          notFound: 0,
          errors: 0
        });
        toast({
          title: 'Нет данных для импорта',
          description: `CSV файл пуст или не содержит валидных записей`,
          variant: 'destructive',
        });
        return;
      }

      // STEP 4: Send pre-matched updates to Edge Function in chunks with retry logic
      const totalOperations = updates.length + newClients.length;
      setCsvImportProgress({ current: 0, total: totalOperations, phase: 'updating' });
      
      const chunkSize = 1000;
      let totalUpdated = 0;
      let totalCreated = 0;
      let totalErrors = 0;

      // Helper function for invoking with retry
      const invokeWithRetry = async (body: Record<string, unknown>, maxRetries = 3) => {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          // Refresh session before each attempt to prevent token expiration
          await supabase.auth.refreshSession();
          
          const { data, error } = await supabase.functions.invoke('import-salebot-ids-csv', {
            body
          });
          
          if (!error) {
            return { data, error: null };
          }
          
          const errorWithContext = error as InvokeErrorWithContext;
          const context = errorWithContext.context;
          const status = context?.status;
          
          // Don't retry on auth errors - these are real authorization issues
          if (status === 401 || status === 403) {
            return { data: null, error };
          }
          
          // Retry on 5xx or network errors
          if (attempt < maxRetries - 1) {
            const delayMs = 1000 * (attempt + 1); // 1s, 2s, 3s
            console.log(`⚠️ Ошибка ${status || 'network'}, повторная попытка через ${delayMs}ms...`);
            await new Promise(r => setTimeout(r, delayMs));
          }
        }
        return { data: null, error: new Error('Превышено количество попыток') };
      };

      // Process updates
      for (let offset = 0; offset < updates.length; offset += chunkSize) {
        const chunk = updates.slice(offset, offset + chunkSize);
        
        console.log(`📤 Отправка updates chunk: offset=${offset}, size=${chunk.length}`);
        
        // Add delay between chunks to reduce DB load
        if (offset > 0) {
          await new Promise(r => setTimeout(r, 500));
        }

        const { data, error } = await invokeWithRetry({ 
          updates: chunk, 
          newClients: [], 
          branch: selectedBranchForCsv,
          organizationId 
        });

        if (error) {
          const errorWithContext = error as InvokeErrorWithContext;
          const context = errorWithContext.context;
          const status = context?.status;
          
          console.error(`❌ Ошибка на chunk ${offset}-${offset + chunkSize}:`, {
            status,
            body: context?.body,
            message: error.message
          });
          
          if (status === 401) {
            throw new Error('Сессия истекла. Пожалуйста, обновите страницу и войдите снова.');
          } else if (status === 403) {
            throw new Error(`Ошибка 403 на chunk ${offset}/${updates.length}. Пожалуйста, обновите страницу и попробуйте снова.`);
          } else if (status === 500) {
            let detailedError = error.message;
            try {
              const bodyText = context?.body;
              if (bodyText) {
                const bodyJson = typeof bodyText === 'string' ? JSON.parse(bodyText) : bodyText;
                if (typeof bodyJson === 'object' && bodyJson !== null && 'error' in bodyJson) {
                  detailedError = String(bodyJson.error);
                }
              }
            } catch { /* ignore */ }
            throw new Error(`Ошибка сервера на chunk ${offset}: ${detailedError}`);
          }
          throw new Error(`Ошибка на chunk ${offset}/${updates.length}: ${error.message}`);
        }

        const result = data as CsvImportResponse;
        if (!result.success && result.updated === undefined) {
          throw new Error(result.error || 'Неизвестная ошибка');
        }

        totalUpdated += result.updated || 0;
        totalErrors += result.errors || 0;

        // Update progress AFTER successful chunk
        setCsvImportProgress({ 
          current: offset + chunk.length, 
          total: totalOperations, 
          phase: 'updating' 
        });

        console.log(`✅ Updates chunk ${offset}-${offset + chunk.length}: updated=${result.updated}, errors=${result.errors || 0}`);
      }

      // Process new clients
      if (newClients.length > 0) {
        setCsvImportProgress({ current: updates.length, total: totalOperations, phase: 'creating' });
        
        for (let offset = 0; offset < newClients.length; offset += chunkSize) {
          const chunk = newClients.slice(offset, offset + chunkSize);
          
          console.log(`📤 Отправка newClients chunk: offset=${offset}, size=${chunk.length}`);
          
          // Add delay between chunks
          if (offset > 0) {
            await new Promise(r => setTimeout(r, 500));
          }

          const { data, error } = await invokeWithRetry({ 
            updates: [], 
            newClients: chunk, 
            branch: selectedBranchForCsv,
            organizationId 
          });

          if (error) {
            console.error(`❌ Ошибка создания клиентов на chunk ${offset}:`, error.message);
            totalErrors += chunk.length;
            continue; // Continue with next chunk instead of failing completely
          }

          const result = data as CsvImportResponse;
          totalCreated += result.created || 0;
          totalErrors += result.errors || 0;

          // Update progress
          setCsvImportProgress({ 
            current: updates.length + offset + chunk.length, 
            total: totalOperations, 
            phase: 'creating' 
          });

          console.log(`✅ NewClients chunk ${offset}-${offset + chunk.length}: created=${result.created || 0}`);
        }
      }

      setCsvImportProgress(null);
      setCsvImportResult({
        matched: updates.length,
        updated: totalUpdated,
        created: totalCreated,
        notFound: 0,
        errors: totalErrors
      });

      toast({
        title: 'Импорт завершён',
        description: `Обновлено ${totalUpdated} клиентов из ${updates.length} найденных`,
      });

      // Refresh stats
      const [clientsWithIdRes, clientsWithoutIdRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }).not('salebot_client_id', 'is', null),
        supabase.from('clients').select('id', { count: 'exact', head: true }).is('salebot_client_id', null)
      ]);

      setDbStats(prev => prev ? {
        ...prev,
        clientsWithSalebotId: clientsWithIdRes.count || 0,
        clientsWithoutSalebotId: clientsWithoutIdRes.count || 0
      } : null);
    } catch (error: any) {
      console.error('Ошибка импорта CSV:', error);
      setCsvImportProgress(null);
      toast({
        title: 'Ошибка импорта',
        description: error.message || 'Неизвестная ошибка при импорте',
        variant: 'destructive',
      });
    } finally {
      setIsImportingCsv(false);
      if (csvFileInputRef.current) {
        csvFileInputRef.current.value = '';
      }
    }
  };

  const handleResetProgress = async () => {
    if (!confirm('Вы уверены? Это сбросит весь прогресс импорта Salebot.')) return;
    
    try {
      const { data: progress } = await supabase
        .from('salebot_import_progress')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (progress?.id) {
        await supabase
          .from('salebot_import_progress')
          .update({
            current_offset: 0,
            total_clients_processed: 0,
            total_imported: 0,
            total_messages_imported: 0,
            is_running: false,
            is_paused: false
          })
          .eq('id', progress.id);
        
        toast({
          title: 'Прогресс сброшен',
          description: 'Счетчики импорта сброшены. Импорт начнется с начала.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateListId = async () => {
    try {
      const { data: progress } = await supabase
        .from('salebot_import_progress')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (progress?.id) {
        await supabase
          .from('salebot_import_progress')
          .update({ list_id: salebotListId || null })
          .eq('id', progress.id);
        
        toast({
          title: 'List ID обновлён',
          description: `Импорт будет использовать список: ${salebotListId || 'все клиенты'}`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateApiLimit = async () => {
    const limitValue = parseInt(newApiLimit, 10);
    if (isNaN(limitValue) || limitValue < 100 || limitValue > 100000) {
      toast({
        title: 'Неверное значение',
        description: 'Лимит должен быть от 100 до 100 000',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSavingLimit(true);
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('salebot_api_usage')
        .upsert({ 
          date: today,
          max_daily_limit: limitValue
        }, { 
          onConflict: 'date' 
        });
      
      if (error) throw error;
      
      setApiUsage(prev => prev ? {
        ...prev,
        limit: limitValue,
        remaining: limitValue - prev.used
      } : null);
      
      toast({
        title: 'Лимит обновлён',
        description: `Новый дневной лимит: ${limitValue.toLocaleString()} запросов`,
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSavingLimit(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Синхронизация данных</h1>
        <p className="text-muted-foreground mt-2">
          Управление импортом из HolyHope и Salebot
        </p>
      </div>

      {/* Stats Overview */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">
          {lastStatsRefresh > 0 && `Обновлено: ${new Date(lastStatsRefresh).toLocaleTimeString()}`}
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchDbStats}
          className="gap-1"
        >
          <RefreshCw className="h-3 w-3" />
          Обновить статистику
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Клиенты</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold">{dbStats?.clients.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Студенты</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{dbStats?.students.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Сообщения</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-purple-500" />
              <span className="text-2xl font-bold">{dbStats?.messages.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Семьи</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-500" />
              <span className="text-2xl font-bold">{dbStats?.familyGroups.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="salebot" className="space-y-4">
        <TabsList>
          <TabsTrigger value="salebot">Salebot (чаты)</TabsTrigger>
          <TabsTrigger value="holyhope">HolyHope (данные)</TabsTrigger>
        </TabsList>

        <TabsContent value="salebot" className="space-y-4">
          {/* API Limit Card */}
          <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <Clock className="h-5 w-5" />
                Лимит API Salebot (сегодня: {apiUsage?.date})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Использовано: <strong>{apiUsage?.used?.toLocaleString()}</strong> / {apiUsage?.limit?.toLocaleString()}</span>
                  <span className={apiUsage?.remaining && apiUsage.remaining < 500 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                    Осталось: {apiUsage?.remaining?.toLocaleString()}
                  </span>
                </div>
                <Progress value={apiUsage ? (apiUsage.used / apiUsage.limit) * 100 : 0} className="h-3" />
                <p className="text-xs text-muted-foreground">
                  ~{apiUsage ? Math.floor(apiUsage.remaining / 11).toLocaleString() : 0} клиентов можно импортировать сегодня (11 API запросов на клиента)
                </p>
                
                {/* Edit limit section */}
                <div className="pt-2 border-t border-amber-200 dark:border-amber-800">
                  <Label className="text-xs text-muted-foreground">Дневной лимит запросов</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="number"
                      value={newApiLimit}
                      onChange={(e) => setNewApiLimit(e.target.value)}
                      placeholder="6000"
                      className="w-32"
                      min={100}
                      max={100000}
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleUpdateApiLimit}
                      disabled={isSavingLimit}
                    >
                      {isSavingLimit ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Сохранить'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Salebot IDs Status Card */}
          <Card className="border-cyan-500/50 bg-cyan-50/50 dark:bg-cyan-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300">
                <Users className="h-5 w-5" />
                Связь клиентов с Salebot
              </CardTitle>
              <CardDescription>
                Для синхронизации диалогов необходимо связать клиентов с их Salebot ID
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <div className="text-xs text-muted-foreground">С Salebot ID</div>
                  <div className="text-2xl font-bold text-green-600">{dbStats?.clientsWithSalebotId?.toLocaleString() || 0}</div>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <div className="text-xs text-muted-foreground">Без Salebot ID</div>
                  <div className="text-2xl font-bold text-red-600">{dbStats?.clientsWithoutSalebotId?.toLocaleString() || 0}</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Процент связанности</div>
                  <div className="text-2xl font-bold">
                    {dbStats?.clients ? Math.round((dbStats.clientsWithSalebotId / dbStats.clients) * 100) : 0}%
                  </div>
                </div>
              </div>
              
              {/* Fill IDs Progress */}
              {importProgress?.fillIdsMode && (
                <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Прогресс заполнения:</span>
                    <span>Offset: {importProgress.fillIdsOffset}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Обработано: <strong>{importProgress.fillIdsTotalProcessed}</strong></div>
                    <div>Связано: <strong>{importProgress.fillIdsTotalMatched}</strong></div>
                  </div>
                </div>
              )}
              
              {/* Sync with IDs Progress - with progress bar */}
              {importProgress?.resyncMode && !importProgress?.fillIdsMode && (
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
                      {importProgress.isRunning && (
                        <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                      )}
                      Фоновый импорт чатов
                    </span>
                    <span className="text-green-600">
                      {dbStats?.clientsWithSalebotId 
                        ? `${Math.round(((importProgress.resyncTotalClients || importProgress.totalClientsProcessed) / dbStats.clientsWithSalebotId) * 100)}%` 
                        : `Offset: ${importProgress.resyncOffset || importProgress.currentOffset}`}
                    </span>
                  </div>
                  {dbStats?.clientsWithSalebotId && dbStats.clientsWithSalebotId > 0 && (
                    <Progress 
                      value={((importProgress.resyncTotalClients || importProgress.totalClientsProcessed) / dbStats.clientsWithSalebotId) * 100} 
                      className="h-2"
                    />
                  )}
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>Обработано: <strong>{importProgress.resyncTotalClients || importProgress.totalClientsProcessed}</strong> / {dbStats?.clientsWithSalebotId || '?'}</div>
                    <div>Новых сообщений: <strong className="text-green-600">{importProgress.resyncNewMessages || importProgress.totalMessagesImported}</strong></div>
                    <div className="text-xs text-muted-foreground">
                      {importProgress.isRunning 
                        ? '🔗 Chain активна' 
                        : (importProgress.resyncTotalClients || importProgress.totalClientsProcessed) > 0 
                          ? importProgress.requiresManualRestart ? '⏸️ Ожидает продолжения' : '✅ Завершено' 
                          : '⏸️ Пауза'}
                    </div>
                  </div>
                </div>
              )}
              
              {dbStats && dbStats.clientsWithoutSalebotId > 0 && (
                <Alert className="border-cyan-500/50 bg-cyan-50/50 dark:bg-cyan-950/20">
                  <AlertCircle className="h-4 w-4 text-cyan-500" />
                  <AlertTitle>Требуется заполнение Salebot IDs</AlertTitle>
                  <AlertDescription>
                    {dbStats.clientsWithoutSalebotId.toLocaleString()} клиентов без Salebot ID. Запустите заполнение для связи клиентов.
                  </AlertDescription>
                </Alert>
              )}

              {dbStats && dbStats.clientsWithSalebotId > 0 && (
                <Alert className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertTitle>Готово к загрузке чатов</AlertTitle>
                  <AlertDescription>
                    {dbStats.clientsWithSalebotId.toLocaleString()} клиентов с Salebot ID готовы к загрузке диалогов.
                  </AlertDescription>
                </Alert>
              )}
              
              {/* New clients without imported messages alert */}
              {clientsWithoutMessages !== null && clientsWithoutMessages > 0 && (
                <Alert className="border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <AlertTitle>🆕 Новые клиенты для импорта</AlertTitle>
                  <AlertDescription className="flex items-center justify-between">
                    <span>
                      <strong>{clientsWithoutMessages.toLocaleString()}</strong> клиентов с Salebot ID ещё не имеют импортированных сообщений. 
                      Webhook теперь ловит новые — импортируйте историю только для этих клиентов.
                    </span>
                    <Button 
                      size="sm" 
                      className="ml-4 bg-orange-600 hover:bg-orange-700"
                      onClick={() => handleSyncNewClientsOnly(false)}
                      disabled={isSyncingNewClientsOnly || importProgress?.isRunning || (apiUsage?.remaining || 0) < 1}
                    >
                      {isSyncingNewClientsOnly ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <MessageSquare className="mr-1 h-3 w-3" />
                      )}
                      Импорт новых
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Branch Selection for CSV Import */}
              <div className="flex items-end gap-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="csv-branch" className="flex items-center gap-1.5 text-sm">
                    <MapPin className="h-3.5 w-3.5" />
                    Филиал для импортируемых клиентов
                  </Label>
                  <Select value={selectedBranchForCsv} onValueChange={setSelectedBranchForCsv}>
                    <SelectTrigger id="csv-branch" className="bg-background">
                      <SelectValue placeholder="Выберите филиал (обязательно)" />
                    </SelectTrigger>
                    <SelectContent className="z-[9999] bg-popover">
                      {branches.length === 0 ? (
                        <SelectItem value="_empty" disabled>
                          Нет филиалов — добавьте в Настройках
                        </SelectItem>
                      ) : (
                        branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.name}>
                            {branch.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  variant="default" 
                  className="bg-cyan-600 hover:bg-cyan-700 flex-1"
                  onClick={handleFillSalebotIds} 
                  disabled={isFillingIds || importProgress?.isRunning || (apiUsage?.remaining || 0) < 1}
                >
                  {isFillingIds ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Заполнить через API
                </Button>
                
                <div className="relative flex-1">
                  <input
                    ref={csvFileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileSelect}
                    className="hidden"
                    id="csv-salebot-upload"
                  />
                  <Button 
                    variant="outline" 
                    className="w-full border-cyan-500 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950"
                    onClick={() => csvFileInputRef.current?.click()}
                    disabled={isImportingCsv || !selectedBranchForCsv}
                    title={!selectedBranchForCsv ? 'Сначала выберите филиал' : ''}
                  >
                    {isImportingCsv ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                    )}
                    Загрузить CSV
                  </Button>
                </div>
                
{/* Sync chats for clients with Salebot ID */}
                {isSyncingWithIds || (importProgress?.resyncMode && importProgress?.isRunning) ? (
                  <Button 
                    variant="destructive" 
                    className="flex-1"
                    onClick={handleStopImport} 
                    disabled={isStopping}
                  >
                    {isStopping ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Pause className="mr-2 h-4 w-4" />
                    )}
                    Остановить
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="default" 
                      className="bg-green-600 hover:bg-green-700 flex-1"
                      onClick={handleBackgroundSync} 
                      disabled={importProgress?.isRunning || (apiUsage?.remaining || 0) < 1 || !dbStats?.clientsWithSalebotId}
                      title="Фоновый импорт - можно закрыть страницу"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      🚀 Фоновый импорт
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                      onClick={() => handleSyncWithSalebotIds(false)} 
                      disabled={importProgress?.isRunning || (apiUsage?.remaining || 0) < 1 || !dbStats?.clientsWithSalebotId}
                      title="Импорт в браузере - требует открытой страницы"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      В браузере
                    </Button>
                  </>
                )}
              </div>

              {/* CSV Import Progress */}
              {csvImportProgress && (
                <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-cyan-700 dark:text-cyan-300">
                      {csvImportProgress.phase === 'parsing' && '📄 Парсинг CSV...'}
                      {csvImportProgress.phase === 'matching' && '🔍 Поиск совпадений...'}
                      {csvImportProgress.phase === 'updating' && '📝 Обновление записей...'}
                      {csvImportProgress.phase === 'creating' && '➕ Создание новых клиентов...'}
                    </span>
                    <span className="text-cyan-600 dark:text-cyan-400">
                      {csvImportProgress.total > 0 
                        ? `${csvImportProgress.current} / ${csvImportProgress.total} (${Math.round(csvImportProgress.current / csvImportProgress.total * 100)}%)`
                        : 'Загрузка...'}
                    </span>
                  </div>
                  <Progress 
                    value={csvImportProgress.total > 0 ? (csvImportProgress.current / csvImportProgress.total) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              )}

              {/* CSV Import Result */}
              {csvImportResult && (
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <div className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                    ✅ Результат импорта CSV:
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                    <div>Найдено: <strong>{csvImportResult.matched}</strong></div>
                    <div>Обновлено: <strong className="text-green-600">{csvImportResult.updated}</strong></div>
                    {csvImportResult.created !== undefined && csvImportResult.created > 0 && (
                      <div>Создано: <strong className="text-blue-600">{csvImportResult.created}</strong></div>
                    )}
                    {csvImportResult.notFound > 0 && (
                      <div>Не найдено: <strong className="text-orange-600">{csvImportResult.notFound}</strong></div>
                    )}
                    {csvImportResult.errors ? (
                      <div>Ошибок: <strong className="text-red-600">{csvImportResult.errors}</strong></div>
                    ) : null}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Загрузите CSV файл с клиентами из Salebot (формат: ID;Имя;Телефон) для быстрого связывания
              </p>
            </CardContent>
          </Card>

          {/* Import Progress Card */}
          <Card className="border-purple-500/50 bg-purple-50/50 dark:bg-purple-950/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <MessageSquare className="h-5 w-5" />
                  Импорт чатов из Salebot
                </CardTitle>
                {importProgress?.isRunning ? (
                  <Badge variant="default" className="bg-green-500">
                    <span className="h-2 w-2 bg-white rounded-full animate-pulse mr-1.5"></span>
                    Запущен
                  </Badge>
                ) : importProgress?.isPaused ? (
                  <Badge variant="secondary">
                    <Pause className="h-3 w-3 mr-1" />
                    На паузе
                  </Badge>
                ) : importProgress?.isCompleted ? (
                  <Badge variant="default" className="bg-blue-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Импорт завершён
                  </Badge>
                ) : (
                  <Badge variant="outline">Остановлен</Badge>
                )}
              </div>
              <CardDescription>
                Автоматический импорт истории сообщений WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stuck Process Alert */}
              {(() => {
                const stuckStatus = getStuckStatus();
                if (stuckStatus.isStuck) {
                  return (
                    <Alert className="border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <AlertTitle className="flex items-center justify-between flex-wrap gap-2">
                        <span>Возможно, процесс завис</span>
                        <div className="flex gap-2">
                          <Button 
                            variant="default" 
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={handleResumeChain}
                            disabled={isResumingChain}
                          >
                            {isResumingChain ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="mr-1 h-4 w-4" />
                            )}
                            Продолжить
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-orange-500 text-orange-600 hover:bg-orange-100"
                            onClick={handleResetStuckProcess}
                            disabled={isResettingStuck}
                          >
                            {isResettingStuck ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="mr-1 h-4 w-4" />
                            )}
                            Сбросить
                          </Button>
                        </div>
                      </AlertTitle>
                      <AlertDescription>
                        Последнее обновление: {stuckStatus.minutesAgo} мин. назад. Нажмите "Продолжить" чтобы возобновить с текущей позиции или "Сбросить" для полной остановки.
                      </AlertDescription>
                    </Alert>
                  );
                }
                return null;
              })()}

              {/* API Limit Reached - Manual Restart Required */}
              {importProgress?.requiresManualRestart && !importProgress?.isRunning && (
                <Alert className="border-red-500/50 bg-red-50/50 dark:bg-red-950/20">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <AlertTitle className="flex items-center justify-between flex-wrap gap-2">
                    <span>Импорт остановлен из-за лимита API</span>
                    <Button 
                      variant="default" 
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={handleManualRestartAfterLimit}
                      disabled={isManualRestarting}
                    >
                      {isManualRestarting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-1 h-4 w-4" />
                      )}
                      Разблокировать импорт
                    </Button>
                  </AlertTitle>
                  <AlertDescription>
                    Дневной лимит API Salebot был достигнут. Импорт заблокирован для предотвращения случайного запуска.
                    Нажмите "Разблокировать импорт" чтобы снять блокировку, затем запустите синхронизацию вручную.
                  </AlertDescription>
                </Alert>
              )}

              {/* Running Status with Time */}
              {importProgress?.isRunning && importProgress?.updatedAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Последнее обновление: {importProgress.updatedAt.toLocaleTimeString()} 
                    ({Math.floor((Date.now() - importProgress.updatedAt.getTime()) / 1000)}с назад)
                  </span>
                </div>
              )}

              {/* Progress Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <div className="text-xs text-muted-foreground">Клиентов обработано</div>
                  <div className="text-xl font-bold">{importProgress?.totalClientsProcessed || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Сообщений импортировано</div>
                  <div className="text-xl font-bold">{importProgress?.totalMessagesImported || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Текущий offset</div>
                  <div className="text-xl font-bold">{importProgress?.currentOffset || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Последний запуск</div>
                  <div className="text-sm font-medium">
                    {importProgress?.lastRunAt?.toLocaleString() || '—'}
                  </div>
                </div>
              </div>

              {/* List ID Settings */}
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="list-id">ID списка Salebot</Label>
                  <Input
                    id="list-id"
                    value={salebotListId}
                    onChange={(e) => setSalebotListId(e.target.value)}
                    placeholder="Например: 740756"
                  />
                </div>
                <Button variant="outline" onClick={handleUpdateListId}>
                  Сохранить
                </Button>
              </div>

              {/* Completed Status Alert */}
              {importProgress?.isCompleted && !importProgress?.isRunning && (
                <Alert className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  <AlertTitle>Импорт списка завершён</AlertTitle>
                  <AlertDescription>
                    Все клиенты из списка обработаны. Используйте "Синхронизировать новые" для загрузки новых сообщений.
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {importProgress?.isRunning ? (
                  <Button variant="destructive" onClick={handleStopImport}>
                    <Pause className="mr-2 h-4 w-4" />
                    Остановить
                  </Button>
                ) : (
                  <Button onClick={handleResumeImport} disabled={isImporting || (apiUsage?.remaining || 0) < 11}>
                    {isImporting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    Запустить импорт
                  </Button>
                )}
                <Button 
                  variant="secondary" 
                  onClick={handleRunBatch} 
                  disabled={isRunningBatch || importProgress?.isRunning || (apiUsage?.remaining || 0) < 11}
                >
                  {isRunningBatch ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Запустить 1 батч
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleSyncNew} 
                  disabled={isSyncingNew || importProgress?.isRunning || (apiUsage?.remaining || 0) < 11}
                >
                  {isSyncingNew ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Синхронизировать новые
                </Button>
                <Button 
                  variant="default" 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleResyncAllDialogs} 
                  disabled={isResyncingAll || importProgress?.isRunning || (apiUsage?.remaining || 0) < 11}
                >
                  {isResyncingAll ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Синхронизировать все диалоги
                </Button>
                <Button variant="outline" onClick={handleResetProgress}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Сбросить прогресс
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleFullReimport} 
                  disabled={isFullReimporting || importProgress?.isRunning || (apiUsage?.remaining || 0) < 11}
                >
                  {isFullReimporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Database className="mr-2 h-4 w-4" />
                  )}
                  Полный реимпорт с нуля
                </Button>
              </div>

              {(apiUsage?.remaining || 0) < 11 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Лимит API исчерпан</AlertTitle>
                  <AlertDescription>
                    Дневной лимит API Salebot исчерпан. Импорт продолжится автоматически завтра.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holyhope" className="space-y-4">
          {/* API Limit Lock Alert */}
          {holihopeProgress?.requiresManualRestart && !holihopeProgress?.isRunning && (
            <Alert className="border-red-500/50 bg-red-50/50 dark:bg-red-950/20">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertTitle className="flex items-center justify-between flex-wrap gap-2">
                <span>Импорт HolyHope заблокирован</span>
                <Button 
                  variant="default" 
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleHolihopeUnlock}
                  disabled={isHolihopeUnlocking}
                >
                  {isHolihopeUnlocking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1 h-4 w-4" />
                  )}
                  Разблокировать импорт
                </Button>
              </AlertTitle>
              <AlertDescription>
                {holihopeProgress.lastError || 'Лимит API HolyHope был достигнут. Импорт заблокирован для предотвращения случайного запуска.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Import Status Card */}
          <Card className="border-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-950/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                  <Database className="h-5 w-5" />
                  Импорт данных из HolyHope
                </CardTitle>
                {holihopeProgress?.isRunning ? (
                  <Badge variant="default" className="bg-green-500">
                    <span className="h-2 w-2 bg-white rounded-full animate-pulse mr-1.5"></span>
                    Запущен
                  </Badge>
                ) : holihopeProgress?.requiresManualRestart ? (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Заблокирован
                  </Badge>
                ) : (
                  <Badge variant="outline">Готов</Badge>
                )}
              </div>
              <CardDescription>
                Полный импорт студентов, лидов, расписания и других данных
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Stats */}
              {holihopeProgress && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <div className="text-xs text-muted-foreground">Филиалы</div>
                    <div className="text-xl font-bold">{holihopeProgress.totalBranchesImported}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Преподаватели</div>
                    <div className="text-xl font-bold">{holihopeProgress.totalTeachersImported}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Лиды</div>
                    <div className="text-xl font-bold">{holihopeProgress.totalLeadsImported}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Студенты</div>
                    <div className="text-xl font-bold">{holihopeProgress.totalStudentsImported}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Группы</div>
                    <div className="text-xl font-bold">{holihopeProgress.totalGroupsImported}</div>
                  </div>
                </div>
              )}

              {/* Last sync info */}
              {holihopeProgress?.lastRunAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Последний запуск: {holihopeProgress.lastRunAt.toLocaleString()}</span>
                </div>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Информация</AlertTitle>
                <AlertDescription>
                  Для полного импорта данных из HolyHope (22 шага) перейдите на специальную страницу импорта.
                </AlertDescription>
              </Alert>
              
              <Button asChild>
                <a href="/holihope-import" target="_blank">
                  <Database className="mr-2 h-4 w-4" />
                  Открыть страницу импорта HolyHope
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Stats from HolyHope */}
          <Card>
            <CardHeader>
              <CardTitle>Данные из HolyHope</CardTitle>
              <CardDescription>Текущие данные в системе</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Студенты</div>
                  <div className="text-2xl font-bold text-green-600">{dbStats?.students.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Клиенты (родители)</div>
                  <div className="text-2xl font-bold text-blue-600">{dbStats?.clients.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Семейные группы</div>
                  <div className="text-2xl font-bold text-orange-600">{dbStats?.familyGroups.toLocaleString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
