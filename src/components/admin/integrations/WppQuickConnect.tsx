import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, MessageSquare, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { wppStatus } from '@/lib/wppApi';
import { toast } from 'sonner';

interface WppQuickConnectProps {
  onConnected?: () => void;
}

type ConnectionStatus = 'idle' | 'loading' | 'qr' | 'connected' | 'error';

interface ProvisionResponse {
  success: boolean;
  status: 'qr_issued' | 'connected' | 'starting' | 'error';
  qrcode?: string;
  integration_id?: string;
  account_number?: string;
  api_key?: string;
  session?: string;
  error?: string;
}

export const WppQuickConnect: React.FC<WppQuickConnectProps> = ({ onConnected }) => {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [accountNumber, setAccountNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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

  const startPolling = useCallback((account: string) => {
    stopPolling();

    pollingRef.current = setInterval(async () => {
      try {
        const result = await wppStatus(account, true);
        console.log('[WppQuickConnect] Poll status:', result.status);

        if (result.status === 'connected') {
          stopPolling();
          setStatus('connected');
          setIsDialogOpen(false);
          toast.success('WhatsApp успешно подключен!');
          onConnected?.();
        } else if (result.status === 'qr_issued' && result.qrcode) {
          // Update QR if it changed
          setQrCode(result.qrcode);
        }
      } catch (err) {
        console.error('[WppQuickConnect] Polling error:', err);
      }
    }, 3000);
  }, [stopPolling, onConnected]);

  const handleConnect = async () => {
    setStatus('loading');
    setError(null);
    setIsDialogOpen(true);

    try {
      const response = await selfHostedPost<ProvisionResponse>('wpp-provision', {});

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Не удалось запустить подключение');
      }

      const data = response.data;
      setAccountNumber(data.account_number || null);

      if (data.status === 'connected') {
        setStatus('connected');
        setIsDialogOpen(false);
        toast.success('WhatsApp уже подключен!');
        onConnected?.();
        return;
      }

      if (data.status === 'qr_issued' && data.qrcode) {
        setQrCode(data.qrcode);
        setStatus('qr');
        
        // Start polling for connection status
        if (data.account_number) {
          startPolling(data.account_number);
        }
        return;
      }

      if (data.status === 'error') {
        throw new Error(data.error || 'Ошибка при подключении');
      }

      // Status is 'starting', keep polling
      setStatus('loading');
      if (data.account_number) {
        startPolling(data.account_number);
      }

    } catch (err: any) {
      console.error('[WppQuickConnect] Error:', err);
      setError(err.message || 'Произошла ошибка');
      setStatus('error');
    }
  };

  const handleRetry = () => {
    stopPolling();
    handleConnect();
  };

  const handleClose = () => {
    stopPolling();
    setIsDialogOpen(false);
    setStatus('idle');
    setQrCode(null);
    setError(null);
  };

  return (
    <>
      <Button
        onClick={handleConnect}
        className="w-full"
        variant="default"
        disabled={status === 'loading'}
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Подключение...
          </>
        ) : (
          <>
            <MessageSquare className="h-4 w-4 mr-2" />
            Подключить WhatsApp
          </>
        )}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              Подключение WhatsApp
            </DialogTitle>
            <DialogDescription>
              {status === 'qr' && 'Отсканируйте QR-код в приложении WhatsApp на телефоне'}
              {status === 'loading' && 'Подготовка подключения...'}
              {status === 'error' && 'Произошла ошибка при подключении'}
              {status === 'connected' && 'WhatsApp успешно подключен!'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-6">
            {status === 'loading' && (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Ожидание QR-кода...</p>
              </div>
            )}

            {status === 'qr' && qrCode && (
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-white rounded-lg">
                  <QRCodeSVG value={qrCode} size={256} />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Откройте WhatsApp на телефоне → Связанные устройства → Привязка устройства
                </p>
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Обновить QR
                </Button>
              </div>
            )}

            {status === 'connected' && (
              <div className="flex flex-col items-center gap-4">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <p className="text-lg font-medium">Подключено!</p>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center gap-4">
                <XCircle className="h-16 w-16 text-destructive" />
                <p className="text-sm text-destructive text-center">{error}</p>
                <Button variant="outline" onClick={handleRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Попробовать снова
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
