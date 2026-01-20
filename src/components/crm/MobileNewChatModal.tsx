import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCirclePlus,
  User
} from "lucide-react";
import { useSearchClients, useCreateClient } from "@/hooks/useClients";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MobileNewChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateChat?: (contactInfo: any) => void;
  onExistingClientFound?: (clientId: string) => void;
}

export const MobileNewChatModal = ({ 
  open, 
  onOpenChange, 
  onCreateChat, 
  onExistingClientFound 
}: MobileNewChatModalProps) => {
  const [newContactData, setNewContactData] = useState({
    name: "",
    phone: ""
  });
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  
  const { searchClients, searchResults, isSearching } = useSearchClients();
  const createClient = useCreateClient();

  const checkExistingPhone = async (phone: string) => {
    if (!phone || phone.length < 5) return;
    
    setIsCheckingPhone(true);
    try {
      // Check in clients table
      const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('id, name, phone, email')
        .or(`phone.ilike.%${phone}%`)
        .eq('is_active', true);
      
      if (clientError) throw clientError;
      
      if (clients && clients.length > 0) {
        const existingClient = clients[0];
        toast.info(`Клиент найден: ${existingClient.name}`, {
          description: "Переходим к существующему чату",
        });
        onExistingClientFound?.(existingClient.id);
        onOpenChange(false);
        return true;
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
        onOpenChange(false);
      } catch (error) {
        console.error('Error creating client:', error);
        toast.error("Ошибка при создании клиента");
      }
    }
  };

  const handleCreateFromExisting = (client: any) => {
    onExistingClientFound?.(client.id);
    onOpenChange(false);
  };

  const handlePhoneChange = (value: string) => {
    setNewContactData(prev => ({ ...prev, phone: value }));
    
    if (value.length >= 3) {
      searchClients(value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md mx-auto rounded-2xl p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <MessageCirclePlus className="h-5 w-5" />
            Новый чат
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="mobile-new-name" className="text-sm font-medium">Имя *</Label>
            <Input
              id="mobile-new-name"
              placeholder="Введите имя контакта"
              value={newContactData.name}
              onChange={(e) => setNewContactData(prev => ({ ...prev, name: e.target.value }))}
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile-new-phone" className="text-sm font-medium">Телефон *</Label>
            <div className="relative">
              <Input
                id="mobile-new-phone"
                placeholder="+7 (___) ___-__-__"
                value={newContactData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="h-12 text-base"
                type="tel"
                inputMode="tel"
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 bg-background border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto mt-1">
                  {searchResults.map((client) => (
                    <div
                      key={client.id}
                      className="p-3 hover:bg-muted active:bg-muted/80 cursor-pointer border-b last:border-b-0"
                      onClick={() => handleCreateFromExisting(client)}
                    >
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{client.name}</p>
                          <p className="text-xs text-muted-foreground">{client.phone}</p>
                        </div>
                        <Badge variant="default" className="text-xs flex-shrink-0">
                          Клиент
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button 
              onClick={handleCreateFromNewContact}
              disabled={!newContactData.name || !newContactData.phone || isCheckingPhone || createClient.isPending}
              className="h-12 text-base font-medium rounded-xl"
            >
              <MessageCirclePlus className="h-5 w-5 mr-2" />
              Создать чат
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="h-12 text-base font-medium rounded-xl"
            >
              Отмена
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};