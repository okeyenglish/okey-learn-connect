import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, RefreshCw, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface WebhookLog {
  id: string;
  event_type: string;
  webhook_data: any;
  created_at: string;
  processed: boolean;
  messenger_type: string;
}

interface RecentMessage {
  id: string;
  client_id: string;
  message_text: string;
  message_type: string;
  is_outgoing: boolean;
  messenger_type: string;
  created_at: string;
  client?: {
    name: string;
    phone: string;
  };
}

export const WhatsAppDebugPanel = () => {
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [webhooksOpen, setWebhooksOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);

  const fetchDebugData = async () => {
    try {
      setLoading(true);

      // Fetch recent webhook logs
      const { data: webhooks } = await supabase
        .from('webhook_logs')
        .select('*')
        .eq('messenger_type', 'whatsapp')
        .order('created_at', { ascending: false })
        .limit(20);

      if (webhooks) {
        setWebhookLogs(webhooks);
      }

      // Fetch recent WhatsApp messages with client info
      const { data: messages } = await supabase
        .from('chat_messages')
        .select(`
          id,
          client_id,
          message_text,
          message_type,
          is_outgoing,
          messenger_type,
          created_at,
          clients (
            name,
            phone
          )
        `)
        .eq('messenger_type', 'whatsapp')
        .order('created_at', { ascending: false })
        .limit(20);

      if (messages) {
        setRecentMessages(messages as any);
      }
    } catch (error) {
      console.error('Error fetching debug data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('debug-panel-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webhook_logs',
          filter: 'messenger_type=eq.whatsapp',
        },
        () => {
          fetchDebugData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: 'messenger_type=eq.whatsapp',
        },
        () => {
          fetchDebugData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getEventTypeBadge = (eventType: string) => {
    const type = eventType.toLowerCase();
    if (type.includes('message')) {
      return <Badge variant="default">Сообщение</Badge>;
    }
    if (type.includes('connected') || type.includes('ready')) {
      return <Badge className="bg-[hsl(var(--success-600))] text-white">Подключено</Badge>;
    }
    if (type.includes('qr')) {
      return <Badge className="bg-[hsl(var(--warning-600))] text-white">QR</Badge>;
    }
    if (type.includes('disconnect')) {
      return <Badge variant="destructive">Отключено</Badge>;
    }
    return <Badge variant="outline">{eventType}</Badge>;
  };

  const getMessageTypeBadge = (isOutgoing: boolean) => {
    return isOutgoing ? (
      <Badge variant="outline" className="bg-blue-100 text-blue-700">Исходящее</Badge>
    ) : (
      <Badge variant="outline" className="bg-green-100 text-green-700">Входящее</Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">🔍 Отладка</CardTitle>
          <Button
            onClick={fetchDebugData}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Webhook Logs Section */}
        <Collapsible open={webhooksOpen} onOpenChange={setWebhooksOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="font-medium">
                Webhook События ({webhookLogs.length})
              </span>
              {webhooksOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {webhookLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Нет webhook событий
              </p>
            ) : (
              webhookLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getEventTypeBadge(log.event_type)}
                        {!log.processed && (
                          <Badge variant="outline" className="text-xs">
                            Не обработан
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), {
                          addSuffix: true,
                          locale: ru,
                        })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSelectedLog(selectedLog === log.id ? null : log.id)
                      }
                    >
                      {selectedLog === log.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {selectedLog === log.id && (
                    <div className="mt-2 p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
                      <pre>{JSON.stringify(log.webhook_data, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Recent Messages Section */}
        <Collapsible open={messagesOpen} onOpenChange={setMessagesOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="font-medium">
                Последние Сообщения ({recentMessages.length})
              </span>
              {messagesOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {recentMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Нет сообщений
              </p>
            ) : (
              recentMessages.map((msg) => (
                <div key={msg.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        {getMessageTypeBadge(msg.is_outgoing)}
                        <span className="text-sm font-medium">
                          {msg.client?.name || msg.client?.phone || 'Неизвестно'}
                        </span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">
                        {msg.message_text}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.created_at), {
                          addSuffix: true,
                          locale: ru,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
