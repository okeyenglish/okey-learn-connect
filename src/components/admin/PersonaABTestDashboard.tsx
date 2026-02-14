import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  FlaskConical, Play, Pause, Trophy, Plus, TrendingUp, Users, BarChart3, CheckCircle2, Loader2, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ABTest {
  id: string;
  name: string;
  description: string | null;
  persona_a_id: string;
  persona_b_id: string;
  traffic_split: number;
  status: 'draft' | 'running' | 'paused' | 'completed';
  target_sample_size: number;
  target_metric: string;
  started_at: string | null;
  completed_at: string | null;
  winner_persona_id: string | null;
  winner_confidence: number | null;
  created_at: string;
  persona_a?: { id: string; name: string; slug: string } | null;
  persona_b?: { id: string; name: string; slug: string } | null;
}

interface Persona {
  id: string;
  name: string;
  slug: string;
}

interface VariantSummary {
  variant: string;
  total_clients: number;
  converted_clients: number;
  conversion_rate: number;
  avg_feedback: number;
  avg_health: number;
  avg_messages: number;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: 'Черновик', color: 'bg-muted text-muted-foreground' },
  running: { label: 'Активен', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  paused: { label: 'Пауза', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  completed: { label: 'Завершён', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
};

export function PersonaABTestDashboard() {
  const { profile } = useAuth();
  const orgId = (profile as any)?.organization_id;
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTestId, setDetailTestId] = useState<string | null>(null);

  // Fetch tests
  const { data: tests, isLoading } = useQuery({
    queryKey: ['ab-tests', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('persona_ab_tests')
        .select(`
          *,
          persona_a:persona_a_id(id, name, slug),
          persona_b:persona_b_id(id, name, slug)
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ABTest[];
    },
    enabled: !!orgId,
  });

  // Fetch personas for creating tests
  const { data: personas } = useQuery({
    queryKey: ['ab-personas', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_personas')
        .select('id, name, slug')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data || []) as Persona[];
    },
    enabled: !!orgId,
  });

  // Status mutations
  const updateStatus = useMutation({
    mutationFn: async ({ testId, status }: { testId: string; status: string }) => {
      const updateData: any = { status };
      if (status === 'running' && !tests?.find(t => t.id === testId)?.started_at) {
        updateData.started_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('persona_ab_tests')
        .update(updateData)
        .eq('id', testId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      toast.success('Статус обновлён');
    },
  });

  // Auto-complete check
  const autoComplete = useMutation({
    mutationFn: async () => {
      const result = await selfHostedPost('persona-ab-test', {
        action: 'auto_complete',
        organization_id: orgId,
      }) as any;
      return result?.data || result;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      if (data.completed?.length > 0) {
        toast.success(`Завершено ${data.completed.length} тест(ов) — победитель определён!`);
      } else {
        toast.info('Ни один тест ещё не набрал достаточно данных');
      }
    },
  });

  const runningTests = tests?.filter(t => t.status === 'running') || [];
  const completedTests = tests?.filter(t => t.status === 'completed') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            A/B Тестирование персон
          </h3>
          <p className="text-sm text-muted-foreground">
            Автоматическое сравнение конверсии между стилями общения AI
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => autoComplete.mutate()}
            disabled={autoComplete.isPending || runningTests.length === 0}>
            <RefreshCw className={cn('h-4 w-4 mr-1', autoComplete.isPending && 'animate-spin')} />
            Проверить результаты
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!personas || personas.length < 2}>
            <Plus className="h-4 w-4 mr-1" />
            Новый тест
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard icon={FlaskConical} label="Всего тестов" value={tests?.length || 0} />
        <KPICard icon={Play} label="Активных" value={runningTests.length} color="text-green-600" />
        <KPICard icon={Trophy} label="Завершённых" value={completedTests.length} color="text-blue-600" />
        <KPICard icon={Users} label="Клиентов в тестах" value="—" />
      </div>

      {/* Tests list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : tests && tests.length > 0 ? (
        <div className="space-y-3">
          {tests.map(test => (
            <ABTestCard
              key={test.id}
              test={test}
              onStatusChange={(status) => updateStatus.mutate({ testId: test.id, status })}
              onViewDetails={() => setDetailTestId(test.id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FlaskConical className="h-10 w-10 mb-3 opacity-40" />
            <p>A/B тесты не созданы</p>
            <p className="text-xs mt-1">Создайте тест для сравнения эффективности персон</p>
          </CardContent>
        </Card>
      )}

      {/* Create dialog */}
      {createOpen && personas && (
        <CreateABTestDialog
          personas={personas}
          orgId={orgId}
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
            setCreateOpen(false);
          }}
        />
      )}

      {/* Detail dialog */}
      {detailTestId && (
        <ABTestDetailDialog
          testId={detailTestId}
          open={!!detailTestId}
          onOpenChange={(open) => !open && setDetailTestId(null)}
        />
      )}
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color?: string }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <Icon className={cn('h-5 w-5', color || 'text-muted-foreground')} />
        <div>
          <p className="text-lg font-semibold">{value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ABTestCard({ test, onStatusChange, onViewDetails }: {
  test: ABTest;
  onStatusChange: (status: string) => void;
  onViewDetails: () => void;
}) {
  const statusInfo = STATUS_MAP[test.status] || STATUS_MAP.draft;
  const isRunning = test.status === 'running';
  const isCompleted = test.status === 'completed';

  return (
    <Card className="hover:border-primary/30 transition-colors cursor-pointer" onClick={onViewDetails}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm truncate">{test.name}</h4>
              <Badge className={cn('text-[10px] px-1.5 py-0', statusInfo.color)}>
                {statusInfo.label}
              </Badge>
              {isCompleted && test.winner_confidence && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  <Trophy className="h-3 w-3 mr-0.5 text-amber-500" />
                  {test.winner_confidence.toFixed(0)}% уверенность
                </Badge>
              )}
            </div>

            {/* Personas comparison */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Badge variant="outline" className="text-[10px]">
                A: {test.persona_a?.name || 'N/A'}
              </Badge>
              <span className="text-muted-foreground">vs</span>
              <Badge variant="outline" className="text-[10px]">
                B: {test.persona_b?.name || 'N/A'}
              </Badge>
              <span className="ml-1">({Math.round((1 - test.traffic_split) * 100)}% / {Math.round(test.traffic_split * 100)}%)</span>
            </div>

            {test.description && (
              <p className="text-[11px] text-muted-foreground mt-1 truncate">{test.description}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            {test.status === 'draft' && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onStatusChange('running')}>
                <Play className="h-3 w-3 mr-1" /> Старт
              </Button>
            )}
            {isRunning && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onStatusChange('paused')}>
                <Pause className="h-3 w-3 mr-1" /> Пауза
              </Button>
            )}
            {test.status === 'paused' && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onStatusChange('running')}>
                <Play className="h-3 w-3 mr-1" /> Продолжить
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateABTestDialog({ personas, orgId, open, onOpenChange, onCreated }: {
  personas: Persona[];
  orgId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [personaAId, setPersonaAId] = useState('');
  const [personaBId, setPersonaBId] = useState('');
  const [split, setSplit] = useState(50);
  const [targetSize, setTargetSize] = useState(50);
  const [targetMetric, setTargetMetric] = useState('conversion');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name || !personaAId || !personaBId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('persona_ab_tests')
        .insert({
          organization_id: orgId,
          name,
          description: description || null,
          persona_a_id: personaAId,
          persona_b_id: personaBId,
          traffic_split: split / 100,
          target_sample_size: targetSize,
          target_metric: targetMetric,
          status: 'draft',
        });
      if (error) throw error;
      toast.success('Тест создан');
      onCreated();
    } catch (err: any) {
      toast.error(`Ошибка: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const personaA = personas.find(p => p.id === personaAId);
  const personaB = personas.find(p => p.id === personaBId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Новый A/B тест
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Название теста</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Мягкий vs продающий стиль" />
          </div>

          <div>
            <Label>Описание (опционально)</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Сравниваем конверсию при разных стилях" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Персона A (контроль)</Label>
              <Select value={personaAId} onValueChange={setPersonaAId}>
                <SelectTrigger><SelectValue placeholder="Выберите..." /></SelectTrigger>
                <SelectContent>
                  {personas.filter(p => p.id !== personaBId).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Персона B (тест)</Label>
              <Select value={personaBId} onValueChange={setPersonaBId}>
                <SelectTrigger><SelectValue placeholder="Выберите..." /></SelectTrigger>
                <SelectContent>
                  {personas.filter(p => p.id !== personaAId).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Traffic split slider */}
          <div>
            <Label>Распределение трафика</Label>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-muted-foreground w-24 text-right">
                A: {100 - split}%
              </span>
              <Slider
                value={[split]}
                onValueChange={([v]) => setSplit(v)}
                min={10}
                max={90}
                step={5}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-24">
                B: {split}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Целевая выборка (на вариант)</Label>
              <Input type="number" value={targetSize} onChange={e => setTargetSize(Number(e.target.value))} min={10} max={1000} />
            </div>
            <div>
              <Label>Метрика</Label>
              <Select value={targetMetric} onValueChange={setTargetMetric}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conversion">Конверсия</SelectItem>
                  <SelectItem value="feedback_score">Оценка ответов</SelectItem>
                  <SelectItem value="response_rate">Скорость ответа</SelectItem>
                  <SelectItem value="health_score">Health Score</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleCreate} disabled={saving || !name || !personaAId || !personaBId || personaAId === personaBId}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Создать тест
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ABTestDetailDialog({ testId, open, onOpenChange }: {
  testId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['ab-test-detail', testId],
    queryFn: async () => {
      const result = await selfHostedPost('persona-ab-test', {
        action: 'summary',
        test_id: testId,
      }) as any;
      return result?.data || result;
    },
    enabled: !!testId,
    refetchInterval: 30000,
  });

  const summary: VariantSummary[] = data?.summary || [];
  const test = data?.test;
  const confidence = data?.confidence || 0;

  const variantA = summary.find(s => s.variant === 'A');
  const variantB = summary.find(s => s.variant === 'B');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {test?.name || 'Результаты теста'}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-40" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Confidence meter */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Статистическая значимость</span>
                  <span className={cn('text-sm font-bold', confidence >= 95 ? 'text-green-600' : confidence >= 80 ? 'text-amber-600' : 'text-muted-foreground')}>
                    {confidence.toFixed(1)}%
                  </span>
                </div>
                <Progress value={confidence} className="h-2" />
                <p className="text-[11px] text-muted-foreground mt-1">
                  {confidence >= 95 ? '✅ Результат статистически значим' : confidence >= 80 ? '⚠️ Приближается к значимости' : 'Нужно больше данных'}
                </p>
              </CardContent>
            </Card>

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-2 gap-3">
              <VariantCard
                label="A (Контроль)"
                personaName={test?.persona_a?.name || 'N/A'}
                data={variantA}
                isWinner={test?.winner_persona_id === test?.persona_a?.id}
              />
              <VariantCard
                label="B (Тест)"
                personaName={test?.persona_b?.name || 'N/A'}
                data={variantB}
                isWinner={test?.winner_persona_id === test?.persona_b?.id}
              />
            </div>

            {/* Winner declaration with promote */}
            {test?.winner_persona_id && (
              <WinnerPromotionCard test={test} />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function WinnerPromotionCard({ test }: { test: any }) {
  const [promoting, setPromoting] = useState(false);
  const [promoted, setPromoted] = useState(false);
  const queryClient = useQueryClient();

  const winnerName = test.winner_persona_id === test.persona_a?.id
    ? test.persona_a?.name : test.persona_b?.name;
  const loserName = test.winner_persona_id === test.persona_a?.id
    ? test.persona_b?.name : test.persona_a?.name;

  const handlePromote = async () => {
    setPromoting(true);
    try {
      const result = await selfHostedPost('persona-ab-test', {
        action: 'promote_winner',
        test_id: test.id,
      }) as any;
      const data = result?.data || result;
      if (data?.success) {
        setPromoted(true);
        queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
        queryClient.invalidateQueries({ queryKey: ['ab-personas'] });
        toast.success(`Персона «${winnerName}» установлена как дефолтная`);
      } else {
        toast.error(data?.error || 'Ошибка продвижения');
      }
    } catch (err: any) {
      toast.error(`Ошибка: ${err.message}`);
    } finally {
      setPromoting(false);
    }
  };

  return (
    <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-800">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Trophy className="h-6 w-6 text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">
              Победитель: {winnerName}
            </p>
            <p className="text-[11px] text-muted-foreground">
              с уверенностью {test.winner_confidence?.toFixed(1)}% • проигравший: {loserName}
            </p>

            {!promoted ? (
              <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-xs text-foreground mb-2">
                  🚀 Сделать <strong>{winnerName}</strong> дефолтной персоной для всех новых диалогов?
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handlePromote}
                    disabled={promoting}
                  >
                    {promoting ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    )}
                    Назначить дефолтной
                  </Button>
                  <span className="text-[10px] text-muted-foreground">
                    Проигравшая персона останется активной
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-medium">Персона назначена дефолтной</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function VariantCard({ label, personaName, data, isWinner }: {
  label: string;
  personaName: string;
  data?: VariantSummary;
  isWinner?: boolean;
}) {
  return (
    <Card className={cn(isWinner && 'border-green-300 ring-1 ring-green-200')}>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          {isWinner && <Trophy className="h-4 w-4 text-amber-500" />}
          {label}
        </CardTitle>
        <CardDescription className="text-xs">{personaName}</CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        {data ? (
          <>
            <MetricRow label="Клиентов" value={data.total_clients} />
            <MetricRow label="Конверсия" value={`${data.conversion_rate}%`} highlight={data.conversion_rate > 0} />
            <MetricRow label="Ср. feedback" value={data.avg_feedback?.toFixed(1) || '—'} />
            <MetricRow label="Ср. health" value={data.avg_health?.toFixed(0) || '—'} />
            <MetricRow label="Ср. сообщений" value={data.avg_messages?.toFixed(0) || '—'} />
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Нет данных</p>
        )}
      </CardContent>
    </Card>
  );
}

function MetricRow({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-medium', highlight && 'text-green-600 dark:text-green-400')}>{value}</span>
    </div>
  );
}
