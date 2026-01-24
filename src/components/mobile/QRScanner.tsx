import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Camera, CheckCircle, Loader2, QrCode, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onClose: () => void;
}

export const QRScanner = ({ onClose }: QRScannerProps) => {
  const { session } = useAuth();
  const [status, setStatus] = useState<'idle' | 'scanning' | 'confirming' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  // Stop scanner
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING state
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.log('Scanner stop error (can ignore):', e);
      }
      scannerRef.current = null;
    }
  }, []);

  // Handle detected QR code
  const handleQRCode = useCallback(async (value: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    console.log('QR code detected:', value);

    // Vibrate on scan (works on Android)
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }

    // Parse the QR code URL
    // Expected format: academyos://qr-login?token=xxx or https://...?token=xxx
    let token: string | null = null;

    try {
      if (value.startsWith('academyos://qr-login')) {
        const url = new URL(value.replace('academyos://', 'https://'));
        token = url.searchParams.get('token');
      } else if (value.includes('token=')) {
        // Try to extract token from any URL format
        const url = new URL(value);
        token = url.searchParams.get('token');
      } else if (value.length > 20 && !value.includes(' ')) {
        // Raw token
        token = value;
      }
    } catch (err) {
      console.error('Error parsing QR URL:', err);
    }

    if (!token) {
      setError('Неверный QR-код. Используйте QR-код со страницы входа.');
      setStatus('error');
      isProcessingRef.current = false;
      return;
    }

    // Confirm the login
    await confirmLogin(token);
  }, []);

  // Confirm login via edge function
  const confirmLogin = async (token: string) => {
    setStatus('confirming');

    if (!session?.access_token) {
      setError('Вы не авторизованы в приложении');
      setStatus('error');
      isProcessingRef.current = false;
      return;
    }

    // Edge Function требует и access_token, и refresh_token
    if (!session.refresh_token) {
      setError('Сессия неполная. Выйдите и войдите в приложение заново.');
      setStatus('error');
      isProcessingRef.current = false;
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/qr-login-confirm`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            token,
            session: {
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_at: session.expires_at,
              expires_in: session.expires_in,
              token_type: session.token_type || 'bearer',
            }
          }),
        }
      );

      let data: any = {};
      const responseText = await response.text();
      
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error('Response is not JSON:', responseText);
      }

      console.log('QR confirm response:', { 
        status: response.status, 
        ok: response.ok, 
        data, 
        responseText: responseText.substring(0, 500) 
      });

      if (!response.ok) {
        const serverError = data?.error || data?.message || responseText || `Ошибка сервера (HTTP ${response.status})`;
        throw new Error(serverError);
      }

      if (!data.success) {
        throw new Error(data.error || 'Сервер вернул неуспешный ответ');
      }

      setStatus('success');

      // Vibrate on success (works on Android and some other platforms)
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]); // Short-pause-short pattern
      }

      toast.success('Вход в веб-версию подтверждён!');

      // Close after showing success
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error('Error confirming login:', err);
      setError(err.message || 'Не удалось подтвердить вход');
      setStatus('error');
      isProcessingRef.current = false;
    }
  };

  // Start camera with html5-qrcode
  const startCamera = useCallback(async () => {
    setStatus('scanning');
    setError(null);
    isProcessingRef.current = false;

    try {
      // Wait for DOM element to be ready
      await new Promise(resolve => setTimeout(resolve, 200));

      const qrReaderElement = document.getElementById('qr-reader');
      if (!qrReaderElement) {
        throw new Error('QR reader element not found');
      }

      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          // Stop scanner immediately after successful scan
          await stopScanner();
          await handleQRCode(decodedText);
        },
        () => {
          // QR code not found - this is normal during scanning, don't log
        }
      );
    } catch (err: any) {
      console.error('Scanner error:', err);

      let errorMessage = 'Не удалось запустить камеру';

      if (err instanceof Error) {
        if (err.message.includes('Permission') || err.message.includes('NotAllowedError')) {
          errorMessage = 'Разрешите доступ к камере в настройках браузера';
        } else if (err.message.includes('NotFoundError') || err.message.includes('DevicesNotFoundError')) {
          errorMessage = 'Камера не найдена на устройстве';
        } else if (err.message.includes('NotReadableError')) {
          errorMessage = 'Камера занята другим приложением';
        } else if (err.message.includes('OverconstrainedError')) {
          errorMessage = 'Задняя камера недоступна, попробуйте ещё раз';
        }
      }

      setError(errorMessage);
      setStatus('error');
    }
  }, [stopScanner, handleQRCode]);

  // Handle close
  const handleClose = useCallback(async () => {
    await stopScanner();
    onClose();
  }, [stopScanner, onClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  // Handle retry
  const handleRetry = () => {
    setError(null);
    setStatus('idle');
    isProcessingRef.current = false;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          <h1 className="font-semibold">Сканировать QR-код</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {status === 'idle' && (
          <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10">
                <Camera className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Войти в веб-версию</CardTitle>
              <CardDescription>
                Отсканируйте QR-код на экране компьютера, чтобы войти в веб-версию ACADEMYOS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={startCamera} className="w-full" size="lg">
                <Camera className="h-4 w-4 mr-2" />
                Включить камеру
              </Button>
            </CardContent>
          </Card>
        )}

        {status === 'scanning' && (
          <div className="w-full max-w-sm">
            <div 
              id="qr-reader" 
              className="w-full rounded-2xl overflow-hidden"
              style={{ minHeight: '320px' }}
            />
            <p className="text-center text-sm text-muted-foreground mt-4">
              Наведите камеру на QR-код
            </p>
            <Button 
              variant="outline" 
              onClick={handleClose} 
              className="w-full mt-4"
            >
              Отмена
            </Button>
          </div>
        )}

        {status === 'confirming' && (
          <Card className="w-full max-w-sm">
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-lg font-medium">Подтверждаем вход...</p>
            </CardContent>
          </Card>
        )}

        {status === 'success' && (
          <Card className="w-full max-w-sm">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <p className="text-lg font-medium text-green-600">Вход подтверждён!</p>
              <p className="text-sm text-muted-foreground mt-2">
                Веб-версия авторизована
              </p>
            </CardContent>
          </Card>
        )}

        {status === 'error' && (
          <Card className="w-full max-w-sm">
            <CardContent className="py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-10 w-10 text-destructive" />
              </div>
              <p className="text-lg font-medium mb-2">Ошибка</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={handleRetry} className="w-full">
                Попробовать снова
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
