import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { MessageSquareOff, Settings, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export const WhatsAppStatusNotification = () => {
  const { getMessengerSettings } = useWhatsApp();
  const [isConnected, setIsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      setIsLoading(true);
      try {
        const settings = await getMessengerSettings();
        
        // Проверяем, есть ли настройки
        if (!settings || !settings.isEnabled || !settings.instanceId || !settings.apiToken) {
          setIsConnected(false);
          setIsLoading(false);
          return;
        }
        
        // Проверяем реальное подключение через GreenAPI
        try {
          const response = await fetch(
            `${settings.apiUrl}/waInstance${settings.instanceId}/getStateInstance/${settings.apiToken}`,
            { method: 'GET' }
          );
          
          if (response.ok) {
            const data = await response.json();
            // GreenAPI возвращает stateInstance: 'authorized' когда всё подключено
            const isAuthorized = data.stateInstance === 'authorized';
            setIsConnected(isAuthorized);
          } else {
            setIsConnected(false);
          }
        } catch (apiError) {
          console.error('Error checking GreenAPI status:', apiError);
          setIsConnected(false);
        }
      } catch (error) {
        console.error('Error checking WhatsApp connection:', error);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();
    
    // Проверяем каждые 2 минуты
    const interval = setInterval(checkConnection, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [getMessengerSettings]);

  // Не показываем уведомление, если:
  // - еще загружается
  // - подключение есть
  // - пользователь закрыл уведомление
  if (isLoading || isConnected || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-5">
      <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800 shadow-lg">
        <div className="flex items-start gap-3">
          <MessageSquareOff className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <AlertDescription className="text-sm text-orange-800 dark:text-orange-200">
              <div className="font-medium mb-1">WhatsApp не подключен</div>
              <div className="text-orange-700 dark:text-orange-300 mb-2">
                Для отправки сообщений необходимо настроить интеграцию с WhatsApp
              </div>
              <Link to="/admin">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Настроить
                </Button>
              </Link>
            </AlertDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-orange-600 hover:text-orange-800 hover:bg-orange-100 dark:text-orange-400 dark:hover:bg-orange-900 flex-shrink-0"
            onClick={() => setIsDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Alert>
    </div>
  );
};
