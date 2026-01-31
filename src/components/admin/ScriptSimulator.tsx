import { useState, useEffect, useRef } from 'react';
import { 
  Send, ArrowLeft, User, Headphones, Timer, Lightbulb, 
  RotateCcw, CheckCircle, XCircle, Loader2, Sparkles, BookOpen
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { useToast } from '@/hooks/use-toast';
import { DialogueExample } from './DialogueScriptCard';
import { intentLabels, issueLabels, dialogTypeLabels } from '@/lib/dialogueTags';

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

interface Message {
  role: 'manager' | 'client' | 'system';
  content: string;
  timestamp: Date;
  feedback?: {
    score: number;
    suggestions: string[];
  };
}

interface ScriptSimulatorProps {
  scenario: TrainingScenario;
  onEnd: (score?: number) => void;
  sampleDialogue?: DialogueExample;
}

export function ScriptSimulator({ scenario, onEnd, sampleDialogue }: ScriptSimulatorProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionStarted && !sessionEnded) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionStarted, sessionEnded]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = async () => {
    setSessionStarted(true);
    setIsLoading(true);

    try {
      const response = await selfHostedPost<{ 
        success: boolean; 
        clientMessage: string;
        context: string;
      }>('script-trainer-session', {
        action: 'start',
        scenario: {
          intent: scenario.intent,
          issue: scenario.issue,
          dialogType: scenario.dialogType,
          description: scenario.description
        },
        sampleDialogue: sampleDialogue?.example_messages
      });

      if (response.success && response.data) {
        // System message with context
        setMessages([
          {
            role: 'system',
            content: response.data.context || `Сценарий: ${scenario.description}`,
            timestamp: new Date()
          },
          {
            role: 'client',
            content: response.data.clientMessage,
            timestamp: new Date()
          }
        ]);
      } else {
        // Fallback to local generation
        const fallbackMessages = generateFallbackStart();
        setMessages(fallbackMessages);
      }
    } catch (error) {
      console.error('Start session error:', error);
      // Use fallback
      const fallbackMessages = generateFallbackStart();
      setMessages(fallbackMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackStart = (): Message[] => {
    const openingLines: Record<string, string[]> = {
      'price_check': [
        'Здравствуйте! Я хотела бы узнать сколько стоят занятия английским?',
        'Добрый день, подскажите цены на обучение?',
        'Привет! Сколько у вас стоит месяц занятий?'
      ],
      'hesitation': [
        'Ну не знаю, мне нужно подумать...',
        'Мы пока не определились, дорого как-то...',
        'Надо посоветоваться с мужем/женой...'
      ],
      'program_choice': [
        'Здравствуйте! Моему ребёнку 7 лет, какая программа подойдёт?',
        'Добрый день, не могу определиться между групповыми и индивидуальными занятиями',
        'Подскажите, какой курс лучше для начинающего?'
      ],
      'comparison': [
        'А почему вы лучше чем школа X?',
        'В другой школе дешевле, почему у вас такие цены?',
        'Чем вы отличаетесь от конкурентов?'
      ]
    };

    const lines = openingLines[scenario.intent] || openingLines['price_check'];
    const clientMessage = lines[Math.floor(Math.random() * lines.length)];

    return [
      {
        role: 'system',
        content: `🎯 ${scenario.title}\n\n${scenario.description}`,
        timestamp: new Date()
      },
      {
        role: 'client',
        content: clientMessage,
        timestamp: new Date()
      }
    ];
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const managerMessage: Message = {
      role: 'manager',
      content: inputText.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, managerMessage]);
    setInputText('');
    setTurnCount(prev => prev + 1);
    setIsLoading(true);

    try {
      const response = await selfHostedPost<{
        success: boolean;
        clientResponse: string;
        feedback?: {
          score: number;
          suggestions: string[];
        };
        shouldEnd?: boolean;
        finalScore?: number;
        finalFeedback?: string[];
      }>('script-trainer-session', {
        action: 'respond',
        scenario: {
          intent: scenario.intent,
          issue: scenario.issue,
          dialogType: scenario.dialogType,
          description: scenario.description
        },
        conversation: [...messages.filter(m => m.role !== 'system'), managerMessage].map(m => ({
          role: m.role,
          content: m.content
        })),
        managerMessage: inputText.trim(),
        sampleDialogue: sampleDialogue?.example_messages,
        turnCount: turnCount + 1
      });

      if (response.success && response.data) {
        if (response.data.shouldEnd || turnCount >= 8) {
          // End session
          setMessages(prev => [...prev, {
            role: 'client',
            content: response.data.clientResponse,
            timestamp: new Date()
          }]);
          endSession(response.data.finalScore, response.data.finalFeedback);
        } else {
          setMessages(prev => [...prev, {
            role: 'client',
            content: response.data.clientResponse,
            timestamp: new Date(),
            feedback: response.data.feedback
          }]);
        }
      } else {
        // Fallback response
        const fallbackResponse = generateFallbackResponse();
        setMessages(prev => [...prev, {
          role: 'client',
          content: fallbackResponse,
          timestamp: new Date()
        }]);

        if (turnCount >= 6) {
          endSession(70, ['Неплохо! Продолжайте практиковаться.']);
        }
      }
    } catch (error) {
      console.error('Send message error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось получить ответ. Попробуйте ещё раз.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackResponse = (): string => {
    const responses: Record<string, string[]> = {
      'price_too_high': [
        'Ммм, всё равно дороговато для нас...',
        'А скидки какие-нибудь есть?',
        'Может есть рассрочка?'
      ],
      'no_time': [
        'Мы очень заняты, некогда возить...',
        'А онлайн формат есть?',
        'Какие есть варианты по времени?'
      ],
      'default': [
        'Понятно, а что ещё можете рассказать?',
        'Хорошо, давайте подробнее...',
        'Интересно, продолжайте...'
      ]
    };

    const key = scenario.issue || 'default';
    const lines = responses[key] || responses['default'];
    return lines[Math.floor(Math.random() * lines.length)];
  };

  const endSession = (score?: number, feedbackItems?: string[]) => {
    setSessionEnded(true);
    setFinalScore(score ?? 75);
    setFeedback(feedbackItems ?? ['Тренировка завершена. Продолжайте практиковаться!']);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getHints = () => {
    const hints: Record<string, string[]> = {
      'price_too_high': [
        'Покажите ценность: что входит в стоимость',
        'Сравните с результатом: сколько стоит репетитор?',
        'Предложите рассрочку или пробный урок'
      ],
      'no_time': [
        'Предложите гибкое расписание',
        'Упомяните онлайн-формат',
        'Узнайте конкретные ограничения'
      ],
      'child_motivation': [
        'Расскажите про игровой формат',
        'Упомяните успехи других детей',
        'Предложите познакомиться с преподавателем'
      ],
      'hesitation': [
        'Задайте уточняющий вопрос',
        'Предложите пробный урок без обязательств',
        'Узнайте что конкретно смущает'
      ]
    };

    return hints[scenario.issue || ''] || hints['hesitation'] || [];
  };

  // Not started view
  if (!sessionStarted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => onEnd()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
          <h1 className="text-xl font-semibold">{scenario.title}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Подготовка к тренировке
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                {scenario.description}
              </AlertDescription>
            </Alert>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {dialogTypeLabels[scenario.dialogType] || scenario.dialogType}
              </Badge>
              <Badge variant="outline">
                {intentLabels[scenario.intent] || scenario.intent}
              </Badge>
              {scenario.issue && (
                <Badge variant="outline" className="text-orange-600">
                  {issueLabels[scenario.issue] || scenario.issue}
                </Badge>
              )}
            </div>

            {sampleDialogue && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">Примеры ключевых фраз:</h4>
                <div className="space-y-2">
                  {sampleDialogue.key_phrases?.slice(0, 3).map((phrase, idx) => (
                    <div key={idx} className="text-sm bg-primary/5 rounded px-3 py-2 border-l-2 border-primary">
                      "{phrase}"
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4">
              <Button size="lg" className="w-full gap-2" onClick={startSession}>
                <Headphones className="h-5 w-5" />
                Начать тренировку
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Session ended view
  if (sessionEnded) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => onEnd(finalScore ?? undefined)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Завершить
          </Button>
          <h1 className="text-xl font-semibold">Результаты тренировки</h1>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="text-center">
              <div className="text-6xl font-bold mb-2" style={{
                color: finalScore && finalScore >= 80 ? 'var(--green-600)' : 
                       finalScore && finalScore >= 60 ? 'var(--yellow-600)' : 
                       'var(--red-600)'
              }}>
                {finalScore}%
              </div>
              <p className="text-muted-foreground">Ваш результат</p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-semibold">{turnCount}</div>
                <p className="text-xs text-muted-foreground">Реплик</p>
              </div>
              <div>
                <div className="text-2xl font-semibold">{formatTime(elapsedTime)}</div>
                <p className="text-xs text-muted-foreground">Время</p>
              </div>
              <div>
                <div className="text-2xl font-semibold">{scenario.difficulty}</div>
                <p className="text-xs text-muted-foreground">Сложность</p>
              </div>
            </div>

            {feedback.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Рекомендации:</h4>
                <ul className="space-y-1">
                  {feedback.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 gap-2"
                onClick={() => {
                  setSessionStarted(false);
                  setSessionEnded(false);
                  setMessages([]);
                  setTurnCount(0);
                  setElapsedTime(0);
                  setFinalScore(null);
                  setFeedback([]);
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Повторить
              </Button>
              <Button 
                className="flex-1 gap-2"
                onClick={() => onEnd(finalScore ?? undefined)}
              >
                <CheckCircle className="h-4 w-4" />
                Завершить
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active session view
  return (
    <div className="space-y-4 h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => endSession(50, ['Тренировка прервана'])}>
            <XCircle className="h-4 w-4 mr-2" />
            Завершить
          </Button>
          <h2 className="font-medium">{scenario.title}</h2>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="gap-1">
            <Timer className="h-3 w-3" />
            {formatTime(elapsedTime)}
          </Badge>
          <Badge variant="secondary">
            {turnCount} / 8 реплик
          </Badge>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowHints(!showHints)}
          >
            <Lightbulb className={`h-4 w-4 ${showHints ? 'text-yellow-500' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Progress */}
      <Progress value={(turnCount / 8) * 100} className="h-1" />

      {/* Hints panel */}
      {showHints && (
        <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200">
          <Lightbulb className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <ul className="list-disc list-inside text-sm space-y-1">
              {getHints().map((hint, idx) => (
                <li key={idx}>{hint}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Chat */}
      <Card className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${
                  msg.role === 'manager' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {msg.role !== 'system' && (
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === 'manager'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {msg.role === 'manager' ? (
                      <Headphones className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                )}

                <div
                  className={`flex-1 ${
                    msg.role === 'system' ? 'text-center' : 
                    msg.role === 'manager' ? 'pl-12' : 'pr-12'
                  }`}
                >
                  <div
                    className={`rounded-lg p-3 ${
                      msg.role === 'system'
                        ? 'bg-muted/50 text-sm text-muted-foreground'
                        : msg.role === 'manager'
                        ? 'bg-primary/10 border border-primary/20'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  
                  {msg.feedback && (
                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950 rounded text-xs">
                      <span className="font-medium">Оценка: {msg.feedback.score}/10</span>
                      {msg.feedback.suggestions.length > 0 && (
                        <p className="text-muted-foreground mt-1">
                          💡 {msg.feedback.suggestions[0]}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              placeholder="Ваш ответ клиенту..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[60px] resize-none"
              disabled={isLoading}
            />
            <Button 
              onClick={sendMessage} 
              disabled={!inputText.trim() || isLoading}
              className="shrink-0 self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Enter для отправки, Shift+Enter для новой строки
          </p>
        </div>
      </Card>
    </div>
  );
}
