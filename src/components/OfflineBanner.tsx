import { WifiOff, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

export const OfflineBanner = () => {
  const { isOnline, queueLength, isSyncing } = useOfflineQueue();

  if (isOnline) return null;

  return (
    <Alert className="fixed top-0 left-0 right-0 z-50 rounded-none border-b border-destructive/50 bg-destructive/10">
      <div className="container mx-auto flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-sm font-medium text-destructive">
            Нет подключения к интернету
          </AlertDescription>
        </div>
        
        {queueLength > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isSyncing ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Синхронизация...</span>
              </>
            ) : (
              <span>{queueLength} действий в очереди</span>
            )}
          </div>
        )}
      </div>
    </Alert>
  );
};