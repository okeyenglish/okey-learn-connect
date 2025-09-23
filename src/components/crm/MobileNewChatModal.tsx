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
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCirclePlus className="h-5 w-5" />
            Новый чат
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mobile-new-name">Имя *</Label>
            <Input
              id="mobile-new-name"
              placeholder="Введите имя контакта"
              value={newContactData.name}
              onChange={(e) => setNewContactData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile-new-phone">Телефон *</Label>
            <div className="relative">
              <Input
                id="mobile-new-phone"
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
                        </div>
                        <Badge variant="default" className="text-xs ml-auto">
                          Клиент
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
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