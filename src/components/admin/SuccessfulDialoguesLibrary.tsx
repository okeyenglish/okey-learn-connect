import { useState, useEffect } from 'react';
import { BookOpen, Filter, Loader2, RefreshCw, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { useToast } from '@/hooks/use-toast';
import { DialogueScriptCard, DialogueExample, scenarioLabels, outcomeLabels } from './DialogueScriptCard';
import { DialogueScriptDetail } from './DialogueScriptDetail';

interface DialoguesResponse {
  success: boolean;
  dialogues: DialogueExample[];
  total: number;
  byScenario: Record<string, number>;
  byOutcome: Record<string, number>;
  pagination: {
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

export function SuccessfulDialoguesLibrary() {
  const [isLoading, setIsLoading] = useState(false);
  const [dialogues, setDialogues] = useState<DialogueExample[]>([]);
  const [total, setTotal] = useState(0);
  const [byScenario, setByScenario] = useState<Record<string, number>>({});
  const [byOutcome, setByOutcome] = useState<Record<string, number>>({});
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [scenarioFilter, setScenarioFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [minQuality, setMinQuality] = useState<number>(4);
  const [sortBy, setSortBy] = useState<'quality_score' | 'created_at'>('quality_score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Detail view
  const [selectedDialogue, setSelectedDialogue] = useState<DialogueExample | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { toast } = useToast();

  const loadDialogues = async (reset = false) => {
    setIsLoading(true);

    try {
      const offset = reset ? 0 : dialogues.length;
      
      const response = await selfHostedPost<DialoguesResponse>('get-successful-dialogues', {
        scenario_type: scenarioFilter,
        outcome: outcomeFilter,
        min_quality: minQuality,
        limit: 20,
        offset,
        sort_by: sortBy,
        sort_order: sortOrder
      });

      if (response.success && response.data) {
        const data = response.data;
        
        if (reset) {
          setDialogues(data.dialogues);
        } else {
          setDialogues(prev => [...prev, ...data.dialogues]);
        }
        
        setTotal(data.total);
        setByScenario(data.byScenario || {});
        setByOutcome(data.byOutcome || {});
        setHasMore(data.pagination?.hasMore || false);
      } else {
        toast({
          title: 'Ошибка',
          description: response.error || 'Не удалось загрузить диалоги',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Load dialogues error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить библиотеку скриптов',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDialogues(true);
  }, [scenarioFilter, outcomeFilter, minQuality, sortBy, sortOrder]);

  const handleCardClick = (dialogue: DialogueExample) => {
    setSelectedDialogue(dialogue);
    setDetailOpen(true);
  };

  const totalScripts = Object.values(byScenario).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Библиотека успешных скриптов
              </CardTitle>
              <CardDescription>
                Примеры лучших диалогов для обучения менеджеров. Изучайте успешные кейсы и используйте их как шаблоны.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadDialogues(true)}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats by Scenario */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card 
          className={`cursor-pointer transition-all ${scenarioFilter === 'all' ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
          onClick={() => setScenarioFilter('all')}
        >
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{totalScripts}</p>
            <p className="text-xs text-muted-foreground">Все скрипты</p>
          </CardContent>
        </Card>
        {Object.entries(byScenario).map(([scenario, count]) => (
          <Card
            key={scenario}
            className={`cursor-pointer transition-all ${scenarioFilter === scenario ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
            onClick={() => setScenarioFilter(scenario)}
          >
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs text-muted-foreground truncate">
                {scenarioLabels[scenario] || scenario}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Сценарий</Label>
              <Select value={scenarioFilter} onValueChange={setScenarioFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все сценарии</SelectItem>
                  {Object.entries(scenarioLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Исход</Label>
              <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все исходы</SelectItem>
                  {Object.entries(outcomeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Мин. качество</Label>
              <Select value={String(minQuality)} onValueChange={(v) => setMinQuality(Number(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">★★★ и выше</SelectItem>
                  <SelectItem value="4">★★★★ и выше</SelectItem>
                  <SelectItem value="5">★★★★★ только</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Сортировка</Label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'quality_score' | 'created_at')}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quality_score">По качеству</SelectItem>
                  <SelectItem value="created_at">По дате</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Порядок</Label>
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Убывание</SelectItem>
                  <SelectItem value="asc">Возрастание</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Badge variant="secondary" className="h-9 px-3">
              Найдено: {total}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Gallery */}
      {isLoading && dialogues.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : dialogues.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Нет скриптов по заданным фильтрам
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Попробуйте изменить фильтры или запустите индексацию диалогов
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dialogues.map((dialogue) => (
              <DialogueScriptCard
                key={dialogue.id}
                dialogue={dialogue}
                onClick={() => handleCardClick(dialogue)}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => loadDialogues(false)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Загрузка...
                  </>
                ) : (
                  'Загрузить ещё'
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Detail Sheet */}
      <DialogueScriptDetail
        dialogue={selectedDialogue}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
