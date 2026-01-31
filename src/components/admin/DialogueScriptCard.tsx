import { Star, MessageSquare, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

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
}

interface DialogueScriptCardProps {
  dialogue: DialogueExample;
  onClick: () => void;
}

const scenarioLabels: Record<string, string> = {
  new_lead: 'Новый лид',
  returning: 'Возврат клиента',
  complaint: 'Жалоба',
  upsell: 'Допродажа',
  reactivation: 'Реактивация',
  info_request: 'Запрос информации',
  scheduling: 'Запись',
  payment: 'Оплата',
  unknown: 'Прочее'
};

const outcomeLabels: Record<string, string> = {
  converted: 'Конверсия',
  resolved: 'Решено',
  scheduled: 'Записан',
  paid: 'Оплачено',
  retained: 'Сохранён',
  satisfied: 'Доволен',
  unknown: 'Прочее'
};

const scenarioColors: Record<string, string> = {
  new_lead: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  returning: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  complaint: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  upsell: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  reactivation: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  info_request: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  scheduling: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  payment: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
};

const outcomeColors: Record<string, string> = {
  converted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  resolved: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  scheduled: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
  paid: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
  retained: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  satisfied: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
};

export function DialogueScriptCard({ dialogue, onClick }: DialogueScriptCardProps) {
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
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header with badges and rating */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={scenarioColors[dialogue.scenario_type] || scenarioColors.unknown}>
              {scenarioLabels[dialogue.scenario_type] || dialogue.scenario_type}
            </Badge>
            <Badge className={outcomeColors[dialogue.outcome] || 'bg-gray-100 text-gray-800'}>
              {outcomeLabels[dialogue.outcome] || dialogue.outcome}
            </Badge>
          </div>
          <div className="flex items-center gap-0.5">
            {renderStars(dialogue.quality_score)}
          </div>
        </div>

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
          <div className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            <span>{messageCount} сообщений</span>
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
  );
}

export { scenarioLabels, outcomeLabels, scenarioColors, outcomeColors };
