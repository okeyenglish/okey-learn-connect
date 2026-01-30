import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/typedClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, RefreshCw, QrCode, Trash2, PowerOff, Plus, Pause, Play } from "lucide-react";
import { WhatsAppDebugPanel } from "./WhatsAppDebugPanel";
import { getErrorMessage } from '@/lib/errorUtils';
import { wppStatus, wppStart, wppDisconnect } from '@/lib/wppApi';
import { useAuth } from "@/hooks/useAuth";

type WhatsAppSession = {
  id: string;
  session_name: string;
  status: 'connected' | 'disconnected' | 'qr_issued';
  organization_id: string;
  organization_name?: string;
  created_at: string;
  updated_at: string;
  last_qr_b64?: string;
  last_qr_at?: string;
};

interface WhatsAppSessionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WhatsAppSessionsModal = ({ open, onOpenChange }: WhatsAppSessionsModalProps) => {
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingSessions, setSyncingSessions] = useState<Set<string>>(new Set());
  const [lastSyncTimes, setLastSyncTimes] = useState<Record<string, Date>>({});
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [nextAutoRefresh, setNextAutoRefresh] = useState<number>(30);
  const [notifiedStaleSessions, setNotifiedStaleSessions] = useState<Set<string>>(new Set());
  const [qrDialog, setQrDialog] = useState<{ open: boolean; qr?: string; sessionName?: string; isPolling?: boolean }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; sessionId?: string }>({ open: false });
  const [countdown, setCountdown] = useState(120);
  const [refreshingQr, setRefreshingQr] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoRefreshCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const staleCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const qrDialogOpenRef = useRef(false);
  const { toast } = useToast();
  const { user: authUser, profile: authProfile } = useAuth();

  useEffect(() => {
    qrDialogOpenRef.current = qrDialog.open;
  }, [qrDialog.open]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      
      const profileData = authProfile as any;
      if (!profileData?.organization_id) {
        throw new Error('Организация не найдена');
      }

      const { data, error } = await supabase
        .from('whatsapp_sessions')
        .select(`
          id,
          session_name,
          status,
          organization_id,
          created_at,
          updated_at,
          last_qr_b64,
          last_qr_at,
          organizations(name)
        `)
        .eq('organization_id', profileData.organization_id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const formattedSessions = data?.map((session: any) => ({
        ...session,
        organization_name: session.organizations?.name,
      })) || [];

      setSessions(formattedSessions);
    } catch (error: unknown) {
      console.error('Error fetching sessions:', error);
      toast({
        title: "Ошибка",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchSessions();

      const channel = supabase
        .channel('whatsapp-sessions-modal-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'whatsapp_sessions'
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newRow: any = payload.new;
              setSessions(prev => {
                const exists = prev.some(s => s.session_name === newRow.session_name);
                if (exists) return prev;
                return [{
                  id: newRow.id,
                  session_name: newRow.session_name,
                  status: newRow.status,
                  organization_id: newRow.organization_id,
                  created_at: newRow.created_at,
                  updated_at: newRow.updated_at,
                  last_qr_b64: newRow.last_qr_b64,
                  last_qr_at: newRow.last_qr_at,
                }, ...prev];
              });
              toast({
                title: "Новая сессия",
                description: `Создана сессия: ${newRow.session_name}`,
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedRow: any = payload.new;
              const oldRow: any = payload.old;
              
              if (oldRow.status === 'connected' && updatedRow.status === 'disconnected') {
                toast({
                  title: "⚠️ Сессия отключена",
                  description: `Сессия ${updatedRow.session_name} потеряла соединение`,
                  variant: "destructive",
                });
              }
              
              setSessions(prev => prev.map(s =>
                s.session_name === updatedRow.session_name
                  ? { ...s, ...updatedRow }
                  : s
              ));
            } else if (payload.eventType === 'DELETE') {
              const deletedRow: any = payload.old;
              setSessions(prev => prev.filter(s => s.session_name !== deletedRow.session_name));
              toast({
                title: "Сессия удалена",
                description: `Сессия ${deletedRow.session_name} была удалена`,
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, toast]);

  const updateSessionStatus = async (sessionName: string, silent = false) => {
    try {
      setSyncingSessions(prev => new Set(prev).add(sessionName));
      
      if (!silent) {
        toast({
          title: "Обновление статуса...",
          description: `Проверка статуса сессии ${sessionName}`,
        });
      }

      const data = await wppStatus(sessionName, true);
      
      setLastSyncTimes(prev => ({
        ...prev,
        [sessionName]: new Date()
      }));
      
      await fetchSessions();
      
      if (!silent) {
        toast({
          title: "Статус обновлен",
          description: `Сессия ${sessionName}: ${data?.status || 'неизвестно'}`,
        });
      }
    } catch (error: unknown) {
      console.error('Error updating status:', error);
      if (!silent) {
        toast({
          title: "Ошибка",
          description: getErrorMessage(error),
          variant: "destructive",
        });
      }
    } finally {
      setSyncingSessions(prev => {
        const next = new Set(prev);
        next.delete(sessionName);
        return next;
      });
    }
  };

  const showQrCode = (session: WhatsAppSession) => {
    if (session.status === 'connected') {
      toast({
        title: "✅ Уже подключено",
        description: "Сессия активна, QR не требуется",
      });
      return;
    }

    if (session.last_qr_b64) {
      setQrDialog({ 
        open: true, 
        qr: session.last_qr_b64, 
        sessionName: session.session_name,
        isPolling: true 
      });
      startStatusPolling(session.session_name);
    } else {
      toast({
        title: "QR код недоступен",
        description: "Обновите статус сессии для получения QR кода",
        variant: "destructive",
      });
    }
  };

  const createNewSession = async () => {
    try {
      setLoading(true);
      
      const profileData = authProfile as any;
      if (!profileData?.organization_id) {
        throw new Error('Организация не найдена');
      }

      const sessionSuffix = Date.now().toString().slice(-6);

      toast({
        title: "Создание сессии...",
        description: "Инициализация новой WhatsApp сессии",
      });

      const data = await wppStart(sessionSuffix);

      await fetchSessions();

      if (data?.qrcode && data?.session_name) {
        const newSession: WhatsAppSession = {
          id: crypto.randomUUID(),
          session_name: data.session_name,
          status: 'qr_issued',
          organization_id: profileData.organization_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_qr_b64: data.qrcode,
          last_qr_at: new Date().toISOString(),
        };
        setSessions(prev => [newSession, ...prev]);
        
        setQrDialog({ 
          open: true, 
          qr: data.qrcode, 
          sessionName: data.session_name,
          isPolling: true 
        });
        startStatusPolling(data.session_name);
        toast({
          title: "✅ Сессия создана",
          description: "Отсканируйте QR-код для подключения",
        });
      } else if (data?.status === 'connected' && data?.session_name) {
        setSessions(prev => {
          const exists = prev.some(s => s.session_name === data.session_name);
          const next = exists
            ? prev.map(s => s.session_name === data.session_name ? { ...s, status: 'connected' as const, last_qr_b64: undefined, last_qr_at: undefined } : s)
            : [{ id: crypto.randomUUID(), session_name: data.session_name!, status: 'connected' as const, organization_id: prev[0]?.organization_id || '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as WhatsAppSession, ...prev];
          return next;
        });
        toast({
          title: "✅ Сессия активна",
          description: "Новая сессия успешно создана и подключена",
        });
      }
    } catch (error: unknown) {
      console.error('[createNewSession] Error:', error);
      toast({
        title: "Ошибка",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const disconnectSession = async (sessionName: string) => {
    try {
      toast({
        title: "Отключение...",
        description: `Отключение сессии ${sessionName}`,
      });

      await wppDisconnect(sessionName);

      await fetchSessions();
      
      toast({
        title: "Отключено",
        description: `Сессия ${sessionName} успешно отключена`,
      });
    } catch (error: unknown) {
      console.error('Error disconnecting:', error);
      toast({
        title: "Ошибка",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const deleteSession = async () => {
    if (!deleteDialog.sessionId) return;

    try {
      const { error } = await supabase
        .from('whatsapp_sessions')
        .delete()
        .eq('id', deleteDialog.sessionId);

      if (error) throw error;

      await fetchSessions();
      setDeleteDialog({ open: false });
      
      toast({
        title: "Удалено",
        description: "Сессия успешно удалена",
      });
    } catch (error: unknown) {
      console.error('Error deleting session:', error);
      toast({
        title: "Ошибка",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const updateAllStatuses = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    
    for (const session of sessions) {
      await updateSessionStatus(session.session_name, silent);
    }
    
    if (!silent) {
      setLoading(false);
    }
  };

  const startAutoRefresh = () => {
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
    }
    if (autoRefreshCountdownRef.current) {
      clearInterval(autoRefreshCountdownRef.current);
    }

    setNextAutoRefresh(30);

    autoRefreshCountdownRef.current = setInterval(() => {
      setNextAutoRefresh(prev => {
        if (prev <= 1) {
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    autoRefreshIntervalRef.current = setInterval(async () => {
      await updateAllStatuses(true);
      setNextAutoRefresh(30);
    }, 30000);
  };

  const stopAutoRefresh = () => {
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = null;
    }
    if (autoRefreshCountdownRef.current) {
      clearInterval(autoRefreshCountdownRef.current);
      autoRefreshCountdownRef.current = null;
    }
  };

  const checkStaleData = () => {
    const now = Date.now();
    const staleThreshold = 30 * 60 * 1000;
    
    sessions.forEach(session => {
      const lastSync = lastSyncTimes[session.session_name];
      
      if (lastSync && session.status === 'connected') {
        const timeSinceSync = now - lastSync.getTime();
        
        if (timeSinceSync > staleThreshold && !notifiedStaleSessions.has(session.session_name)) {
          toast({
            title: "⚠️ Устаревшие данные синхронизации",
            description: `Сессия ${session.session_name} не обновлялась более 30 минут`,
            variant: "destructive",
          });
          
          setNotifiedStaleSessions(prev => new Set(prev).add(session.session_name));
        }
      }
      
      if (lastSync && notifiedStaleSessions.has(session.session_name)) {
        const timeSinceSync = now - lastSync.getTime();
        if (timeSinceSync < staleThreshold) {
          setNotifiedStaleSessions(prev => {
            const next = new Set(prev);
            next.delete(session.session_name);
            return next;
          });
        }
      }
    });
  };

  const startStaleDataMonitoring = () => {
    if (staleCheckIntervalRef.current) {
      clearInterval(staleCheckIntervalRef.current);
    }
    
    staleCheckIntervalRef.current = setInterval(() => {
      checkStaleData();
    }, 60000);
  };

  const stopStaleDataMonitoring = () => {
    if (staleCheckIntervalRef.current) {
      clearInterval(staleCheckIntervalRef.current);
      staleCheckIntervalRef.current = null;
    }
  };

  const toggleAutoRefresh = () => {
    const newState = !autoRefreshEnabled;
    setAutoRefreshEnabled(newState);
    
    if (newState) {
      startAutoRefresh();
      startStaleDataMonitoring();
      toast({
        title: "Авто-обновление включено",
        description: "Статусы будут обновляться каждые 30 секунд",
      });
    } else {
      stopAutoRefresh();
      stopStaleDataMonitoring();
      toast({
        title: "Авто-обновление отключено",
        description: "Используйте кнопку для ручного обновления",
      });
    }
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const startStatusPolling = (sessionName: string) => {
    stopPolling();
    setCountdown(120);
    setQrDialog(prev => ({ ...prev, isPolling: true }));

    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          stopPolling();
          toast({
            title: "QR код истек",
            description: "Сгенерируйте новый QR код",
            variant: "destructive",
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const data = await wppStatus(sessionName);

        if (data?.qrcode && data?.status === 'qr_issued') {
          setQrDialog(prev => {
            if (prev.qr !== data.qrcode) {
              return { ...prev, qr: data.qrcode };
            }
            return prev;
          });
        }

        if (data?.status === 'connected') {
          stopPolling();
          
          const profileData = authProfile as any;
          if (profileData?.organization_id) {
            await supabase
              .from('whatsapp_sessions')
              .upsert({
                session_name: sessionName,
                organization_id: profileData.organization_id,
                status: 'connected',
                last_qr_b64: null,
                last_qr_at: null,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'session_name' });
          }
          
          setQrDialog({ open: false, isPolling: false });

          setSessions(prev => prev.map(s =>
            s.session_name === sessionName
              ? { ...s, status: 'connected', last_qr_b64: undefined, last_qr_at: undefined }
              : s
          ));
          
          await fetchSessions();
          
          toast({
            title: "✅ Подключено!",
            description: "WhatsApp успешно подключен",
          });
        }
      } catch (error: unknown) {
        console.error('Polling error:', error);
      }
    }, 2000);

    setTimeout(() => {
      if (pollingIntervalRef.current) {
        stopPolling();
      }
    }, 120000);
  };

  const reconnectSession = async (sessionName: string) => {
    try {
      toast({
        title: "Переподключение...",
        description: "Запуск сессии WhatsApp...",
      });

      const parts = sessionName.split('_');
      const sessionSuffix = parts.length > 2 ? parts[parts.length - 1] : undefined;

      await wppStart(sessionSuffix);

      await fetchSessions();

      const statusData = await wppStatus(sessionName, true);

      if (statusData?.qrcode) {
        setQrDialog({ 
          open: true, 
          qr: statusData.qrcode, 
          sessionName,
          isPolling: true 
        });
        startStatusPolling(sessionName);
        toast({
          title: "✅ QR получен",
          description: "Отсканируйте QR-код в WhatsApp",
        });
      } else if (statusData?.status === 'connected') {
        setSessions(prev => prev.map(s =>
          s.session_name === sessionName
            ? { ...s, status: 'connected', last_qr_b64: undefined, last_qr_at: undefined }
            : s
        ));
        toast({
          title: "✅ Уже подключено",
          description: "Сессия уже активна",
        });
      }
    } catch (error: unknown) {
      console.error('Error reconnecting:', error);
      toast({
        title: "Ошибка",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const refreshQrCode = async (sessionName: string) => {
    try {
      setRefreshingQr(true);
      
      const data = await wppStatus(sessionName, true);

      if (data?.qrcode) {
        setQrDialog(prev => ({ 
          ...prev, 
          qr: data.qrcode 
        }));
        
        setCountdown(120);
        
        toast({
          title: "✅ QR обновлен",
          description: "Новый QR код получен",
        });
      } else if (data?.status === 'connected') {
        stopPolling();
        setQrDialog({ open: false });
        toast({
          title: "✅ Уже подключено",
          description: "WhatsApp уже подключен",
        });
        await fetchSessions();
      } else {
        toast({
          title: "⚠️ QR недоступен",
          description: `Статус: ${data?.status || 'неизвестно'}`,
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      console.error('Error refreshing QR:', error);
      toast({
        title: "Ошибка",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setRefreshingQr(false);
    }
  };

  useEffect(() => {
    if (sessions.length > 0 && autoRefreshEnabled && open) {
      if (!autoRefreshIntervalRef.current) {
        startAutoRefresh();
      }
      if (!staleCheckIntervalRef.current) {
        startStaleDataMonitoring();
      }
    }
  }, [sessions.length, autoRefreshEnabled, open]);

  useEffect(() => {
    if (Object.keys(lastSyncTimes).length > 0) {
      checkStaleData();
    }
  }, [lastSyncTimes, sessions]);

  useEffect(() => {
    if (!open) {
      stopPolling();
      stopAutoRefresh();
      stopStaleDataMonitoring();
    }
    
    return () => {
      stopPolling();
      stopAutoRefresh();
      stopStaleDataMonitoring();
    };
  }, [open]);

  const getStatusBadge = (status: WhatsAppSession['status']) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-[hsl(var(--success-600))] text-white hover:bg-[hsl(var(--success-600))]">🟢 Подключено</Badge>;
      case 'qr_issued':
        return <Badge className="bg-[hsl(var(--warning-600))] text-white hover:bg-[hsl(var(--warning-600))]">🟡 QR выдан</Badge>;
      case 'disconnected':
        return <Badge variant="destructive">🔴 Отключено</Badge>;
      default:
        return <Badge variant="outline">Неизвестно</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSyncFreshnessIndicator = (sessionName: string) => {
    const lastSync = lastSyncTimes[sessionName];
    if (!lastSync) {
      return {
        color: 'text-muted-foreground',
        text: 'Никогда',
        badge: '⚫'
      };
    }

    const minutesAgo = (Date.now() - lastSync.getTime()) / 1000 / 60;
    
    if (minutesAgo < 5) {
      return {
        color: 'text-[hsl(var(--success-600))]',
        text: formatDistanceToNow(lastSync, { addSuffix: true, locale: ru }),
        badge: '🟢'
      };
    } else if (minutesAgo < 30) {
      return {
        color: 'text-[hsl(var(--warning-600))]',
        text: formatDistanceToNow(lastSync, { addSuffix: true, locale: ru }),
        badge: '🟡'
      };
    } else {
      return {
        color: 'text-destructive',
        text: formatDistanceToNow(lastSync, { addSuffix: true, locale: ru }),
        badge: '🔴'
      };
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div>
                <DialogTitle>WhatsApp Sessions</DialogTitle>
                {autoRefreshEnabled && sessions.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Следующее обновление через: {nextAutoRefresh}с
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={toggleAutoRefresh} 
                  variant={autoRefreshEnabled ? "default" : "outline"}
                  size="sm"
                >
                  {autoRefreshEnabled ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      Пауза
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Старт
                    </>
                  )}
                </Button>
                <Button onClick={createNewSession} disabled={loading} size="sm">
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Создать
                </Button>
                <Button onClick={() => updateAllStatuses(false)} disabled={loading} variant="outline" size="sm">
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Обновить
                </Button>
              </div>
            </div>
          </DialogHeader>

          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Сессии</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Нет активных сессий
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Имя сессии</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Последняя синхронизация</TableHead>
                      <TableHead>Создано</TableHead>
                      <TableHead>Обновлено</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => {
                      const freshness = getSyncFreshnessIndicator(session.session_name);
                      const isSyncing = syncingSessions.has(session.session_name);
                      
                      return (
                        <TableRow key={session.id}>
                          <TableCell className="font-medium">{session.session_name}</TableCell>
                          <TableCell>{getStatusBadge(session.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span>{freshness.badge}</span>
                              <span className={freshness.color}>{freshness.text}</span>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(session.created_at)}</TableCell>
                          <TableCell>{formatDate(session.updated_at)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                onClick={() => updateSessionStatus(session.session_name, false)}
                                disabled={isSyncing}
                                size="sm"
                                variant="outline"
                              >
                                {isSyncing ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                              
                              {session.status === 'qr_issued' && (
                                <Button
                                  onClick={() => showQrCode(session)}
                                  size="sm"
                                  variant="outline"
                                >
                                  <QrCode className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {session.status === 'disconnected' && (
                                <Button
                                  onClick={() => reconnectSession(session.session_name)}
                                  size="sm"
                                  variant="outline"
                                >
                                  <PowerOff className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {session.status === 'connected' && (
                                <Button
                                  onClick={() => disconnectSession(session.session_name)}
                                  size="sm"
                                  variant="outline"
                                >
                                  <PowerOff className="h-4 w-4" />
                                </Button>
                              )}
                              
                              <Button
                                onClick={() => setDeleteDialog({ open: true, sessionId: session.id })}
                                size="sm"
                                variant="destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <WhatsAppDebugPanel />
        </DialogContent>
      </Dialog>

      <Dialog open={qrDialog.open} onOpenChange={(open) => {
        if (!open) {
          stopPolling();
          setQrDialog({ open: false });
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR код для подключения</DialogTitle>
            <DialogDescription>
              Отсканируйте этот QR код в WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {qrDialog.qr && (
              <img
                src={qrDialog.qr}
                alt="WhatsApp QR Code"
                className="w-64 h-64 border-2 border-border rounded-lg"
              />
            )}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Сессия: {qrDialog.sessionName}
              </p>
              {qrDialog.isPolling && countdown > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Осталось времени: {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                  </p>
                  <Progress value={(countdown / 120) * 100} className="w-64" />
                </div>
              )}
            </div>
            <Button 
              onClick={() => qrDialog.sessionName && refreshQrCode(qrDialog.sessionName)}
              disabled={refreshingQr}
              variant="outline"
              className="w-full"
            >
              {refreshingQr ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Обновление...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Обновить QR код
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить сессию?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Сессия будет полностью удалена из системы.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={deleteSession}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
