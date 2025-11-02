import { useEffect, useState } from "react";
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

  useEffect(() => {
    const checkConnection = async () => {
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

        const { data: wppSession } = await supabase
          .from('whatsapp_sessions')
          .select('status')
          .eq('organization_id', profile.organization_id)
          .maybeSingle();

        setIsConnected(wppSession?.status === 'connected');
      } catch (error) {
        console.error("Error checking WhatsApp connection:", error);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);

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

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
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
