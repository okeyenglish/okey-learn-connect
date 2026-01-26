import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Lightbulb, 
  Target, 
  ChevronDown, 
  ChevronUp,
  Clock,
  Flag
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AiCallEvaluation {
  overall_score: number;
  scores: {
    greeting: number;
    needs_identification: number;
    product_presentation: number;
    objection_handling: number;
    closing: number;
  };
  summary: string;
  call_purpose: string;
  call_result: string;
  key_points: string[];
  strengths: string[];
  improvements: string[];
  action_items: {
    task: string;
    priority: 'high' | 'medium' | 'low';
    deadline?: string;
  }[];
  analyzed_at: string;
  model_used: string;
}

interface CallEvaluationCardProps {
  evaluation: AiCallEvaluation;
  transcription?: string | null;
}

const SCORE_LABELS: Record<keyof AiCallEvaluation['scores'], string> = {
  greeting: 'Приветствие',
  needs_identification: 'Выявление потребностей',
  product_presentation: 'Презентация услуг',
  objection_handling: 'Работа с возражениями',
  closing: 'Закрытие сделки'
};

const getScoreColor = (score: number): string => {
  if (score >= 8) return 'bg-green-500';
  if (score >= 5) return 'bg-yellow-500';
  return 'bg-red-500';
};

const getScoreTextColor = (score: number): string => {
  if (score >= 8) return 'text-green-600';
  if (score >= 5) return 'text-yellow-600';
  return 'text-red-600';
};

const getOverallScoreBg = (score: number): string => {
  if (score >= 8) return 'bg-green-100 border-green-300';
  if (score >= 5) return 'bg-yellow-100 border-yellow-300';
  return 'bg-red-100 border-red-300';
};

const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case 'high':
      return { 
        bg: 'bg-red-50 border-red-200', 
        text: 'text-red-700',
        badge: 'bg-red-100 text-red-700 border-red-200',
        icon: <Flag className="h-3 w-3" />,
        label: 'Срочно'
      };
    case 'medium':
      return { 
        bg: 'bg-orange-50 border-orange-200', 
        text: 'text-orange-700',
        badge: 'bg-orange-100 text-orange-700 border-orange-200',
        icon: <Clock className="h-3 w-3" />,
        label: 'Важно'
      };
    default:
      return { 
        bg: 'bg-blue-50 border-blue-200', 
        text: 'text-blue-700',
        badge: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: null,
        label: 'Обычно'
      };
  }
};

export const CallEvaluationCard: React.FC<CallEvaluationCardProps> = ({ 
  evaluation,
  transcription 
}) => {
  const [showTranscription, setShowTranscription] = useState(false);

  return (
    <div className="space-y-4">
      {/* Overall Score & Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-оценка звонка
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Score */}
          <div className="flex items-center gap-4">
            <div className={cn(
              "flex items-center justify-center w-16 h-16 rounded-full border-2 font-bold text-2xl",
              getOverallScoreBg(evaluation.overall_score),
              getScoreTextColor(evaluation.overall_score)
            )}>
              {evaluation.overall_score.toFixed(1)}
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm text-muted-foreground mb-1">Общая оценка</div>
              <p className="text-sm">{evaluation.summary}</p>
            </div>
          </div>

          {/* Call Purpose & Result */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground mb-1">Цель звонка</div>
              <div className="font-medium">{evaluation.call_purpose}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Результат</div>
              <div className="font-medium">{evaluation.call_result}</div>
            </div>
          </div>

          {/* Criteria Scores */}
          <div className="space-y-3 pt-2">
            <div className="text-sm font-medium text-muted-foreground">Оценка по критериям</div>
            {Object.entries(evaluation.scores).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{SCORE_LABELS[key as keyof typeof SCORE_LABELS]}</span>
                  <span className={cn("font-medium", getScoreTextColor(value))}>
                    {value}/10
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all", getScoreColor(value))}
                    style={{ width: `${value * 10}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Items */}
      {evaluation.action_items && evaluation.action_items.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
              <Target className="h-5 w-5" />
              Задачи по итогам звонка
              <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700">
                {evaluation.action_items.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {evaluation.action_items.map((item, index) => {
              const config = getPriorityConfig(item.priority);
              return (
                <div 
                  key={index}
                  className={cn(
                    "p-3 rounded-lg border flex items-start gap-3",
                    config.bg
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={cn("text-xs", config.badge)}>
                        {config.icon}
                        <span className="ml-1">{config.label}</span>
                      </Badge>
                      {item.deadline && (
                        <span className="text-xs text-muted-foreground">
                          {item.deadline}
                        </span>
                      )}
                    </div>
                    <p className={cn("text-sm font-medium", config.text)}>
                      {item.task}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Key Points */}
      {evaluation.key_points && evaluation.key_points.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ключевые моменты
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {evaluation.key_points.map((point, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {point}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strengths & Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths */}
        {evaluation.strengths && evaluation.strengths.length > 0 && (
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Сильные стороны
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {evaluation.strengths.map((item, index) => (
                  <li key={index} className="text-sm text-green-700 flex items-start gap-2">
                    <span className="text-green-500 mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Improvements */}
        {evaluation.improvements && evaluation.improvements.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Рекомендации
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {evaluation.improvements.map((item, index) => (
                  <li key={index} className="text-sm text-yellow-700 flex items-start gap-2">
                    <span className="text-yellow-500 mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Transcription (Collapsible) */}
      {transcription && (
        <Collapsible open={showTranscription} onOpenChange={setShowTranscription}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                  <span>Транскрипция разговора</span>
                  <Button variant="ghost" size="sm" className="h-6 px-2">
                    {showTranscription ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="bg-muted/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {transcription}
                  </p>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Analysis Metadata */}
      <div className="text-xs text-muted-foreground text-center">
        Проанализировано {new Date(evaluation.analyzed_at).toLocaleString('ru-RU')} • {evaluation.model_used}
      </div>
    </div>
  );
};
