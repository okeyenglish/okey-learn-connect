import { Sparkles, X, RefreshCw, Loader2, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RescueReplySuggestionsProps {
  strategies: string[];
  loading: boolean;
  riskLevel: 'warning' | 'critical';
  onSend: (text: string) => void;
  onDismiss: () => void;
  onRefresh: () => void;
  disabled?: boolean;
}

export function RescueReplySuggestions({
  strategies,
  loading,
  riskLevel,
  onSend,
  onDismiss,
  onRefresh,
  disabled = false,
}: RescueReplySuggestionsProps) {
  if (strategies.length === 0 && !loading) return null;

  const isCritical = riskLevel === 'critical';

  return (
    <div className={cn(
      'mx-1 mb-1 rounded-lg border p-2 animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-1.5',
      isCritical
        ? 'border-destructive/30 bg-destructive/5'
        : 'border-amber-400/30 bg-amber-50/50 dark:bg-amber-900/10',
    )}>
      {/* Header */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className={cn('h-3.5 w-3.5', isCritical ? 'text-destructive' : 'text-amber-500')} />
          <span className={cn(
            'text-[11px] font-medium',
            isCritical ? 'text-destructive' : 'text-amber-700 dark:text-amber-400'
          )}>
            {isCritical ? 'Rescue-стратегии' : 'Рекомендации'}
          </span>
          <Sparkles className="h-3 w-3 text-amber-500" />
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-0.5 rounded hover:bg-muted/50 transition-colors disabled:opacity-50"
            title="Обновить"
          >
            <RefreshCw className={cn('h-3 w-3 text-muted-foreground', loading && 'animate-spin')} />
          </button>
          <button
            onClick={onDismiss}
            className="p-0.5 rounded hover:bg-muted/50 transition-colors"
            title="Скрыть"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && strategies.length === 0 && (
        <div className="flex items-center gap-1.5 py-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">Генерирую rescue-ответы...</span>
        </div>
      )}

      {/* Strategies */}
      {strategies.length > 0 && (
        <div className="space-y-1">
          {strategies.map((text, i) => (
            <button
              key={i}
              onClick={() => onSend(text)}
              disabled={disabled}
              className={cn(
                'w-full text-left px-2.5 py-1.5 text-[11px] leading-4 rounded-md border transition-colors disabled:opacity-50',
                isCritical
                  ? 'border-destructive/20 bg-destructive/5 hover:bg-destructive/10 hover:border-destructive/30'
                  : 'border-amber-200 bg-amber-50/80 hover:bg-amber-100 hover:border-amber-300 dark:border-amber-800 dark:bg-amber-900/20 dark:hover:bg-amber-900/30',
                'text-foreground'
              )}
            >
              <span className="text-[9px] font-medium text-muted-foreground mr-1">
                {i === 0 ? '🤝 Мягкая' : i === 1 ? '🎯 Прямая' : '💎 Ценностная'}:
              </span>
              {text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
