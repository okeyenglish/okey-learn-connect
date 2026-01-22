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

  // Search for clients with improved phone search and ID search
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients-for-link", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];

      // Check if searching by internal ID (format: #C12345 or C12345 or just 12345 or UUID)
      const idSearch = searchQuery.trim();
      const isIdSearch =
        idSearch.startsWith("#C") ||
        idSearch.startsWith("#c") ||
        idSearch.startsWith("C") ||
        idSearch.startsWith("c") ||
        /^[0-9a-fA-F-]{36}$/.test(idSearch); // UUID format

      if (isIdSearch) {
        // Extract ID - remove # prefix if present
        let searchId = idSearch;
        if (searchId.startsWith("#")) searchId = searchId.slice(1);
        searchId = searchId.trim();
        
        // Normalize: client_number in DB is stored as "C99746" (with C prefix)
        // User might search: #C99746, C99746, #99746, or just 99746
        let clientNumberSearch = searchId;
        if (!clientNumberSearch.toLowerCase().startsWith("c")) {
          // User entered just number like 99746 - add C prefix
          clientNumberSearch = `C${clientNumberSearch}`;
        } else {
          // Normalize case - DB stores as uppercase C
          clientNumberSearch = `C${clientNumberSearch.slice(1)}`;
        }

        console.log('[LinkChat] Searching by ID:', { original: idSearch, normalized: clientNumberSearch });

        // Search by client_number (e.g., C99746) or full UUID
        const { data: clientsById, error } = await supabase
          .from("clients")
          .select("id, name, phone, email, avatar_url, telegram_chat_id, whatsapp_chat_id, max_chat_id, client_number")
          .eq("is_active", true)
          .neq("id", chatClientId)
          .or(`client_number.eq.${clientNumberSearch},id.eq.${idSearch}`)
          .limit(10);

        if (error) {
          console.log('[LinkChat] ID search error, trying client_number only:', error.message);
          // If query fails (e.g. invalid UUID), try just client_number
          const { data: clientsByNumber } = await supabase
            .from("clients")
            .select("id, name, phone, email, avatar_url, telegram_chat_id, whatsapp_chat_id, max_chat_id, client_number")
            .eq("is_active", true)
            .neq("id", chatClientId)
            .eq("client_number", clientNumberSearch)
            .limit(10);
          console.log('[LinkChat] Fallback search result:', clientsByNumber?.length || 0);
          return clientsByNumber || [];
        }
        console.log('[LinkChat] ID search result:', clientsById?.length || 0);
        return clientsById || [];
      }

      // Normalize phone - extract only digits
      const phoneDigits = searchQuery.replace(/\D/g, "");
      const isPhoneSearch = phoneDigits.length >= 4;
      
      // Get last 10 digits for phone matching (Russian format)
      const phonePattern = phoneDigits.length >= 10 
        ? phoneDigits.slice(-10) 
        : phoneDigits;

      // First, search clients directly
      let clientIds = new Set<string>();
      
      // Search by name/email
      const { data: clientsByName } = await supabase
        .from("clients")
        .select("id")
        .eq("is_active", true)
        .neq("id", chatClientId)
        .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(50);
      
      (clientsByName || []).forEach(c => clientIds.add(c.id));

      // Search by phone in clients table
      if (isPhoneSearch) {
        const { data: clientsByPhone } = await supabase
          .from("clients")
          .select("id")
          .eq("is_active", true)
          .neq("id", chatClientId)
          .ilike("phone", `%${phonePattern}%`)
          .limit(50);
        
        (clientsByPhone || []).forEach(c => clientIds.add(c.id));

        // Search in client_phone_numbers table
        const { data: phoneNumbers } = await supabase
          .from("client_phone_numbers")
          .select("client_id, phone")
          .ilike("phone", `%${phonePattern}%`)
          .limit(100);
        
        if (phoneNumbers) {
          for (const pn of phoneNumbers) {
            if (pn.client_id !== chatClientId) {
              clientIds.add(pn.client_id);
            }
          }
        }
      }

      if (clientIds.size === 0) return [];

      // Fetch full client data
      const { data: fullClients, error } = await supabase
        .from("clients")
        .select("id, name, phone, email, avatar_url, telegram_chat_id, whatsapp_chat_id, max_chat_id, client_number")
        .in("id", Array.from(clientIds))
        .eq("is_active", true)
        .limit(30);

      if (error) throw error;
      return fullClients || [];
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
      console.log("Starting link process:", { chatClientId, selectedClientId });
      
      // Get target client data
      const { data: targetClient, error: targetError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", selectedClientId)
        .single();

      if (targetError) {
        console.error("Error fetching target client:", targetError);
        throw targetError;
      }

      console.log("Target client:", targetClient?.name);

      // Prepare update data - move messenger IDs (avoid unique constraints)
      const targetUpdateData: Record<string, any> = {};
      const currentClearData: Record<string, any> = {};
      const currentRestoreData: Record<string, any> = {};

      // Telegram (unique: organization_id + telegram_user_id)
      if (currentClient.telegram_user_id && !targetClient.telegram_user_id) {
        targetUpdateData.telegram_user_id = currentClient.telegram_user_id;
        targetUpdateData.telegram_chat_id = currentClient.telegram_chat_id;
        targetUpdateData.telegram_avatar_url = currentClient.telegram_avatar_url;

        currentClearData.telegram_user_id = null;
        currentClearData.telegram_chat_id = null;
        currentClearData.telegram_avatar_url = null;

        currentRestoreData.telegram_user_id = currentClient.telegram_user_id;
        currentRestoreData.telegram_chat_id = currentClient.telegram_chat_id;
        currentRestoreData.telegram_avatar_url = currentClient.telegram_avatar_url;
      }

      // WhatsApp
      if (currentClient.whatsapp_chat_id && !targetClient.whatsapp_chat_id) {
        targetUpdateData.whatsapp_chat_id = currentClient.whatsapp_chat_id;
        targetUpdateData.whatsapp_avatar_url = currentClient.whatsapp_avatar_url;

        currentClearData.whatsapp_chat_id = null;
        currentClearData.whatsapp_avatar_url = null;

        currentRestoreData.whatsapp_chat_id = currentClient.whatsapp_chat_id;
        currentRestoreData.whatsapp_avatar_url = currentClient.whatsapp_avatar_url;
      }

      // MAX
      if (currentClient.max_chat_id && !targetClient.max_chat_id) {
        targetUpdateData.max_chat_id = currentClient.max_chat_id;
        targetUpdateData.max_user_id = currentClient.max_user_id;
        targetUpdateData.max_avatar_url = currentClient.max_avatar_url;

        currentClearData.max_chat_id = null;
        currentClearData.max_user_id = null;
        currentClearData.max_avatar_url = null;

        currentRestoreData.max_chat_id = currentClient.max_chat_id;
        currentRestoreData.max_user_id = currentClient.max_user_id;
        currentRestoreData.max_avatar_url = currentClient.max_avatar_url;
      }

      // Salebot client id
      if (currentClient.salebot_client_id && !targetClient.salebot_client_id) {
        targetUpdateData.salebot_client_id = currentClient.salebot_client_id;

        currentClearData.salebot_client_id = null;
        currentRestoreData.salebot_client_id = currentClient.salebot_client_id;
      }

      // First clear fields on current client (to satisfy unique constraints), then update target
      if (Object.keys(targetUpdateData).length > 0) {
        if (Object.keys(currentClearData).length > 0) {
          console.log("Clearing fields on current client:", currentClearData);
          const { error: clearError } = await supabase
            .from("clients")
            .update(currentClearData)
            .eq("id", chatClientId);

          if (clearError) {
            console.error("Error clearing current client fields:", clearError);
            throw clearError;
          }
        }

        console.log("Updating target client with:", targetUpdateData);
        const { error: updateError } = await supabase
          .from("clients")
          .update(targetUpdateData)
          .eq("id", selectedClientId);

        if (updateError) {
          console.error("Error updating target client:", updateError);

          // Best-effort restore if we already cleared something
          if (Object.keys(currentRestoreData).length > 0) {
            await supabase
              .from("clients")
              .update(currentRestoreData)
              .eq("id", chatClientId);
          }

          throw updateError;
        }
      }

      // Transfer all messages to target client
      console.log("Transferring messages from", chatClientId, "to", selectedClientId);
      const { error: messagesError } = await supabase
        .from("chat_messages")
        .update({ client_id: selectedClientId })
        .eq("client_id", chatClientId);

      if (messagesError) {
        console.error("Error transferring messages:", messagesError);
        throw messagesError;
      }

      // Transfer phone numbers that don't exist in target
      const { data: currentPhones } = await supabase
        .from("client_phone_numbers")
        .select("*")
        .eq("client_id", chatClientId);

      console.log("Current phones to transfer:", currentPhones?.length);

      // Get target's existing phones to avoid duplicates
      const { data: targetPhones } = await supabase
        .from("client_phone_numbers")
        .select("phone")
        .eq("client_id", selectedClientId);

      const targetPhoneSet = new Set(
        (targetPhones || []).map((p) => p.phone.replace(/\D/g, ""))
      );

      // Also add target client's main phone to the set
      if (targetClient.phone) {
        targetPhoneSet.add(targetClient.phone.replace(/\D/g, ""));
      }

      // Transfer phone numbers from client_phone_numbers table
      if (currentPhones && currentPhones.length > 0) {
        const phonesToTransfer = currentPhones.filter(
          (p) => !targetPhoneSet.has(p.phone.replace(/\D/g, ""))
        );

        console.log("Phones to transfer after dedup:", phonesToTransfer.length);

        if (phonesToTransfer.length > 0) {
          for (const phone of phonesToTransfer) {
            const { error: phoneError } = await supabase
              .from("client_phone_numbers")
              .update({ client_id: selectedClientId, is_primary: false })
              .eq("id", phone.id);
            
            if (phoneError) {
              console.error("Error transferring phone:", phone.phone, phoneError);
              // Continue with other phones
            }
          }
        }
      }

      // IMPORTANT: Also transfer the main phone from clients table
      // If current client has a phone and target doesn't have it
      if (currentClient.phone) {
        const currentPhoneDigits = currentClient.phone.replace(/\D/g, "");
        
        // Check if this phone already exists in target's phone numbers
        if (!targetPhoneSet.has(currentPhoneDigits)) {
          console.log("Transferring main phone to client_phone_numbers:", currentClient.phone);
          
          // Add as a new phone number record for the target client
          const { error: insertPhoneError } = await supabase
            .from("client_phone_numbers")
            .insert({
              client_id: selectedClientId,
              phone: currentClient.phone,
              is_primary: !targetClient.phone, // Make primary only if target has no phone
              phone_type: "mobile"
            });
          
          if (insertPhoneError) {
            console.error("Error inserting main phone:", insertPhoneError);
            // Not critical, continue
          }
          
          // Update target client's main phone if they don't have one
          if (!targetClient.phone) {
            const { error: updatePhoneError } = await supabase
              .from("clients")
              .update({ phone: currentClient.phone })
              .eq("id", selectedClientId);
            
            if (updatePhoneError) {
              console.error("Error updating target phone:", updatePhoneError);
            }
          }
        }
      }

      // Deactivate the old client
      console.log("Deactivating old client:", chatClientId);
      const { error: deactivateError } = await supabase
        .from("clients")
        .update({ is_active: false })
        .eq("id", chatClientId);

      if (deactivateError) {
        console.error("Error deactivating client:", deactivateError);
        throw deactivateError;
      }

      console.log("Link process completed successfully");
      toast.success("Чат успешно привязан к клиенту");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error linking chat:", error);
      toast.error(`Ошибка при привязке чата: ${error.message || 'Неизвестная ошибка'}`);
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
                placeholder="Поиск по имени, телефону, email или #ID..."
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
                            {client.name}
                          </p>
                          {client.client_number && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              #C{client.client_number}
                            </span>
                          )}
                        </div>
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
