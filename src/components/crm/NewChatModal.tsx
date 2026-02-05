import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCirclePlus,
  Search,
  User,
  Phone,
  Mail,
  MessageCircle
} from "lucide-react";
import { useSearchClients, useCreateClient } from "@/hooks/useClients";
import { useClientPhoneNumbers } from "@/hooks/useClients";
import { supabase } from "@/integrations/supabase/typedClient";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface NewChatModalProps {
  children: React.ReactNode;
  onCreateChat?: (contactInfo: any) => void;
  onExistingClientFound?: (clientId: string) => void;
}

export const NewChatModal = ({ children, onCreateChat, onExistingClientFound }: NewChatModalProps) => {
  const [open, setOpen] = useState(false);
  const [newContactData, setNewContactData] = useState({
    name: "",
    phone: ""
  });
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  
  const { searchClients, searchResults, isSearching } = useSearchClients();
  const createClient = useCreateClient();
  const queryClient = useQueryClient();

  const invalidateAfterRestore = () => {
    queryClient.invalidateQueries({ queryKey: ['deleted-chats'] });
    queryClient.invalidateQueries({ queryKey: ['deleted-client-ids'] });
    queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    queryClient.invalidateQueries({ queryKey: ['chat-threads-infinite'] });
    queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  const checkExistingPhone = async (phone: string): Promise<'found' | 'restored' | false> => {
    if (!phone || phone.length < 5) return false;
    
    setIsCheckingPhone(true);
    try {
      // Normalize phone for comparison (last 10 digits)
      const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
      
      // First check for active clients
      const { data: activeClients, error: activeError } = await supabase
        .from('clients')
        .select('id, name, phone, email, status')
        .or(`phone.ilike.%${normalizedPhone}%`)
        .neq('status', 'deleted')
        .limit(5);
      
      if (activeError) throw activeError;
      
      if (activeClients && activeClients.length > 0) {
        const existingClient = activeClients[0];
        toast.info(`Клиент найден: ${existingClient.name}`, {
          description: "Переходим к существующему чату",
        });
        onExistingClientFound?.(existingClient.id);
        setOpen(false);
        return 'found';
      }
      
      // Check for deleted clients - restore if found
      const { data: deletedClients, error: deletedError } = await supabase
        .from('clients')
        .select('id, name, phone, email')
        .or(`phone.ilike.%${normalizedPhone}%`)
        .eq('status', 'deleted')
        .limit(5);
      
      if (deletedError) throw deletedError;
      
      if (deletedClients && deletedClients.length > 0) {
        const deletedClient = deletedClients[0];
        
        // Restore the deleted client
        const { error: restoreError } = await supabase
          .from('clients')
          .update({ status: 'active' })
          .eq('id', deletedClient.id);
        
        if (restoreError) throw restoreError;
        
        invalidateAfterRestore();
        toast.success(`Чат восстановлен: ${deletedClient.name}`, {
          description: "Клиент был ранее удалён и теперь восстановлен",
        });
        onExistingClientFound?.(deletedClient.id);
        setOpen(false);
        return 'restored';
      }
      
      // Check in client_phone_numbers table (for systems that use it)
      const { data: phoneNumbers, error: phoneError } = await supabase
        .from('client_phone_numbers')
        .select(`
          id,
          phone,
          client_id,
          clients!inner(id, name, phone, email, status)
        `)
        .ilike('phone', `%${normalizedPhone}%`);
      
      if (phoneError) {
        // Table might not exist on self-hosted, ignore error
        console.log('client_phone_numbers check skipped:', phoneError.message);
      } else if (phoneNumbers && phoneNumbers.length > 0) {
        const clientRow = phoneNumbers[0].clients;
        const existingClientData = clientRow as unknown as { id: string; name: string; phone: string | null; email: string | null; status: string } | null;
        
        if (existingClientData) {
          if (existingClientData.status === 'deleted') {
            // Restore deleted client
            const { error: restoreError } = await supabase
              .from('clients')
              .update({ status: 'active' })
              .eq('id', existingClientData.id);
            
            if (restoreError) throw restoreError;
            
            invalidateAfterRestore();
            toast.success(`Чат восстановлен: ${existingClientData.name}`, {
              description: "Клиент был ранее удалён и теперь восстановлен",
            });
            onExistingClientFound?.(existingClientData.id);
            setOpen(false);
            return 'restored';
          } else if (existingClientData.status !== 'deleted') {
            toast.info(`Клиент найден: ${existingClientData.name}`, {
              description: "Переходим к существующему чату",
            });
            onExistingClientFound?.(existingClientData.id);
            setOpen(false);
            return 'found';
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking existing phone:', error);
      return false;
    } finally {
      setIsCheckingPhone(false);
    }
  };

  const handleCreateFromNewContact = async () => {
    if (newContactData.name && newContactData.phone) {
      // First check if phone already exists
      const phoneExists = await checkExistingPhone(newContactData.phone);
      if (phoneExists) return;
      
      try {
        const result = await createClient.mutateAsync({
          name: newContactData.name,
          phone: newContactData.phone,
          is_active: true
        });
        
        toast.success("Новый клиент создан");
        onCreateChat?.(result);
        setNewContactData({ name: "", phone: "" });
        setOpen(false);
      } catch (error: any) {
        console.error('[NewChatModal] Error creating client:', error);
        
        // Handle unique constraint violation (23505) - client exists but wasn't found
        if (error?.code === '23505' || error?.message?.includes('23505')) {
          // Extract client ID from error message like "Клиент с таким телефоном уже существует (ID: uuid)"
          const idMatch = error?.message?.match(/ID:\s*([a-f0-9-]{36})/i);
          console.log('[NewChatModal] 23505 error, extracted ID:', idMatch?.[1]);
          
          if (idMatch) {
            const existingId = idMatch[1];
            
            // Try to restore the client
            try {
              const { data: existingClient, error: fetchError } = await supabase
                .from('clients')
                .select('id, name, status')
                .eq('id', existingId)
                .maybeSingle();
              
              console.log('[NewChatModal] Fetched client:', existingClient, 'error:', fetchError);
              
              if (existingClient) {
                // Restore the client if deleted
                if (existingClient.status === 'deleted') {
                  const { error: restoreError } = await supabase
                    .from('clients')
                    .update({ status: 'active', name: newContactData.name })
                    .eq('id', existingId);
                  
                  if (restoreError) {
                    console.error('[NewChatModal] Restore error:', restoreError);
                  } else {
                    invalidateAfterRestore();
                    toast.success(`Чат восстановлен: ${newContactData.name}`, {
                      description: "Клиент был ранее удалён и теперь восстановлен",
                    });
                  }
                } else {
                  toast.info(`Клиент найден: ${existingClient.name}`, {
                    description: "Переходим к существующему чату",
                  });
                }
                
                onExistingClientFound?.(existingId);
                setNewContactData({ name: "", phone: "" });
                setOpen(false);
                return;
              }
            } catch (restoreError) {
              console.error('[NewChatModal] Error in restore flow:', restoreError);
            }
          }
        }
        
        toast.error("Ошибка при создании клиента");
      }
    }
  };

  const handleCreateFromExisting = (client: any) => {
    onExistingClientFound?.(client.id);
    setOpen(false);
  };

  const handlePhoneChange = (value: string) => {
    setNewContactData(prev => ({ ...prev, phone: value }));
    
    if (value.length >= 3) {
      searchClients(value);
    }
  };

  const getContactTypeColor = () => 'default';
  const getContactTypeLabel = () => 'Клиент';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCirclePlus className="h-5 w-5" />
            Новый чат
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-name">Имя *</Label>
            <Input
              id="new-name"
              placeholder="Введите имя контакта"
              value={newContactData.name}
              onChange={(e) => setNewContactData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-phone">Телефон *</Label>
            <div className="relative">
              <Input
                id="new-phone"
                placeholder="+7 (___) ___-__-__"
                value={newContactData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 bg-background border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
                  {searchResults.map((client) => (
                    <div
                      key={client.id}
                      className="p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                      onClick={() => handleCreateFromExisting(client)}
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{client.name}</p>
                          <p className="text-xs text-muted-foreground">{client.phone}</p>
                          {client.email && (
                            <p className="text-xs text-muted-foreground">{client.email}</p>
                          )}
                        </div>
                        <Badge variant="default" className="text-xs ml-auto">
                          {getContactTypeLabel()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleCreateFromNewContact}
              disabled={!newContactData.name || !newContactData.phone || isCheckingPhone || createClient.isPending}
            >
              <MessageCirclePlus className="h-4 w-4 mr-2" />
              Создать чат
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};