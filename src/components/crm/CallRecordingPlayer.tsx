import React, { useState, useRef, useCallback, useEffect, memo } from "react";
import { Play, Pause, Download, AlertCircle, Loader2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface CallRecordingPlayerProps {
  recordingUrl: string;
  duration?: number | null;
  className?: string;
  compact?: boolean;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const CallRecordingPlayer = memo<CallRecordingPlayerProps>(({ 
  recordingUrl, 
  duration,
  className,
  compact = true
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  // Lazy load audio only when play is clicked
  const initializeAudio = useCallback(() => {
    if (audioRef.current || isAudioLoaded) return audioRef.current;
    
    const audio = new Audio();
    audio.preload = 'metadata';
    
    audio.onloadedmetadata = () => {
      setAudioDuration(audio.duration);
      setIsLoading(false);
      setIsAudioLoaded(true);
    };
    
    audio.oncanplaythrough = () => {
      setIsLoading(false);
    };
    
    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    
    audio.onerror = () => {
      setHasError(true);
      setIsLoading(false);
      setIsPlaying(false);
    };
    
    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);
    
    audio.src = recordingUrl;
    audioRef.current = audio;
    
    return audio;
  }, [recordingUrl, isAudioLoaded]);

  const handlePlayPause = useCallback(() => {
    if (hasError) return;
    
    let audio = audioRef.current;
    
    if (!audio) {
      setIsLoading(true);
      audio = initializeAudio();
      if (!audio) return;
      
      audio.play().catch(() => {
        setHasError(true);
        setIsLoading(false);
      });
      return;
    }
    
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {
        setHasError(true);
      });
    }
  }, [hasError, isPlaying, initializeAudio]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioDuration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * audioDuration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [audioDuration]);

  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = recordingUrl;
    link.download = `recording-${Date.now()}.mp3`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [recordingUrl]);

  const progressValue = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;
  const displayDuration = audioDuration || duration || 0;

  if (hasError) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <AlertCircle className="h-3.5 w-3.5 text-destructive" />
        <span>Запись недоступна</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-2 bg-muted/50 rounded-md px-2 py-1.5",
      compact ? "min-w-[180px]" : "min-w-[240px]",
      className
    )}>
      {/* Play/Pause button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePlayPause}
        disabled={isLoading}
        className="h-7 w-7 p-0 flex-shrink-0"
        aria-label={isPlaying ? "Пауза" : "Воспроизвести"}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
      </Button>

      {/* Time display */}
      <span className="text-[10px] text-muted-foreground tabular-nums w-[30px] flex-shrink-0">
        {formatTime(currentTime)}
      </span>

      {/* Progress bar */}
      <div 
        className="flex-1 cursor-pointer min-w-[60px]"
        onClick={handleProgressClick}
        role="slider"
        aria-label="Прогресс воспроизведения"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressValue}
      >
        <Progress value={progressValue} className="h-1.5" />
      </div>

      {/* Duration */}
      <span className="text-[10px] text-muted-foreground tabular-nums w-[30px] flex-shrink-0">
        {formatTime(displayDuration)}
      </span>

      {/* Download button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDownload}
        className="h-6 w-6 p-0 flex-shrink-0"
        aria-label="Скачать запись"
      >
        <Download className="h-3 w-3" />
      </Button>
    </div>
  );
});

CallRecordingPlayer.displayName = 'CallRecordingPlayer';
