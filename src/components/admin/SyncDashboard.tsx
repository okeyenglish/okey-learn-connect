import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw, Database, MessageSquare, Users, Clock, Pause, Play, Upload, FileSpreadsheet } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface SalebotProgress {
  totalClientsProcessed: number;
  totalImported: number;
  totalMessagesImported: number;
  currentOffset: number;
  startTime: Date | null;
  lastRunAt: Date | null;
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
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

export function SyncDashboard() {
  const { toast } = useToast();
  const [importProgress, setImportProgress] = useState<SalebotProgress | null>(null);
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
  const [isFullReimporting, setIsFullReimporting] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [csvImportProgress, setCsvImportProgress] = useState<{
    current: number;
    total: number;
    phase: 'parsing' | 'matching' | 'updating';
  } | null>(null);
  const [csvImportResult, setCsvImportResult] = useState<{
    matched: number;
    updated: number;
    notFound: number;
    errors?: number;
  } | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const [newApiLimit, setNewApiLimit] = useState<string>('6000');
  const [isSavingLimit, setIsSavingLimit] = useState(false);

  // Smart polling: only fetch when tab is visible, with backoff on errors
  const [pollInterval, setPollInterval] = useState(10000); // Start at 10s
  const [lastStatsRefresh, setLastStatsRefresh] = useState<number>(0);

  const fetchProgressOnly = async () => {
    try {
      // Get Salebot progress (lightweight)
      const { data: progressData } = await supabase
        .from('salebot_import_progress')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (progressData) {
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
          isRunning: progressData.is_running || false,
          isPaused: progressData.is_paused || false,
          isCompleted,
          resyncMode: progressData.resync_mode || false,
          resyncOffset: progressData.resync_offset || 0,
          resyncTotalClients: progressData.resync_total_clients || 0,
          resyncNewMessages: progressData.resync_new_messages || 0,
          fillIdsMode: (progressData as any).fill_ids_mode || false,
          fillIdsOffset: (progressData as any).fill_ids_offset || 0,
          fillIdsTotalProcessed: (progressData as any).fill_ids_total_processed || 0,
          fillIdsTotalMatched: (progressData as any).fill_ids_total_matched || 0
        });

        // If import is running, poll faster (5s), otherwise slow down (30s)
        setPollInterval(progressData.is_running ? 5000 : 30000);
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
      const [clientsRes, studentsRes, messagesRes, familyRes, clientsWithIdRes, clientsWithoutIdRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('chat_messages').select('id', { count: 'exact', head: true }),
        supabase.from('family_groups').select('id', { count: 'exact', head: true }),
        supabase.from('clients').select('id', { count: 'exact', head: true }).not('salebot_client_id', 'is', null),
        supabase.from('clients').select('id', { count: 'exact', head: true }).is('salebot_client_id', null)
      ]);

      setDbStats({
        clients: clientsRes.count || 0,
        students: studentsRes.count || 0,
        messages: messagesRes.count || 0,
        familyGroups: familyRes.count || 0,
        clientsWithSalebotId: clientsWithIdRes.count || 0,
        clientsWithoutSalebotId: clientsWithoutIdRes.count || 0
      });
      setLastStatsRefresh(Date.now());
    } catch (error) {
      console.error('Error fetching DB stats:', error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchProgressOnly();
    fetchDbStats(); // Fetch stats once on mount

    let intervalId: NodeJS.Timeout;

    const startPolling = () => {
      // Only poll if tab is visible
      if (document.visibilityState === 'visible') {
        intervalId = setInterval(() => {
          if (document.visibilityState === 'visible') {
            fetchProgressOnly();
          }
        }, pollInterval);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Resume polling when tab becomes visible
        fetchProgressOnly();
        startPolling();
      } else {
        // Stop polling when tab is hidden
        if (intervalId) clearInterval(intervalId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    startPolling();

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pollInterval]);

  const handleStopImport = async () => {
    try {
      const { error } = await supabase.functions.invoke('salebot-stop');
      if (error) throw error;
      toast({
        title: 'Импорт остановлен',
        description: 'Автоматический импорт Salebot успешно остановлен',
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
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
      if (error) throw error;
      
      toast({
        title: 'Импорт возобновлён',
        description: 'Автоматический импорт Salebot успешно запущен',
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
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
      if (error) throw error;
      
      const result = data as any;
      
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
      toast({
        title: 'Ошибка',
        description: error.message,
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
      if (error) throw error;
      
      toast({
        title: 'Синхронизация запущена',
        description: 'Поиск новых сообщений у существующих клиентов',
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
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
      if (error) throw error;
      
      const result = data as any;
      toast({
        title: 'Синхронизация диалогов запущена',
        description: `Обработано: ${result?.processedClients || 0} клиентов, новых сообщений: ${result?.newMessages || 0}`,
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsResyncingAll(false);
    }
  };

  const handleSyncWithSalebotIds = async () => {
    try {
      setIsSyncingWithIds(true);
      
      // Reset resync progress and trigger sync mode
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
        body: { mode: 'sync_with_salebot_ids' }
      });
      if (error) throw error;
      
      const result = data as any;
      toast({
        title: 'Синхронизация запущена',
        description: `Обработано: ${result?.processedClients || 0} клиентов, новых сообщений: ${result?.newMessages || 0}`,
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
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
          } as any)
          .eq('id', progress.id);
      }
      
      const { data, error } = await supabase.functions.invoke('import-salebot-chats-auto', {
        body: { mode: 'fill_salebot_ids' }
      });
      if (error) throw error;
      
      const result = data as any;
      toast({
        title: 'Заполнение Salebot IDs запущено',
        description: `Обработано: ${result?.processedThisBatch || 0}, связано: ${result?.matchedThisBatch || 0}`,
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsFillingIds(false);
    }
  };

  const handleFullReimport = async () => {
    if (!confirm('⚠️ ПОЛНЫЙ РЕИМПОРТ С НУЛЯ\n\nЭто сбросит весь прогресс и начнёт импорт заново:\n- Существующие клиенты будут пропущены (без дублей)\n- Все сообщения будут проверены (дубликаты пропущены)\n- Новые клиенты будут созданы\n- Это займёт много времени и API запросов!\n\nПродолжить?')) return;
    
    try {
      setIsFullReimporting(true);
      
      const { data, error } = await supabase.functions.invoke('import-salebot-chats-auto', {
        body: { mode: 'full_reimport' }
      });
      if (error) throw error;
      
      const result = data as any;
      toast({
        title: 'Полный реимпорт запущен',
        description: `Прогресс сброшен, импорт начнётся с начала списка. Клиентов: ${result?.totalClients || 0}, сообщений: ${result?.messagesImported || 0}`,
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
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
      
      const parsedRows: { salebotId: string; phone: string }[] = [];
      
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
          const phone = fields[2] || fields[3];
          
          if (salebotId && phone) {
            parsedRows.push({ salebotId, phone: normalizePhoneLocal(phone) });
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
      let totalNotFound = 0;

      for (const row of parsedRows) {
        const clientId = phoneToClientMap.get(row.phone);
        if (clientId) {
          updates.push({ clientId, salebotId: row.salebotId });
        } else {
          totalNotFound++;
        }
      }

      console.log(`✅ Найдено совпадений: ${updates.length}, не найдено: ${totalNotFound}`);
      
      if (updates.length === 0) {
        setCsvImportProgress(null);
        setCsvImportResult({
          matched: 0,
          updated: 0,
          notFound: totalNotFound,
          errors: 0
        });
        toast({
          title: 'Совпадений не найдено',
          description: `Ни один телефон из CSV не найден в базе данных`,
          variant: 'destructive',
        });
        return;
      }

      // STEP 4: Send pre-matched updates to Edge Function in chunks with retry logic
      setCsvImportProgress({ current: 0, total: updates.length, phase: 'updating' });
      
      const chunkSize = 1000;
      let totalUpdated = 0;
      let totalErrors = 0;

      // Helper function for invoking with retry
      const invokeWithRetry = async (chunk: { clientId: string; salebotId: string }[], maxRetries = 3) => {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          // Refresh session before each attempt to prevent token expiration
          await supabase.auth.refreshSession();
          
          const { data, error } = await supabase.functions.invoke('import-salebot-ids-csv', {
            body: { updates: chunk }
          });
          
          if (!error) {
            return { data, error: null };
          }
          
          const context = (error as any).context;
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

      for (let offset = 0; offset < updates.length; offset += chunkSize) {
        const chunk = updates.slice(offset, offset + chunkSize);
        
        console.log(`📤 Отправка chunk: offset=${offset}, size=${chunk.length}`);
        
        // Add delay between chunks to reduce DB load
        if (offset > 0) {
          await new Promise(r => setTimeout(r, 500));
        }

        const { data, error } = await invokeWithRetry(chunk);

        if (error) {
          const context = (error as any).context;
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
                if (bodyJson?.error) detailedError = bodyJson.error;
              }
            } catch { /* ignore */ }
            throw new Error(`Ошибка сервера на chunk ${offset}: ${detailedError}`);
          }
          throw new Error(`Ошибка на chunk ${offset}/${updates.length}: ${error.message}`);
        }

        const result = data as any;
        if (!result.success) {
          throw new Error(result.error || 'Неизвестная ошибка');
        }

        totalUpdated += result.updated || 0;
        totalErrors += result.errors || 0;

        // Update progress AFTER successful chunk
        setCsvImportProgress({ 
          current: offset + chunk.length, 
          total: updates.length, 
          phase: 'updating' 
        });

        console.log(`✅ Chunk ${offset}-${offset + chunk.length}: updated=${result.updated}, errors=${result.errors || 0}`);
      }

      setCsvImportProgress(null);
      setCsvImportResult({
        matched: updates.length,
        updated: totalUpdated,
        notFound: totalNotFound,
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
              
              {/* Sync with IDs Progress */}
              {importProgress?.resyncMode && !importProgress?.fillIdsMode && (
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Прогресс загрузки чатов:</span>
                    <span>Offset: {importProgress.resyncOffset}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Клиентов: <strong>{importProgress.resyncTotalClients}</strong></div>
                    <div>Новых сообщений: <strong className="text-green-600">{importProgress.resyncNewMessages}</strong></div>
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
                    disabled={isImportingCsv}
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
                <Button 
                  variant="default" 
                  className="bg-green-600 hover:bg-green-700 flex-1"
                  onClick={handleSyncWithSalebotIds} 
                  disabled={isSyncingWithIds || importProgress?.isRunning || (apiUsage?.remaining || 0) < 1 || !dbStats?.clientsWithSalebotId}
                >
                  {isSyncingWithIds ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="mr-2 h-4 w-4" />
                  )}
                  Загрузить чаты ({dbStats?.clientsWithSalebotId || 0})
                </Button>
              </div>

              {/* CSV Import Progress */}
              {csvImportProgress && (
                <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-cyan-700 dark:text-cyan-300">
                      {csvImportProgress.phase === 'parsing' && '📄 Парсинг CSV...'}
                      {csvImportProgress.phase === 'matching' && '🔍 Поиск совпадений...'}
                      {csvImportProgress.phase === 'updating' && '📝 Обновление записей...'}
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>Найдено: <strong>{csvImportResult.matched}</strong></div>
                    <div>Обновлено: <strong className="text-green-600">{csvImportResult.updated}</strong></div>
                    <div>Не найдено: <strong className="text-orange-600">{csvImportResult.notFound}</strong></div>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Импорт данных из HolyHope
              </CardTitle>
              <CardDescription>
                Полный импорт студентов, лидов, расписания и других данных
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Информация</AlertTitle>
                <AlertDescription>
                  Для полного импорта данных из HolyHope перейдите на специальную страницу импорта.
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
