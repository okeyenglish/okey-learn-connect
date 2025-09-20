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
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("search");
  const [newContactData, setNewContactData] = useState({
    name: "",
    phone: "",
    email: ""
  });

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

  const filteredContacts = mockContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone.includes(searchQuery)
  );

  const handleCreateNewChat = (contact: Contact) => {
    onCreateChat?.(contact);
    setOpen(false);
  };

  const handleCreateFromNewContact = () => {
    if (newContactData.name && newContactData.phone) {
      const newContact = {
        id: Date.now().toString(),
        ...newContactData,
        type: 'new' as const
      };
      onCreateChat?.(newContact);
      setNewContactData({ name: "", phone: "", email: "" });
      setOpen(false);
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Поиск контактов</TabsTrigger>
            <TabsTrigger value="new">Новый контакт</TabsTrigger>
          </TabsList>
          
          <TabsContent value="search" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени или телефону..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Контакты не найдены' : 'Начните вводить для поиска'}
                  </p>
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleCreateNewChat(contact)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <User className="h-8 w-8 p-2 bg-muted rounded-full" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{contact.name}</p>
                            <Badge variant={getContactTypeColor(contact.type)} className="text-xs">
                              {getContactTypeLabel(contact.type)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {contact.phone}
                          </div>
                          {contact.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {contact.email}
                            </div>
                          )}
                          {contact.lastContact && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Последний контакт: {contact.lastContact}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Начать чат
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="new" className="space-y-4">
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
                <Input
                  id="new-phone"
                  placeholder="+7 (___) ___-__-__"
                  value={newContactData.phone}
                  onChange={(e) => setNewContactData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-email">Email (опционально)</Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="email@example.com"
                  value={newContactData.email}
                  onChange={(e) => setNewContactData(prev => ({ ...prev, email: e.target.value }))}
                />
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};