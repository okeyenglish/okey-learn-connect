import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare, RefreshCw, CheckCircle2, XCircle, Copy, Power } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { wppCreate, wppQr, wppGetStatus, wppDisconnect } from '@/lib/wppApi';
import { toast } from 'sonner';

interface WppConnectPanelProps {
  onConnected?: () => void;
}

type ConnectionStatus = 'idle' | 'loading' | 'qr' | 'connected' | 'error';

interface ConnectionData {
  session: string;
  apiKey: string;
}

export const WppConnectPanel: React.FC<WppConnectPanelProps> = ({ onConnected }) => {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionData, setConnectionData] = useState<ConnectionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback((session: string) => {
    stopPolling();

    pollingRef.current = setInterval(async () => {
      try {
        // Poll both QR and status in parallel
        const [qrResult, statusResult] = await Promise.all([
          wppQr(session).catch((err) => {
            console.error('[WppConnectPanel] QR fetch error:', err);
            return { success: false, qr: null };
          }),
          wppGetStatus(session, true).catch((err) => {
            console.error('[WppConnectPanel] Status fetch error:', err);
            return { success: false, status: 'error' as const };
          }),
        ]);

        console.log('[WppConnectPanel] Poll results:', { qr: !!qrResult.qr, status: statusResult.status });

        // Update QR if available
        if (qrResult.success && qrResult.qr) {
          setQrCode(qrResult.qr);
          setStatus('qr');
        }

        // Check if connected
        if (statusResult.status === 'connected') {
          stopPolling();
          setStatus('connected');
          toast.success('WhatsApp успешно подключен!');
          onConnected?.();
        }
      } catch (err) {
        console.error('[WppConnectPanel] Polling error:', err);
      }
    }, 2000);
  }, [stopPolling, onConnected]);

  const handleConnect = async () => {
    setStatus('loading');
    setError(null);
    setQrCode(null);

    try {
      const result = await wppCreate();
      console.log('[WppConnectPanel] Create result:', result);

      if (!result.success) {
        throw new Error(result.error || 'Не удалось создать интеграцию');
      }

      // Save connection data
      if (result.session && result.apiKey) {
        setConnectionData({
          session: result.session,
          apiKey: result.apiKey,
        });
      }

      // Handle different statuses
      if (result.status === 'connected') {
        setStatus('connected');
        toast.success('WhatsApp уже подключен!');
        onConnected?.();
        return;
      }

      if (result.status === 'qr_issued' && result.qrcode) {
        setQrCode(result.qrcode);
        setStatus('qr');
        
        // Start polling for connection status
        if (result.session) {
          startPolling(result.session);
        }
        return;
      }

      // Status is 'starting', start polling
      setStatus('loading');
      if (result.session) {
        startPolling(result.session);
      }

    } catch (err: any) {
      console.error('[WppConnectPanel] Error:', err);
      setError(err.message || 'Произошла ошибка');
      setStatus('error');
    }
  };

  const handleRefreshQr = async () => {
    if (!connectionData?.session) return;
    
    try {
      const qrResult = await wppQr(connectionData.session);
      if (qrResult.success && qrResult.qr) {
        setQrCode(qrResult.qr);
        toast.success('QR-код обновлен');
      } else {
        toast.info('QR-код пока не готов, подождите...');
      }
    } catch (err: any) {
      toast.error(err.message || 'Ошибка обновления QR');
    }
  };

  const handleDisconnect = async () => {
    if (!connectionData?.session) return;

    try {
      await wppDisconnect(connectionData.session);
      stopPolling();
      setStatus('idle');
      setQrCode(null);
      setConnectionData(null);
      toast.success('WhatsApp отключен');
    } catch (err: any) {
      toast.error(err.message || 'Ошибка отключения');
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} скопирован`);
  };

  // Idle state - show connect button
  if (status === 'idle') {
    return (
      <Button onClick={handleConnect} className="w-full" variant="default">
        <MessageSquare className="h-4 w-4 mr-2" />
        Подключить WhatsApp
      </Button>
    );
  }

  // Loading state
  if (status === 'loading') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Ожидание QR-кода...</p>
            {connectionData?.session && (
              <p className="text-xs text-muted-foreground">Session: {connectionData.session}</p>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                stopPolling();
                setStatus('idle');
              }}
            >
              Отмена
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // QR code state
  if (status === 'qr' && qrCode) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            <div className="text-center">
              <h3 className="font-medium mb-1">Отсканируйте QR-код</h3>
              <p className="text-sm text-muted-foreground">
                Откройте WhatsApp → Связанные устройства → Привязка устройства
              </p>
            </div>

            <div className="p-4 bg-white rounded-lg shadow-sm">
              <QRCodeSVG value={qrCode} size={200} />
            </div>

            {connectionData && (
              <div className="w-full space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-muted-foreground">Session:</span>
                  <code className="font-mono">{connectionData.session}</code>
                </div>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={handleRefreshQr}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Обновить QR
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Connected state
  if (status === 'connected') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <div>
                <h3 className="font-medium">WhatsApp подключён</h3>
                <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                  🟢 Подключено
                </Badge>
              </div>
            </div>

            {connectionData && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm text-muted-foreground">Session:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono">{connectionData.session}</code>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => handleCopy(connectionData.session, 'Session')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm text-muted-foreground">API Key:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono">{connectionData.apiKey}</code>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => handleCopy(connectionData.apiKey, 'API Key')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <Button 
              variant="outline" 
              className="w-full text-destructive hover:text-destructive" 
              onClick={handleDisconnect}
            >
              <Power className="h-4 w-4 mr-2" />
              Отключить
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 py-4">
            <XCircle className="h-12 w-12 text-destructive" />
            <p className="text-sm text-destructive text-center">{error}</p>
            <Button variant="outline" onClick={handleConnect}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Попробовать снова
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};
