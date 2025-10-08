import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { checkSupabaseHealth, type HealthCheckResult } from '@/utils/supabaseHealthCheck';

/**
 * Banner component that displays when Supabase server is unavailable
 */
export function SupabaseHealthBanner() {
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      const result = await checkSupabaseHealth();
      setHealth(result);
      
      // Show banner if server is not healthy
      if (!result.isHealthy && !isDismissed) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Check immediately
    checkHealth();

    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, [isDismissed]);

  if (!isVisible || !health || health.isHealthy) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4">
      <Alert variant="destructive" className="max-w-4xl mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            Сервер временно недоступен. 
            {!health.restAvailable && ' REST API недоступен.'}
            {!health.authAvailable && ' Сервис аутентификации недоступен.'}
            {' '}Пожалуйста, попробуйте позже или обратитесь к администратору.
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="ml-4 h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
