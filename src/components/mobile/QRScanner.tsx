import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Camera, CheckCircle, Loader2, QrCode, AlertCircle, Smartphone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Capacitor } from '@capacitor/core';

interface QRScannerProps {
  onClose: () => void;
}

export const QRScanner = ({ onClose }: QRScannerProps) => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [status, setStatus] = useState<'idle' | 'scanning' | 'confirming' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isNative, setIsNative] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // Check if running in native Capacitor app
  useEffect(() => {
    const checkNative = Capacitor.isNativePlatform();
    setIsNative(checkNative);
    console.log('QRScanner: isNative =', checkNative);
  }, []);

  // Start native Capacitor scanner (only available in native app)
  const startNativeScanner = useCallback(async () => {
    try {
      setStatus('scanning');
      setError(null);

      // Access the barcode scanner from the global Capacitor plugins
      // This only works when the plugin is installed in the native app
      const Plugins = (window as any).Capacitor?.Plugins;
      const BarcodeScanner = Plugins?.BarcodeScanner;
      
      if (!BarcodeScanner) {
        console.log('Native BarcodeScanner not available, falling back to web');
        await startWebScanner();
        return;
      }

      // Check camera permission
      const permissionStatus = await BarcodeScanner.checkPermission({ force: true });
      
      if (!permissionStatus.granted) {
        setError('Разрешите доступ к камере в настройках приложения');
        setStatus('error');
        return;
      }

      // Make the webview transparent so we can see the camera
      document.querySelector('body')?.classList.add('scanner-active');
      await BarcodeScanner.hideBackground();

      // Start scanning
      const result = await BarcodeScanner.startScan();
      
      // Restore UI
      document.querySelector('body')?.classList.remove('scanner-active');
      await BarcodeScanner.showBackground();

      if (result.hasContent) {
        console.log('Native QR scanned:', result.content);
        await handleQRCode(result.content);
      } else {
        setStatus('idle');
      }
    } catch (err: any) {
      console.error('Native scanner error:', err);
      document.querySelector('body')?.classList.remove('scanner-active');
      
      // Fall back to web scanner
      console.log('Falling back to web scanner');
      await startWebScanner();
    }
  }, []);

  // Stop native scanner
  const stopNativeScanner = useCallback(async () => {
    try {
      const Plugins = (window as any).Capacitor?.Plugins;
      const BarcodeScanner = Plugins?.BarcodeScanner;
      
      if (BarcodeScanner) {
        await BarcodeScanner.stopScan();
        await BarcodeScanner.showBackground();
      }
      document.querySelector('body')?.classList.remove('scanner-active');
    } catch (err) {
      // Ignore if not available
    }
  }, []);

  // Initialize web camera
  const startWebScanner = useCallback(async () => {
    try {
      setStatus('scanning');
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Start scanning for QR codes
      startWebQRDetection();
    } catch (err: any) {
      console.error('Camera error:', err);
      setError('Не удалось получить доступ к камере. Разрешите доступ в настройках.');
      setStatus('error');
    }
  }, []);

  // Scan for QR codes using BarcodeDetector API
  const startWebQRDetection = useCallback(() => {
    if ('BarcodeDetector' in window) {
      const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      
      scanIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState !== 4) return;
        
        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const qrValue = barcodes[0].rawValue;
            handleQRCode(qrValue);
          }
        } catch (err) {
          // Ignore detection errors
        }
      }, 500);
    } else {
      setError('Автоматическое сканирование недоступно в этом браузере. Откройте приложение на телефоне или используйте Chrome/Edge.');
    }
  }, []);

  // Start camera (native or web)
  const startCamera = useCallback(async () => {
    if (isNative) {
      await startNativeScanner();
    } else {
      await startWebScanner();
    }
  }, [isNative, startNativeScanner, startWebScanner]);

  // Handle detected QR code
  const handleQRCode = async (value: string) => {
    // Stop scanning
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    stopWebCamera();
    
    console.log('QR code detected:', value);
    
    // Parse the QR code URL
    // Expected format: academyos://qr-login?token=xxx
    let token: string | null = null;
    
    try {
      if (value.startsWith('academyos://qr-login')) {
        const url = new URL(value.replace('academyos://', 'https://'));
        token = url.searchParams.get('token');
      } else if (value.includes('token=')) {
        // Try to extract token from any URL format
        const url = new URL(value);
        token = url.searchParams.get('token');
      }
    } catch (err) {
      console.error('Error parsing QR URL:', err);
    }
    
    if (!token) {
      setError('Неверный QR-код. Используйте QR-код со страницы входа.');
      setStatus('error');
      return;
    }
    
    // Confirm the login
    await confirmLogin(token);
  };

  // Confirm login via edge function
  const confirmLogin = async (token: string) => {
    setStatus('confirming');
    
    if (!session?.access_token) {
      setError('Вы не авторизованы в приложении');
      setStatus('error');
      return;
    }
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('qr-login-confirm', {
        body: { token },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (fnError) throw fnError;
      if (!data.success) throw new Error(data.error || 'Ошибка подтверждения');
      
      setStatus('success');
      toast.success('Вход в веб-версию подтверждён!');
      
      // Close after showing success
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (err: any) {
      console.error('Error confirming login:', err);
      setError(err.message || 'Не удалось подтвердить вход');
      setStatus('error');
    }
  };

  // Stop web camera
  const stopWebCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  }, []);

  // Handle close
  const handleClose = useCallback(async () => {
    stopWebCamera();
    if (isNative) {
      await stopNativeScanner();
    }
    onClose();
  }, [stopWebCamera, stopNativeScanner, isNative, onClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWebCamera();
      if (isNative) {
        stopNativeScanner();
      }
    };
  }, [stopWebCamera, stopNativeScanner, isNative]);

  // Handle retry
  const handleRetry = () => {
    setError(null);
    setStatus('idle');
  };

  return (
    <div className={`fixed inset-0 z-[100] bg-background flex flex-col ${status === 'scanning' && isNative ? 'bg-transparent' : ''}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${status === 'scanning' && isNative ? 'bg-background/90' : ''}`}>
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          <h1 className="font-semibold">Сканировать QR-код</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Content */}
      <div className={`flex-1 flex flex-col items-center justify-center p-4 ${status === 'scanning' && isNative ? 'bg-transparent' : ''}`}>
        {status === 'idle' && (
          <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10">
                {isNative ? (
                  <Smartphone className="h-8 w-8 text-primary" />
                ) : (
                  <Camera className="h-8 w-8 text-primary" />
                )}
              </div>
              <CardTitle>Войти в веб-версию</CardTitle>
              <CardDescription>
                Отсканируйте QR-код на экране компьютера, чтобы войти в веб-версию ACADEMYOS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={startCamera} className="w-full" size="lg">
                <Camera className="h-4 w-4 mr-2" />
                {isNative ? 'Сканировать QR-код' : 'Включить камеру'}
              </Button>
              {isNative && (
                <p className="text-xs text-center text-muted-foreground">
                  Наведите камеру на QR-код на странице входа
                </p>
              )}
            </CardContent>
          </Card>
        )}
        
        {status === 'scanning' && (
          <div className="relative w-full max-w-sm aspect-square">
            <video 
              ref={videoRef}
              className="w-full h-full object-cover rounded-2xl"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-primary rounded-2xl relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-xl" />
                
                {/* Scanning line animation */}
                <div className="absolute inset-x-2 top-2 h-0.5 bg-primary/50 animate-pulse" />
              </div>
            </div>
            
            <p className="absolute bottom-4 left-0 right-0 text-center text-sm text-white bg-black/50 py-2 rounded-b-2xl">
              Наведите камеру на QR-код
            </p>
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
