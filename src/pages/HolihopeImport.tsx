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
      name: '1. Очистка данных',
      description: 'Удаление всех существующих данных из базы',
      action: 'clear_data',
      status: 'pending',
    },
    {
      id: 'locations',
      name: '2. Филиалы',
      description: 'Импорт филиалов из Holihope',
      action: 'import_locations',
      status: 'pending',
    },
    {
      id: 'teachers',
      name: '3. Преподаватели',
      description: 'Импорт преподавателей',
      action: 'import_teachers',
      status: 'pending',
    },
    {
      id: 'clients',
      name: '4. Клиенты',
      description: 'Импорт клиентов (родителей)',
      action: 'import_clients',
      status: 'pending',
    },
    {
      id: 'students',
      name: '5. Ученики',
      description: 'Импорт учеников и связь с семьями',
      action: 'import_students',
      status: 'pending',
    },
    {
      id: 'groups',
      name: '6. Группы',
      description: 'Импорт групп и распределение учеников',
      action: 'import_groups',
      status: 'pending',
    },
    {
      id: 'schedule',
      name: '7. Расписание',
      description: 'Импорт занятий и расписания',
      action: 'import_schedule',
      status: 'pending',
    },
    {
      id: 'payments',
      name: '8. Платежи',
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
        <AlertDescription>
          Полный импорт удалит все существующие данные и заменит их данными из Holihope.
          Убедитесь, что у вас есть резервная копия, если это необходимо.
        </AlertDescription>
      </Alert>

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
