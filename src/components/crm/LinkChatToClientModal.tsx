import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Link2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface LinkChatToClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatClientId: string; // ID of the chat/client to link or merge
  chatClientName: string;
  onSuccess?: () => void;
}

export const LinkChatToClientModal = ({
  open,
  onOpenChange,
  chatClientId,
  chatClientName,
  onSuccess,
}: LinkChatToClientModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  // Search for clients
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients-for-link", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];

      const { data, error } = await supabase
        .from("clients")
        .select("id, name, phone, email, avatar_url, telegram_chat_id, whatsapp_chat_id, max_chat_id")
        .eq("is_active", true)
        .neq("id", chatClientId) // Exclude current chat client
        .or(
          `name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
        )
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: searchQuery.length >= 2,
  });

  // Get current chat client info
  const { data: currentClient } = useQuery({
    queryKey: ["current-chat-client", chatClientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", chatClientId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!chatClientId,
  });

  const handleLinkToClient = async () => {
    if (!selectedClientId || !currentClient) return;

    setIsLinking(true);
    try {
      // Get target client data
      const { data: targetClient, error: targetError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", selectedClientId)
        .single();

      if (targetError) throw targetError;

      // Prepare update data - merge messenger IDs
      const updateData: Record<string, any> = {};

      // Transfer telegram data if current has it and target doesn't
      if (currentClient.telegram_chat_id && !targetClient.telegram_chat_id) {
        updateData.telegram_chat_id = currentClient.telegram_chat_id;
        updateData.telegram_user_id = currentClient.telegram_user_id;
        updateData.telegram_avatar_url = currentClient.telegram_avatar_url;
      }

      // Transfer whatsapp data if current has it and target doesn't
      if (currentClient.whatsapp_chat_id && !targetClient.whatsapp_chat_id) {
        updateData.whatsapp_chat_id = currentClient.whatsapp_chat_id;
        updateData.whatsapp_avatar_url = currentClient.whatsapp_avatar_url;
      }

      // Transfer max data if current has it and target doesn't
      if (currentClient.max_chat_id && !targetClient.max_chat_id) {
        updateData.max_chat_id = currentClient.max_chat_id;
        updateData.max_user_id = currentClient.max_user_id;
        updateData.max_avatar_url = currentClient.max_avatar_url;
      }

      // Update target client with merged data
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from("clients")
          .update(updateData)
          .eq("id", selectedClientId);

        if (updateError) throw updateError;
      }

      // Transfer all messages to target client
      const { error: messagesError } = await supabase
        .from("chat_messages")
        .update({ client_id: selectedClientId })
        .eq("client_id", chatClientId);

      if (messagesError) throw messagesError;

      // Transfer phone numbers that don't exist in target
      const { data: currentPhones } = await supabase
        .from("client_phone_numbers")
        .select("*")
        .eq("client_id", chatClientId);

      if (currentPhones && currentPhones.length > 0) {
        // Get target's existing phones to avoid duplicates
        const { data: targetPhones } = await supabase
          .from("client_phone_numbers")
          .select("phone")
          .eq("client_id", selectedClientId);

        const targetPhoneSet = new Set(
          (targetPhones || []).map((p) => p.phone.replace(/\D/g, ""))
        );

        const phonesToTransfer = currentPhones.filter(
          (p) => !targetPhoneSet.has(p.phone.replace(/\D/g, ""))
        );

        if (phonesToTransfer.length > 0) {
          for (const phone of phonesToTransfer) {
            await supabase
              .from("client_phone_numbers")
              .update({ client_id: selectedClientId, is_primary: false })
              .eq("id", phone.id);
          }
        }
      }

      // Deactivate the old client
      const { error: deactivateError } = await supabase
        .from("clients")
        .update({ is_active: false })
        .eq("id", chatClientId);

      if (deactivateError) throw deactivateError;

      toast.success("Чат успешно привязан к клиенту");
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error linking chat:", error);
      toast.error("Ошибка при привязке чата");
    } finally {
      setIsLinking(false);
    }
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Привязать чат к клиенту
          </DialogTitle>
          <DialogDescription>
            Объедините диалог "{chatClientName}" с существующим клиентом. Все
            сообщения и номера телефонов будут перенесены.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current chat info */}
          {currentClient && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground mb-2">Текущий чат:</p>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentClient.avatar_url || ""} />
                  <AvatarFallback>
                    {currentClient.name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {currentClient.name}
                  </p>
                  <div className="flex gap-1 flex-wrap">
                    {currentClient.telegram_chat_id && (
                      <Badge variant="outline" className="text-[10px] h-4">
                        TG
                      </Badge>
                    )}
                    {currentClient.whatsapp_chat_id && (
                      <Badge variant="outline" className="text-[10px] h-4">
                        WA
                      </Badge>
                    )}
                    {currentClient.max_chat_id && (
                      <Badge variant="outline" className="text-[10px] h-4">
                        MAX
                      </Badge>
                    )}
                    {currentClient.phone && (
                      <span className="text-[10px] text-muted-foreground">
                        {currentClient.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="space-y-2">
            <Label>Найти клиента для объединения</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени, телефону или email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Search results */}
          {searchQuery.length >= 2 && (
            <ScrollArea className="h-[200px] border rounded-lg">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Поиск...
                </div>
              ) : clients.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Клиенты не найдены
                </div>
              ) : (
                <div className="p-1">
                  {clients.map((client) => (
                    <button
                      key={client.id}
                      className={`w-full p-2 rounded-lg text-left transition-colors flex items-center gap-2 ${
                        selectedClientId === client.id
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedClientId(client.id)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={client.avatar_url || ""} />
                        <AvatarFallback>
                          {client.name
                            ?.split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {client.name}
                        </p>
                        <div className="flex gap-1 flex-wrap">
                          {client.telegram_chat_id && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4"
                            >
                              TG
                            </Badge>
                          )}
                          {client.whatsapp_chat_id && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4"
                            >
                              WA
                            </Badge>
                          )}
                          {client.max_chat_id && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4"
                            >
                              MAX
                            </Badge>
                          )}
                          {client.phone && (
                            <span className="text-[10px] text-muted-foreground">
                              {client.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}

          {/* Selected client preview */}
          {selectedClient && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <p className="text-xs text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
                <UserPlus className="h-3 w-3" />
                Объединить с:
              </p>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selectedClient.avatar_url || ""} />
                  <AvatarFallback>
                    {selectedClient.name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{selectedClient.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedClient.phone || selectedClient.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                После объединения текущий чат будет деактивирован, а все
                сообщения перенесены к выбранному клиенту. Это действие нельзя
                отменить.
              </span>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleLinkToClient}
            disabled={!selectedClientId || isLinking}
          >
            {isLinking ? "Объединение..." : "Объединить чаты"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
