import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare, RefreshCw, CheckCircle2, XCircle, Copy, Power, Plus, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { wppCreate, wppQr, wppGetStatus, wppDisconnect } from '@/lib/wppApi';
import { useMessengerIntegrations, MessengerIntegration } from '@/hooks/useMessengerIntegrations';
import { toast } from 'sonner';

interface WppConnectPanelProps {
  onConnected?: () => void;
}

type ConnectionStatus = 'idle' | 'loading' | 'qr' | 'error';
type SessionStatus = 'connected' | 'disconnected' | 'checking';

interface WppSessionInfo {
  integration: MessengerIntegration;
  status: SessionStatus;
  session: string;
  apiKey: string;
}

interface NewSessionData {
  session: string;
  apiKey: string;
}

const maskApiKey = (apiKey: string | undefined): string => {
  if (!apiKey) return '—';
  if (apiKey.startsWith('••')) return apiKey;
  if (apiKey.length <= 8) return '••••••••';
  return apiKey.slice(0, 4) + '••••' + apiKey.slice(-4);
};

export const WppConnectPanel: React.FC<WppConnectPanelProps> = ({ onConnected }) => {
  // DB integrations
  const { integrations, isLoading: integrationsLoading, refetch } = useMessengerIntegrations('whatsapp');
  const wppIntegrations = integrations.filter(i => i.provider === 'wpp');

  // Sessions status map
  const [sessionsStatus, setSessionsStatus] = useState<Map<string, WppSessionInfo>>(new Map());
  const [statusChecking, setStatusChecking] = useState(false);

  // New connection state
  const [connectStatus, setConnectStatus] = useState<ConnectionStatus>('idle');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [newSessionData, setNewSessionData] = useState<NewSessionData | null>(null);
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

  // Check status of existing integrations when loaded
  useEffect(() => {
    const checkStatuses = async () => {
      if (wppIntegrations.length === 0) return;
      
      setStatusChecking(true);
      const newMap = new Map<string, WppSessionInfo>();

      for (const integration of wppIntegrations) {
        const settings = integration.settings as Record<string, unknown>;
        const session = settings.wppAccountNumber as string;
        const apiKey = settings.wppApiKey as string;

        if (!session) continue;

        // Set initial checking state
        newMap.set(integration.id, {
          integration,
          status: 'checking',
          session,
          apiKey: maskApiKey(apiKey),
        });
      }
      setSessionsStatus(newMap);

      // Check each session status
      for (const integration of wppIntegrations) {
        const settings = integration.settings as Record<string, unknown>;
        const session = settings.wppAccountNumber as string;
        const apiKey = settings.wppApiKey as string;

        if (!session) continue;

        try {
          const statusResult = await wppGetStatus(session, false);
          setSessionsStatus(prev => {
            const updated = new Map(prev);
            updated.set(integration.id, {
              integration,
              status: statusResult.status === 'connected' ? 'connected' : 'disconnected',
              session,
              apiKey: maskApiKey(apiKey),
            });
            return updated;
          });
        } catch (err) {
          console.error(`[WppConnectPanel] Status check failed for ${session}:`, err);
          setSessionsStatus(prev => {
            const updated = new Map(prev);
            updated.set(integration.id, {
              integration,
              status: 'disconnected',
              session,
              apiKey: maskApiKey(apiKey),
            });
            return updated;
          });
        }
      }

      setStatusChecking(false);
    };

    checkStatuses();
  }, [wppIntegrations.length]); // Only re-run when count changes

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
        const [qrResult, statusResult] = await Promise.all([
          wppQr(session).catch(() => ({ success: false, qr: null })),
          wppGetStatus(session, true).catch(() => ({ success: false, status: 'error' as const })),
        ]);

        console.log('[WppConnectPanel] Poll results:', { qr: !!qrResult.qr, status: statusResult.status });

        if (qrResult.success && qrResult.qr) {
          setQrCode(qrResult.qr);
          setConnectStatus('qr');
        }

        if (statusResult.status === 'connected') {
          stopPolling();
          setConnectStatus('idle');
          setQrCode(null);
          setNewSessionData(null);
          toast.success('WhatsApp успешно подключен!');
          refetch(); // Refresh integrations list
          onConnected?.();
        }
      } catch (err) {
        console.error('[WppConnectPanel] Polling error:', err);
      }
    }, 2000);
  }, [stopPolling, onConnected, refetch]);

  const handleConnect = async (addNew = false) => {
    setConnectStatus('loading');
    setError(null);
    setQrCode(null);

    try {
      const result = await wppCreate({ addNew });
      console.log('[WppConnectPanel] Create result:', result);

      if (!result.success) {
        throw new Error(result.error || 'Не удалось создать интеграцию');
      }

      if (result.session && result.apiKey) {
        setNewSessionData({
          session: result.session,
          apiKey: result.apiKey,
        });
      }

      if (result.status === 'connected') {
        setConnectStatus('idle');
        toast.success('WhatsApp уже подключен!');
        refetch();
        onConnected?.();
        return;
      }

      if (result.status === 'qr_issued' && result.qrcode) {
        setQrCode(result.qrcode);
        setConnectStatus('qr');
        if (result.session) {
          startPolling(result.session);
        }
        return;
      }

      // Status is 'starting', start polling
      setConnectStatus('loading');
      if (result.session) {
        startPolling(result.session);
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Произошла ошибка';
      console.error('[WppConnectPanel] Error:', err);
      setError(message);
      setConnectStatus('error');
    }
  };

  const handleRefreshQr = async () => {
    if (!newSessionData?.session) return;

    try {
      const qrResult = await wppQr(newSessionData.session);
      if (qrResult.success && qrResult.qr) {
        setQrCode(qrResult.qr);
        toast.success('QR-код обновлен');
      } else {
        toast.info('QR-код пока не готов, подождите...');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка обновления QR';
      toast.error(message);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    try {
      await wppDisconnect(integrationId);
      // Remove from local state immediately
      setSessionsStatus(prev => {
        const updated = new Map(prev);
        updated.delete(integrationId);
        return updated;
      });
      toast.success('WhatsApp отключен');
      refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка отключения';
      toast.error(message);
    }
  };

  const handleCancelConnect = () => {
    stopPolling();
    setConnectStatus('idle');
    setQrCode(null);
    setNewSessionData(null);
    setError(null);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} скопирован`);
  };

  // Loading integrations
  if (integrationsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasExistingSessions = sessionsStatus.size > 0;

  return (
    <div className="space-y-4">
      {/* Existing sessions list */}
      {hasExistingSessions && (
        <div className="space-y-3">
          {Array.from(sessionsStatus.values()).map((info) => (
            <Card key={info.integration.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {info.status === 'checking' ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground flex-shrink-0" />
                    ) : info.status === 'connected' ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-amber-500 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{info.integration.name}</h4>
                        <Badge 
                          variant="outline" 
                          className={
                            info.status === 'connected' 
                              ? 'border-emerald-500 text-emerald-600' 
                              : info.status === 'checking'
                              ? 'border-muted-foreground'
                              : 'border-amber-500 text-amber-600'
                          }
                        >
                          {info.status === 'connected' ? '🟢 Подключено' : 
                           info.status === 'checking' ? '⏳ Проверка...' : '🔴 Отключено'}
                        </Badge>
                      </div>
                      <div className="mt-2 space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Session:</span>
                          <code className="font-mono text-xs bg-muted px-1 rounded">{info.session}</code>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5"
                            onClick={() => handleCopy(info.session, 'Session')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">API Key:</span>
                          <code className="font-mono text-xs bg-muted px-1 rounded">{info.apiKey}</code>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-destructive hover:text-destructive flex-shrink-0"
                    onClick={() => handleDisconnect(info.integration.id)}
                  >
                    <Power className="h-4 w-4 mr-1" />
                    Отключить
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New connection UI */}
      {connectStatus === 'loading' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Ожидание QR-кода...</p>
              {newSessionData?.session && (
                <p className="text-xs text-muted-foreground">Session: {newSessionData.session}</p>
              )}
              <Button variant="outline" size="sm" onClick={handleCancelConnect}>
                Отмена
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {connectStatus === 'qr' && qrCode && (
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

              {newSessionData && (
                <div className="w-full space-y-2 text-sm">
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-muted-foreground">Session:</span>
                    <code className="font-mono">{newSessionData.session}</code>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleRefreshQr}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Обновить QR
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCancelConnect}>
                  Отмена
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {connectStatus === 'error' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 py-4">
              <XCircle className="h-10 w-10 text-destructive" />
              <p className="text-sm text-destructive text-center">{error}</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleConnect(false)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Попробовать снова
                </Button>
                <Button variant="ghost" onClick={handleCancelConnect}>
                  Отмена
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connect button */}
      {connectStatus === 'idle' && (
        <Button 
          onClick={() => handleConnect(hasExistingSessions)} 
          className="w-full" 
          variant={hasExistingSessions ? 'outline' : 'default'}
        >
          {hasExistingSessions ? (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Подключить ещё один WhatsApp
            </>
          ) : (
            <>
              <MessageSquare className="h-4 w-4 mr-2" />
              Подключить WhatsApp
            </>
          )}
        </Button>
      )}

      {/* Refresh status button */}
      {hasExistingSessions && connectStatus === 'idle' && !statusChecking && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить статусы
        </Button>
      )}
    </div>
  );
};
