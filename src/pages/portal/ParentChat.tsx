import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { MessageCircle, Send, Paperclip, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PortalContext {
  client: any;
}

interface ChatMessage {
  id: string;
  content: string | null;
  direction: string;
  sender_name: string | null;
  message_type: string | null;
  media_url: string | null;
  created_at: string;
  is_read: boolean;
}

export default function ParentChat() {
  const { client } = useOutletContext<PortalContext>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (client?.id) {
      loadMessages();
      subscribeToMessages();
    }
  }, [client?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async () => {
    try {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("client_id", client.id)
        .order("created_at", { ascending: true });

      setMessages((data as ChatMessage[]) || []);
      
      // Mark as read
      if (data && data.length > 0) {
        const unreadIds = data.filter(m => !m.is_read && m.direction === "incoming").map(m => m.id);
        if (unreadIds.length > 0) {
          await supabase
            .from("chat_messages")
            .update({ is_read: true })
            .in("id", unreadIds);
        }
      }
    } catch (err) {
      console.error("Error loading messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`chat-${client.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `client_id=eq.${client.id}`
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => [...prev, newMsg]);
          
          // Mark as read if incoming
          if (newMsg.direction === "incoming") {
            supabase
              .from("chat_messages")
              .update({ is_read: true })
              .eq("id", newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase.from("chat_messages").insert({
        client_id: client.id,
        organization_id: client.organization_id,
        content: newMessage.trim(),
        direction: "outgoing",
        sender_name: `${client.first_name || ""} ${client.last_name || ""}`.trim() || "Родитель",
        message_type: "text",
        messenger: "chatos",
        status: "sent"
      });

      if (error) throw error;

      setNewMessage("");
    } catch (err: any) {
      toast.error(err.message || "Ошибка отправки");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="h-6 w-6" />
          Чат со школой
        </h1>
        <p className="text-muted-foreground">
          Напишите нам, если у вас есть вопросы
        </p>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium">Начните общение</h3>
              <p className="text-sm text-muted-foreground">
                Напишите сообщение, и мы ответим в ближайшее время
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isOutgoing = msg.direction === "outgoing";
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-2",
                      isOutgoing ? "justify-end" : "justify-start"
                    )}
                  >
                    {!isOutgoing && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>Ш</AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        "max-w-[70%] rounded-lg px-4 py-2",
                        isOutgoing
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {!isOutgoing && msg.sender_name && (
                        <p className="text-xs font-medium mb-1">{msg.sender_name}</p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p
                        className={cn(
                          "text-xs mt-1",
                          isOutgoing ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}
                      >
                        {format(parseISO(msg.created_at), "HH:mm", { locale: ru })}
                      </p>
                    </div>
                    {isOutgoing && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {client?.first_name?.[0] || "Р"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </CardContent>

        {/* Message input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Введите сообщение..."
              disabled={sending}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
