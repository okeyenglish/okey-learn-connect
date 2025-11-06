import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Loader2, RefreshCw, QrCode, Trash2, PowerOff, Plus } from "lucide-react";

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

const WhatsAppSessions = () => {
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingSessions, setSyncingSessions] = useState<Set<string>>(new Set());
  const [lastSyncTimes, setLastSyncTimes] = useState<Record<string, Date>>({});
  const [qrDialog, setQrDialog] = useState<{ open: boolean; qr?: string; sessionName?: string; isPolling?: boolean }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; sessionId?: string }>({ open: false });
  const [countdown, setCountdown] = useState(120);
  const [refreshingQr, setRefreshingQr] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const qrDialogOpenRef = useRef(false);
  const { toast } = useToast();

  // Keep ref in sync with state
  useEffect(() => {
    qrDialogOpenRef.current = qrDialog.open;
  }, [qrDialog.open]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      
      // Get current user's organization_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.organization_id) {
        throw new Error('Организация не найдена');
      }

      // Fetch sessions only for user's organization
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
        .eq('organization_id', profile.organization_id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const formattedSessions = data?.map((session: any) => ({
        ...session,
        organization_name: session.organizations?.name,
      })) || [];

      console.log('[fetchSessions] Loaded sessions:', formattedSessions.map(s => ({ name: s.session_name, status: s.status })));
      setSessions(formattedSessions);
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось загрузить сессии",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();

    // Subscribe to real-time changes on whatsapp_sessions table
    const channel = supabase
      .channel('whatsapp-sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'whatsapp_sessions'
        },
        (payload) => {
          console.log('[Real-time] Update received:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newRow: any = payload.new;
            // Add new session to the list if not already present
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

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const updateSessionStatus = async (sessionName: string) => {
    try {
      setSyncingSessions(prev => new Set(prev).add(sessionName));
      
      toast({
        title: "Обновление статуса...",
        description: `Проверка статуса сессии ${sessionName}`,
      });

      const { data, error } = await supabase.functions.invoke('wpp-status', {
        body: { session_name: sessionName, force: true },
      });

      if (error) throw error;

      console.log('[updateSessionStatus] Status from wpp-status:', data);
      
      // Update last sync time on successful sync
      setLastSyncTimes(prev => ({
        ...prev,
        [sessionName]: new Date()
      }));
      
      // Force refresh sessions
      await fetchSessions();
      
      toast({
        title: "Статус обновлен",
        description: `Сессия ${sessionName}: ${data?.status || 'неизвестно'}`,
      });
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить статус",
        variant: "destructive",
      });
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
      // Start polling immediately when opening QR dialog
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
      
      // Get current user's organization_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) {
        throw new Error('Организация не найдена');
      }

      // Generate unique session suffix using timestamp
      const sessionSuffix = Date.now().toString().slice(-6);
      console.log('[createNewSession] Creating session with suffix:', sessionSuffix);

      toast({
        title: "Создание сессии...",
        description: "Инициализация новой WhatsApp сессии",
      });

      const { data, error } = await supabase.functions.invoke('wpp-start', {
        body: { session_suffix: sessionSuffix },
      });

      console.log('[createNewSession] Response:', { data, error });

      if (error) {
        const anyErr: any = error;
        const status = anyErr?.context?.status ? ` (HTTP ${anyErr.context.status})` : '';
        const bodySnippet = anyErr?.context?.body ? `\n${String(anyErr.context.body).slice(0, 200)}` : '';
        toast({
          title: "Ошибка",
          description: `${anyErr?.message || 'Не удалось создать сессию'}${status}${bodySnippet}`,
          variant: "destructive",
        });
        throw error;
      }

      // Refresh sessions list
      await fetchSessions();

      // Handle different response scenarios
      if (data?.qrcode && data?.session_name) {
        console.log('[createNewSession] QR received, opening dialog');
        
        // Optimistically add to list immediately with qr_issued status
        const newSession: WhatsAppSession = {
          id: crypto.randomUUID(),
          session_name: data.session_name,
          status: 'qr_issued',
          organization_id: profile.organization_id,
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
        console.log('[createNewSession] Session already connected');
        // Optimistically add/update the session as connected
        setSessions(prev => {
          const exists = prev.some(s => s.session_name === data.session_name);
          const next = exists
            ? prev.map(s => s.session_name === data.session_name ? { ...s, status: 'connected', last_qr_b64: undefined, last_qr_at: undefined } : s)
            : [{ id: crypto.randomUUID(), session_name: data.session_name, status: 'connected', organization_id: prev[0]?.organization_id || '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any, ...prev];
          return next;
        });
        toast({
          title: "✅ Сессия активна",
          description: "Новая сессия успешно создана и подключена",
        });
      } else if (data?.session_name) {
        // Session created but QR not yet available - force status check
        console.log('[createNewSession] Session created, fetching fresh QR');
        
        // Wait a moment for WPP to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: statusData } = await supabase.functions.invoke('wpp-status', {
          body: { 
            session_name: data.session_name,
            force: true 
          },
        });

        if (statusData?.qrcode) {
          console.log('[createNewSession] Got QR from status check');
          
          // Optimistically add to list
          const newSession: WhatsAppSession = {
            id: crypto.randomUUID(),
            session_name: data.session_name,
            status: 'qr_issued',
            organization_id: profile.organization_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_qr_b64: statusData.qrcode,
            last_qr_at: new Date().toISOString(),
          };
          setSessions(prev => {
            // Check if already exists to avoid duplicates
            const exists = prev.some(s => s.session_name === data.session_name);
            return exists ? prev : [newSession, ...prev];
          });
          
          setQrDialog({ 
            open: true, 
            qr: statusData.qrcode, 
            sessionName: data.session_name,
            isPolling: true 
          });
          startStatusPolling(data.session_name);
          toast({
            title: "✅ QR получен",
            description: "Отсканируйте QR-код для подключения",
          });
        } else {
          toast({
            title: "Сессия создана",
            description: "Обновите статус для получения QR кода",
          });
        }
      } else {
        console.warn('[createNewSession] Unexpected response:', data);
        toast({
          title: "Сессия создана",
          description: "Обновите список для просмотра новой сессии",
        });
      }
    } catch (error: any) {
      console.error('[createNewSession] Error:', error);
      if (!error?.context) {
        toast({
          title: "Ошибка",
          description: error?.message || "Не удалось создать сессию",
          variant: "destructive",
        });
      }
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

      const { error } = await supabase.functions.invoke('wpp-disconnect', {
        body: { session_name: sessionName },
      });

      if (error) throw error;

      await fetchSessions();
      
      toast({
        title: "Отключено",
        description: `Сессия ${sessionName} успешно отключена`,
      });
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отключить сессию",
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
    } catch (error: any) {
      console.error('Error deleting session:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить сессию",
        variant: "destructive",
      });
    }
  };

  const updateAllStatuses = async () => {
    setLoading(true);
    for (const session of sessions) {
      await updateSessionStatus(session.session_name);
    }
    setLoading(false);
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
    stopPolling(); // Clear any existing polling
    setCountdown(120); // Reset countdown to 2 minutes
    setQrDialog(prev => ({ ...prev, isPolling: true }));

    // Start countdown timer
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

    // Poll status every 2 seconds
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('wpp-status', {
          body: { session_name: sessionName },
        });

        if (error) throw error;

        console.log('[startStatusPolling] Status check:', data?.status);

        // Update QR if it changed
        if (data?.qrcode && data?.status === 'qr_issued') {
          setQrDialog(prev => {
            if (prev.qr !== data.qrcode) {
              console.log('[startStatusPolling] QR updated');
              return { ...prev, qr: data.qrcode };
            }
            return prev;
          });
        }

        // Handle connected status
        if (data?.status === 'connected') {
          console.log('[startStatusPolling] Connected! Stopping polling and updating...');
          stopPolling();
          
          // CRITICAL: Force DB update to ensure status is persisted
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('organization_id')
              .eq('id', user.id)
              .single();
            
            if (profile?.organization_id) {
              await supabase
                .from('whatsapp_sessions')
                .upsert({
                  session_name: sessionName,
                  organization_id: profile.organization_id,
                  status: 'connected',
                  last_qr_b64: null,
                  last_qr_at: null,
                  updated_at: new Date().toISOString(),
                }, { onConflict: 'session_name' });
            }
          }
          
          // Close dialog immediately
          setQrDialog({ open: false, isPolling: false });

          // Optimistically update list
          setSessions(prev => prev.map(s =>
            s.session_name === sessionName
              ? { ...s, status: 'connected', last_qr_b64: undefined, last_qr_at: undefined }
              : s
          ));
          
          // Force refresh from DB
          await fetchSessions();
          
          // Show success toast
          toast({
            title: "✅ Подключено!",
            description: "WhatsApp успешно подключен",
          });
        }
      } catch (error: any) {
        console.error('Polling error:', error);
      }
    }, 2000);

    // Stop polling after 2 minutes
    setTimeout(() => {
      if (pollingIntervalRef.current) {
        console.log('[startStatusPolling] Timeout reached, stopping polling');
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

      // Extract suffix from session name if exists (format: org_XXX_SUFFIX)
      const parts = sessionName.split('_');
      const sessionSuffix = parts.length > 2 ? parts[parts.length - 1] : undefined;

      const { data, error } = await supabase.functions.invoke('wpp-start', {
        body: sessionSuffix ? { session_suffix: sessionSuffix } : {},
      });

      if (error) {
        const anyErr: any = error as any;
        const status = anyErr?.context?.status ? ` (HTTP ${anyErr.context.status})` : '';
        const bodySnippet = anyErr?.context?.body ? `\n${String(anyErr.context.body).slice(0, 200)}` : '';
        toast({
          title: "Ошибка",
          description: `${anyErr?.message || 'Не удалось запустить сессию'}${status}${bodySnippet}`,
          variant: "destructive",
        });
        throw error;
      }

      await fetchSessions();

      // Force fresh QR code on reconnect
      const { data: statusData, error: statusError } = await supabase.functions.invoke('wpp-status', {
        body: { 
          session_name: sessionName,
          force: true 
        },
      });

      if (statusError) throw statusError;

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
        // Optimistic update
        setSessions(prev => prev.map(s =>
          s.session_name === sessionName
            ? { ...s, status: 'connected', last_qr_b64: undefined, last_qr_at: undefined }
            : s
        ));
        toast({
          title: "✅ Уже подключено",
          description: "Сессия уже активна",
        });
      } else {
        toast({
          title: "Ожидание QR",
          description: "QR код генерируется, проверьте статус через несколько секунд",
        });
      }
    } catch (error: any) {
      console.error('Error reconnecting:', error);
      if (!error?.context) {
        toast({
          title: "Ошибка",
          description: error?.message || "Не удалось переподключить сессию",
          variant: "destructive",
        });
      }
    }
  };

  const refreshQrCode = async (sessionName: string) => {
    try {
      setRefreshingQr(true);
      
      const { data, error } = await supabase.functions.invoke('wpp-status', {
        body: { 
          session_name: sessionName,
          force: true 
        },
      });

      if (error) throw error;

      if (data?.qrcode) {
        setQrDialog(prev => ({ 
          ...prev, 
          qr: data.qrcode 
        }));
        
        // Reset countdown when QR is refreshed
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
    } catch (error: any) {
      console.error('Error refreshing QR:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить QR код",
        variant: "destructive",
      });
    } finally {
      setRefreshingQr(false);
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

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
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">WhatsApp Sessions Management</h1>
        <div className="flex gap-2">
          <Button onClick={createNewSession} disabled={loading} variant="default">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Создать сессию
          </Button>
          <Button onClick={updateAllStatuses} disabled={loading} variant="outline">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Обновить статусы
          </Button>
        </div>
      </div>

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
                  <TableHead>Организация</TableHead>
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
                  const syncIndicator = getSyncFreshnessIndicator(session.session_name);
                  return (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">
                        {session.organization_name || session.organization_id}
                      </TableCell>
                      <TableCell>{session.session_name}</TableCell>
                      <TableCell>{getStatusBadge(session.status)}</TableCell>
                      <TableCell className={`text-sm font-medium ${syncIndicator.color}`}>
                        <div className="flex items-center gap-2">
                          <span>{syncIndicator.badge}</span>
                          <span>{syncIndicator.text}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(session.created_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(session.updated_at)}
                      </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateSessionStatus(session.session_name)}
                          disabled={syncingSessions.has(session.session_name)}
                        >
                          {syncingSessions.has(session.session_name) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                        {session.status === 'connected' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => disconnectSession(session.session_name)}
                            title="Отключить сессию"
                          >
                            <PowerOff className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => showQrCode(session)}
                            disabled={!session.last_qr_b64}
                            title="Показать QR код"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        )}
                        {session.status === 'disconnected' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => reconnectSession(session.session_name)}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Переподключить
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteDialog({ open: true, sessionId: session.id })}
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

      {/* QR Code Dialog */}
      <Dialog 
        open={qrDialog.open} 
        onOpenChange={(open) => {
          if (!open) stopPolling();
          setQrDialog({ open });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Код для подключения</DialogTitle>
            <DialogDescription className="space-y-2">
              <div>Сессия: <strong>{qrDialog.sessionName}</strong></div>
              <div className="text-sm">
                1. Откройте WhatsApp на телефоне<br />
                2. Перейдите в Настройки → Связанные устройства<br />
                3. Нажмите "Связать устройство"<br />
                4. Отсканируйте QR код ниже
              </div>
            </DialogDescription>
          </DialogHeader>
          {qrDialog.qr && (
            <div className="space-y-4">
              <div className="flex justify-center py-4">
                <img 
                  src={qrDialog.qr}
                  key={qrDialog.qr?.slice(-24)}
                  alt="QR Code" 
                  className="max-w-full h-auto border rounded-lg shadow-lg"
                />
              </div>
              {qrDialog.isPolling && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Ожидание сканирования...
                    </span>
                    <Badge variant="outline">
                      {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                    </Badge>
                  </div>
                  <Progress value={(countdown / 120) * 100} />
                  
                  {/* Refresh QR button */}
                  <Button 
                    onClick={() => qrDialog.sessionName && refreshQrCode(qrDialog.sessionName)}
                    disabled={refreshingQr}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    {refreshingQr ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Обновление...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Обновить QR сейчас
                      </>
                    )}
                  </Button>
                </div>
              )}
              {countdown === 0 && (
                <Button 
                  onClick={() => qrDialog.sessionName && reconnectSession(qrDialog.sessionName)}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Сгенерировать новый QR код
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить сессию?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Сессия будет удалена из базы данных.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={deleteSession}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WhatsAppSessions;
