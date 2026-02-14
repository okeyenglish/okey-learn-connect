import { useState } from 'react';
import { Bot, Play, Loader2, Database, BarChart3, Search, BookOpen, Brain, HelpCircle, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { useToast } from '@/hooks/use-toast';
import { ConversationAnalyticsDashboard } from './ConversationAnalyticsDashboard';
import { ConversationSemanticSearch } from './ConversationSemanticSearch';
import { SuccessfulDialoguesLibrary } from './SuccessfulDialoguesLibrary';
import { ScriptTrainerPage } from './ScriptTrainerPage';
import { ExtractedFAQPanel } from './ExtractedFAQPanel';
import { KnowledgeCoverageDashboard } from './KnowledgeCoverageDashboard';

interface IndexingResult {
  success: boolean;
  total: number;
  processed: number;
  indexed: number;
  skipped: number;
  errors: number;
  dryRun: boolean;
  examples?: Array<{
    clientId: string;
    scenario: string;
    quality: number;
    summary: string;
  }>;
  skipReasons?: {
    lowQuality: number;
    ongoing: number;
    analysisFailed: number;
    embeddingFailed: number;
    noMessages: number;
  };
  error?: string;
}

export function ConversationIndexingPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<IndexingResult | null>(null);
  const [daysBack, setDaysBack] = useState(60);
  const [minMessages, setMinMessages] = useState(5);
  const [maxConversations, setMaxConversations] = useState(100);
  const [minQuality, setMinQuality] = useState(3);
  const [dryRun, setDryRun] = useState(true);
  const { toast } = useToast();

  const runIndexing = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const response = await selfHostedPost<IndexingResult>('index-conversations', {
        daysBack,
        minMessages,
        maxConversations,
        minQuality,
        dryRun
      });

      if (response.success && response.data) {
        setResult(response.data);
        toast({
          title: dryRun ? 'Пробный запуск завершён' : 'Индексация завершена',
          description: `Обработано: ${response.data.processed}, проиндексировано: ${response.data.indexed}`,
        });
      } else {
        setResult({ 
          success: false, 
          total: 0, 
          processed: 0, 
          indexed: 0, 
          skipped: 0, 
          errors: 0, 
          dryRun,
          error: response.error 
        });
        toast({
          title: 'Ошибка',
          description: response.error || 'Неизвестная ошибка',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Indexing error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось запустить индексацию',
        variant: 'destructive'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getScenarioColor = (scenario: string) => {
    const colors: Record<string, string> = {
      new_lead: 'bg-green-100 text-green-800',
      returning: 'bg-blue-100 text-blue-800',
      complaint: 'bg-red-100 text-red-800',
      upsell: 'bg-purple-100 text-purple-800',
      reactivation: 'bg-orange-100 text-orange-800',
      info_request: 'bg-gray-100 text-gray-800',
      scheduling: 'bg-cyan-100 text-cyan-800',
      payment: 'bg-amber-100 text-amber-800'
    };
    return colors[scenario] || 'bg-gray-100 text-gray-800';
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 4) return 'text-green-600';
    if (quality >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bot className="h-8 w-8" />
          Обучение AI на диалогах
        </h1>
        <p className="text-muted-foreground mt-2">
          Индексация успешных диалогов для обучения AI-менеджера с использованием RAG
        </p>
      </div>

      <Tabs defaultValue="indexing" className="space-y-6">
        <TabsList>
          <TabsTrigger value="indexing" className="gap-2">
            <Database className="h-4 w-4" />
            Индексация
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Аналитика
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-2">
            <Search className="h-4 w-4" />
            Поиск кейсов
          </TabsTrigger>
          <TabsTrigger value="scripts" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Скрипты
          </TabsTrigger>
          <TabsTrigger value="trainer" className="gap-2">
            <Brain className="h-4 w-4" />
            Тренажёр
          </TabsTrigger>
          <TabsTrigger value="faq" className="gap-2">
            <HelpCircle className="h-4 w-4" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="coverage" className="gap-2">
            <Shield className="h-4 w-4" />
            Покрытие
          </TabsTrigger>
        </TabsList>

        <TabsContent value="indexing" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle>Настройки индексации</CardTitle>
                <CardDescription>
                  Параметры для анализа и индексации диалогов
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="daysBack">Период (дней назад)</Label>
                  <Input
                    id="daysBack"
                    type="number"
                    value={daysBack}
                    onChange={(e) => setDaysBack(Number(e.target.value))}
                    min={1}
                    max={365}
                  />
                  <p className="text-xs text-muted-foreground">
                    Диалоги за последние N дней
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minMessages">Мин. сообщений в диалоге</Label>
                  <Input
                    id="minMessages"
                    type="number"
                    value={minMessages}
                    onChange={(e) => setMinMessages(Number(e.target.value))}
                    min={3}
                    max={50}
                  />
                  <p className="text-xs text-muted-foreground">
                    Минимальное количество сообщений для анализа
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxConversations">Макс. диалогов</Label>
                  <Input
                    id="maxConversations"
                    type="number"
                    value={maxConversations}
                    onChange={(e) => setMaxConversations(Number(e.target.value))}
                    min={10}
                    max={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    Максимальное количество диалогов за один запуск
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minQuality">Мин. качество диалога</Label>
                  <Input
                    id="minQuality"
                    type="number"
                    value={minQuality}
                    onChange={(e) => setMinQuality(Number(e.target.value))}
                    min={1}
                    max={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Оценка 1-5 (рекомендуется 3+, для обучения 4+)
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="space-y-0.5">
                    <Label htmlFor="dryRun">Пробный запуск</Label>
                    <p className="text-xs text-muted-foreground">
                      Анализ без сохранения в базу
                    </p>
                  </div>
                  <Switch
                    id="dryRun"
                    checked={dryRun}
                    onCheckedChange={setDryRun}
                  />
                </div>

                <Button
                  onClick={runIndexing}
                  disabled={isRunning}
                  className="w-full mt-4"
                  size="lg"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Индексация...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      {dryRun ? 'Пробный запуск' : 'Запустить индексацию'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results Card */}
            <Card>
              <CardHeader>
                <CardTitle>Результаты</CardTitle>
                <CardDescription>
                  {result ? (
                    result.dryRun ? 'Пробный запуск (данные не сохранены)' : 'Индексация завершена'
                  ) : 'Запустите индексацию для просмотра результатов'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {result ? (
                  <div className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Найдено</p>
                        <p className="text-2xl font-bold">{result.total}</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Обработано</p>
                        <p className="text-2xl font-bold">{result.processed}</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-600">Проиндексировано</p>
                        <p className="text-2xl font-bold text-green-700">{result.indexed}</p>
                      </div>
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-yellow-600">Пропущено</p>
                        <p className="text-2xl font-bold text-yellow-700">{result.skipped}</p>
                      </div>
                    </div>

                    {result.errors > 0 && (
                      <div className="p-3 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-600">Ошибок</p>
                        <p className="text-2xl font-bold text-red-700">{result.errors}</p>
                      </div>
                    )}

                    {/* Skip Reasons */}
                    {result.skipReasons && result.skipped > 0 && (
                      <div className="p-3 bg-orange-50 rounded-lg space-y-2">
                        <p className="text-sm font-medium text-orange-800">Причины пропуска:</p>
                        <div className="text-sm text-orange-700 space-y-1">
                          {result.skipReasons.lowQuality > 0 && (
                            <p>• Низкое качество: {result.skipReasons.lowQuality}</p>
                          )}
                          {result.skipReasons.ongoing > 0 && (
                            <p>• Диалог не завершён: {result.skipReasons.ongoing}</p>
                          )}
                          {result.skipReasons.analysisFailed > 0 && (
                            <p>• Ошибка анализа: {result.skipReasons.analysisFailed}</p>
                          )}
                          {result.skipReasons.embeddingFailed > 0 && (
                            <p>• Ошибка embedding: {result.skipReasons.embeddingFailed}</p>
                          )}
                          {result.skipReasons.noMessages > 0 && (
                            <p>• Нет сообщений: {result.skipReasons.noMessages}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Progress */}
                    {result.total > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Прогресс</span>
                          <span>{Math.round((result.indexed / result.total) * 100)}%</span>
                        </div>
                        <Progress value={(result.indexed / result.total) * 100} />
                      </div>
                    )}

                    {/* Examples */}
                    {result.examples && result.examples.length > 0 && (
                      <div className="space-y-2">
                        <Label>Примеры проиндексированных диалогов</Label>
                        <ScrollArea className="h-[200px] border rounded-lg p-2">
                          <div className="space-y-2">
                            {result.examples.map((ex, idx) => (
                              <div key={idx} className="p-2 bg-muted/50 rounded text-sm">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge className={getScenarioColor(ex.scenario)}>
                                    {ex.scenario}
                                  </Badge>
                                  <span className={`font-medium ${getQualityColor(ex.quality)}`}>
                                    ★{ex.quality}
                                  </span>
                                </div>
                                <p className="text-muted-foreground line-clamp-2">
                                  {ex.summary}
                                </p>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Database className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Нет данных. Запустите индексацию.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Как это работает</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">1</div>
                    <h3 className="font-medium">Анализ</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AI анализирует каждый диалог и определяет сценарий, тип клиента и качество работы менеджера
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">2</div>
                    <h3 className="font-medium">Индексация</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Качественные диалоги (оценка 4-5) сохраняются как примеры с векторными embeddings
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">3</div>
                    <h3 className="font-medium">Обучение</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    При генерации ответа AI находит похожие успешные диалоги и использует их как примеры
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <ConversationAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="search">
          <ConversationSemanticSearch />
        </TabsContent>

        <TabsContent value="scripts">
          <SuccessfulDialoguesLibrary />
        </TabsContent>

        <TabsContent value="trainer">
          <ScriptTrainerPage />
        </TabsContent>

        <TabsContent value="faq">
          <ExtractedFAQPanel />
        </TabsContent>

        <TabsContent value="coverage">
          <KnowledgeCoverageDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
