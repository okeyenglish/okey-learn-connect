import { Star, MessageSquare, Calendar, Heart, Target, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  dialogTypeLabels, 
  dialogTypeColors, 
  outcomeLabels, 
  outcomeColors,
  intentLabels,
  intentColors,
  issueLabels,
  issueColors,
  intentDescriptions,
  issueDescriptions
} from '@/lib/dialogueTags';

interface DialogueMessage {
  role: 'manager' | 'client';
  content: string;
  timestamp: string;
}

export interface DialogueExample {
  id: string;
  scenario_type: string;
  outcome: string;
  quality_score: number;
  context_summary: string;
  example_messages: DialogueMessage[];
  key_phrases: string[];
  created_at: string;
  message_count?: number;
  // Новые поля
  intent?: string | null;
  issue?: string | null;
  confidence_score?: number;
  client_stage?: string;
}

interface DialogueScriptCardProps {
  dialogue: DialogueExample;
  onClick: () => void;
  isFavorite?: boolean;
  commentCount?: number;
}

// Re-export for backward compatibility
export const scenarioLabels = dialogTypeLabels;
export const scenarioColors = dialogTypeColors;
export { outcomeLabels, outcomeColors };

export function DialogueScriptCard({ dialogue, onClick, isFavorite, commentCount = 0 }: DialogueScriptCardProps) {
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

  const messageCount = dialogue.message_count || dialogue.example_messages?.length || 0;

  return (
    <TooltipProvider>
      <Card
        className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 relative"
        onClick={onClick}
      >
        {/* Favorite indicator */}
        {isFavorite && (
          <div className="absolute top-2 right-2 z-10">
            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
          </div>
        )}
        
        <CardContent className="p-4">
          {/* Header with badges and rating */}
          <div className="flex items-center justify-between mb-3 pr-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={dialogTypeColors[dialogue.scenario_type] || dialogTypeColors.unknown}>
                {dialogTypeLabels[dialogue.scenario_type] || dialogue.scenario_type}
              </Badge>
              <Badge className={outcomeColors[dialogue.outcome] || 'bg-gray-100 text-gray-800'}>
                {outcomeLabels[dialogue.outcome] || dialogue.outcome}
              </Badge>
            </div>
            <div className="flex items-center gap-0.5">
              {renderStars(dialogue.quality_score)}
            </div>
          </div>

          {/* Intent & Issue badges */}
          {(dialogue.intent || dialogue.issue) && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {dialogue.intent && dialogue.intent !== 'unknown' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${intentColors[dialogue.intent] || ''} border-current`}
                    >
                      <Target className="h-3 w-3 mr-1" />
                      {intentLabels[dialogue.intent] || dialogue.intent}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      {intentDescriptions[dialogue.intent] || 'Намерение клиента'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
              {dialogue.issue && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${issueColors[dialogue.issue] || ''} border-current`}
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {issueLabels[dialogue.issue] || dialogue.issue}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      {issueDescriptions[dialogue.issue] || 'Возражение клиента'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {/* Summary */}
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
            {dialogue.context_summary || 'Нет описания'}
          </p>

          {/* Key phrases preview */}
          {dialogue.key_phrases && dialogue.key_phrases.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {dialogue.key_phrases.slice(0, 2).map((phrase, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-primary/10 text-primary rounded px-2 py-0.5 truncate max-w-[150px]"
                  title={phrase}
                >
                  "{phrase}"
                </span>
              ))}
              {dialogue.key_phrases.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{dialogue.key_phrases.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span>{messageCount}</span>
              </div>
              {commentCount > 0 && (
                <div className="flex items-center gap-1 text-primary">
                  <MessageSquare className="h-3 w-3" />
                  <span>{commentCount} заметок</span>
                </div>
              )}
              {dialogue.confidence_score && dialogue.confidence_score < 0.8 && (
                <Tooltip>
                  <TooltipTrigger>
                    <span className="text-orange-500">⚠️</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Низкая уверенность классификации ({Math.round(dialogue.confidence_score * 100)}%)</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                {format(new Date(dialogue.created_at), 'd MMM yyyy', { locale: ru })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
