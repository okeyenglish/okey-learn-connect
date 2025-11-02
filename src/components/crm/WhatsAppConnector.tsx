import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type WppStatus = 'connected' | 'disconnected' | 'qr_issued' | 'pairing';

export function WhatsAppConnector() {
  const [status, setStatus] = useState<WppStatus>('disconnected');
  const [qr, setQr] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const { toast } = useToast();

  async function fetchStatus() {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const { data, error } = await supabase.functions.invoke('wpp-status', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) {
        console.error('Error fetching WPP status:', error);
        return;
      }

      if (data?.ok) {
        setStatus(data.status);
        setQr(data.qrcode || null);
      }
    } catch (error) {
      console.error('Error in fetchStatus:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function startPairing() {
    setIsStarting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast({
          title: "Ошибка",
          description: "Необходимо авторизоваться",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('wpp-start', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) {
        console.error('Error starting WPP session:', error);
        toast({
          title: "Ошибка",
          description: `Не удалось запустить сессию: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      if (!data?.ok) {
        console.error('WPP start failed:', data);
        toast({
          title: "Ошибка",
          description: data?.error || "Не удалось запустить сессию WhatsApp",
          variant: "destructive",
        });
        return;
      }

      setStatus(data.status);
      setQr(data.qrcode || null);

      if (data.qrcode) {
        toast({
          title: "Успешно",
          description: "QR-код для подключения сгенерирован",
        });
      } else if (data.status === 'connected') {
        toast({
          title: "Подключено",
          description: "WhatsApp уже подключен",
        });
      }
    } catch (error: any) {
      console.error('Error in startPairing:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Внутренняя ошибка",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    
    // Poll status every 3 seconds if not connected
    const interval = setInterval(() => {
      if (status !== 'connected') {
        fetchStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [status]);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </Card>
    );
  }

  async function disconnectWhatsApp() {
    setIsStarting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast({
          title: "Ошибка",
          description: "Необходимо авторизоваться",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('wpp-disconnect', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error || !data?.ok) {
        toast({
          title: "Ошибка",
          description: data?.error || "Не удалось отключить WhatsApp",
          variant: "destructive",
        });
        return;
      }

      setStatus('disconnected');
      toast({
        title: "Отключено",
        description: "WhatsApp успешно отключен",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Внутренняя ошибка",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  }

  if (status === 'connected') {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
            <div className="flex-1">
              <h3 className="font-semibold">WhatsApp подключен</h3>
              <p className="text-sm text-muted-foreground">
                Интеграция активна и готова к работе
              </p>
            </div>
          </div>
          <Button 
            onClick={disconnectWhatsApp} 
            disabled={isStarting}
            variant="destructive"
            className="w-full"
          >
            {isStarting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Отключение...
              </>
            ) : (
              'Отключить WhatsApp'
            )}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <div>
            <h3 className="font-semibold">WhatsApp не подключен</h3>
            <p className="text-sm text-muted-foreground">
              Для отправки сообщений необходимо настроить интеграцию с WhatsApp
            </p>
          </div>
        </div>

        <Button 
          onClick={startPairing} 
          disabled={isStarting}
          className="w-full"
        >
          {isStarting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Получение QR-кода...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Показать QR для подключения
            </>
          )}
        </Button>

        {qr && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex justify-center">
              <img 
                src={qr} 
                alt="WhatsApp QR Code"
                className="w-64 h-64 border-2 border-border rounded-lg"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Инструкция:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Откройте WhatsApp на телефоне</li>
                <li>Перейдите в Настройки → Связанные устройства</li>
                <li>Нажмите "Привязать устройство"</li>
                <li>Отсканируйте QR-код выше</li>
              </ol>
              <p className="text-xs italic pt-2">
                QR-код действителен 45 секунд. Если не успели - нажмите кнопку "Обновить QR" выше.
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
