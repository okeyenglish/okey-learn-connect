import { useState } from 'react';
import { Send, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAppGenerator } from '@/hooks/useAppGenerator';
import { AppViewer } from './AppViewer';
import { ImprovementButtons } from './ImprovementButtons';
import { AppCard } from './AppCard';
interface Teacher {
  id: string;
  [key: string]: any;
}

interface AppGeneratorChatProps {
  teacher: Teacher;
}

export const AppGeneratorChat = ({ teacher }: AppGeneratorChatProps) => {
  const [brief, setBrief] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [format, setFormat] = useState<
    'quiz' | 'game' | 'flashcards' | 'matching' | 'test' | 'crossword' | 
    'wordSearch' | 'fillInBlanks' | 'dragAndDrop' | 'memory' | 'typing'
  >('quiz');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishTitle, setPublishTitle] = useState('');
  const [publishDescription, setPublishDescription] = useState('');
  const [lastPrompt, setLastPrompt] = useState<any>(null);
  
  const { 
    stage, 
    suggestOrGenerate, 
    generateApp, 
    improveApp,
    publishApp,
    isGenerating,
    isSuggesting,
    isPublishing,
    reset 
  } = useAppGenerator((teacher as any).profile_id || (teacher as any).user_id || teacher.id);

  const handleSubmit = () => {
    if (!brief.trim()) return;
    
    if (stage.stage === 'idle') {
      suggestOrGenerate({ brief, answers: { format } });
    } else if (stage.stage === 'ask') {
      suggestOrGenerate({ brief, answers: { ...answers, format } });
    }
  };

  const handleGenerate = () => {
    if (stage.stage === 'generate') {
      const prompt = (stage as any).prompt || { 
        title: 'New App', 
        type: format, 
        brief,
        description: brief 
      };
      setLastPrompt(prompt);
      generateApp({ prompt });
    }
  };

  const handleRegenerateWithFormat = () => {
    if (lastPrompt) {
      const newPrompt = { ...lastPrompt, type: format };
      generateApp({ prompt: newPrompt, appId: stage.result?.app_id });
    }
  };

  const handlePublish = () => {
    if (stage.result?.app_id && publishTitle.trim() && publishDescription.trim()) {
      publishApp({ 
        appId: stage.result.app_id, 
        title: publishTitle, 
        description: publishDescription 
      });
      setPublishDialogOpen(false);
      setPublishTitle('');
      setPublishDescription('');
    }
  };

  const handleImprove = (request: string) => {
    if (stage.result?.app_id) {
      improveApp({ appId: stage.result.app_id, request });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Генератор приложений
          </CardTitle>
          <CardDescription>
            Опишите, какое приложение или игру вы хотите создать
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Например: Игра на закрепление do/does для A1"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              disabled={isGenerating || isSuggesting}
            />
            <Button 
              onClick={handleSubmit}
              disabled={!brief.trim() || isGenerating || isSuggesting}
            >
              {isSuggesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-muted-foreground">Формат игры:</span>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'quiz', label: 'Квиз', icon: '❓' },
                { key: 'crossword', label: 'Кроссворд', icon: '🔤' },
                { key: 'flashcards', label: 'Карточки', icon: '🎴' },
                { key: 'matching', label: 'Сопоставление', icon: '🔗' },
                { key: 'wordSearch', label: 'Поиск слов', icon: '🔍' },
                { key: 'fillInBlanks', label: 'Заполни пропуски', icon: '📝' },
                { key: 'memory', label: 'Мемори', icon: '🧠' },
                { key: 'dragAndDrop', label: 'Перетаскивание', icon: '🎯' },
                { key: 'test', label: 'Тест', icon: '📋' },
                { key: 'typing', label: 'Тренажер набора', icon: '⌨️' },
                { key: 'game', label: 'Игра', icon: '🎮' },
              ].map((opt) => (
                <Badge
                  key={opt.key}
                  variant={format === (opt.key as any) ? "default" : "outline"}
                  className="cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => setFormat(opt.key as any)}
                >
                  <span className="mr-1">{opt.icon}</span>
                  {opt.label}
                </Badge>
              ))}
            </div>
          </div>

          {stage.stage === 'ask' && stage.questions && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <p className="font-medium">{stage.message}</p>
              {stage.questions.map((q) => (
                <div key={q.key} className="space-y-2">
                  <label className="text-sm font-medium">{q.q}</label>
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((opt) => (
                      <Badge
                        key={opt}
                        variant={answers[q.key] === opt ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setAnswers({ ...answers, [q.key]: opt })}
                      >
                        {opt}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={isSuggesting}>
                  Продолжить
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // Generate with defaults even without answers
                    const prompt = {
                      title: 'New App',
                      type: format,
                      brief: brief,
                      description: brief,
                      level: 'A2',
                      duration: 10,
                      features: ['timer', 'results']
                    };
                    generateApp({ prompt });
                  }}
                  disabled={isGenerating}
                >
                  Создать с базовыми настройками
                </Button>
              </div>
            </div>
          )}

          {stage.stage === 'offer' && stage.suggestions && (
            <div className="space-y-4">
              <p className="font-medium">{stage.message}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stage.suggestions.map((app: any) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    onOpen={() => window.open(app.preview_url, '_blank')}
                  />
                ))}
              </div>
              <Button onClick={() => { setBrief(''); reset(); }}>
                Создать новое приложение
              </Button>
            </div>
          )}

          {stage.stage === 'generate' && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <p className="font-medium">{stage.message || 'Готов создать приложение'}</p>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  'Создать приложение'
                )}
              </Button>
            </div>
          )}

          {isGenerating && (
            <div className="flex items-center gap-2 p-4 border rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p>Создаю приложение... Это может занять до минуты.</p>
            </div>
          )}

          {stage.stage === 'done' && stage.result && (
            <div className="space-y-4">
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle>Приложение готово!</CardTitle>
                  <CardDescription>
                    Вы можете просмотреть, улучшить или опубликовать приложение
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button onClick={() => setViewerOpen(true)}>
                      Открыть предпросмотр
                    </Button>
                    <Button 
                      variant="secondary"
                      onClick={() => setPublishDialogOpen(true)}
                      disabled={isPublishing}
                    >
                      Опубликовать
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        reset();
                        setBrief('');
                        setAnswers({});
                        setLastPrompt(null);
                      }}
                    >
                      Создать новое
                    </Button>
                  </div>

                  {lastPrompt && (
                    <div className="p-3 border rounded-lg bg-muted/50 space-y-2">
                      <p className="text-sm font-medium">Перегенерировать с другим форматом:</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { key: 'quiz', label: 'Квиз', icon: '❓' },
                          { key: 'crossword', label: 'Кроссворд', icon: '🔤' },
                          { key: 'flashcards', label: 'Карточки', icon: '🎴' },
                          { key: 'matching', label: 'Сопоставление', icon: '🔗' },
                          { key: 'wordSearch', label: 'Поиск слов', icon: '🔍' },
                          { key: 'fillInBlanks', label: 'Заполни пропуски', icon: '📝' },
                          { key: 'memory', label: 'Мемори', icon: '🧠' },
                          { key: 'dragAndDrop', label: 'Перетаскивание', icon: '🎯' },
                          { key: 'test', label: 'Тест', icon: '📋' },
                          { key: 'typing', label: 'Тренажер набора', icon: '⌨️' },
                          { key: 'game', label: 'Игра', icon: '🎮' },
                        ].map((opt) => (
                          <Badge
                            key={opt.key}
                            variant={format === (opt.key as any) ? "default" : "outline"}
                            className="cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => setFormat(opt.key as any)}
                          >
                            <span className="mr-1">{opt.icon}</span>
                            {opt.label}
                          </Badge>
                        ))}
                      </div>
                      <Button 
                        onClick={handleRegenerateWithFormat}
                        disabled={isGenerating}
                        size="sm"
                        className="w-full"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Перегенерация...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Перегенерировать как {
                              [
                                { key: 'quiz', label: 'Квиз' },
                                { key: 'crossword', label: 'Кроссворд' },
                                { key: 'flashcards', label: 'Карточки' },
                                { key: 'matching', label: 'Сопоставление' },
                                { key: 'wordSearch', label: 'Поиск слов' },
                                { key: 'fillInBlanks', label: 'Заполни пропуски' },
                                { key: 'memory', label: 'Мемори' },
                                { key: 'dragAndDrop', label: 'Перетаскивание' },
                                { key: 'test', label: 'Тест' },
                                { key: 'typing', label: 'Тренажер набора' },
                                { key: 'game', label: 'Игра' },
                              ].find((opt) => opt.key === format)?.label
                            }
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <ImprovementButtons 
                onImprove={handleImprove}
                disabled={isGenerating}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {stage.result && (
        <AppViewer
          appId={stage.result.app_id}
          previewUrl={stage.result.preview_url}
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          teacherId={(teacher as any).user_id || teacher.id}
        />
      )}

      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Опубликовать приложение</DialogTitle>
            <DialogDescription>
              Добавьте название и описание, чтобы опубликовать приложение в каталог
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Название</Label>
              <Input
                id="title"
                placeholder="Например: Игра на закрепление do/does"
                value={publishTitle}
                onChange={(e) => setPublishTitle(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                placeholder="Опишите, что изучает ученик в этом приложении..."
                value={publishDescription}
                onChange={(e) => setPublishDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPublishDialogOpen(false);
                setPublishTitle('');
                setPublishDescription('');
              }}
            >
              Отмена
            </Button>
            <Button
              onClick={handlePublish}
              disabled={!publishTitle.trim() || !publishDescription.trim() || isPublishing}
            >
              {isPublishing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Публикация...
                </>
              ) : (
                'Опубликовать'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
