import { useState } from 'react';
import { Copy, Star, User, Headphones, Lightbulb, Heart, MessageSquare, Send, Trash2, Target, AlertTriangle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { DialogueExample } from './DialogueScriptCard';
import { DialogueComment } from '@/hooks/useDialogueInteractions';
import {
  dialogTypeLabels,
  dialogTypeColors,
  outcomeLabels,
  outcomeColors,
  intentLabels,
  intentColors,
  issueLabels,
  issueColors,
  clientStageLabels,
  clientStageColors,
  intentDescriptions,
  issueDescriptions
} from '@/lib/dialogueTags';

interface DialogueScriptDetailProps {
  dialogue: DialogueExample | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  comments?: DialogueComment[];
  onAddComment?: (text: string) => Promise<DialogueComment | null>;
  onDeleteComment?: (commentId: string) => Promise<boolean>;
}

export function DialogueScriptDetail({ 
  dialogue, 
  open, 
  onOpenChange,
  isFavorite = false,
  onToggleFavorite,
  comments = [],
  onAddComment,
  onDeleteComment
}: DialogueScriptDetailProps) {
  const { toast } = useToast();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleAddComment = async () => {
    if (!newComment.trim() || !onAddComment) return;
    
    setIsSubmitting(true);
    const result = await onAddComment(newComment.trim());
    setIsSubmitting(false);
    
    if (result) {
      setNewComment('');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!onDeleteComment) return;
    await onDeleteComment(commentId);
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
  const confidencePercent = dialogue.confidence_score ? Math.round(dialogue.confidence_score * 100) : 80;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-xl">
                  Скрипт диалога
                </SheetTitle>
                {onToggleFavorite && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleFavorite}
                    className="shrink-0"
                  >
                    <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                  </Button>
                )}
              </div>
              
              {/* Primary badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={dialogTypeColors[dialogue.scenario_type] || 'bg-gray-100'}>
                  {dialogTypeLabels[dialogue.scenario_type] || dialogue.scenario_type}
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

              {/* Secondary badges: intent, issue, stage */}
              <div className="flex items-center gap-2 flex-wrap">
                {dialogue.client_stage && (
                  <Badge variant="outline" className={clientStageColors[dialogue.client_stage] || ''}>
                    {clientStageLabels[dialogue.client_stage] || dialogue.client_stage}
                  </Badge>
                )}
                {dialogue.intent && dialogue.intent !== 'unknown' && (
                  <Badge variant="outline" className={`${intentColors[dialogue.intent] || ''}`}>
                    <Target className="h-3 w-3 mr-1" />
                    {intentLabels[dialogue.intent] || dialogue.intent}
                  </Badge>
                )}
                {dialogue.issue && (
                  <Badge variant="outline" className={`${issueColors[dialogue.issue] || ''}`}>
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {issueLabels[dialogue.issue] || dialogue.issue}
                  </Badge>
                )}
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

            {/* Intent & Issue details */}
            {(dialogue.intent || dialogue.issue) && (
              <div className="grid grid-cols-2 gap-3">
                {dialogue.intent && dialogue.intent !== 'unknown' && (
                  <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Target className="h-4 w-4 text-primary" />
                      Намерение
                    </div>
                    <p className="text-sm font-semibold">
                      {intentLabels[dialogue.intent]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {intentDescriptions[dialogue.intent]}
                    </p>
                  </div>
                )}
                {dialogue.issue && (
                  <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Возражение
                    </div>
                    <p className="text-sm font-semibold">
                      {issueLabels[dialogue.issue]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {issueDescriptions[dialogue.issue]}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Confidence score */}
            {dialogue.confidence_score && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    Уверенность классификации
                  </span>
                  <span className={confidencePercent >= 80 ? 'text-green-600' : confidencePercent >= 60 ? 'text-yellow-600' : 'text-red-600'}>
                    {confidencePercent}%
                  </span>
                </div>
                <Progress value={confidencePercent} className="h-2" />
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

            {/* Comments Section */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wide flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Мои заметки ({comments.length})
              </h3>

              {/* Add comment form */}
              {onAddComment && (
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Добавить заметку..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[60px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        handleAddComment();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || isSubmitting}
                    className="shrink-0 self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Comments list */}
              {comments.length > 0 && (
                <div className="space-y-2">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="bg-muted/50 rounded-lg p-3 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm whitespace-pre-wrap flex-1">
                          {comment.comment_text}
                        </p>
                        {onDeleteComment && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(comment.created_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
