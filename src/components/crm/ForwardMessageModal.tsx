import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, MessageCircle, GraduationCap, Building2, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/typedClient";
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
  onForward: (recipients: Array<{id: string, type: 'client' | 'teacher' | 'corporate', name: string}>) => void;
}

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface Teacher {
  id: string;
  name: string;
  subject: string;
  phone?: string;
}

interface CorporateChat {
  id: string;
  name: string;
  department: string;
  description: string;
}

export const ForwardMessageModal = ({ 
  open, 
  onOpenChange, 
  selectedMessages, 
  currentClientId,
  onForward 
}: ForwardMessageModalProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [corporateChats, setCorporateChats] = useState<CorporateChat[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<Array<{id: string, type: 'client' | 'teacher' | 'corporate', name: string}>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("clients");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Загрузка данных
  useEffect(() => {
    if (open) {
      loadClients();
      loadTeachers();
      loadCorporateChats();
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

  const loadTeachers = async () => {
    // Mock данные для преподавателей (в реальном проекте это будет из БД)
    const mockTeachers: Teacher[] = [
      { id: 'teacher-1', name: 'Анна Петрова', subject: 'Английский язык', phone: '+7 (999) 123-45-67' },
      { id: 'teacher-2', name: 'Михаил Сидоров', subject: 'Математика', phone: '+7 (999) 234-56-78' },
      { id: 'teacher-3', name: 'Елена Иванова', subject: 'Физика', phone: '+7 (999) 345-67-89' },
      { id: 'teacher-4', name: 'Дмитрий Козлов', subject: 'Химия', phone: '+7 (999) 456-78-90' },
    ];
    setTeachers(mockTeachers);
  };

  const loadCorporateChats = async () => {
    // Mock данные для корпоративных чатов (в реальном проекте это будет из БД)
    const mockCorporateChats: CorporateChat[] = [
      { id: 'corp-1', name: 'Методический отдел', department: 'Образование', description: 'Обсуждение методик преподавания' },
      { id: 'corp-2', name: 'Администрация', department: 'Управление', description: 'Общие вопросы управления' },
      { id: 'corp-3', name: 'IT-поддержка', department: 'Техническая', description: 'Техническая поддержка' },
      { id: 'corp-4', name: 'Маркетинг', department: 'Маркетинг', description: 'Продвижение и реклама' },
      { id: 'corp-5', name: 'Расписание', department: 'Организация', description: 'Вопросы расписания и занятий' },
    ];
    setCorporateChats(mockCorporateChats);
  };

  // Фильтрация по поисковому запросу
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone.includes(searchQuery)
  );

  const filteredTeachers = teachers.filter(teacher => 
    teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCorporateChats = corporateChats.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRecipientToggle = (id: string, type: 'client' | 'teacher' | 'corporate', name: string) => {
    setSelectedRecipients(prev => {
      const exists = prev.some(r => r.id === id && r.type === type);
      if (exists) {
        return prev.filter(r => !(r.id === id && r.type === type));
      } else {
        return [...prev, { id, type, name }];
      }
    });
  };

  const getCurrentTabItems = () => {
    switch(activeTab) {
      case 'clients': return filteredClients;
      case 'teachers': return filteredTeachers;
      case 'corporate': return filteredCorporateChats;
      default: return [];
    }
  };

  const isRecipientSelected = (id: string, type: 'client' | 'teacher' | 'corporate') => {
    return selectedRecipients.some(r => r.id === id && r.type === type);
  };

  const handleSelectAllInTab = () => {
    const currentItems = getCurrentTabItems();
    const currentType: 'client' | 'teacher' | 'corporate' = activeTab === 'clients' ? 'client' : activeTab === 'teachers' ? 'teacher' : 'corporate';
    
    const allSelected = currentItems.every(item => isRecipientSelected(item.id, currentType));
    
    if (allSelected) {
      // Убираем все элементы текущей вкладки
      setSelectedRecipients(prev => 
        prev.filter(r => r.type !== currentType)
      );
    } else {
      // Добавляем все элементы текущей вкладки
      const newRecipients = currentItems.map(item => ({
        id: item.id,
        type: currentType as 'client' | 'teacher' | 'corporate',
        name: item.name
      }));
      
      setSelectedRecipients(prev => {
        const filtered = prev.filter(r => r.type !== currentType);
        return [...filtered, ...newRecipients];
      });
    }
  };

  const handleForward = async () => {
    if (selectedRecipients.length === 0) {
      toast({
        title: "Выберите получателей",
        description: "Необходимо выбрать хотя бы одного получателя для переадресации",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      onForward(selectedRecipients);
      onOpenChange(false);
      setSelectedRecipients([]);
      setSearchQuery("");
    } catch (error) {
      console.error('Error forwarding messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedRecipients([]);
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
            {selectedRecipients.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Получателей: <span className="font-semibold">{selectedRecipients.length}</span>
              </p>
            )}
          </div>

          {/* Поиск */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск получателей..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Вкладки с типами получателей */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="clients" className="flex items-center gap-1">
                <UserCheck className="h-4 w-4" />
                Клиенты
              </TabsTrigger>
              <TabsTrigger value="teachers" className="flex items-center gap-1">
                <GraduationCap className="h-4 w-4" />
                Преподаватели
              </TabsTrigger>
              <TabsTrigger value="corporate" className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                Корпоративные
              </TabsTrigger>
            </TabsList>

            {/* Кнопка выбрать всех в текущей вкладке */}
            {getCurrentTabItems().length > 0 && (
              <div className="flex items-center gap-2 mt-3">
              <Checkbox
                  id="select-all-tab"
                  checked={getCurrentTabItems().every(item => {
                    const type: 'client' | 'teacher' | 'corporate' = activeTab === 'clients' ? 'client' : activeTab === 'teachers' ? 'teacher' : 'corporate';
                    return isRecipientSelected(item.id, type);
                  })}
                  onCheckedChange={handleSelectAllInTab}
                />
                <label htmlFor="select-all-tab" className="text-sm font-medium cursor-pointer">
                  Выбрать всех в разделе ({getCurrentTabItems().length})
                </label>
              </div>
            )}

            <TabsContent value="clients" className="mt-4">
              <ScrollArea className="h-64 border rounded-md">
                <div className="p-2 space-y-2">
                  {filteredClients.length > 0 ? (
                    filteredClients.map(client => (
                      <div key={client.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md">
                        <Checkbox
                          checked={isRecipientSelected(client.id, 'client')}
                          onCheckedChange={() => handleRecipientToggle(client.id, 'client', client.name)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{client.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{client.phone}</p>
                        </div>
                        <UserCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {searchQuery ? 'Клиенты не найдены' : 'Нет доступных клиентов'}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="teachers" className="mt-4">
              <ScrollArea className="h-64 border rounded-md">
                <div className="p-2 space-y-2">
                  {filteredTeachers.length > 0 ? (
                    filteredTeachers.map(teacher => (
                      <div key={teacher.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md">
                        <Checkbox
                          checked={isRecipientSelected(teacher.id, 'teacher')}
                          onCheckedChange={() => handleRecipientToggle(teacher.id, 'teacher', teacher.name)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{teacher.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{teacher.subject}</p>
                          {teacher.phone && (
                            <p className="text-xs text-muted-foreground/70 truncate">{teacher.phone}</p>
                          )}
                        </div>
                        <GraduationCap className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {searchQuery ? 'Преподаватели не найдены' : 'Нет доступных преподавателей'}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="corporate" className="mt-4">
              <ScrollArea className="h-64 border rounded-md">
                <div className="p-2 space-y-2">
                  {filteredCorporateChats.length > 0 ? (
                    filteredCorporateChats.map(chat => (
                      <div key={chat.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md">
                        <Checkbox
                          checked={isRecipientSelected(chat.id, 'corporate')}
                          onCheckedChange={() => handleRecipientToggle(chat.id, 'corporate', chat.name)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{chat.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{chat.department}</p>
                          <p className="text-xs text-muted-foreground/70 truncate">{chat.description}</p>
                        </div>
                        <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {searchQuery ? 'Корпоративные чаты не найдены' : 'Нет доступных корпоративных чатов'}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Действия */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>
              Отмена
            </Button>
            <Button 
              onClick={handleForward}
              disabled={selectedRecipients.length === 0 || loading}
            >
              {loading ? 'Отправка...' : `Переслать (${selectedRecipients.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};