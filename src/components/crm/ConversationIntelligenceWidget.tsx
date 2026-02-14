import React, { useState } from 'react';
import { Brain, ChevronDown, ChevronUp, Lightbulb, TrendingUp, ArrowRight, Copy, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NextBestAction {
  action_type: string;
  action_label: string;
  action_detail?: string;
  priority: number;
  success_rate?: number;
}

interface ConversationState {
  stage: string;
  previous_stage?: string;
  is_transition: boolean;
  confidence: number;
  reason?: string;
  next_best_actions: NextBestAction[];
  messages_analyzed: number;
}

// Stage display configuration
const STAGE_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  greeting: { label: 'Приветствие', emoji: '👋', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  qualification: { label: 'Квалификация', emoji: '🎯', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  need_discovery: { label: 'Выявление потребности', emoji: '🔍', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  value_explanation: { label: 'Ценность', emoji: '💎', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  objection: { label: 'Возражение', emoji: '⚡', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  offer: { label: 'Предложение', emoji: '💰', color: 'bg-green-100 text-green-700 border-green-200' },
  closing: { label: 'Закрытие', emoji: '🎉', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  follow_up: { label: 'Фоллоуап', emoji: '🔄', color: 'bg-orange-100 text-orange-700 border-orange-200' },
};

interface ConversationIntelligenceWidgetProps {
  state: ConversationState | null;
  loading: boolean;
  onInsertAction?: (text: string) => void;
  onShowVariants?: () => void;
  compact?: boolean;
}

export function ConversationIntelligenceWidget({
  state,
  loading,
  onInsertAction,
  compact = false,
}: ConversationIntelligenceWidgetProps) {
  const [expanded, setExpanded] = useState(false);

  if (loading && !state) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 animate-pulse">
        <Brain className="h-3 w-3 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">Анализ диалога...</span>
      </div>
    );
  }

  if (!state || state.next_best_actions.length === 0) return null;

  const stageInfo = STAGE_CONFIG[state.stage] || {
    label: state.stage,
    emoji: '📋',
    color: 'bg-muted text-muted-foreground border-border',
  };

  const topAction = state.next_best_actions[0];
  const otherActions = state.next_best_actions.slice(1);
  const confidencePercent = Math.round(state.confidence * 100);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 px-1 py-1 animate-in fade-in slide-in-from-bottom-1 duration-200">
        <div className="flex items-center gap-1 shrink-0">
          <Brain className="h-3 w-3 text-primary" />
          <Badge variant="outline" className={cn('text-[9px] px-1 py-0 h-4 font-normal border', stageInfo.color)}>
            {stageInfo.emoji} {stageInfo.label}
          </Badge>
        </div>
        {topAction && (
          <button
            onClick={() => onInsertAction?.(topAction.action_detail || topAction.action_label)}
            className="shrink-0 flex items-center gap-1 px-2 py-0.5 text-[11px] leading-4 rounded-md border border-primary/20 bg-primary/5 text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Lightbulb className="h-2.5 w-2.5" />
            <span className="truncate max-w-[200px]">{topAction.action_label}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-1 mb-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Main suggestion bar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-primary/15 bg-primary/3">
        {/* Stage badge */}
        <div className="flex items-center gap-1 shrink-0">
          <Brain className="h-3.5 w-3.5 text-primary" />
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-5 font-medium border', stageInfo.color)}>
            {stageInfo.emoji} {stageInfo.label}
          </Badge>
          {confidencePercent >= 70 && (
            <span className="text-[9px] text-muted-foreground">{confidencePercent}%</span>
          )}
        </div>

        {/* Transition indicator */}
        {state.is_transition && state.previous_stage && (
          <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground shrink-0">
            <span>{STAGE_CONFIG[state.previous_stage]?.emoji || '•'}</span>
            <ArrowRight className="h-2.5 w-2.5" />
            <span>{stageInfo.emoji}</span>
          </div>
        )}

        {/* Top action */}
        {topAction && (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <Lightbulb className="h-3 w-3 text-amber-500 shrink-0" />
            <span className="text-[11px] text-foreground truncate">{topAction.action_label}</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          {topAction?.action_detail && (
            <Button
              size="sm"
              variant="ghost"
              className="h-5 px-1.5 text-[10px] text-primary hover:bg-primary/10"
              onClick={() => onInsertAction?.(topAction.action_detail!)}
              title="Вставить текст"
            >
              <Copy className="h-2.5 w-2.5 mr-0.5" />
              Вставить
            </Button>
          )}
          {otherActions.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0 text-muted-foreground"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          )}
        </div>
      </div>

      {/* Expanded actions */}
      {expanded && otherActions.length > 0 && (
        <div className="mt-1 space-y-0.5 px-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {otherActions.map((action, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2 py-1 rounded border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors group"
            >
              <Sparkles className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
              <span className="text-[11px] text-foreground flex-1 truncate">{action.action_label}</span>
              {action.success_rate != null && action.success_rate > 0 && (
                <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                  <TrendingUp className="h-2 w-2" />
                  {Math.round(action.success_rate * 100)}%
                </span>
              )}
              {action.action_detail && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-4 px-1 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onInsertAction?.(action.action_detail!)}
                >
                  <Copy className="h-2 w-2" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
