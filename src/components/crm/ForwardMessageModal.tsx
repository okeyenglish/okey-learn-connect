import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Users, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ForwardMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMessages: Array<{
    id: string;
    message: string;
    time: string;
    type: string;
  }>;
  currentClientId: string;
  onForward: (clientIds: string[]) => void;
}

interface Client {
  id: string;
  name: string;
  phone: string;
}

export const ForwardMessageModal = ({ 
  open, 
  onOpenChange, 
  selectedMessages, 
  currentClientId,
  onForward 
}: ForwardMessageModalProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Загрузка списка клиентов
  useEffect(() => {
    if (open) {
      loadClients();
    }
  }, [open]);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, phone')
        .neq('id', currentClientId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error loading clients:', error);
        return;
      }

      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  // Фильтрация клиентов по поисковому запросу
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone.includes(searchQuery)
  );

  const handleClientToggle = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleSelectAll = () => {
    if (selectedClients.length === filteredClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(filteredClients.map(client => client.id));
    }
  };

  const handleForward = async () => {
    if (selectedClients.length === 0) {
      toast({
        title: "Выберите получателей",
        description: "Необходимо выбрать хотя бы одного клиента для переадресации",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      onForward(selectedClients);
      onOpenChange(false);
      setSelectedClients([]);
      setSearchQuery("");
    } catch (error) {
      console.error('Error forwarding messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedClients([]);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Переслать сообщения
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Информация о выделенных сообщениях */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              Выбрано сообщений: <span className="font-semibold">{selectedMessages.length}</span>
            </p>
          </div>

          {/* Поиск клиентов */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск клиентов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Кнопка выбрать всех */}
          {filteredClients.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all"
                checked={selectedClients.length === filteredClients.length}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Выбрать всех ({filteredClients.length})
              </label>
            </div>
          )}

          {/* Список клиентов */}
          <ScrollArea className="h-64 border rounded-md">
            <div className="p-2 space-y-2">
              {filteredClients.length > 0 ? (
                filteredClients.map(client => (
                  <div key={client.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md">
                    <Checkbox
                      id={`client-${client.id}`}
                      checked={selectedClients.includes(client.id)}
                      onCheckedChange={() => handleClientToggle(client.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{client.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{client.phone}</p>
                    </div>
                    <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {searchQuery ? 'Клиенты не найдены' : 'Нет доступных клиентов'}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Действия */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>
              Отмена
            </Button>
            <Button 
              onClick={handleForward}
              disabled={selectedClients.length === 0 || loading}
            >
              {loading ? 'Отправка...' : `Переслать (${selectedClients.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};