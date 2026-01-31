import { useState, useEffect } from 'react';
import { 
  BookOpen, Target, AlertTriangle, MessageSquare, Play, Trophy, 
  ChevronRight, Timer, Brain, Sparkles, RefreshCw, Filter, Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { useToast } from '@/hooks/use-toast';
import { DialogueExample } from './DialogueScriptCard';
import { ScriptSimulator } from './ScriptSimulator';
import { 
  dialogTypeLabels, 
  intentLabels, 
  issueLabels, 
  dialogTypeOptions,
  intentOptions,
  issueOptions 
} from '@/lib/dialogueTags';

interface TrainingScenario {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  intent: string;
  issue?: string;
  dialogType: string;
  sampleDialogue?: DialogueExample;
}

interface TrainingStats {
  totalSessions: number;
  averageScore: number;
  bestScore: number;
  lastTrainedAt?: string;
  scenariosCovered: number;
}

export function ScriptTrainerPage() {
  const [activeTab, setActiveTab] = useState<'scenarios' | 'practice' | 'stats'>('scenarios');
  const [isLoading, setIsLoading] = useState(false);
  const [dialogues, setDialogues] = useState<DialogueExample[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<TrainingScenario | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  
  // Filters
  const [dialogTypeFilter, setDialogTypeFilter] = useState<string>('all');
  const [intentFilter, setIntentFilter] = useState<string>('all');
  const [issueFilter, setIssueFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');

  const { toast } = useToast();

  // Training scenarios based on common patterns
  const trainingScenarios: TrainingScenario[] = [
    {
      id: 'price_objection',
      title: 'Работа с возражением "Дорого"',
      description: 'Клиент считает цену слишком высокой. Покажите ценность и обоснуйте стоимость.',
      difficulty: 'medium',
      intent: 'price_check',
      issue: 'price_too_high',
      dialogType: 'objection'
    },
    {
      id: 'no_time',
      title: 'Возражение "Нет времени"',
      description: 'Родитель говорит что нет времени водить ребёнка. Предложите гибкие варианты.',
      difficulty: 'medium',
      intent: 'hesitation',
      issue: 'no_time',
      dialogType: 'objection'
    },
    {
      id: 'child_motivation',
      title: 'Мотивация ребёнка',
      description: 'Клиент сомневается потому что ребёнок "не хочет". Работа с истинным мотивом.',
      difficulty: 'hard',
      intent: 'hesitation',
      issue: 'child_motivation',
      dialogType: 'objection'
    },
    {
      id: 'first_contact',
      title: 'Первый контакт с лидом',
      description: 'Новый лид интересуется ценами и расписанием. Выявите потребности и назначьте пробный урок.',
      difficulty: 'easy',
      intent: 'price_check',
      dialogType: 'new_lead'
    },
    {
      id: 'program_choice',
      title: 'Выбор программы',
      description: 'Клиент не может определиться с программой. Помогите подобрать оптимальный вариант.',
      difficulty: 'medium',
      intent: 'program_choice',
      dialogType: 'consultation'
    },
    {
      id: 'competitor_comparison',
      title: 'Сравнение с конкурентами',
      description: 'Клиент сравнивает вас с другими школами. Выделите преимущества без негатива.',
      difficulty: 'hard',
      intent: 'comparison',
      dialogType: 'consultation'
    },
    {
      id: 'reactivation',
      title: 'Реактивация ушедшего клиента',
      description: 'Клиент ранее занимался, но ушёл. Выясните причину и предложите вернуться.',
      difficulty: 'hard',
      intent: 'support_request',
      dialogType: 'reactivation'
    },
    {
      id: 'urgent_start',
      title: 'Срочный старт',
      description: 'Клиенту нужно срочно начать занятия. Быстро оформите без потери качества.',
      difficulty: 'easy',
      intent: 'urgent_start',
      dialogType: 'enrollment'
    }
  ];

  const loadDialogues = async () => {
    setIsLoading(true);
    try {
      const response = await selfHostedPost<{ dialogues: DialogueExample[]; success: boolean }>('get-successful-dialogues', {
        scenario_type: dialogTypeFilter !== 'all' ? dialogTypeFilter : undefined,
        intent: intentFilter !== 'all' ? intentFilter : undefined,
        issue: issueFilter !== 'all' ? issueFilter : undefined,
        min_quality: 4,
        limit: 50
      });

      if (response.success && response.data?.dialogues) {
        setDialogues(response.data.dialogues);
      }
    } catch (error) {
      console.error('Load dialogues error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDialogues();
  }, [dialogTypeFilter, intentFilter, issueFilter]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Легко';
      case 'medium': return 'Средне';
      case 'hard': return 'Сложно';
      default: return difficulty;
    }
  };

  const handleStartTraining = (scenario: TrainingScenario) => {
    // Find a matching dialogue from our library
    const matchingDialogue = dialogues.find(d => 
      (scenario.dialogType === d.scenario_type || !scenario.dialogType) &&
      (scenario.intent === d.intent || !scenario.intent) &&
      (scenario.issue === d.issue || !scenario.issue)
    );

    setSelectedScenario({
      ...scenario,
      sampleDialogue: matchingDialogue
    });
    setIsTraining(true);
  };

  const handleEndTraining = (score?: number) => {
    setIsTraining(false);
    setSelectedScenario(null);
    
    if (score !== undefined) {
      toast({
        title: 'Тренировка завершена!',
        description: `Ваш результат: ${score}%`,
      });
    }
  };

  const filteredScenarios = trainingScenarios.filter(scenario => {
    if (difficultyFilter !== 'all' && scenario.difficulty !== difficultyFilter) return false;
    if (dialogTypeFilter !== 'all' && scenario.dialogType !== dialogTypeFilter) return false;
    if (intentFilter !== 'all' && scenario.intent !== intentFilter) return false;
    if (issueFilter !== 'all' && scenario.issue !== issueFilter) return false;
    return true;
  });

  // If training is active, show the simulator
  if (isTraining && selectedScenario) {
    return (
      <ScriptSimulator
        scenario={selectedScenario}
        onEnd={handleEndTraining}
        sampleDialogue={selectedScenario.sampleDialogue}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Тренажёр скриптов
              </CardTitle>
              <CardDescription>
                Практикуйте работу с клиентами на основе реальных успешных диалогов
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadDialogues}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scenarios" className="gap-2">
            <Target className="h-4 w-4" />
            Сценарии
          </TabsTrigger>
          <TabsTrigger value="practice" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Практика
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <Trophy className="h-4 w-4" />
            Статистика
          </TabsTrigger>
        </TabsList>

        {/* Scenarios Tab */}
        <TabsContent value="scenarios" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Сложность</Label>
                  <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все уровни</SelectItem>
                      <SelectItem value="easy">Легко</SelectItem>
                      <SelectItem value="medium">Средне</SelectItem>
                      <SelectItem value="hard">Сложно</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Тип диалога</Label>
                  <Select value={dialogTypeFilter} onValueChange={setDialogTypeFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все типы</SelectItem>
                      {dialogTypeOptions.slice(0, 8).map(({ value, label }) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Намерение</Label>
                  <Select value={intentFilter} onValueChange={setIntentFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все намерения</SelectItem>
                      {intentOptions.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Badge variant="secondary" className="h-9 px-3">
                  {filteredScenarios.length} сценариев
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Scenario Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredScenarios.map((scenario) => (
              <Card 
                key={scenario.id}
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                onClick={() => handleStartTraining(scenario)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{scenario.title}</CardTitle>
                    <Badge className={getDifficultyColor(scenario.difficulty)}>
                      {getDifficultyLabel(scenario.difficulty)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {scenario.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      <Target className="h-3 w-3 mr-1" />
                      {intentLabels[scenario.intent] || scenario.intent}
                    </Badge>
                    {scenario.issue && (
                      <Badge variant="outline" className="text-xs text-orange-600">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {issueLabels[scenario.issue] || scenario.issue}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {dialogTypeLabels[scenario.dialogType] || scenario.dialogType}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      {dialogues.filter(d => 
                        d.scenario_type === scenario.dialogType || 
                        d.intent === scenario.intent
                      ).length} примеров в базе
                    </span>
                    <Button size="sm" className="gap-1">
                      <Play className="h-3 w-3" />
                      Начать
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredScenarios.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Нет сценариев по заданным фильтрам
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Practice Tab - Quick start with random scenario */}
        <TabsContent value="practice" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Быстрый старт
              </CardTitle>
              <CardDescription>
                Выберите случайный сценарий для практики
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="h-auto py-6 flex-col gap-2"
                  onClick={() => {
                    const easyScenarios = trainingScenarios.filter(s => s.difficulty === 'easy');
                    if (easyScenarios.length > 0) {
                      handleStartTraining(easyScenarios[Math.floor(Math.random() * easyScenarios.length)]);
                    }
                  }}
                >
                  <div className="text-green-600 text-2xl">🌱</div>
                  <span className="font-medium">Лёгкий уровень</span>
                  <span className="text-xs text-muted-foreground">Для новичков</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto py-6 flex-col gap-2"
                  onClick={() => {
                    const mediumScenarios = trainingScenarios.filter(s => s.difficulty === 'medium');
                    if (mediumScenarios.length > 0) {
                      handleStartTraining(mediumScenarios[Math.floor(Math.random() * mediumScenarios.length)]);
                    }
                  }}
                >
                  <div className="text-yellow-600 text-2xl">⚡</div>
                  <span className="font-medium">Средний уровень</span>
                  <span className="text-xs text-muted-foreground">Стандартные ситуации</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto py-6 flex-col gap-2"
                  onClick={() => {
                    const hardScenarios = trainingScenarios.filter(s => s.difficulty === 'hard');
                    if (hardScenarios.length > 0) {
                      handleStartTraining(hardScenarios[Math.floor(Math.random() * hardScenarios.length)]);
                    }
                  }}
                >
                  <div className="text-red-600 text-2xl">🔥</div>
                  <span className="font-medium">Сложный уровень</span>
                  <span className="text-xs text-muted-foreground">Для опытных</span>
                </Button>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Практика на реальных диалогах</h4>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : dialogues.length > 0 ? (
                  <div className="space-y-2">
                    {dialogues.slice(0, 5).map((dialogue) => (
                      <div 
                        key={dialogue.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                        onClick={() => {
                          const scenario: TrainingScenario = {
                            id: dialogue.id,
                            title: dialogue.context_summary?.slice(0, 50) || 'Диалог',
                            description: dialogue.context_summary || '',
                            difficulty: dialogue.quality_score >= 5 ? 'hard' : dialogue.quality_score >= 4 ? 'medium' : 'easy',
                            intent: dialogue.intent || 'unknown',
                            issue: dialogue.issue || undefined,
                            dialogType: dialogue.scenario_type,
                            sampleDialogue: dialogue
                          };
                          handleStartTraining(scenario);
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {dialogue.context_summary?.slice(0, 60) || 'Без описания'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {dialogTypeLabels[dialogue.scenario_type] || dialogue.scenario_type}
                            </Badge>
                            {dialogue.intent && (
                              <Badge variant="outline" className="text-xs">
                                {intentLabels[dialogue.intent] || dialogue.intent}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Нет диалогов в библиотеке. Запустите индексацию для добавления примеров.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary">0</div>
                <p className="text-sm text-muted-foreground">Тренировок</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-green-600">—</div>
                <p className="text-sm text-muted-foreground">Средний балл</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-yellow-600">—</div>
                <p className="text-sm text-muted-foreground">Лучший результат</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-blue-600">0</div>
                <p className="text-sm text-muted-foreground">Сценариев пройдено</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Статистика будет доступна после прохождения тренировок
              </p>
              <Button 
                className="mt-4 gap-2"
                onClick={() => setActiveTab('scenarios')}
              >
                <Play className="h-4 w-4" />
                Начать тренировку
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
