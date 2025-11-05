import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";
import { WhatsAppConnector } from "./WhatsAppConnector";
import { supabase } from "@/integrations/supabase/client";

export const WhatsAppStatusNotification = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!profile?.organization_id) {
        setIsConnected(false);
        setIsLoading(false);
        return;
      }

      // Save org id for realtime filtering
      setOrgId(profile.organization_id);

      // Check if ANY session for this org is connected (not just one)
      const { data: wppSessions } = await supabase
        .from('whatsapp_sessions')
        .select('status')
        .eq('organization_id', profile.organization_id)
        .eq('status', 'connected');

      const hasConnectedSession = wppSessions && wppSessions.length > 0;
      console.log('[WhatsAppStatus] Connected sessions:', wppSessions?.length || 0);
      
      const wasDisconnected = !isConnected;
      setIsConnected(hasConnectedSession);
      
      // If just connected, close any open dialog and show success
      if (hasConnectedSession && wasDisconnected && showDialog) {
        console.log('[WhatsAppStatus] Connection established, closing dialog');
        setShowDialog(false);
      }
    } catch (error) {
      console.error("[WhatsAppStatus] Error checking connection:", error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, showDialog]);

  useEffect(() => {
    checkConnection();
    
    // Set up real-time subscription to whatsapp_sessions changes
    const channel = supabase
      .channel('whatsapp-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_sessions'
        },
        (payload) => {
          console.log('[WhatsAppStatus] Real-time update:', payload);
          const newRow: any = payload.new || {};
          const oldRow: any = payload.old || {};
          const changedOrgId = newRow.organization_id || oldRow.organization_id;

          if (orgId && changedOrgId === orgId) {
            const newStatus = newRow.status;
            if (newStatus === 'connected') {
              setIsConnected(true);
              if (showDialog) setShowDialog(false);
            } else if (newStatus === 'disconnected') {
              setIsConnected(false);
            }
          }

          // Fallback: verify with a fresh read
          checkConnection();
        }
      )
      .subscribe();

    // Also poll every 10 seconds as fallback
    const interval = setInterval(checkConnection, 10000);
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [checkConnection, orgId, showDialog]);

  if (isLoading || isConnected || isDismissed) {
    return null;
  }

  return (
    <>
      <div className="p-4 border-b bg-yellow-50 dark:bg-yellow-950/20">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
            <div>
              <p className="font-semibold text-sm">WhatsApp не подключен</p>
              <p className="text-sm text-muted-foreground">
                Для отправки сообщений необходимо настроить интеграцию с WhatsApp
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="default" 
              size="sm"
              onClick={() => setShowDialog(true)}
            >
              Подключить
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        // If dialog closes, recheck connection status
        if (!open) {
          checkConnection();
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Подключение WhatsApp</DialogTitle>
          </DialogHeader>
          <WhatsAppConnector />
        </DialogContent>
      </Dialog>
    </>
  );
};
