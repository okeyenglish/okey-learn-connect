import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Bell, X, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FocusModeWarningProps {
  className?: string;
  /** If true, show compact inline version */
  compact?: boolean;
}

/**
 * Detects when push notifications might be suppressed by OS Focus/DND mode
 * by checking if a test notification was received by SW but not shown
 */
export function FocusModeWarning({ className, compact = false }: FocusModeWarningProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Check localStorage for Focus mode detection flag
  useEffect(() => {
    const checkFocusMode = () => {
      try {
        const detected = localStorage.getItem('push:focus_mode_detected');
        const detectedAt = localStorage.getItem('push:focus_mode_detected_at');
        
        if (detected === 'true' && detectedAt) {
          // Only show warning if detected within last hour
          const timestamp = parseInt(detectedAt, 10);
          const oneHourAgo = Date.now() - 60 * 60 * 1000;
          
          if (timestamp > oneHourAgo) {
            setShowWarning(true);
          } else {
            // Clear old detection
            localStorage.removeItem('push:focus_mode_detected');
            localStorage.removeItem('push:focus_mode_detected_at');
          }
        }
      } catch {
        // Ignore localStorage errors
      }
    };

    checkFocusMode();
    
    // Listen for focus mode detection events from SW bridge
    const onMessage = (event: MessageEvent) => {
      const msg = event.data as any;
      if (msg?.type === 'PUSH_RECEIVED_BUT_NOT_SHOWN') {
        setShowWarning(true);
        try {
          localStorage.setItem('push:focus_mode_detected', 'true');
          localStorage.setItem('push:focus_mode_detected_at', String(Date.now()));
        } catch {
          // ignore
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', onMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onMessage);
      }
    };
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.removeItem('push:focus_mode_detected');
      localStorage.removeItem('push:focus_mode_detected_at');
    } catch {
      // ignore
    }
  }, []);

  const handleRecheck = useCallback(() => {
    setIsChecking(true);
    // Clear the flag and hide warning - next push test will re-detect if still an issue
    try {
      localStorage.removeItem('push:focus_mode_detected');
      localStorage.removeItem('push:focus_mode_detected_at');
    } catch {
      // ignore
    }
    setShowWarning(false);
    setTimeout(() => setIsChecking(false), 1000);
  }, []);

  if (!showWarning || dismissed) {
    return null;
  }

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400",
        className
      )}>
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1">Возможно включён режим «Не беспокоить»</span>
        <button 
          onClick={handleDismiss}
          className="p-1 hover:bg-amber-500/20 rounded"
          aria-label="Закрыть"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <Alert className={cn("border-amber-500/50 bg-amber-500/10", className)}>
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertTitle className="text-amber-600 dark:text-amber-400">
        Push-уведомления могут быть заглушены
      </AlertTitle>
      <AlertDescription className="text-amber-600/80 dark:text-amber-400/80">
        <p className="mb-3">
          Push дошёл до устройства, но системный баннер не появился. 
          Возможные причины:
        </p>
        <ul className="list-disc list-inside space-y-1 mb-3 text-sm">
          <li>Включён режим <strong>«Фокус»</strong> или <strong>«Не беспокоить»</strong></li>
          <li>Приложение было активно на переднем плане</li>
          <li>Уведомления для браузера заглушены в настройках ОС</li>
          <li>На iOS: открыта другая вкладка Safari</li>
        </ul>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline"
            className="border-amber-500/50 hover:bg-amber-500/20"
            onClick={handleRecheck}
            disabled={isChecking}
          >
            <RefreshCw className={cn("h-3 w-3 mr-1", isChecking && "animate-spin")} />
            Проверить снова
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={handleDismiss}
          >
            Понятно
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Hook to detect and report Focus/DND mode
 * Should be called when a push was sent and SW confirmed receipt
 */
export function useFocusModeDetection() {
  const markAsDetected = useCallback(() => {
    try {
      localStorage.setItem('push:focus_mode_detected', 'true');
      localStorage.setItem('push:focus_mode_detected_at', String(Date.now()));
    } catch {
      // ignore
    }
  }, []);

  const clearDetection = useCallback(() => {
    try {
      localStorage.removeItem('push:focus_mode_detected');
      localStorage.removeItem('push:focus_mode_detected_at');
    } catch {
      // ignore
    }
  }, []);

  return { markAsDetected, clearDetection };
}
