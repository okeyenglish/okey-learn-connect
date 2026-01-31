import { Copy, Star, User, Headphones, X, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { DialogueExample, scenarioLabels, outcomeLabels, scenarioColors, outcomeColors } from './DialogueScriptCard';

interface DialogueScriptDetailProps {
  dialogue: DialogueExample | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DialogueScriptDetail({ dialogue, open, onOpenChange }: DialogueScriptDetailProps) {
  const { toast } = useToast();

  if (!dialogue) return null;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Скопировано',
        description: 'Фраза скопирована в буфер обмена',
      });
    } catch {
      toast({
        title: 'Ошибка',
        description: 'Не удалось скопировать',
        variant: 'destructive'
      });
    }
  };

  const renderStars = (score: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < score ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const messages = dialogue.example_messages || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <SheetTitle className="text-xl">
                Скрипт диалога
              </SheetTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={scenarioColors[dialogue.scenario_type] || 'bg-gray-100'}>
                  {scenarioLabels[dialogue.scenario_type] || dialogue.scenario_type}
                </Badge>
                <Badge className={outcomeColors[dialogue.outcome] || 'bg-gray-100'}>
                  {outcomeLabels[dialogue.outcome] || dialogue.outcome}
                </Badge>
                <div className="flex items-center gap-0.5">
                  {renderStars(dialogue.quality_score)}
                  <span className="ml-1 text-sm text-muted-foreground">
                    ({dialogue.quality_score.toFixed(1)})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {/* Context */}
            {dialogue.context_summary && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wide">
                  Контекст
                </h3>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">
                  {dialogue.context_summary}
                </p>
              </div>
            )}

            {/* Key Phrases */}
            {dialogue.key_phrases && dialogue.key_phrases.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wide flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Ключевые фразы
                </h3>
                <div className="space-y-2">
                  {dialogue.key_phrases.map((phrase, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 bg-primary/5 border border-primary/20 rounded-lg p-2"
                    >
                      <span className="text-sm text-primary font-medium">
                        "{phrase}"
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => copyToClipboard(phrase)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Dialogue */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wide">
                Диалог ({messages.length} сообщений)
              </h3>
              
              {messages.length > 0 ? (
                <div className="space-y-3">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 ${
                        msg.role === 'manager' ? 'flex-row' : 'flex-row-reverse'
                      }`}
                    >
                      {/* Avatar */}
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

                      {/* Message */}
                      <div
                        className={`flex-1 ${
                          msg.role === 'manager' ? 'pr-8' : 'pl-8'
                        }`}
                      >
                        <div
                          className={`rounded-lg p-3 ${
                            msg.role === 'manager'
                              ? 'bg-primary/10 border border-primary/20'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 flex-1">
                              <p className="text-xs font-medium text-muted-foreground">
                                {msg.role === 'manager' ? 'Менеджер' : 'Клиент'}
                              </p>
                              <p className="text-sm whitespace-pre-wrap">
                                {msg.content}
                              </p>
                            </div>
                            {msg.role === 'manager' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 -mt-1 -mr-1"
                                onClick={() => copyToClipboard(msg.content)}
                                title="Копировать"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          {msg.timestamp && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(msg.timestamp), 'HH:mm', { locale: ru })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Сообщения диалога не доступны</p>
                  <p className="text-xs mt-1">
                    Запустите индексацию с сохранением example_messages
                  </p>
                </div>
              )}
            </div>

            {/* Metadata */}
            <Separator />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>ID: {dialogue.id}</p>
              <p>
                Добавлено: {format(new Date(dialogue.created_at), 'd MMMM yyyy, HH:mm', { locale: ru })}
              </p>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
