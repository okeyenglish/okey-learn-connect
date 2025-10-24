import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

  const executeStep = async (step: ImportStep, batchParams?: any) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === step.id ? { ...s, status: 'in_progress' } : s
      )
    );

    try {
      const body: any = { action: step.action };
      
      // Add batch parameters if provided
      if (batchParams) {
        Object.assign(body, batchParams);
      }
      
      // Set 60 second timeout for edge function calls
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      try {
        const { data, error } = await supabase.functions.invoke('import-holihope', {
          body,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        clearTimeout(timeoutId);
        
        if (error) throw error;

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
      } catch (err: any) {
        clearTimeout(timeoutId);
        
        // If timeout, treat as temporary error and allow retry
        if (err.name === 'AbortError' || err.message?.includes('aborted')) {
          console.warn('Request timeout, but backend continues working. Will retry...');
          throw new Error('Таймаут запроса. Backend продолжает работу. Повтор...');
        }
        
        throw err;
      }
    } catch (error: any) {
      console.error(`Error in step ${step.id}:`, error);
      
      setSteps((prev) =>
        prev.map((s) =>
          s.id === step.id
            ? { ...s, status: 'error', error: error.message }
            : s
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
        // For ed_units, use batch mode with office/status/time indices
        else if (step.action === 'import_ed_units') {
          let totalImported = 0;
          let totalFetched = 0;
          let shouldContinueImport = true;
          let batchParams = { 
            batch_size: 10, // Process 10 requests per batch for faster import
            office_index: 0,
            status_index: 0,
            time_index: 0
          };
          
          while (!shouldStopImport && shouldContinueImport) {
            let retries = 0;
            const maxRetries = 3;
            let batchSuccess = false;
            
            while (retries < maxRetries && !batchSuccess && !shouldStopImport) {
              try {
                console.log(`Executing batch (attempt ${retries + 1}/${maxRetries}) with params:`, batchParams);
                const result = await executeStep(step, batchParams);
                console.log('Batch result:', result);
                
                if (!result.success) {
                  console.error('Batch failed');
                  retries++;
                  if (retries >= maxRetries) {
                    console.error('Max retries reached, stopping');
                    shouldContinueImport = false;
                    break;
                  }
                  console.log(`Retrying in 2 seconds...`);
                  await new Promise((resolve) => setTimeout(resolve, 2000));
                  continue;
                }
                
                batchSuccess = true;
                
                const progress = result.progress;
                const stats = result.stats;
                const nextBatch = result.nextBatch;
                
                totalImported += stats?.totalImported || 0;
                totalFetched += stats?.totalFetched || 0;
                
                const hasMore = progress?.hasMore || false;
                const progressPercent = stats?.progressPercentage || 0;
                const currentPos = stats?.currentPosition || 0;
                const totalCombs = stats?.totalCombinations || 1615;
                
                console.log(`Batch completed: imported=${stats?.totalImported}, fetched=${stats?.totalFetched}, hasMore=${hasMore}, progress=${progressPercent}%`);
                
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
                
                if (!hasMore) {
                  console.log('Import completed, exiting loop');
                  shouldContinueImport = false;
                  break;
                }
                
                // Update batch parameters for next iteration
                if (nextBatch) {
                  batchParams = nextBatch;
                  console.log('Updated batch params for next iteration:', batchParams);
                } else {
                  console.log('No nextBatch provided, stopping');
                  shouldContinueImport = false;
                  break;
                }
                
                // Small delay between batches
                await new Promise((resolve) => setTimeout(resolve, 1000));
              } catch (error) {
                console.error('Error in batch retry loop:', error);
                retries++;
                if (retries >= maxRetries) {
                  toast({
                    title: 'Ошибка в цикле импорта',
                    description: error instanceof Error ? error.message : 'Неизвестная ошибка',
                    variant: 'destructive',
                  });
                  shouldContinueImport = false;
                  break;
                }
                console.log(`Retrying in 2 seconds...`);
                await new Promise((resolve) => setTimeout(resolve, 2000));
              }
            }
            
            if (!batchSuccess) {
              console.error('Batch failed after all retries, stopping');
              shouldContinueImport = false;
              break;
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
    // For ed_units, use batch mode with office/status/time indices
    else if (step.action === 'import_ed_units') {
          let totalImported = 0;
          let totalFetched = 0;
          let shouldContinueImport = true;
          let batchParams = { 
            batch_size: 10, // Process 10 requests per batch for faster import
            office_index: 0,
            status_index: 0,
            time_index: 0
          };
      
      while (!shouldStopImport && shouldContinueImport) {
        let retries = 0;
        const maxRetries = 3;
        let batchSuccess = false;
        
        while (retries < maxRetries && !batchSuccess && !shouldStopImport) {
          try {
            console.log(`Executing batch (attempt ${retries + 1}/${maxRetries}) with params:`, batchParams);
            const result = await executeStep(step, batchParams);
            console.log('Batch result:', result);
            
            if (!result.success) {
              console.error('Batch failed');
              retries++;
              if (retries >= maxRetries) {
                console.error('Max retries reached, stopping');
                shouldContinueImport = false;
                break;
              }
              console.log(`Retrying in 2 seconds...`);
              await new Promise((resolve) => setTimeout(resolve, 2000));
              continue;
            }
            
            batchSuccess = true;
            
            const progress = result.progress;
            const stats = result.stats;
            const nextBatch = result.nextBatch;
            
            totalImported += stats?.totalImported || 0;
            totalFetched += stats?.totalFetched || 0;
            
            const hasMore = progress?.hasMore || false;
            const progressPercent = stats?.progressPercentage || 0;
            const currentPos = stats?.currentPosition || 0;
            const totalCombs = stats?.totalCombinations || 1615;
            
            console.log(`Batch completed: imported=${stats?.totalImported}, fetched=${stats?.totalFetched}, hasMore=${hasMore}, progress=${progressPercent}%`);
            
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
            
            if (!hasMore) {
              toast({
                title: 'Успешно',
                description: `${step.name} завершен. Всего импортировано: ${totalImported}`,
              });
              console.log('Import completed in single step, exiting loop');
              shouldContinueImport = false;
              break;
            }
            
            // Update batch parameters for next iteration
            if (nextBatch) {
              batchParams = nextBatch;
              console.log('Updated batch params for next iteration:', batchParams);
            } else {
              console.log('No nextBatch provided, stopping');
              shouldContinueImport = false;
              break;
            }
            
            // Small delay between batches
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch (error) {
            console.error('Error in batch retry loop:', error);
            retries++;
            if (retries >= maxRetries) {
              toast({
                title: 'Ошибка в цикле импорта',
                description: error instanceof Error ? error.message : 'Неизвестная ошибка',
                variant: 'destructive',
              });
              shouldContinueImport = false;
              break;
            }
            console.log(`Retrying in 2 seconds...`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
        
        if (!batchSuccess) {
          console.error('Batch failed after all retries, stopping');
          shouldContinueImport = false;
          break;
        }
      }
    } 
    else {
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
        body: { action: 'delete_ed_units_and_schedule' },
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
        body: { action: 'delete_all_data' },
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
        body: { action: previewAction },
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
            {isImportingChats && (
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
                setIsImportingChats(true);
                const mode = salebotListId ? `списка ${salebotListId}` : 'всех клиентов';
                setChatImportStatus(`Инициализация импорта из ${mode}...`);
                
                try {
                  // Устанавливаем list_id и сбрасываем прогресс в таблице
                  const { error: updateError } = await supabase
                    .from('salebot_import_progress')
                    .update({
                      list_id: salebotListId || null,
                      current_offset: 0,
                      is_running: false
                    })
                    .limit(1);

                  if (updateError) {
                    console.error('Ошибка обновления прогресса:', updateError);
                  }

                  let offset = 0;
                  let totalImported = 0;
                  let totalClients = 0;
                  let allErrors: string[] = [];
                  let batchNumber = 1;

                  while (true) {
                    setChatImportStatus(`Обработка батча ${batchNumber} (${mode}, offset: ${offset})...`);
                    
                    const { data, error } = await supabase.functions.invoke('import-salebot-chats', {
                      body: { offset },
                    });

                    if (error) throw error;

                    totalImported += data.totalImported || 0;
                    totalClients += data.totalClients || 0;
                    
                    if (data.errors && data.errors.length > 0) {
                      allErrors = [...allErrors, ...data.errors];
                    }

                    setChatImportStatus(
                      `Батч ${batchNumber} завершен. Всего: ${totalImported} сообщений от ${totalClients} клиентов`
                    );

                    if (data.completed) {
                      break;
                    }

                    offset = data.nextOffset;
                    batchNumber++;
                    
                    // Небольшая пауза между батчами
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  }

                  setChatImportStatus('Завершение импорта...');
                  
                  toast({
                    title: 'Импорт завершен',
                    description: `Импортировано ${totalImported} сообщений от ${totalClients} клиентов${allErrors.length > 0 ? ` (ошибок: ${allErrors.length})` : ''}`,
                  });

                  if (allErrors.length > 0) {
                    console.error('Ошибки импорта:', allErrors);
                  }
                } catch (error: any) {
                  console.error('Ошибка импорта чатов:', error);
                  toast({
                    title: 'Ошибка импорта',
                    description: error.message,
                    variant: 'destructive',
                  });
                } finally {
                  setIsImportingChats(false);
                  setChatImportStatus('');
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
                  Импортировать историю чатов
                </>
              )}
            </Button>
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
