import { useState } from "react";
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

interface NewChatModalProps {
  children: React.ReactNode;
  onCreateChat?: (contactInfo: any) => void;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  type: 'existing' | 'lead';
  lastContact?: string;
}

export const NewChatModal = ({ children, onCreateChat }: NewChatModalProps) => {
  const [open, setOpen] = useState(false);
  const [newContactData, setNewContactData] = useState({
    name: "",
    phone: ""
  });
  const [phoneSuggestions, setPhoneSuggestions] = useState<Contact[]>([]);

  // Mock existing contacts/leads
  const mockContacts: Contact[] = [
    {
      id: '1',
      name: 'Елена Иванова',
      phone: '+7 (916) 555-01-23',
      email: 'elena.ivanova@email.com',
      type: 'existing',
      lastContact: '2 дня назад'
    },
    {
      id: '2', 
      name: 'Дмитрий Сидоров',
      phone: '+7 (903) 555-45-67',
      type: 'lead',
      lastContact: 'Неделю назад'
    },
    {
      id: '3',
      name: 'Ольга Смирнова', 
      phone: '+7 (925) 555-89-01',
      email: 'olga.smirnova@email.com',
      type: 'existing',
      lastContact: 'Вчера'
    }
  ];

  const handleCreateFromNewContact = () => {
    if (newContactData.name && newContactData.phone) {
      const newContact = {
        id: Date.now().toString(),
        ...newContactData,
        type: 'new' as const
      };
      onCreateChat?.(newContact);
      setNewContactData({ name: "", phone: "" });
      setOpen(false);
    }
  };

  const handleCreateFromExisting = (contact: Contact) => {
    onCreateChat?.(contact);
    setOpen(false);
  };

  const handlePhoneChange = (value: string) => {
    setNewContactData(prev => ({ ...prev, phone: value }));
    
    if (value.length >= 3) {
      const suggestions = mockContacts.filter(contact =>
        contact.phone.includes(value) || contact.name.toLowerCase().includes(value.toLowerCase())
      );
      setPhoneSuggestions(suggestions);
    } else {
      setPhoneSuggestions([]);
    }
  };

  const getContactTypeColor = (type: string) => {
    switch (type) {
      case 'existing': return 'default';
      case 'lead': return 'secondary';
      case 'new': return 'outline';
      default: return 'default';
    }
  };

  const getContactTypeLabel = (type: string) => {
    switch (type) {
      case 'existing': return 'Клиент';
      case 'lead': return 'Лид';
      case 'new': return 'Новый';
      default: return type;
    }
  };

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
              {phoneSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 bg-background border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
                  {phoneSuggestions.map((contact) => (
                    <div
                      key={contact.id}
                      className="p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                      onClick={() => handleCreateFromExisting(contact)}
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{contact.name}</p>
                          <p className="text-xs text-muted-foreground">{contact.phone}</p>
                        </div>
                        <Badge variant={getContactTypeColor(contact.type)} className="text-xs ml-auto">
                          {getContactTypeLabel(contact.type)}
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
              disabled={!newContactData.name || !newContactData.phone}
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