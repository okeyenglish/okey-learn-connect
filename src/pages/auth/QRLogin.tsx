import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, RefreshCw, Smartphone, QrCode, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface TokenData {
  token: string;
  qr_url: string;
  expires_at: string;
  ttl_seconds: number;
}

type Status = 'loading' | 'ready' | 'polling' | 'confirmed' | 'expired' | 'error';

export default function QRLogin() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [remainingTime, setRemainingTime] = useState(120);
  const [error, setError] = useState<string | null>(null);

  // Generate a new QR token
  const generateToken = useCallback(async () => {
    setStatus('loading');
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('qr-login-generate', {
        body: { browser_info: navigator.userAgent }
      });

      if (fnError) throw fnError;
      if (!data.success) throw new Error(data.error || 'Failed to generate token');

      setTokenData(data);
      setRemainingTime(data.ttl_seconds || 120);
      setStatus('ready');
      
      console.log('QR token generated:', data.token.substring(0, 8) + '...');
    } catch (err: any) {
      console.error('Error generating QR token:', err);
      setError(err.message || 'Не удалось сгенерировать QR-код');
      setStatus('error');
    }
  }, []);

  // Poll for token status
  const checkToken = useCallback(async () => {
    if (!tokenData?.token) return;

    try {
      const { data, error: fnError } = await supabase.functions.invoke('qr-login-check', {
        body: { token: tokenData.token }
      });

      if (fnError) throw fnError;

      console.log('Token status:', data.status);

      if (data.status === 'confirmed' && data.session) {
        setStatus('confirmed');
        
        // Set the session in Supabase client
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });

        if (sessionError) {
          console.error('Error setting session:', sessionError);
          setError('Ошибка установки сессии');
          setStatus('error');
          return;
        }

        toast.success('Вход выполнен успешно!');
        
        // Redirect based on user role
        setTimeout(() => {
          navigate('/auth/callback', { replace: true });
        }, 1000);
        
      } else if (data.status === 'expired') {
        setStatus('expired');
      } else if (data.status === 'used') {
        setError('Этот QR-код уже использован');
        setStatus('error');
      }
      // If still pending, continue polling
    } catch (err: any) {
      console.error('Error checking token:', err);
      // Don't set error state for network issues during polling
    }
  }, [tokenData, navigate]);

  // Generate token on mount
  useEffect(() => {
    generateToken();
  }, [generateToken]);

  // Start polling when token is ready
  useEffect(() => {
    if (status !== 'ready' && status !== 'polling') return;
    
    setStatus('polling');
    const pollInterval = setInterval(checkToken, 2000);
    
    return () => clearInterval(pollInterval);
  }, [status, checkToken]);

  // Countdown timer
  useEffect(() => {
    if (status !== 'ready' && status !== 'polling') return;
    
    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
            <QrCode className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Вход по QR-коду</CardTitle>
          <CardDescription>
            Отсканируйте QR-код в мобильном приложении ACADEMYOS
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* QR Code Display */}
          <div className="flex justify-center">
            <div className="relative p-4 bg-white rounded-xl shadow-inner">
              {status === 'loading' ? (
                <div className="w-48 h-48 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : status === 'confirmed' ? (
                <div className="w-48 h-48 flex flex-col items-center justify-center text-green-600">
                  <CheckCircle className="h-16 w-16 mb-2" />
                  <span className="text-sm font-medium">Вход подтверждён!</span>
                </div>
              ) : status === 'expired' || status === 'error' ? (
                <div className="w-48 h-48 flex flex-col items-center justify-center text-muted-foreground">
                  <XCircle className="h-16 w-16 mb-2 text-destructive" />
                  <span className="text-sm text-center">
                    {status === 'expired' ? 'Код истёк' : error}
                  </span>
                </div>
              ) : tokenData?.qr_url ? (
                <QRCodeSVG 
                  value={tokenData.qr_url}
                  size={192}
                  level="M"
                  includeMargin={false}
                />
              ) : null}
            </div>
          </div>

          {/* Timer */}
          {(status === 'ready' || status === 'polling') && (
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">
                Код действителен
              </div>
              <div className={`text-2xl font-mono font-bold ${
                remainingTime <= 30 ? 'text-orange-500' : 'text-foreground'
              }`}>
                {formatTime(remainingTime)}
              </div>
            </div>
          )}

          {/* Instructions */}
          {(status === 'ready' || status === 'polling') && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-3">
                <Smartphone className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Как войти:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Откройте приложение ACADEMYOS</li>
                    <li>Нажмите на иконку QR-сканера</li>
                    <li>Наведите камеру на QR-код</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {(status === 'expired' || status === 'error') && (
              <Button onClick={generateToken} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Обновить QR-код
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/auth')}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Войти другим способом
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
