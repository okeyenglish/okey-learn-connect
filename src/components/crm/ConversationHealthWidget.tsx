import React, { useState } from 'react';
import { AlertTriangle, Shield, ShieldAlert, ChevronDown, ChevronUp, Activity, Lightbulb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ConversationHealthData } from '@/hooks/useConversationHealth';

interface ConversationHealthWidgetProps {
  health: ConversationHealthData | null;
  loading: boolean;
  compact?: boolean;
}

const SIGNAL_LABELS: Record<string, string> = {
  short_replies: 'Короткие ответы',
  slow_response: 'Медленные ответы',
  declining_engagement: 'Падение вовлечённости',
  stage_stagnation: 'Застой на стадии',
  manager_monologue: 'Монолог менеджера',
  no_questions: 'Нет вопросов',
  ok: 'Норма',
  insufficient_data: 'Мало данных',
};

export function ConversationHealthWidget({ health, loading, compact = false }: ConversationHealthWidgetProps) {
  const [expanded, setExpanded] = useState(false);

  if (loading && !health) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 animate-pulse">
        <Activity className="h-3 w-3 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">Расчёт health score...</span>
      </div>
    );
  }

  if (!health || health.dominant_signal === 'insufficient_data') return null;

  // Only show widget if there's a risk
  if (health.risk_level === 'ok') return null;

  const isCritical = health.risk_level === 'critical';
  const isWarning = health.risk_level === 'warning';

  const Icon = isCritical ? ShieldAlert : isWarning ? AlertTriangle : Shield;
  const riskLabel = isCritical ? 'Высокий риск' : 'Внимание';
  const signalLabel = SIGNAL_LABELS[health.dominant_signal] || health.dominant_signal;

  const containerClass = cn(
    'mx-1 mb-1 animate-in fade-in slide-in-from-bottom-2 duration-300',
  );

  const barClass = cn(
    'flex items-center gap-1.5 px-2 py-1.5 rounded-lg border',
    isCritical && 'border-destructive/30 bg-destructive/5',
    isWarning && 'border-amber-400/30 bg-amber-50/50 dark:bg-amber-900/10',
  );

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 px-1 py-1 animate-in fade-in slide-in-from-bottom-1 duration-200">
        <Icon className={cn('h-3 w-3', isCritical ? 'text-destructive' : 'text-amber-500')} />
        <Badge variant="outline" className={cn(
          'text-[9px] px-1 py-0 h-4 font-normal border',
          isCritical ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-amber-100 text-amber-700 border-amber-200',
        )}>
          {health.health_score}% · {signalLabel}
        </Badge>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div className={barClass}>
        {/* Risk icon + score */}
        <Icon className={cn('h-3.5 w-3.5 shrink-0', isCritical ? 'text-destructive' : 'text-amber-500')} />
        
        <Badge variant="outline" className={cn(
          'text-[10px] px-1.5 py-0 h-5 font-medium border shrink-0',
          isCritical ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-amber-100 text-amber-700 border-amber-200',
        )}>
          {riskLabel} · {health.health_score}%
        </Badge>

        {/* Reason */}
        <span className="text-[11px] text-foreground truncate flex-1 min-w-0">
          {health.reason}
        </span>

        {/* Expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 p-0.5 rounded hover:bg-muted/50 transition-colors"
        >
          {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </button>
      </div>

      {/* Expanded: recommendation + signal breakdown */}
      {expanded && (
        <div className="mt-1 px-2 py-1.5 rounded border border-border/50 bg-muted/20 animate-in fade-in slide-in-from-top-1 duration-150 space-y-1.5">
          {/* Recommendation */}
          <div className="flex items-start gap-1.5">
            <Lightbulb className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
            <span className="text-[11px] text-foreground leading-tight">{health.recommendation}</span>
          </div>
          
          {/* Signal bars */}
          <div className="space-y-1">
            {(['engagement', 'momentum', 'stage_progress', 'manager_behavior'] as const).map(key => {
              const signal = health.signals[key];
              if (!signal) return null;
              const score = signal.score ?? 0;
              const labels: Record<string, string> = {
                engagement: 'Вовлечённость',
                momentum: 'Динамика',
                stage_progress: 'Прогресс',
                manager_behavior: 'Менеджер',
              };
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground w-[70px] shrink-0">{labels[key]}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-amber-500' : 'bg-destructive',
                      )}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground w-[25px] text-right">{score}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
