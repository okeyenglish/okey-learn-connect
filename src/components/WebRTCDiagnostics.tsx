import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertTriangle, Wifi, Mic, Shield, Network } from 'lucide-react';

interface DiagnosticItem {
  key: string;
  label: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  details?: string;
  icon: React.ReactNode;
}

interface WebRTCDiagnosticsProps {
  isVisible: boolean;
  sipProfile?: any;
  onDiagnosticUpdate?: (key: string, status: 'pending' | 'success' | 'error' | 'warning', details?: string) => void;
}

export const WebRTCDiagnostics: React.FC<WebRTCDiagnosticsProps> = ({ 
  isVisible, 
  sipProfile,
  onDiagnosticUpdate 
}) => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([
    {
      key: 'https',
      label: 'HTTPS соединение',
      status: 'pending',
      icon: <Shield className="h-4 w-4" />
    },
    {
      key: 'microphone',
      label: 'Доступ к микрофону',
      status: 'pending',
      icon: <Mic className="h-4 w-4" />
    },
    {
      key: 'tcp8082',
      label: 'TCP 8082 доступность',
      status: 'pending',
      icon: <Network className="h-4 w-4" />
    },
    {
      key: 'register',
      label: 'SIP REGISTER',
      status: 'pending',
      icon: <Wifi className="h-4 w-4" />
    },
    {
      key: 'websocket',
      label: 'WebSocket соединение',
      status: 'pending',
      icon: <Network className="h-4 w-4" />
    },
    {
      key: 'ice',
      label: 'ICE кандидаты',
      status: 'pending',
      icon: <Network className="h-4 w-4" />
    },
    {
      key: 'audio',
      label: 'Audio MediaStream',
      status: 'pending',
      icon: <Mic className="h-4 w-4" />
    }
  ]);

  const updateDiagnostic = (key: string, status: 'pending' | 'success' | 'error' | 'warning', details?: string) => {
    setDiagnostics(prev => prev.map(item => 
      item.key === key ? { ...item, status, details } : item
    ));
    onDiagnosticUpdate?.(key, status, details);
  };

  useEffect(() => {
    if (!isVisible) return;
    
    // Диагностика 1: HTTPS
    const isHTTPS = window.location.protocol === 'https:';
    updateDiagnostic('https', isHTTPS ? 'success' : 'error', 
      isHTTPS ? 'Сайт работает по HTTPS' : 'Требуется HTTPS для WebRTC');

    // Диагностика 2: Микрофон
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        updateDiagnostic('microphone', 'success', 'Микрофон доступен');
        stream.getTracks().forEach(track => track.stop());
      })
      .catch((error) => {
        updateDiagnostic('microphone', 'error', `Ошибка доступа к микрофону: ${error.message}`);
      });

    // Диагностика 3: TCP 8082 (косвенная проверка через WebSocket)
    if (sipProfile?.sip_domain) {
      const testURL = sipProfile.sip_ws_url || `wss://${sipProfile.sip_domain}:8082`;
      
      try {
        const testWS = new WebSocket(testURL);
        
        const timeout = setTimeout(() => {
          updateDiagnostic('tcp8082', 'warning', `Таймаут подключения к ${testURL}`);
          try { testWS.close(); } catch (e) {}
        }, 3000);

        testWS.onopen = () => {
          clearTimeout(timeout);
          updateDiagnostic('tcp8082', 'success', `Порт доступен: ${testURL}`);
          testWS.close();
        };

        testWS.onerror = (error) => {
          clearTimeout(timeout);
          console.warn('WebSocket test error:', error);
          updateDiagnostic('tcp8082', 'error', `Порт недоступен: ${testURL}`);
        };

        testWS.onclose = (event) => {
          if (event.code !== 1000) {
            console.warn('WebSocket test closed with code:', event.code, event.reason);
          }
        };
      } catch (error) {
        console.error('Failed to create test WebSocket:', error);
        updateDiagnostic('tcp8082', 'error', `Ошибка создания WebSocket: ${error.message}`);
      }
    } else {
      updateDiagnostic('tcp8082', 'warning', 'SIP домен не настроен');
    }

  }, [isVisible, sipProfile]);

  // Expose diagnostic update function globally for WebRTC component
  useEffect(() => {
    (window as any).updateWebRTCDiagnostic = updateDiagnostic;
    return () => {
      delete (window as any).updateWebRTCDiagnostic;
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge variant="secondary" className="bg-green-100 text-green-800">OK</Badge>;
      case 'error': return <Badge variant="destructive">Ошибка</Badge>;
      case 'warning': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Внимание</Badge>;
      default: return <Badge variant="outline">Проверка...</Badge>;
    }
  };

  if (!isVisible) return null;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Network className="h-4 w-4" />
          Диагностика WebRTC подключения
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {diagnostics.map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {item.icon}
              <span className="text-sm">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(item.status)}
              {getStatusBadge(item.status)}
            </div>
          </div>
        ))}
        
        {diagnostics.some(d => d.details) && (
          <div className="mt-4 space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Детали:</div>
            {diagnostics
              .filter(d => d.details)
              .map(item => (
                <div key={item.key} className="text-xs text-muted-foreground">
                  <strong>{item.label}:</strong> {item.details}
                </div>
              ))
            }
          </div>
        )}

        <div className="mt-4 p-3 bg-muted rounded-md">
          <div className="text-xs font-medium mb-1">Рекомендации при проблемах:</div>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Убедитесь что сайт работает по HTTPS</li>
            <li>• Разрешите доступ к микрофону в браузере</li>
            <li>• Проверьте что порт 8082 TCP открыт в файрволе</li>
            <li>• При проблемах с NAT/CGNAT настройте TURN сервер</li>
            <li>• Откройте DevTools → Network для отслеживания WSS</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};