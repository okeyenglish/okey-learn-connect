import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  const [steps, setSteps] = useState<ImportStep[]>([
    {
      id: 'clear',
      name: '1. Архивация данных',
      description: 'Пометка существующих данных как неактивных (НЕ удаление)',
      action: 'clear_data',
      status: 'pending',
    },
    {
      id: 'locations',
      name: '2. Филиалы',
      description: 'Импорт филиалов/офисов из Holihope',
      action: 'import_locations',
      status: 'pending',
    },
    {
      id: 'teachers',
      name: '3. Преподаватели',
      description: 'Импорт преподавателей с предметами и категориями',
      action: 'import_teachers',
      status: 'pending',
    },
    {
      id: 'clients',
      name: '4. Клиенты (родители)',
      description: 'Импорт клиентов/родителей с контактами',
      action: 'import_clients',
      status: 'pending',
    },
    {
      id: 'leads',
      name: '5. Лиды',
      description: 'Импорт лидов - потенциальных учеников, которые никогда не учились (через GetLeads API)',
      action: 'import_leads',
      status: 'pending',
    },
    {
      id: 'students',
      name: '6. Ученики',
      description: 'Импорт активных и архивных учеников (через GetStudents API), связь с родителями',
      action: 'import_students',
      status: 'pending',
    },
    {
      id: 'groups',
      name: '7. Учебные единицы',
      description: 'Импорт групп, мини-групп, индивидуальных занятий',
      action: 'import_groups',
      status: 'pending',
    },
    {
      id: 'schedule',
      name: '8. Расписание',
      description: 'Импорт занятий с темами и статусами',
      action: 'import_schedule',
      status: 'pending',
    },
    {
      id: 'payments',
      name: '9. Платежи',
      description: 'Импорт платежей и истории транзакций',
      action: 'import_payments',
      status: 'pending',
    },
  ]);

  const executeStep = async (step: ImportStep) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === step.id ? { ...s, status: 'in_progress' } : s
      )
    );

    try {
      const { data, error } = await supabase.functions.invoke('import-holihope', {
        body: { action: step.action },
      });

      if (error) throw error;

      const progress = data?.progress?.[0];
      
      setSteps((prev) =>
        prev.map((s) =>
          s.id === step.id
            ? {
                ...s,
                status: progress?.status || 'completed',
                count: progress?.count,
                message: progress?.message,
                error: progress?.error,
              }
            : s
        )
      );

      if (progress?.status === 'error') {
        throw new Error(progress.error || 'Ошибка импорта');
      }

      toast({
        title: 'Успешно',
        description: progress?.message || `${step.name} завершен`,
      });

      return true;
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

      return false;
    }
  };

  const runFullImport = async () => {
    setIsImporting(true);

    try {
      for (const step of steps) {
        const success = await executeStep(step);
        if (!success) {
          break;
        }
        // Small delay between steps
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      toast({
        title: 'Импорт завершен',
        description: 'Все данные успешно импортированы из Holihope',
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка импорта',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const runSingleStep = async (step: ImportStep) => {
    setIsImporting(true);
    await executeStep(step);
    setIsImporting(false);
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
        </div>
        <Button
          onClick={runFullImport}
          disabled={isImporting}
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
            Важная информация о лидах и учениках
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <h4 className="font-semibold mb-1 text-foreground">Лиды (Шаг 5):</h4>
            <p className="text-muted-foreground">
              Импортируются через API <code className="px-1 py-0.5 bg-muted rounded">GetLeads</code>. 
              Это потенциальные ученики, которые <strong>никогда не начинали обучение</strong>.
              В базе данных получают статус <code className="px-1 py-0.5 bg-muted rounded">status: 'lead'</code>.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-1 text-foreground">Ученики (Шаг 6):</h4>
            <p className="text-muted-foreground">
              Импортируются через API <code className="px-1 py-0.5 bg-muted rounded">GetStudents</code>. 
              Это реальные ученики со статусами <code className="px-1 py-0.5 bg-muted rounded">'Active'</code> (активные) 
              или <code className="px-1 py-0.5 bg-muted rounded">'Archived'</code> (архивные/завершившие обучение).
            </p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded p-3">
            <p className="font-medium text-yellow-800 dark:text-yellow-200">
              ⚠️ Порядок импорта критически важен: 
              сначала <strong>Клиенты</strong>, затем <strong>Лиды</strong>, затем <strong>Ученики</strong>
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
                <Button
                  variant="outline"
                  onClick={() => runSingleStep(step)}
                  disabled={isImporting}
                  size="sm"
                >
                  Запустить отдельно
                </Button>
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
