import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Loader2, RefreshCw, QrCode, Trash2, PowerOff } from "lucide-react";

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
  const [qrDialog, setQrDialog] = useState<{ open: boolean; qr?: string; sessionName?: string }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; sessionId?: string }>({ open: false });
  const { toast } = useToast();

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
          console.log('Real-time update received:', payload);
          // Refetch sessions when any change occurs
          fetchSessions();
          
          // Show toast notification
          const eventType = payload.eventType;
          const sessionName = (payload.new as any)?.session_name || (payload.old as any)?.session_name;
          
          if (eventType === 'INSERT') {
            toast({
              title: "Новая сессия",
              description: `Создана сессия: ${sessionName}`,
            });
          } else if (eventType === 'UPDATE') {
            toast({
              title: "Обновление сессии",
              description: `Статус сессии ${sessionName} изменен`,
            });
          } else if (eventType === 'DELETE') {
            toast({
              title: "Сессия удалена",
              description: `Сессия ${sessionName} была удалена`,
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
      toast({
        title: "Обновление статуса...",
        description: `Проверка статуса сессии ${sessionName}`,
      });

      const { data, error } = await supabase.functions.invoke('wpp-status', {
        body: { session_name: sessionName },
      });

      if (error) throw error;

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
    }
  };

  const showQrCode = (session: WhatsAppSession) => {
    if (session.last_qr_b64) {
      setQrDialog({ 
        open: true, 
        qr: session.last_qr_b64, 
        sessionName: session.session_name 
      });
    } else {
      toast({
        title: "QR код недоступен",
        description: "Обновите статус сессии для получения QR кода",
        variant: "destructive",
      });
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

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">WhatsApp Sessions Management</h1>
        <Button onClick={updateAllStatuses} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Обновить все статусы
        </Button>
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
                  <TableHead>Создано</TableHead>
                  <TableHead>Обновлено</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      {session.organization_name || session.organization_id}
                    </TableCell>
                    <TableCell>{session.session_name}</TableCell>
                    <TableCell>{getStatusBadge(session.status)}</TableCell>
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
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => showQrCode(session)}
                          disabled={!session.last_qr_b64}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        {session.status === 'connected' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => disconnectSession(session.session_name)}
                          >
                            <PowerOff className="h-4 w-4" />
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={qrDialog.open} onOpenChange={(open) => setQrDialog({ open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Код для подключения</DialogTitle>
            <DialogDescription>
              Отсканируйте этот QR код в WhatsApp: {qrDialog.sessionName}
            </DialogDescription>
          </DialogHeader>
          {qrDialog.qr && (
            <div className="flex justify-center py-4">
              <img 
                src={qrDialog.qr} 
                alt="QR Code" 
                className="max-w-full h-auto border rounded-lg"
              />
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
