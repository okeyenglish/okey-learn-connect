import { memo } from 'react';
import { Cloud, CloudOff, Loader2, Image, Video, Music, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MediaCacheProgress } from '@/hooks/useAutoCacheImages';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

// Re-export type for backwards compatibility
export type ImageCacheProgress = MediaCacheProgress;

interface ImageCacheIndicatorProps {
  progress: MediaCacheProgress;
  className?: string;
  compact?: boolean;
  showDetails?: boolean;
}

/**
 * Visual indicator showing media caching progress
 * Shows cloud icon with progress when caching is active
 */
export const ImageCacheIndicator = memo(({
  progress,
  className,
  compact = false,
  showDetails = false,
}: ImageCacheIndicatorProps) => {
  const { total, cached, inProgress, isActive, percentage, byType } = progress;
  
  // Don't show if no media in chat
  if (total === 0) return null;
  
  const allCached = cached === total && !isActive;
  
  const content = (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs transition-all duration-300",
        isActive && "animate-pulse",
        allCached ? "text-green-500" : "text-muted-foreground",
        className
      )}
    >
      {isActive ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : allCached ? (
        <Cloud className="h-3.5 w-3.5" />
      ) : (
        <CloudOff className="h-3.5 w-3.5" />
      )}
      
      {!compact && (
        <span className="font-medium">
          {isActive ? (
            `${cached}/${total}`
          ) : allCached ? (
            `${total} 💾`
          ) : (
            `${cached}/${total}`
          )}
        </span>
      )}
      
      {/* Progress bar for active caching */}
      {isActive && !compact && (
        <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );

  const tooltipContent = (
    <div className="space-y-2">
      <div className="font-medium">
        {isActive
          ? `Кэширование: ${cached} из ${total} (${inProgress} в очереди)`
          : allCached
            ? `Все ${total} файлов сохранены для офлайн`
            : `${cached} из ${total} файлов сохранено`}
      </div>
      
      {showDetails && byType && (
        <div className="space-y-1 pt-1 border-t border-border/50">
          {byType.images?.total > 0 && (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Image className="h-3 w-3" /> Изображения
              </span>
              <span>{byType.images.cached}/{byType.images.total}</span>
            </div>
          )}
          {byType.videos?.total > 0 && (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Video className="h-3 w-3" /> Видео
              </span>
              <span>{byType.videos.cached}/{byType.videos.total}</span>
            </div>
          )}
          {byType.audio?.total > 0 && (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Music className="h-3 w-3" /> Аудио
              </span>
              <span>{byType.audio.cached}/{byType.audio.total}</span>
            </div>
          )}
          {byType.documents?.total > 0 && (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1 text-muted-foreground">
                <FileText className="h-3 w-3" /> Документы
              </span>
              <span>{byType.documents.cached}/{byType.documents.total}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-64">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

ImageCacheIndicator.displayName = 'ImageCacheIndicator';

// Re-export for new component name
export const MediaCacheIndicator = ImageCacheIndicator;
