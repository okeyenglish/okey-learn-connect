/**
 * PWAUpdateBanner
 * 
 * Shows a non-intrusive banner when a new PWA version is available.
 * User can click "Обновить" to apply the update immediately.
 */
import { usePWAUpdate } from '@/hooks/usePWAUpdate';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { useState } from 'react';

export function PWAUpdateBanner() {
  const { updateAvailable, isUpdating, applyUpdate } = usePWAUpdate();
  const [dismissed, setDismissed] = useState(false);

  if (!updateAvailable || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4 flex items-center gap-3">
        <RefreshCw className="h-5 w-5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Доступно обновление</p>
          <p className="text-xs opacity-90">Нажмите для применения</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={applyUpdate}
            disabled={isUpdating}
            className="h-8"
          >
            {isUpdating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              'Обновить'
            )}
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-primary-foreground/20 rounded transition-colors"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
