import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Eye, MessageSquare } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ImportStep {
  id: string;
  name: string;
  description: string;
  action: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  count?: number;
  message?: string;
  error?: string;
}

export default function HolihopeImport() {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [shouldStopImport, setShouldStopImport] = useState(false);
  const [isImportingChats, setIsImportingChats] = useState(false);
  const [chatImportStatus, setChatImportStatus] = useState<string>('');
  const [isClearing, setIsClearing] = useState(false);
  const [isDeletingEdUnits, setIsDeletingEdUnits] = useState(false);
  const [salebotListId, setSalebotListId] = useState<string>('');
  const [startOffset, setStartOffset] = useState<string>('0');
  const [batchSize, setBatchSize] = useState<string>('10');
  const [importProgress, setImportProgress] = useState<{
    totalClientsProcessed: number;
    totalImported: number;
    totalMessagesImported: number;
    currentOffset: number;
    startTime: Date | null;
    lastRunAt: Date | null;
    isRunning: boolean;
    isPaused: boolean;
  } | null>(null);
  const [edUnitsProgress, setEdUnitsProgress] = useState<{
    officeIndex: number;
    statusIndex: number;
    timeIndex: number;
    totalImported: number;
    totalCombinations: number;
    isRunning: boolean;
    lastUpdatedAt: Date | null;
  } | null>(null);
  const [edUnitStudentsProgress, setEdUnitStudentsProgress] = useState<{
    skip: number;
    totalImported: number;
    isRunning: boolean;
    lastUpdatedAt: Date | null;
  } | null>(null);
  const [apiUsage, setApiUsage] = useState<{
    used: number;
    limit: number;
    remaining: number;
    date: string;
  } | null>(null);
  const [steps, setSteps] = useState<ImportStep[]>([
    { id: 'clear', name: '1. Архивация данных', description: 'Пометка существующих данных как неактивных', action: 'clear_data', status: 'pending' },
    { id: 'offices', name: '2. Филиалы', description: 'Импорт филиалов/офисов', action: 'import_locations', status: 'pending' },
    { id: 'client_statuses', name: '3. Статусы клиентов', description: 'Справочник статусов клиентов/учеников', action: 'import_client_statuses', status: 'pending' },
    { id: 'lead_statuses', name: '4. Статусы лидов', description: 'Справочник статусов лидов', action: 'import_lead_statuses', status: 'pending' },
    { id: 'disciplines', name: '5. Дисциплины', description: 'Импорт языков/дисциплин', action: 'import_disciplines', status: 'pending' },
    { id: 'levels', name: '6. Уровни', description: 'Импорт уровней обучения (A1-C2)', action: 'import_levels', status: 'pending' },
    { id: 'learning_types', name: '7. Типы обучения', description: 'Справочник типов обучения', action: 'import_learning_types', status: 'pending' },
    { id: 'employees', name: '8. Сотрудники', description: 'Импорт сотрудников офиса', action: 'import_employees', status: 'pending' },
    { id: 'teachers', name: '9. Преподаватели', description: 'Импорт преподавателей', action: 'import_teachers', status: 'pending' },
    { id: 'leads', name: '10. Лиды', description: 'Импорт лидов (+ автосоздание клиентов по телефонам)', action: 'import_leads', status: 'pending' },
    { id: 'students', name: '11. Ученики', description: 'Импорт учеников + контакты (Agents) + доп.поля (+ автосоздание клиентов)', action: 'import_students', status: 'pending' },
    { id: 'ed_units', name: '12. Учебные единицы + Расписание', description: 'Импорт всех типов (Group, MiniGroup, Individual) + расписание и занятия', action: 'import_ed_units', status: 'pending' },
    { id: 'ed_unit_students', name: '13. Связки ученик-группа', description: 'Информация о том, кто в какой группе', action: 'import_ed_unit_students', status: 'pending' },
    { id: 'entrance_tests', name: '14. Вступительные тесты', description: 'Результаты входных тестирований', action: 'import_entrance_tests', status: 'pending' },
    { id: 'personal_tests', name: '15. Персональные тесты', description: 'Результаты индивидуальных тестов', action: 'import_personal_tests', status: 'pending' },
    { id: 'group_tests', name: '16. Групповые тесты', description: 'Результаты групповых тестов', action: 'import_group_tests', status: 'pending' },
    { id: 'online_tests', name: '17. Онлайн-тесты', description: 'Результаты онлайн-тестов', action: 'import_online_tests', status: 'pending' },
    { id: 'academic_reports', name: '18. Отчеты об успеваемости', description: 'Отчеты преподавателей по месяцам', action: 'import_academic_reports', status: 'pending' },
    { id: 'balances', name: '19. Балансы', description: 'Текущие балансы учеников', action: 'import_balances', status: 'pending' },
    { id: 'transactions', name: '20. Транзакции', description: 'Поступления и списания по клиентам', action: 'import_transactions', status: 'pending' },
    { id: 'payments', name: '21. Платежи (legacy)', description: 'Платежи через GetPayments', action: 'import_payments', status: 'pending' },
    { id: 'lesson_plans', name: '22. Планы занятий', description: 'ДЗ и материалы (текст + ссылки)', action: 'import_lesson_plans', status: 'pending' },
  ]);

  // Smart polling: only when tab visible, with adaptive interval
  const [pollInterval, setPollInterval] = useState(15000); // Start at 15s

  // Check Step 12 completion status on mount (before polling starts)
  useEffect(() => {
    const checkStep12Completion = async () => {
      const { data: holihopeProgress } = await supabase
        .from('holihope_import_progress')
        .select('ed_units_office_index, ed_units_total_combinations, ed_units_total_imported, ed_units_is_running')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (holihopeProgress) {
        const totalCombs = holihopeProgress.ed_units_total_combinations || 1615;
        const officeCount = Math.max(1, Math.round(totalCombs / (5 * 17)));
        const officeIdx = holihopeProgress.ed_units_office_index || 0;
        const isCompleted = officeIdx >= officeCount;
        
        if (isCompleted && !holihopeProgress.ed_units_is_running) {
          setSteps((prev) =>
            prev.map((s) =>
              s.id === 'ed_units'
                ? {
                    ...s,
                    status: 'completed',
                    message: `Шаг 12 завершён. Импортировано: ${holihopeProgress.ed_units_total_imported || 0}`,
                  }
                : s
            )
          );
        }
      }
    };
    
    checkStep12Completion();
  }, []); // Run only on mount

  useEffect(() => {
    const pollProgress = async () => {
      // Skip if tab is hidden
      if (document.visibilityState !== 'visible') return;

      try {
        // 1) Try to get currently running progress
        let query = supabase
          .from('salebot_import_progress')
          .select('*')
          .eq('is_running', true)
          .order('last_run_at', { ascending: false, nullsFirst: false })
          .order('updated_at', { ascending: false, nullsFirst: false })
          .limit(1)
          .single();

        let { data } = await query;

        // 2) Fallback – get last updated
        if (!data) {
          const fallback = await supabase
            .from('salebot_import_progress')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();
          data = fallback.data || null;
        }

        if (data) {
          setImportProgress({
            totalClientsProcessed: data.total_clients_processed || 0,
            totalImported: data.total_imported || 0,
            totalMessagesImported: data.total_messages_imported || 0,
            currentOffset: data.current_offset || 0,
            startTime: data.start_time ? new Date(data.start_time) : null,
            lastRunAt: data.last_run_at ? new Date(data.last_run_at) : null,
            isRunning: data.is_running || false,
            isPaused: data.is_paused || false
          });

          // If import is running, poll faster (5s), otherwise slow (30s)
          setPollInterval(data.is_running ? 5000 : 30000);
        }

        // 3) Get API usage
        const today = new Date().toISOString().split('T')[0];
        const { data: usageData } = await supabase
          .from('salebot_api_usage')
          .select('*')
          .eq('date', today)
          .maybeSingle();

        if (usageData) {
          setApiUsage({
            used: usageData.api_requests_count || 0,
            limit: usageData.max_daily_limit || 6000,
            remaining: (usageData.max_daily_limit || 6000) - (usageData.api_requests_count || 0),
            date: usageData.date
          });
        } else {
          setApiUsage({
            used: 0,
            limit: 6000,
            remaining: 6000,
            date: today
          });
        }
        
        // 4) Get ed_units progress from holihope_import_progress
        const { data: holihopeProgress } = await supabase
          .from('holihope_import_progress')
          .select('ed_units_office_index, ed_units_status_index, ed_units_time_index, ed_units_total_imported, ed_units_total_combinations, ed_units_is_running, ed_units_last_updated_at, ed_unit_students_skip, ed_unit_students_total_imported, ed_unit_students_is_running, ed_unit_students_last_updated_at')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (holihopeProgress) {
          const totalCombs = holihopeProgress.ed_units_total_combinations || 1615;
          // Calculate officeCount dynamically: totalCombinations = offices * 5 statuses * 17 time slots
          const officeCount = Math.max(1, Math.round(totalCombs / (5 * 17)));
          
          const officeIdx = holihopeProgress.ed_units_office_index || 0;
          const statusIdx = holihopeProgress.ed_units_status_index || 0;
          const timeIdx = holihopeProgress.ed_units_time_index || 0;
          
          // currentPosition = processed combinations
          // When completed: officeIndex = officeCount, statusIndex = 0, timeIndex = 0
          const currentPosition = Math.min(
            officeIdx * 5 * 17 + statusIdx * 17 + timeIdx,
            totalCombs
          );
          
          // Detect completion: officeIndex >= officeCount means all offices processed
          const isCompleted = officeIdx >= officeCount;
          
          setEdUnitsProgress({
            officeIndex: officeIdx,
            statusIndex: statusIdx,
            timeIndex: timeIdx,
            totalImported: holihopeProgress.ed_units_total_imported || 0,
            totalCombinations: totalCombs,
            isRunning: holihopeProgress.ed_units_is_running || false,
            lastUpdatedAt: holihopeProgress.ed_units_last_updated_at ? new Date(holihopeProgress.ed_units_last_updated_at) : null,
          });
          
          // Auto-complete Step 12 in UI if data shows it's done
          if (isCompleted && !holihopeProgress.ed_units_is_running) {
            setSteps((prev) =>
              prev.map((s) =>
                s.id === 'ed_units'
                  ? {
                      ...s,
                      status: 'completed',
                      message: `Шаг 12 завершён. Импортировано: ${holihopeProgress.ed_units_total_imported || 0}`,
                    }
                  : s
              )
            );
          }
          
          // 5) Get ed_unit_students progress
          if (holihopeProgress.ed_unit_students_skip !== undefined) {
            setEdUnitStudentsProgress({
              skip: holihopeProgress.ed_unit_students_skip || 0,
              totalImported: holihopeProgress.ed_unit_students_total_imported || 0,
              isRunning: holihopeProgress.ed_unit_students_is_running || false,
              lastUpdatedAt: holihopeProgress.ed_unit_students_last_updated_at 
                ? new Date(holihopeProgress.ed_unit_students_last_updated_at) 
                : null,
            });
            
            // Update step 13 count only (message will be shown in dedicated progress card)
            if ((holihopeProgress.ed_unit_students_total_imported || 0) > 0) {
              setSteps((prev) =>
                prev.map((s) =>
                  s.id === 'ed_unit_students'
                    ? {
                        ...s,
                        count: holihopeProgress.ed_unit_students_total_imported || 0,
                        // Don't set message here - avoid duplicate display with count
                      }
                    : s
                )
              );
            }
          }
        }
      } catch (error) {
        console.error('Error polling progress:', error);
        // Backoff on error
        setPollInterval(prev => Math.min(prev * 2, 60000));
      }
    };

    // Load immediately
    pollProgress();

    let intervalId: NodeJS.Timeout;

    const startPolling = () => {
      if (document.visibilityState === 'visible') {
        intervalId = setInterval(pollProgress, pollInterval);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pollProgress();
        startPolling();
      } else {
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

  // Emergency stop via URL param: /holihope-import?stop_salebot=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stop_salebot') === '1') {
      (async () => {
        try {
          setChatImportStatus('Останавливаю импорт Salebot...');
          const { data: progress } = await supabase
            .from('salebot_import_progress')
            .select('id')
            .limit(1)
            .single();
          if (progress?.id) {
            await supabase
              .from('salebot_import_progress')
              .update({ is_running: false })
              .eq('id', progress.id);
            setIsImportingChats(false);
            toast({ title: 'Импорт остановлен', description: 'Импорт Salebot принудительно остановлен' });
          }
        } catch (e) {
          console.error('Не удалось остановить импорт:', e);
        }
      })();
    }
  }, []);


  const formatElapsedTime = (startTime: Date) => {
    const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isTransientInvokeError = (err: any) => {
    const msg = String(err?.message || err || '');
    return (
      msg.includes('Failed to send a request to the Edge Function') ||
      msg.includes('fetch failed') ||
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('Load failed') ||
      msg.includes('REQUEST_TIMEOUT')
    );
  };

  const executeStep = async (step: ImportStep, batchParams?: any) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === step.id ? { ...s, status: 'in_progress' } : s))
    );

    try {
      const body: any = { action: step.action, ...(batchParams || {}) };

      // Step 12 is long-running (many batches); give it more headroom.
      const timeoutMs = body.action === 'import_ed_units' ? 120_000 : 60_000;

      const invokePromise = supabase.functions.invoke('import-holihope', {
        body,
        headers: {
          'Content-Type': 'application/json',
          'x-action': body.action,
        },
      });

      const result = (await Promise.race([
        invokePromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), timeoutMs)
        ),
      ])) as any;

      const { data, error } = result || {};
      if (error) throw error;

      // Check if edge function returned "already running" response
      if (data?.alreadyRunning) {
        return { 
          success: false, 
          alreadyRunning: true, 
          lastUpdatedSecondsAgo: data.lastUpdatedSecondsAgo 
        };
      }

      const progress = data?.progress?.[0];
      const nextBatch = data?.nextBatch;
      const stats = data?.stats;

      setSteps((prev) =>
        prev.map((s) =>
          s.id === step.id
            ? {
                ...s,
                status: progress?.status || 'completed',
                count: progress?.count || stats?.totalImported,
                message: progress?.message,
                error: progress?.error,
              }
            : s
        )
      );

      if (progress?.status === 'error') {
        throw new Error(progress.error || 'Ошибка импорта');
      }

      return { success: true, progress, nextBatch, stats };
    } catch (error: any) {
      const transient = isTransientInvokeError(error);
      const isTimeout = error.message === 'REQUEST_TIMEOUT';
      console.error(`Error in step ${step.id}:`, error);

      if (isTimeout) {
        // Timeout - but import continues on server
        setSteps((prev) =>
          prev.map((s) =>
            s.id === step.id
              ? {
                  ...s,
                  status: 'in_progress',
                  message: '⏳ Соединение прервано, но импорт продолжается на сервере...',
                }
              : s
          )
        );
        return { success: false, timeout: true };
      }

      if (transient) {
        // Do NOT mark the step as failed: we'll auto-retry in the calling loop.
        setSteps((prev) =>
          prev.map((s) =>
            s.id === step.id
              ? {
                  ...s,
                  status: 'in_progress',
                  message:
                    '⏳ Связь с Edge Function прервалась — продолжаю автоматически…',
                }
              : s
          )
        );
        return { success: false, transient: true };
      }

      setSteps((prev) =>
        prev.map((s) =>
          s.id === step.id ? { ...s, status: 'error', error: error.message } : s
        )
      );

      toast({
        title: 'Ошибка',
        description: error.message || `Ошибка на шаге "${step.name}"`,
        variant: 'destructive',
      });

      return { success: false };
    }
  };

  const runFullImport = async () => {
    setIsImporting(true);
    setShouldStopImport(false);

    try {
      for (const step of steps) {
        // Check if user requested to stop
        if (shouldStopImport) {
          toast({
            title: 'Импорт остановлен',
            description: 'Импорт был остановлен пользователем',
            variant: 'default',
          });
          break;
        }
        
        // For leads/students/ed_unit_students, use batch mode with skip
        if (step.action === 'import_leads' || step.action === 'import_students' || step.action === 'import_ed_unit_students') {
          let skip = 0;
          let totalImported = 0;
          let hasMore = true;
          
          while (hasMore && !shouldStopImport) {
            const result = await executeStep(step, { skip, batch_mode: true, max_batches: 1 });
            
            if (!result.success) break;
            
            const progress = result.progress;
            totalImported += progress?.count || 0;
            hasMore = progress?.hasMore || false;
            skip = progress?.nextSkip || skip + 100;
            
            setSteps((prev) =>
              prev.map((s) =>
                s.id === step.id
                  ? {
                      ...s,
                      count: totalImported,
                      message: `Импортировано ${totalImported} записей${hasMore ? ' (продолжается...)' : ''}`,
                    }
                  : s
              )
            );
          }
          
          if (!hasMore) {
            setSteps((prev) =>
              prev.map((s) =>
                s.id === step.id ? { ...s, status: 'completed' } : s
              )
            );
          }
        }
        // For ed_units: start once and let server auto-continue
        else if (step.action === 'import_ed_units') {
          const batchParams = { 
            batch_size: 2,
            office_index: 0,
            status_index: 0,
            time_index: 0,
            full_history: true
          };
          
          console.log('Starting ed_units import with auto-continue on server...', batchParams);
          const result = await executeStep(step, batchParams) as any;
          console.log('Initial batch result:', result);
          
          if (!result.success) {
            // Check if already running - that's OK, just poll for progress
            if (result.alreadyRunning) {
              console.log('Ed units import already running, switching to poll mode');
              toast({
                title: 'Импорт уже выполняется',
                description: 'Шаг 12 уже запущен на сервере. Прогресс обновляется автоматически.',
              });
              setPollInterval(3000);
            } else {
              console.error('Failed to start ed_units import');
            }
          } else {
            const progress = result.progress;
            const stats = result.stats;
            const hasMore = progress?.hasMore || false;
            
            setSteps((prev) =>
              prev.map((s) =>
                s.id === step.id
                  ? {
                      ...s,
                      count: stats?.totalImported || 0,
                      message: hasMore 
                        ? `Запущен. Импорт продолжается автоматически на сервере...`
                        : `Завершён. Импортировано: ${stats?.totalImported || 0}`,
                      status: hasMore ? 'in_progress' : 'completed',
                    }
                  : s
              )
            );
            
            if (hasMore && result.autoContinue) {
              // Server will auto-continue - wait for completion by polling
              toast({
                title: 'Импорт запущен',
                description: 'Шаг 12 продолжается автоматически на сервере. Дождитесь завершения перед следующим шагом.',
              });
              setPollInterval(3000);
              
              // Wait for step 12 to complete before moving to step 13
              // Poll until isRunning=false and officeIndex >= officeCount
              let waitAttempts = 0;
              const maxWaitAttempts = 600; // ~30 minutes with 3s interval
              
              while (waitAttempts < maxWaitAttempts && !shouldStopImport) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                waitAttempts++;
                
                const { data: holihopeProgress } = await supabase
                  .from('holihope_import_progress')
                  .select('ed_units_office_index, ed_units_is_running, ed_units_total_combinations, ed_units_total_imported')
                  .order('updated_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();
                
                if (holihopeProgress) {
                  const totalCombs = holihopeProgress.ed_units_total_combinations || 1615;
                  const officeCount = Math.max(1, Math.round(totalCombs / (5 * 17)));
                  const isCompleted = (holihopeProgress.ed_units_office_index || 0) >= officeCount;
                  
                  if (isCompleted && !holihopeProgress.ed_units_is_running) {
                    console.log('Step 12 completed, proceeding to next step');
                    setSteps((prev) =>
                      prev.map((s) =>
                        s.id === step.id
                          ? {
                              ...s,
                              count: holihopeProgress.ed_units_total_imported || 0,
                              message: `Завершён. Импортировано: ${holihopeProgress.ed_units_total_imported || 0}`,
                              status: 'completed',
                            }
                          : s
                      )
                    );
                    break;
                  }
                }
                
                // Update UI every 10 attempts
                if (waitAttempts % 10 === 0) {
                  console.log(`Still waiting for step 12 to complete... (attempt ${waitAttempts})`);
                }
              }
              
              if (waitAttempts >= maxWaitAttempts) {
                toast({
                  title: 'Таймаут ожидания',
                  description: 'Шаг 12 всё ещё выполняется. Продолжите полный импорт позже.',
                  variant: 'destructive',
                });
              }
            }
          }
        }
        else {
          const result = await executeStep(step);
          if (!result.success) break;
        }
        
        // Small delay between steps
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (!shouldStopImport) {
        toast({
          title: 'Импорт завершен',
          description: 'Все данные успешно импортированы из Holihope',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка импорта',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      setShouldStopImport(false);
    }
  };

  const runSingleStep = async (step: ImportStep) => {
    setIsImporting(true);
    setShouldStopImport(false);
    
    // For leads/students/ed_unit_students, use batch mode with skip
    if (step.action === 'import_leads' || step.action === 'import_students' || step.action === 'import_ed_unit_students') {
      let skip = 0;
      let totalImported = 0;
      let hasMore = true;
      
      // For ed_unit_students, check if there's saved progress to resume from
      if (step.action === 'import_ed_unit_students') {
        try {
          const { data: savedProgress } = await supabase
            .from('holihope_import_progress')
            .select('ed_unit_students_skip, ed_unit_students_total_imported')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (savedProgress && savedProgress.ed_unit_students_skip > 0) {
            skip = savedProgress.ed_unit_students_skip;
            totalImported = savedProgress.ed_unit_students_total_imported || 0;
            console.log(`📌 Resuming ed_unit_students from skip=${skip}, totalImported=${totalImported}`);
            toast({
              title: 'Продолжение импорта',
              description: `Возобновляем с позиции ${skip}, уже импортировано: ${totalImported}`,
            });
          }
        } catch (e) {
          console.error('Error checking saved progress:', e);
        }
      }
      
      while (hasMore && !shouldStopImport) {
        const result = await executeStep(step, { skip, batch_mode: true, max_batches: 1 });
        
        if (!result.success) break;
        
        const progress = result.progress;
        totalImported += progress?.count || 0;
        hasMore = progress?.hasMore || false;
        skip = progress?.nextSkip || skip + 100;
        
        // Update UI with cumulative progress
        setSteps((prev) =>
          prev.map((s) =>
            s.id === step.id
              ? {
                  ...s,
                  count: totalImported,
                  message: `Импортировано ${totalImported} записей${hasMore ? ' (продолжается...)' : ''}`,
                }
              : s
          )
        );
        
        if (!hasMore) {
          toast({
            title: 'Успешно',
            description: `${step.name} завершен. Всего импортировано: ${totalImported}`,
          });
          
          setSteps((prev) =>
            prev.map((s) =>
              s.id === step.id ? { ...s, status: 'completed' } : s
            )
          );
        }
      }
    }
    // For ed_units, use simplified approach - server auto-continues via EdgeRuntime.waitUntil
    else if (step.action === 'import_ed_units') {
      const batchParams = { 
        batch_size: 2,
        office_index: 0,
        status_index: 0,
        time_index: 0,
        full_history: true
      };
      
      try {
        console.log('Starting ed_units import with auto-continue on server...', batchParams);
        const result = await executeStep(step, batchParams) as any;
        console.log('Initial batch result:', result);
        
        if (!result.success) {
          toast({
            title: 'Ошибка запуска импорта',
            description: result.message || 'Не удалось запустить импорт',
            variant: 'destructive',
          });
          setIsImporting(false);
          setShouldStopImport(false);
          return;
        }
        
        const progress = result.progress;
        const stats = result.stats;
        const hasMore = progress?.hasMore || false;
        const progressPercent = stats?.progressPercentage || 0;
        const currentPos = stats?.currentPosition || 0;
        const totalCombs = stats?.totalCombinations || 1615;
        const totalImported = stats?.totalImported || 0;
        
        setSteps((prev) =>
          prev.map((s) =>
            s.id === step.id
              ? {
                  ...s,
                  count: totalImported,
                  message: `Обработано ${currentPos}/${totalCombs} комбинаций (${progressPercent}%). Импортировано: ${totalImported} единиц.`,
                  status: hasMore ? 'in_progress' : 'completed',
                }
              : s
          )
        );
        
        if (hasMore && result.autoContinue) {
          // Server will auto-continue - switch to polling mode
          toast({
            title: 'Импорт запущен',
            description: 'Импорт продолжается автоматически на сервере. Прогресс обновляется в реальном времени.',
          });
          // Speed up polling to see progress updates
          setPollInterval(3000);
        } else if (!hasMore) {
          toast({
            title: 'Успешно',
            description: `${step.name} завершен. Всего импортировано: ${totalImported}`,
          });
        }
      } catch (error) {
        console.error('Error starting ed_units import:', error);
        toast({
          title: 'Ошибка импорта',
          description: error instanceof Error ? error.message : 'Неизвестная ошибка',
          variant: 'destructive',
        });
      }
    } else {
      const result = await executeStep(step);
      if (result.success) {
        toast({
          title: 'Успешно',
          description: result.progress?.message || `${step.name} завершен`,
        });
      }
    }
    
    if (shouldStopImport) {
      toast({
        title: 'Импорт остановлен',
        description: `${step.name} был остановлен пользователем`,
        variant: 'default',
      });
    }
    
    setIsImporting(false);
    setShouldStopImport(false);
  };

  // Resume ed_units import from saved progress in DB
  const resumeEdUnitsImport = async () => {
    if (!edUnitsProgress || edUnitsProgress.officeIndex === 0 && edUnitsProgress.statusIndex === 0 && edUnitsProgress.timeIndex === 0) {
      toast({
        title: 'Нет сохранённого прогресса',
        description: 'Начните импорт шага 12 с начала',
        variant: 'destructive',
      });
      return;
    }
    
    const step = steps.find(s => s.id === 'ed_units');
    if (!step) return;
    
    setIsImporting(true);
    setShouldStopImport(false);
    
    // Only reset is_running flag if import is TRULY stale (> 3 minutes without update)
    try {
      const { data: holihopeProgress } = await supabase
        .from('holihope_import_progress')
        .select('id, ed_units_is_running, ed_units_last_updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (holihopeProgress?.id && holihopeProgress?.ed_units_is_running) {
        const lastUpdate = holihopeProgress.ed_units_last_updated_at 
          ? new Date(holihopeProgress.ed_units_last_updated_at)
          : null;
        const secondsSinceUpdate = lastUpdate 
          ? (Date.now() - lastUpdate.getTime()) / 1000 
          : Infinity;
        
        // Only reset if truly stale (> 3 minutes) - lowered from 10 for faster recovery
        if (secondsSinceUpdate > 180) {
          console.log(`Import stale for ${secondsSinceUpdate}s, resetting is_running flag`);
          await supabase
            .from('holihope_import_progress')
            .update({ ed_units_is_running: false })
            .eq('id', holihopeProgress.id);
        } else {
          // Import is still active - don't reset, let edge function handle "already running"
          console.log(`Import still active (${secondsSinceUpdate}s since last update), not resetting flag`);
        }
      }
    } catch (e) {
      console.error('Failed to check/reset is_running flag:', e);
    }
    
    toast({
      title: 'Продолжение импорта учебных единиц',
      description: `Возобновление с office=${edUnitsProgress.officeIndex}, status=${edUnitsProgress.statusIndex}, time=${edUnitsProgress.timeIndex}`,
    });
    
    const batchParams = { 
      batch_size: 2,
      resume: true, // Tell edge function to load progress from DB
      full_history: true
    };
    
    try {
      console.log('Resuming ed_units import with auto-continue on server...');
      const result = await executeStep(step, batchParams) as any;
      console.log('Resume batch result:', result);
      
      if (!result.success) {
        // Check if this is "already running" response
        if (result.alreadyRunning) {
          toast({
            title: 'Импорт уже выполняется',
            description: `Другой процесс импорта активен. Последнее обновление ${result.lastUpdatedSecondsAgo || '?'} сек назад. Прогресс будет обновляться автоматически.`,
            variant: 'default',
          });
          // Speed up polling to track progress
          setPollInterval(3000);
          setIsImporting(false);
          setShouldStopImport(false);
          return;
        }
        
        toast({
          title: 'Ошибка возобновления импорта',
          description: result.message || 'Не удалось возобновить импорт',
          variant: 'destructive',
        });
        setIsImporting(false);
        setShouldStopImport(false);
        return;
      }
      
      const progress = result.progress;
      const stats = result.stats;
      const totalImported = stats?.totalImported || edUnitsProgress.totalImported;
      const hasMore = progress?.hasMore || false;
      const progressPercent = stats?.progressPercentage || 0;
      const currentPos = stats?.currentPosition || 0;
      const totalCombs = stats?.totalCombinations || 1615;
      
      setSteps((prev) =>
        prev.map((s) =>
          s.id === step.id
            ? {
                ...s,
                count: totalImported,
                message: `Обработано ${currentPos}/${totalCombs} комбинаций (${progressPercent}%). Импортировано: ${totalImported} единиц.`,
                status: hasMore ? 'in_progress' : 'completed',
              }
            : s
        )
      );
      
      if (hasMore && result.autoContinue) {
        // Server will auto-continue - switch to polling mode
        toast({
          title: 'Импорт возобновлён',
          description: 'Импорт продолжается автоматически на сервере. Прогресс обновляется в реальном времени.',
        });
        // Speed up polling to see progress updates
        setPollInterval(3000);
      } else if (!hasMore) {
        toast({
          title: 'Успешно',
          description: `Шаг 12 завершен. Всего импортировано: ${totalImported}`,
        });
      }
    } catch (error) {
      console.error('Error resuming ed_units import:', error);
      toast({
        title: 'Ошибка возобновления',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
        variant: 'destructive',
      });
    }
    
    setIsImporting(false);
    setShouldStopImport(false);
  };

  const deleteEdUnitsAndSchedule = async () => {
    if (!confirm('⚠️ ВНИМАНИЕ! Это действие удалит:\n\n• Все учебные единицы (группы, индивидуальные)\n• Все занятия и расписание\n• Связи ученик-группа\n\nЭто действие НЕОБРАТИМО!\n\nВы уверены?')) {
      return;
    }

    setIsDeletingEdUnits(true);
    toast({
      title: 'Начинаю удаление учебных единиц и расписания...',
      description: 'Удаление групп, занятий и расписания',
    });

    try {
      const { data, error } = await supabase.functions.invoke('import-holihope', {
        body: JSON.stringify({ action: 'delete_ed_units_and_schedule' }),
        headers: { 'Content-Type': 'application/json', 'x-action': 'delete_ed_units_and_schedule' },
      });

      if (error) throw error;

      toast({
        title: 'Удаление завершено!',
        description: `Удалено: ${data.stats?.learningGroups || 0} групп, ${data.stats?.individualLessons || 0} индивидуальных уроков, ${data.stats?.lessonSessions || 0} занятий, ${data.stats?.studentLessonSessions || 0} студенческих сессий`,
      });
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: 'Ошибка удаления',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeletingEdUnits(false);
    }
  };

  const clearAllData = async () => {
    if (!confirm('⚠️ ВНИМАНИЕ! Это действие удалит ВСЕ данные:\n\n• Всех учеников\n• Всех клиентов\n• Все семейные группы и связи\n• Всех лидов\n• Все связанные данные\n\nЭто действие НЕОБРАТИМО!\n\nВы уверены?')) {
      return;
    }

    setIsClearing(true);
    toast({
      title: 'Начинаю полную очистку данных...',
      description: 'Удаление всех студентов, клиентов и связей',
    });

    try {
      const { data, error } = await supabase.functions.invoke('import-holihope', {
        body: JSON.stringify({ action: 'delete_all_data' }),
        headers: { 'Content-Type': 'application/json', 'x-action': 'delete_all_data' },
      });

      if (error) throw error;

      toast({
        title: 'Очистка завершена!',
        description: `Удалено: ${data.stats?.students || 0} учеников, ${data.stats?.clients || 0} клиентов, ${data.stats?.familyGroups || 0} семейных групп, ${data.stats?.leads || 0} лидов`,
      });
    } catch (error: any) {
      console.error('Clear error:', error);
      toast({
        title: 'Ошибка очистки',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsClearing(false);
    }
  };

  const previewStep = async (step: ImportStep) => {
    const previewAction = step.action.replace('import_', 'preview_');
    
    try {
      const { data, error } = await supabase.functions.invoke('import-holihope', {
        body: JSON.stringify({ action: previewAction }),
        headers: { 'Content-Type': 'application/json', 'x-action': previewAction },
      });

      if (error) throw error;

      console.log('Preview data:', data);
      toast({
        title: `Preview: ${step.name}`,
        description: `Будет импортировано ${data.total || 0} записей. См. консоль для деталей.`,
      });
      
    } catch (error: any) {
      console.error('Preview error:', error);
      toast({
        title: 'Ошибка предпросмотра',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // useEffect(() => {
  //   let intervalId: NodeJS.Timeout;

  //   const pollImportProgress = async () => {
  //     const { data } = await supabase
  //       .from('salebot_import_progress')
  //       .select('*')
  //       .limit(1)
  //       .single();
      
  //     if (data) {
  //       setImportProgress({
  //         totalClientsProcessed: data.total_clients_processed || 0,
  //         totalImported: data.total_imported || 0,
  //         totalMessagesImported: data.total_messages_imported || 0,
  //         currentOffset: data.current_offset || 0,
  //         startTime: data.start_time ? new Date(data.start_time) : null,
  //         isRunning: data.is_running || false
  //       });

  //       // Stop polling if import finished
  //       if (!data.is_running && isImportingChats) {
  //         setIsImportingChats(false);
  //         setChatImportStatus("Импорт завершен");
  //       }
  //     }
  //   };

  //   if (isImportingChats) {
  //     // Initial fetch
  //     pollImportProgress();
  //     // Poll every 2 seconds
  //     intervalId = setInterval(pollImportProgress, 2000);
  //   }

  //   return () => {
  //     if (intervalId) {
  //       clearInterval(intervalId);
  //     }
  //   };
  // }, [isImportingChats]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'in_progress':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Импорт из Holihope</h1>
          <p className="text-muted-foreground mt-2">
            Полный импорт данных из CRM Holihope в текущую систему
          </p>
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Важно! Сначала очистите данные</AlertTitle>
            <AlertDescription>
              Перед импортом необходимо удалить всех существующих учеников, клиентов и семейные связи, 
              иначе могут возникнуть дубли и конфликты данных.
            </AlertDescription>
          </Alert>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={deleteEdUnitsAndSchedule}
            disabled={isImporting || isDeletingEdUnits || isClearing}
            variant="outline"
            className="border-orange-500 text-orange-600 hover:bg-orange-50"
            size="lg"
          >
            {isDeletingEdUnits ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Удаление...
              </>
            ) : (
              '🗑️ Удалить учебные единицы + расписание'
            )}
          </Button>
          <Button
            onClick={clearAllData}
            disabled={isImporting || isClearing || isDeletingEdUnits}
            variant="destructive"
            size="lg"
          >
            {isClearing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Очистка...
              </>
            ) : (
              '🗑️ Очистить все данные'
            )}
          </Button>
          {isImporting && (
            <Button
              onClick={() => setShouldStopImport(true)}
              disabled={shouldStopImport}
              variant="destructive"
              size="lg"
            >
              {shouldStopImport ? 'Остановка...' : 'Остановить импорт'}
            </Button>
          )}
          <Button
            onClick={runFullImport}
            disabled={isImporting || isClearing}
            size="lg"
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Импорт...
              </>
            ) : (
              'Запустить полный импорт'
            )}
          </Button>
        </div>
      </div>

      {/* API Usage Card */}
      {apiUsage && (
        <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-base">
              📊 Лимит API Salebot (сегодня)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Использовано: <strong>{apiUsage.used}</strong> / {apiUsage.limit}</span>
                <span className={apiUsage.remaining < 500 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                  Осталось: {apiUsage.remaining}
                </span>
              </div>
              <Progress value={(apiUsage.used / apiUsage.limit) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                ~{Math.floor(apiUsage.remaining / 11)} клиентов можно импортировать сегодня (11 API запросов на клиента)
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ed Units Progress Card */}
      {edUnitsProgress && (edUnitsProgress.officeIndex > 0 || edUnitsProgress.statusIndex > 0 || edUnitsProgress.timeIndex > 0 || edUnitsProgress.totalImported > 0) && (
        <Card className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-base">
              📚 Прогресс импорта учебных единиц (Шаг 12)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(() => {
                    const secondsAgo = edUnitsProgress.lastUpdatedAt 
                      ? Math.floor((Date.now() - edUnitsProgress.lastUpdatedAt.getTime()) / 1000)
                      : null;
                    // Active: updated within 60 seconds
                    const isActive = secondsAgo !== null && secondsAgo < 60;
                    // Heavy processing: 1-3 minutes without update (upserts in progress)
                    const isHeavyProcessing = secondsAgo !== null && secondsAgo >= 60 && secondsAgo < 180;
                    // Stale: no update for > 3 minutes (lowered from 5 for faster detection)
                    const isStale = secondsAgo !== null && secondsAgo >= 180;
                    
                    if (edUnitsProgress.isRunning && isActive) {
                      return (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400">
                          <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                          Активен ({secondsAgo}с назад)
                        </span>
                      );
                    } else if (edUnitsProgress.isRunning && isHeavyProcessing) {
                      return (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                          <span className="h-2 w-2 bg-amber-400 rounded-full animate-pulse"></span>
                          Тяжёлая обработка ({secondsAgo}с назад)
                        </span>
                      );
                    } else if (edUnitsProgress.isRunning && isStale) {
                      return (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                          <span className="h-2 w-2 bg-red-500 rounded-full"></span>
                          Завис (нет ответа {secondsAgo}с)
                        </span>
                      );
                    } else if (edUnitsProgress.isRunning) {
                      return (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                          <span className="h-2 w-2 bg-amber-400 rounded-full animate-pulse"></span>
                          Ожидание ({secondsAgo}с назад)
                        </span>
                      );
                    } else {
                      return (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                          <span className="h-2 w-2 bg-gray-400 rounded-full"></span>
                          Остановлен
                        </span>
                      );
                    }
                  })()}
                </div>
                {edUnitsProgress.lastUpdatedAt && (
                  <span className="text-xs text-muted-foreground">
                    {edUnitsProgress.lastUpdatedAt.toLocaleTimeString()}
                  </span>
                )}
              </div>
              
              {(() => {
                // Calculate officeCount dynamically from totalCombinations
                const officeCount = Math.max(1, Math.round(edUnitsProgress.totalCombinations / (5 * 17)));
                const isCompleted = edUnitsProgress.officeIndex >= officeCount;
                
                return (
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div className="p-2 bg-white/60 dark:bg-gray-800/60 rounded">
                      <div className="text-xs text-muted-foreground">Офис</div>
                      <div className="font-semibold">
                        {isCompleted 
                          ? <span className="text-green-600">✓ Все ({officeCount})</span>
                          : `${edUnitsProgress.officeIndex + 1} / ${officeCount}`
                        }
                      </div>
                    </div>
                    <div className="p-2 bg-white/60 dark:bg-gray-800/60 rounded">
                      <div className="text-xs text-muted-foreground">Статус</div>
                      <div className="font-semibold">
                        {isCompleted 
                          ? <span className="text-green-600">—</span>
                          : (['Reserve', 'Forming', 'Working', 'Stopped', 'Finished'][edUnitsProgress.statusIndex] || '?')
                        }
                      </div>
                    </div>
                    <div className="p-2 bg-white/60 dark:bg-gray-800/60 rounded">
                      <div className="text-xs text-muted-foreground">Время</div>
                      <div className="font-semibold">
                        {isCompleted 
                          ? <span className="text-green-600">—</span>
                          : `${6 + edUnitsProgress.timeIndex}:00`
                        }
                      </div>
                    </div>
                    <div className="p-2 bg-white/60 dark:bg-gray-800/60 rounded">
                      <div className="text-xs text-muted-foreground">Импортировано</div>
                      <div className="font-semibold text-blue-600">{edUnitsProgress.totalImported}</div>
                    </div>
                  </div>
                );
              })()}
              
              {(() => {
                const officeCount = Math.max(1, Math.round(edUnitsProgress.totalCombinations / (5 * 17)));
                const isCompleted = edUnitsProgress.officeIndex >= officeCount;
                
                const currentPosition = isCompleted 
                  ? edUnitsProgress.totalCombinations 
                  : Math.min(
                      edUnitsProgress.officeIndex * 5 * 17 + 
                      edUnitsProgress.statusIndex * 17 + 
                      edUnitsProgress.timeIndex,
                      edUnitsProgress.totalCombinations
                    );
                const progress = Math.min(100, Math.round((currentPosition / edUnitsProgress.totalCombinations) * 100));
                
                return (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>
                        {isCompleted 
                          ? <span className="text-green-600 font-semibold">✓ Завершено</span>
                          : `Комбинаций: ${currentPosition} / ${edUnitsProgress.totalCombinations}`
                        }
                      </span>
                      <span className="font-semibold">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                );
              })()}
              
              {(() => {
                // Detect stale import: is_running=true but last_updated_at is older than 3 minutes
                const isStale = edUnitsProgress.isRunning &&
                  edUnitsProgress.lastUpdatedAt &&
                  (Date.now() - edUnitsProgress.lastUpdatedAt.getTime()) > 3 * 60 * 1000;

                const officeCount = Math.max(1, Math.round(edUnitsProgress.totalCombinations / (5 * 17)));
                const isCompleted = edUnitsProgress.officeIndex >= officeCount;

                const showResumeButton = isStale || (!edUnitsProgress.isRunning && !isCompleted);
                const showResetButton = !isCompleted; // allow reset even while running

                const handleResetStep12 = async () => {
                  if (!confirm('Сбросить прогресс Шага 12 и начать сначала? Все индексы будут обнулены.')) return;

                  try {
                    const { data: progressRow, error: progressRowError } = await supabase
                      .from('holihope_import_progress')
                      .select('organization_id')
                      .order('updated_at', { ascending: false })
                      .limit(1)
                      .maybeSingle();

                    if (progressRowError) throw progressRowError;
                    if (!progressRow?.organization_id) {
                      throw new Error('Не удалось определить организацию для сброса прогресса');
                    }

                    const { error: resetError } = await supabase
                      .from('holihope_import_progress')
                      .update({
                        ed_units_office_index: 0,
                        ed_units_status_index: 0,
                        ed_units_time_index: 0,
                        ed_units_total_imported: 0,
                        ed_units_total_combinations: 0,
                        ed_units_is_running: false,
                        ed_units_last_updated_at: null,
                      })
                      .eq('organization_id', progressRow.organization_id);

                    if (resetError) throw resetError;

                    setEdUnitsProgress(null);
                    setSteps((prev) =>
                      prev.map((s) =>
                        s.id === 'ed_units'
                          ? { ...s, status: 'pending', message: undefined, count: undefined }
                          : s
                      )
                    );

                    toast({ title: 'Прогресс сброшен', description: 'Шаг 12 можно запустить заново' });
                  } catch (e: any) {
                    toast({
                      title: 'Не удалось сбросить прогресс',
                      description: e?.message ?? 'Ошибка при сбросе прогресса шага 12',
                      variant: 'destructive',
                    });
                  }
                };

                if (showResumeButton || showResetButton) {
                  return (
                    <div className="flex flex-wrap gap-2">
                      {showResumeButton && (
                        <Button
                          onClick={resumeEdUnitsImport}
                          disabled={isImporting || isClearing}
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                          🔄 {isStale ? 'Продолжить (завис)' : 'Продолжить'}
                        </Button>
                      )}

                      {showResetButton && (
                        <Button
                          variant="destructive"
                          onClick={handleResetStep12}
                          disabled={isClearing}
                          className="whitespace-nowrap"
                        >
                          ⟲ Сбросить
                        </Button>
                      )}
                    </div>
                  );
                }

                // Show completion message if completed
                if (isCompleted && !edUnitsProgress.isRunning) {
                  return (
                    <div className="text-center py-2 text-green-600 font-medium">
                      ✓ Шаг 12 полностью завершён
                    </div>
                  );
                }

                return null;
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ed Unit Students Progress Card (Step 13) */}
      {edUnitStudentsProgress && edUnitStudentsProgress.totalImported > 0 && (
        <Card className="border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300 text-base">
              🔗 Прогресс связок ученик-группа (Шаг 13)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(() => {
                    const secondsAgo = edUnitStudentsProgress.lastUpdatedAt 
                      ? Math.floor((Date.now() - edUnitStudentsProgress.lastUpdatedAt.getTime()) / 1000)
                      : null;
                    const isActive = secondsAgo !== null && secondsAgo < 60;
                    const isStale = secondsAgo !== null && secondsAgo >= 180;
                    
                    if (edUnitStudentsProgress.isRunning && isActive) {
                      return (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400">
                          <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                          Активен ({secondsAgo}с назад)
                        </span>
                      );
                    } else if (edUnitStudentsProgress.isRunning && isStale) {
                      return (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                          <span className="h-2 w-2 bg-red-500 rounded-full"></span>
                          Завис (нет ответа {secondsAgo}с)
                        </span>
                      );
                    } else if (edUnitStudentsProgress.isRunning) {
                      return (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                          <span className="h-2 w-2 bg-amber-400 rounded-full animate-pulse"></span>
                          Выполняется ({secondsAgo}с назад)
                        </span>
                      );
                    } else {
                      return (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                          <span className="h-2 w-2 bg-gray-400 rounded-full"></span>
                          Остановлен
                        </span>
                      );
                    }
                  })()}
                </div>
                {edUnitStudentsProgress.lastUpdatedAt && (
                  <span className="text-xs text-muted-foreground">
                    {edUnitStudentsProgress.lastUpdatedAt.toLocaleTimeString()}
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2 bg-white/60 dark:bg-gray-800/60 rounded">
                  <div className="text-xs text-muted-foreground">Позиция (skip)</div>
                  <div className="font-semibold">{edUnitStudentsProgress.skip}</div>
                </div>
                <div className="p-2 bg-white/60 dark:bg-gray-800/60 rounded">
                  <div className="text-xs text-muted-foreground">Импортировано</div>
                  <div className="font-semibold text-orange-600">{edUnitStudentsProgress.totalImported}</div>
                </div>
              </div>
              
              <div className="flex gap-2">
                {!edUnitStudentsProgress.isRunning && (
                  <>
                    <Button
                      onClick={() => {
                        const step = steps.find(s => s.id === 'ed_unit_students');
                        if (step) runSingleStep(step);
                      }}
                      disabled={isImporting}
                      className="flex-1 bg-orange-600 hover:bg-orange-700"
                    >
                      🔄 Продолжить с позиции {edUnitStudentsProgress.skip}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (!confirm('Сбросить прогресс Шага 13 и начать сначала?')) return;
                        await supabase
                          .from('holihope_import_progress')
                          .update({
                            ed_unit_students_skip: 0,
                            ed_unit_students_total_imported: 0,
                            ed_unit_students_is_running: false
                          })
                          .order('updated_at', { ascending: false })
                          .limit(1);
                        setEdUnitStudentsProgress(null);
                        toast({ title: 'Прогресс сброшен', description: 'Шаг 13 начнётся сначала' });
                      }}
                      disabled={isImporting}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      ⟲ Сбросить
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-purple-500/50 bg-purple-50/50 dark:bg-purple-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
            <MessageSquare className="h-5 w-5" />
            Импорт истории чатов из Salebot
          </CardTitle>
          <CardDescription>
            Перенос всей истории переписки с клиентами из WhatsApp Salebot
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Этот инструмент загружает историю сообщений WhatsApp из платформы Salebot. Вы можете импортировать чаты для всех клиентов или только для клиентов из определенного списка Salebot.
            </p>

            {importProgress && (
              <div className="p-4 bg-gradient-to-r from-purple-100/80 to-pink-100/80 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg border border-purple-300 dark:border-purple-700">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                    Текущий прогресс автоимпорта
                  </h4>
                  <div className="flex items-center gap-2">
                    {importProgress.isRunning ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400">
                        <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                        Запущен
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                        <span className="h-2 w-2 bg-gray-400 rounded-full"></span>
                        Остановлен
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">Клиентов (текущий запуск)</div>
                    <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                      {importProgress.totalClientsProcessed}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">Сообщений (текущий запуск)</div>
                    <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                      {importProgress.totalMessagesImported}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">Сквозной offset (для продолжения)</div>
                    <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                      {importProgress.currentOffset}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-purple-700 dark:text-purple-300">
                  Последний коммит: {importProgress.lastRunAt ? importProgress.lastRunAt.toLocaleString() : '—'}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    onClick={async () => {
                      try {
                        const { error } = await supabase.functions.invoke('salebot-stop');
                        if (error) throw error;
                        toast({
                          title: 'Импорт остановлен',
                          description: 'Автоматический импорт Salebot успешно остановлен',
                        });
                        // Refresh progress
                        const { data } = await supabase
                          .from('salebot_import_progress')
                          .select('*')
                          .order('updated_at', { ascending: false })
                          .limit(1)
                          .single();
                        if (data) {
                          setImportProgress({
                            totalClientsProcessed: data.total_clients_processed || 0,
                            totalImported: data.total_imported || 0,
                            totalMessagesImported: data.total_messages_imported || 0,
                            currentOffset: data.current_offset || 0,
                            startTime: data.start_time ? new Date(data.start_time) : null,
                            lastRunAt: data.last_run_at ? new Date(data.last_run_at) : null,
                            isRunning: data.is_running || false,
                            isPaused: data.is_paused || false
                          });
                        }
                      } catch (error: any) {
                        toast({
                          title: 'Ошибка',
                          description: error.message,
                          variant: 'destructive',
                        });
                      }
                    }}
                    variant="destructive"
                    size="sm"
                    disabled={!importProgress.isRunning}
                  >
                    Остановить автоимпорт
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        setChatImportStatus('Возобновляем импорт...');
                        
                        // Снимаем флаг паузы
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
                        
                        // Запускаем импорт
                        const { error } = await supabase.functions.invoke('import-salebot-chats-auto');
                        if (error) throw error;
                        
                        toast({
                          title: 'Импорт возобновлён',
                          description: 'Автоматический импорт Salebot успешно возобновлён',
                        });
                      } catch (error: any) {
                        toast({
                          title: 'Ошибка',
                          description: error.message,
                          variant: 'destructive',
                        });
                      }
                    }}
                    variant="default"
                    size="sm"
                    disabled={importProgress.isRunning || !importProgress.isPaused}
                  >
                    Возобновить импорт
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        const { data: progress } = await supabase
                          .from('salebot_import_progress')
                          .select('id')
                          .order('last_run_at', { ascending: false })
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
                              is_running: false
                            })
                            .eq('id', progress.id);
                          
                          toast({
                            title: 'Прогресс сброшен',
                            description: 'Счетчики импорта сброшены. Импорт начнется с начала.',
                          });
                          
                          // Refresh progress
                          setImportProgress({
                            totalClientsProcessed: 0,
                            totalImported: 0,
                            totalMessagesImported: 0,
                            currentOffset: 0,
                            startTime: null,
                            lastRunAt: null,
                            isRunning: false,
                            isPaused: false
                          });
                        }
                      } catch (error: any) {
                        toast({
                          title: 'Ошибка',
                          description: error.message,
                          variant: 'destructive',
                        });
                      }
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Сбросить прогресс
                  </Button>
                </div>
              </div>
            )}
            
            {/* Настройки для запуска с нуля (только если импорт не запущен) */}
            {!importProgress?.isRunning && (
              <>
                <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                  <Label htmlFor="salebot-list-id">ID списка Salebot (опционально)</Label>
                  <Input
                    id="salebot-list-id"
                    type="text"
                    placeholder="Например: 740756"
                    value={salebotListId}
                    onChange={(e) => setSalebotListId(e.target.value)}
                    disabled={isImportingChats}
                  />
                  <p className="text-xs text-muted-foreground">
                    Если указан, импорт будет выполнен только для клиентов из этого списка Salebot. 
                    Клиенты, которых нет в базе, будут автоматически созданы.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-offset">Начальный offset</Label>
                    <Input
                      id="start-offset"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={startOffset}
                      onChange={(e) => setStartOffset(e.target.value)}
                      disabled={isImportingChats}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="batch-size">Размер батча</Label>
                    <Input
                      id="batch-size"
                      type="number"
                      min="5"
                      max="100"
                      placeholder="10"
                      value={batchSize}
                      onChange={(e) => setBatchSize(e.target.value)}
                      disabled={isImportingChats}
                    />
                  </div>
                </div>
                
                {isImportingChats && !importProgress?.isRunning && (
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Импорт в процессе...</span>
                      <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                    </div>
                    <Progress value={undefined} className="h-2" />
                    {chatImportStatus && (
                      <p className="text-xs text-muted-foreground animate-pulse">
                        {chatImportStatus}
                      </p>
                    )}
                  </div>
                )}
                <Button
                  onClick={async () => {
                    if (isImportingChats) return;
                    
                    setIsImportingChats(true);
                    
                    // Validate and parse parameters
                    const startOffsetNum = Math.max(0, Number(startOffset) || 0);
                    const batchSizeNum = Math.max(5, Number(batchSize) || 10);
                    
                    let offset = startOffsetNum;
                    let limit = batchSizeNum;
                    let totalImported = 0;
                    let totalClients = 0;
                    let batchCount = 0;
                    
                    const mode = salebotListId ? `список ${salebotListId}` : 'локальные клиенты';
                    setChatImportStatus(`Начинаем импорт чатов (${mode}, offset: ${offset}, limit: ${limit})...`);
                    
                    try {
                      // Update progress table only if listId is set
                      if (salebotListId) {
                        const { data: existingProgress } = await supabase
                          .from('salebot_import_progress')
                          .select('id')
                          .order('last_run_at', { ascending: false })
                          .limit(1)
                          .single();

                        if (existingProgress) {
                          await supabase
                            .from('salebot_import_progress')
                            .update({
                              list_id: salebotListId || null,
                              is_running: false
                            })
                            .eq('id', existingProgress.id);
                        }
                      }
                      
                      while (true) {
                        batchCount++;
                        setChatImportStatus(`Батч ${batchCount} (${mode}, offset: ${offset}, limit: ${limit})...`);
                        
                        // Retry logic with AbortController
                        let retries = 0;
                        const maxRetries = 3;
                        let success = false;
                        let data: any = null;
                        
                        while (retries < maxRetries && !success) {
                          try {
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout
                            
                            const response = await supabase.functions.invoke('import-salebot-chats', {
                              body: { offset, limit },
                              headers: {
                                'Content-Type': 'application/json',
                              },
                            });
                            
                            clearTimeout(timeoutId);
                            
                            if (response.error) {
                              throw new Error(response.error.message || 'Ошибка вызова функции');
                            }
                            
                            data = response.data;
                            success = true;
                            
                          } catch (err: any) {
                            retries++;
                            
                            if (err.name === 'AbortError' || err.message?.includes('FunctionsFetchError') || err.message?.includes('Failed to send')) {
                              if (retries < maxRetries) {
                                const delay = Math.pow(2, retries - 1) * 1000; // 1s, 2s, 4s
                                console.warn(`Retry ${retries}/${maxRetries} after ${delay}ms...`);
                                setChatImportStatus(`Батч ${batchCount} (${mode}) - повтор ${retries}/${maxRetries}...`);
                                await new Promise(resolve => setTimeout(resolve, delay));
                                continue;
                              }
                            }
                            
                            throw err;
                          }
                        }
                        
                        if (!success || !data) {
                          throw new Error('Не удалось выполнить запрос после нескольких попыток');
                        }
                        
                        totalImported += data.totalImported || 0;
                        totalClients += data.totalClients || 0;
                        
                        setChatImportStatus(
                          `Батч ${batchCount} завершен (${mode}). Всего: ${totalImported} сообщений от ${totalClients} клиентов. Следующий offset: ${data.nextOffset}`
                        );
                        
                        if (data.completed) {
                          toast({
                            title: 'Импорт завершен',
                            description: `Всего импортировано ${totalImported} сообщений от ${totalClients} клиентов`,
                          });
                          break;
                        }
                        
                        offset = data.nextOffset || offset + limit;
                        
                        await new Promise(resolve => setTimeout(resolve, 1000));
                      }
                    } catch (error: any) {
                      console.error('Ошибка импорта чатов:', error);
                      toast({
                        title: 'Ошибка импорта чатов',
                        description: error.message,
                        variant: 'destructive',
                      });
                      setChatImportStatus(`Ошибка: ${error.message}`);
                    } finally {
                      setIsImportingChats(false);
                    }
                  }}
                  disabled={isImportingChats || isImporting}
                  className="w-full"
                >
                  {isImportingChats ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Импорт чатов...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Импортировать историю чатов (ручной режим)
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Внимание!</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            <strong>Шаг 1 "Архивация данных"</strong> помечает существующие записи как неактивные, 
            но <strong>НЕ УДАЛЯЕТ</strong> их из базы данных.
          </p>
          <p>
            Все импортированные данные связываются через <code className="px-1 py-0.5 bg-muted rounded">external_id</code> с Holihope. 
            Повторный импорт <strong>обновит</strong> существующие записи, а не создаст дубликаты.
          </p>
        </AlertDescription>
      </Alert>

      <Card className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <AlertCircle className="h-5 w-5" />
            Полный перенос CRM HolliHope
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Реализован <strong>полный перенос всех данных</strong> из CRM HolliHope согласно документации:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Справочники: статусы, дисциплины, уровни, типы обучения</li>
            <li>Сотрудники и преподаватели</li>
            <li>Клиенты с контактными данными</li>
            <li>Лиды и ученики (включая Agents - контактные лица, и ExtraFields - доп.поля)</li>
            <li>Все типы учебных единиц: Group, MiniGroup, Individual, TrialLesson, OpenLesson, Exam, Tour</li>
            <li>Связи ученик-группа и расписание занятий</li>
            <li>Все виды тестов: вступительные, персональные, групповые, онлайн</li>
            <li>Отчеты об успеваемости за все периоды</li>
            <li>Финансы: балансы, транзакции, платежи</li>
            <li>Планы занятий с домашними заданиями и материалами</li>
          </ul>
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded p-3 mt-3">
            <p className="font-medium text-green-800 dark:text-green-200">
              ✅ Все данные связаны между собой через внешние ключи.<br/>
              ✅ Порядок импорта соблюдает зависимости данных.<br/>
              ✅ Поддерживается полное обновление через повторный импорт (UPSERT по external_id).
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {steps.map((step) => (
          <Card key={step.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(step.status)}
                  <div>
                    <CardTitle className="text-lg">{step.name}</CardTitle>
                    <CardDescription>{step.description}</CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  {step.action !== 'clear_data' && (
                    <Button
                      variant="ghost"
                      onClick={() => previewStep(step)}
                      disabled={isImporting}
                      size="sm"
                    >
                      <Eye className="mr-2 h-3 w-3" />
                      Preview
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => runSingleStep(step)}
                    disabled={isImporting}
                    size="sm"
                  >
                    Запустить отдельно
                  </Button>
                </div>
              </div>
            </CardHeader>
            {(step.message || step.error || step.count !== undefined) && (
              <CardContent>
                {step.message && (
                  <p className="text-sm text-muted-foreground">{step.message}</p>
                )}
                {step.count !== undefined && (
                  <p className="text-sm font-medium">Импортировано записей: {step.count}</p>
                )}
                {step.error && (
                  <Alert variant="destructive" className="mt-2">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Ошибка</AlertTitle>
                    <AlertDescription>{step.error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
