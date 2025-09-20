import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { useClients, useSearchClients, useCreateClient } from "@/hooks/useClients";
import { useChatThreads, useRealtimeMessages } from "@/hooks/useChatMessages";
import { useStudents } from "@/hooks/useStudents";
import { ChatArea } from "@/components/crm/ChatArea";
import { CorporateChatArea } from "@/components/crm/CorporateChatArea";
import { TeacherChatArea } from "@/components/crm/TeacherChatArea";
import { SearchInput } from "@/components/crm/SearchInput";
import { SearchResults } from "@/components/crm/SearchResults";
import { LinkedContacts } from "@/components/crm/LinkedContacts";
import { FamilyCard } from "@/components/crm/FamilyCard";
import { FamilyCardWrapper } from "@/components/crm/FamilyCardWrapper";
import { ChatContextMenu } from "@/components/crm/ChatContextMenu";
import { AddClientModal } from "@/components/crm/AddClientModal";
import { ClientsList } from "@/components/crm/ClientsList";
import { NewChatModal } from "@/components/crm/NewChatModal";
import { PinnedModalTabs } from "@/components/crm/PinnedModalTabs";
import { AddTaskModal } from "@/components/crm/AddTaskModal";
import { CreateInvoiceModal } from "@/components/crm/CreateInvoiceModal";
import { usePinnedModals } from "@/hooks/usePinnedModals";
import { 
  Search, 
  CheckSquare, 
  FileText, 
  User, 
  Building, 
  GraduationCap, 
  Monitor, 
  Calendar, 
  DollarSign, 
  BarChart3, 
  Settings,
  ExternalLink,
  Phone,
  MessageCircle,
  MessageCirclePlus,
  Pin,
  Building2,
  ChevronDown,
  ChevronRight,
  LogOut
} from "lucide-react";

const CRMContent = () => {
  const { user, profile, role, signOut } = useAuth();
  const { clients, isLoading: clientsLoading } = useClients();
  const { threads, isLoading: threadsLoading } = useChatThreads();
  const { students, isLoading: studentsLoading } = useStudents();
  const { 
    searchResults: clientSearchResults, 
    isSearching, 
    searchClients,
    clearSearch 
  } = useSearchClients();
  const createClient = useCreateClient();
  const queryClient = useQueryClient();
  const { 
    pinnedModals, 
    pinModal, 
    unpinModal, 
    openPinnedModal, 
    closePinnedModal, 
    isPinned 
  } = usePinnedModals();
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [hasUnsavedChat, setHasUnsavedChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  // Добавим несколько чатов в закрепленные для демонстрации
  const [chatStates, setChatStates] = useState<Record<string, { pinned: boolean; archived: boolean; unread: boolean }>>({
    '1': { pinned: true, archived: false, unread: true }, // Мария Петрова - закреплена
    '2': { pinned: false, archived: false, unread: false },
    '3': { pinned: true, archived: false, unread: false }, // Игорь Волков - закреплен
  });
  const [activePhoneId, setActivePhoneId] = useState<string>('1');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChatType, setActiveChatType] = useState<'client' | 'corporate' | 'teachers'>('client');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('teachers-group');
  const [isPinnedSectionOpen, setIsPinnedSectionOpen] = useState(false);
  
  // Состояния для модальных окон
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [activeClientName, setActiveClientName] = useState('');
  
  // Enable real-time updates for the active chat
  useRealtimeMessages(activeChatId);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleMenuClick = (action: string) => {
    if (hasUnsavedChat) {
      const confirm = window.confirm("У вас есть несохраненное сообщение. Продолжить?");
      if (!confirm) return;
    }
    setOpenModal(action);
  };

  // Mock data для демонстрации поиска
  const mockSearchData = [
    // Корпоративный чат
    { id: 'corporate', type: 'chat', title: 'Корпоративный чат', subtitle: 'Команда OKEY ENGLISH', description: 'Общение с коллегами по филиалам' },
    
    // Клиенты
    { id: '1', type: 'client', title: 'Мария Петрова', subtitle: '+7 (985) 261-50-56', description: 'Родитель Павла и Марии', metadata: { phone: '+7 (985) 261-50-56', branch: 'Котельники' } },
    { id: '2', type: 'client', title: 'Анна Смирнова', subtitle: '+7 (916) 123-45-67', description: 'Родитель Алексея', metadata: { phone: '+7 (916) 123-45-67', branch: 'Люберцы' } },
    { id: '3', type: 'client', title: 'Игорь Волков', subtitle: '+7 (903) 987-65-43', description: 'Родитель Дианы', metadata: { phone: '+7 (903) 987-65-43', branch: 'Мытищи' } },
    
    // Ученики
    { id: '4', type: 'student', title: 'Петров Павел Александрович', subtitle: '8 лет', description: 'Kids Box 2, группа вечерняя', metadata: { course: 'Kids Box 2', branch: 'Котельники' } },
    { id: '5', type: 'student', title: 'Петрова Мария Александровна', subtitle: '6 лет', description: 'Super Safari 1, утренняя группа', metadata: { course: 'Super Safari 1', branch: 'Котельники' } },
    { id: '6', type: 'student', title: 'Алексей Смирнов', subtitle: '10 лет', description: 'Empower B1, подготовка к экзаменам', metadata: { course: 'Empower B1', branch: 'Люберцы' } },
    
    // Чаты
    { id: '7', type: 'chat', title: 'Чат с Марией Петровой', subtitle: 'Последнее сообщение: 10:32', description: 'Обсуждение расписания Павла' },
    { id: '8', type: 'chat', title: 'Чат с Анной Смирновой', subtitle: 'Последнее сообщение: 09:15', description: 'Вопрос по домашнему заданию' },
    
    // Платежи
    { id: '9', type: 'payment', title: 'Платеж от Марии Петровой', subtitle: '11490₽', description: 'Срок: 25.09.2025', metadata: { amount: '11490₽' } },
    { id: '10', type: 'payment', title: 'Платеж от Анны Смирновой', subtitle: '8900₽', description: 'Просрочен на 3 дня', metadata: { amount: '8900₽' } },
    
    // Расписание
    { id: '11', type: 'schedule', title: 'Занятие Павла', subtitle: 'Сегодня 17:20-20:40', description: 'Kids Box 2, Ауд. WASHINGTON', metadata: { time: '17:20-20:40', course: 'Kids Box 2' } }
  ];

  const handleGlobalSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 0) {
      // Search clients using the hook
      searchClients(query);
      
      // Also search mock data for other types
      const filtered = mockSearchData.filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.subtitle?.toLowerCase().includes(query.toLowerCase()) ||
        item.description?.toLowerCase().includes(query.toLowerCase())
      );
      
      // Combine results (clients from real data + other mock data)
      const combinedResults = [
        ...clientSearchResults.map(client => ({
          id: client.id,
          type: 'client',
          title: client.name,
          subtitle: client.phone,
          description: client.email || 'Клиент',
          metadata: { phone: client.phone, email: client.email }
        })),
        ...filtered
      ];
      
      setGlobalSearchResults(combinedResults);
      setShowSearchResults(true);
    } else {
      clearSearch();
      setGlobalSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const handleChatSearch = (query: string) => {
    setChatSearchQuery(query);
  };

  const handleSelectSearchResult = (result: any) => {
    // Логика обработки выбранного результата
    if (result.type === 'client' || result.type === 'chat') {
      // Переключиться на чат с клиентом
      console.log('Открыть чат с:', result.title);
    } else if (result.type === 'student') {
      // Открыть карточку ученика
      console.log('Открыть карточку ученика:', result.title);
    }
    setShowSearchResults(false);
  };

  // Используем реальные чаты из базы данных + системные чаты
  // Функция для форматирования времени
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Вчера';
    } else {
      return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }
  };

  const allChats = [
    // Системные чаты
    { id: 'corporate', name: 'Корпоративный чат', phone: 'Команда OKEY ENGLISH', time: '11:45', unread: 3, type: 'corporate' as const, timestamp: Date.now() - 1000 * 60 * 60 },
    { id: 'teachers', name: 'Преподаватели', phone: 'Чаты с преподавателями', time: '10:15', unread: 2, type: 'teachers' as const, timestamp: Date.now() - 1000 * 60 * 90 },
    // Реальные чаты с клиентами
    ...threads.map(thread => ({
      id: thread.client_id,
      name: thread.client_name,
      phone: thread.client_phone,
      time: formatTime(thread.last_message_time),
      unread: thread.unread_count,
      type: 'client' as const,
      timestamp: new Date(thread.last_message_time).getTime()
    }))
  ];

  const filteredChats = allChats
    .filter(chat => 
      chatSearchQuery.length === 0 || 
      chat.name.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
      chat.phone.includes(chatSearchQuery)
    )
    .filter(chat => !chatStates[chat.id]?.archived) // Скрываем архивированные чаты
    .sort((a, b) => {
      // Сначала закрепленные чаты
      const aPinned = chatStates[a.id]?.pinned || false;
      const bPinned = chatStates[b.id]?.pinned || false;
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      
      // Внутри каждой группы сортируем по времени (новые сверху)
      return (b.timestamp || 0) - (a.timestamp || 0);
    });

  const [activeFamilyMemberId, setActiveFamilyMemberId] = useState('550e8400-e29b-41d4-a716-446655440001');

  const handleSwitchFamilyMember = (memberId: string) => {
    setActiveFamilyMemberId(memberId);
    console.log('Переключение на члена семьи:', memberId);
  };

  const handleOpenLinkedChat = (contactId: string) => {
    console.log('Открытие чата с:', contactId);
  };

  const handleCallFamilyMember = (memberId: string) => {
    console.log('Звонок члену семьи:', memberId);
  };

  const handlePhoneSwitch = (phoneId: string) => {
    setActivePhoneId(phoneId);
  };

  // Get current phone number for display
  const getCurrentPhoneNumber = () => {
    const phoneNumbers = {
      '1': '+7 (985) 261-50-56',
      '2': '+7 (916) 185-33-85'
    };
    return phoneNumbers[activePhoneId as keyof typeof phoneNumbers] || '+7 (985) 261-50-56';
  };

  // Find active client data
  const activeClient = clients.find(client => client.id === activeChatId);
  const activeThread = threads.find(thread => thread.client_id === activeChatId);
  
  // Get current client info for ChatArea
  const getFamilyGroupId = () => {
    // For now, we'll use a simple approach - in a real app this would come from client data
    return activeChatId; // This could be enhanced to get actual family group ID from client data
  };

  const getActiveClientInfo = () => {
    if (activeClient) {
      return {
        name: activeClient.name,
        phone: activeClient.phone,
        comment: activeClient.notes || 'Клиент'
      };
    }
    if (activeThread) {
      return {
        name: activeThread.client_name,
        phone: activeThread.client_phone,
        comment: 'Клиент'
      };
    }
    return {
      name: 'Выберите чат',
      phone: '',
      comment: ''
    };
  };

  const handleCreateNewChat = async (contactInfo: any) => {
    
    try {
      // Create new client in database
      const newClient = await createClient.mutateAsync({
        name: contactInfo.name,
        phone: contactInfo.phone,
        is_active: true
      });
      
      // Create initial system message directly
      await supabase.from('chat_messages').insert([
        {
          client_id: newClient.id,
          message_text: `Создан чат с ${contactInfo.name}`,
          message_type: 'system',
          is_read: false,
        }
      ]);

      // Refresh threads and messages
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages', newClient.id] });
      
      // Switch to the new client's chat
      setActiveChatId(newClient.id);
      setActiveChatType('client');
      
      console.log('Новый клиент создан:', newClient);
    } catch (error) {
      console.error('Ошибка при создании клиента:', error);
    }
  };

  const handleExistingClientFound = (clientId: string) => {
    // Switch to the existing client's chat
    setActiveChatId(clientId);
    setActiveChatType('client');
    
    // Refresh threads and messages to ensure data is current
    queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    queryClient.invalidateQueries({ queryKey: ['chat-messages', clientId] });
  };

  const handleChatAction = (chatId: string, action: 'unread' | 'pin' | 'archive' | 'block') => {
    setChatStates(prev => ({
      ...prev,
      [chatId]: {
        ...prev[chatId],
        ...(action === 'unread' && { unread: true }),
        ...(action === 'pin' && { pinned: !prev[chatId]?.pinned }),
        ...(action === 'archive' && { archived: !prev[chatId]?.archived }),
      }
    }));
    console.log(`${action} для чата:`, chatId);
  };

  const handleChatClick = (chatId: string, chatType: 'client' | 'corporate' | 'teachers') => {
    console.log('Переключение на чат:', { chatId, chatType });
    setActiveChatId(chatId);
    setActiveChatType(chatType);
    
    // Обновляем имя активного клиента для модальных окон
    const activeClient = clients.find(client => client.id === chatId);
    if (activeClient) {
      setActiveClientName(activeClient.name);
    }
  };

  // Обработчики для закрепления модальных окон
  const handlePinTaskModal = () => {
    const clientInfo = getActiveClientInfo();
    pinModal({
      id: activeChatId,
      type: 'task',
      title: `Задача: ${clientInfo.name}`,
      props: { clientName: clientInfo.name }
    });
  };

  const handlePinInvoiceModal = () => {
    const clientInfo = getActiveClientInfo();
    pinModal({
      id: activeChatId,
      type: 'invoice',
      title: `Счет: ${clientInfo.name}`,
      props: { clientName: clientInfo.name }
    });
  };

  // Обработчик открытия закрепленных модальных окон
  const handleOpenPinnedModal = (id: string, type: string) => {
    if (type === 'task') {
      setActiveChatId(id);
      setShowAddTaskModal(true);
      openPinnedModal(id, type);
    } else if (type === 'invoice') {
      setActiveChatId(id);
      setShowInvoiceModal(true);
      openPinnedModal(id, type);
    }
  };

  // Обработчики для модальных окон
  const handleTaskModalClose = () => {
    setShowAddTaskModal(false);
    closePinnedModal(activeChatId, 'task');
  };

  const handleInvoiceModalClose = () => {
    setShowInvoiceModal(false);
    closePinnedModal(activeChatId, 'invoice');
  };

  const menuItems = [
    { icon: CheckSquare, label: "Мои задачи" },
    { icon: FileText, label: "Заявки" },
    { icon: User, label: "Лиды" },
    { icon: Building, label: "Компания" },
    { icon: GraduationCap, label: "Обучение" },
    { icon: Monitor, label: "Занятия онлайн" },
    { icon: Calendar, label: "Расписание" },
    { icon: DollarSign, label: "Финансы" },
    { icon: BarChart3, label: "Отчёты" },
    { icon: Settings, label: "Настройки" },
  ];


  return (
    <div className="h-screen bg-muted/30 flex flex-col">
      {/* User Header */}
      <div className="bg-background border-b p-4 shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">O'KEY ENGLISH CRM</h1>
              {profile && (
                <p className="text-sm text-muted-foreground">
                  {profile.first_name} {profile.last_name} ({role})
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(clientsLoading || threadsLoading || studentsLoading) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                Загрузка данных...
              </div>
            )}
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Выйти
            </Button>
          </div>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="bg-background border-b p-4 shrink-0">
        <div className="relative max-w-7xl mx-auto space-y-4">
          <SearchInput
            placeholder="Поиск клиентов, учеников, чатов, платежей..."
            onSearch={handleGlobalSearch}
            onClear={() => {
              setSearchQuery("");
              setShowSearchResults(false);
              setGlobalSearchResults([]);
            }}
            size="lg"
          />
          
          {/* Закрепленные модальные окна как вкладки */}
          <PinnedModalTabs 
            pinnedModals={pinnedModals}
            onOpenModal={handleOpenPinnedModal}
            onUnpinModal={unpinModal}
          />
        </div>
      </div>

      <div className="flex flex-1 max-w-7xl mx-auto w-full h-0">
        {/* Left Unified Sidebar */}
        <div className="w-80 bg-background border-r flex flex-col h-full">
          <Tabs defaultValue="chats" className="flex flex-col h-full">
            <TabsList className="grid w-full grid-cols-2 m-2 shrink-0">
              <TabsTrigger value="menu">Меню</TabsTrigger>
              <TabsTrigger value="chats">Чаты</TabsTrigger>
            </TabsList>
            
            <TabsContent value="menu" className="flex-1 mt-0 overflow-y-auto">
              <div className="p-2 space-y-1">
                {menuItems.map((item, index) => (
                  <Dialog key={index} open={openModal === item.label} onOpenChange={(open) => !open && setOpenModal(null)}>
                    <DialogTrigger asChild>
                      <button
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
                        onClick={() => handleMenuClick(item.label)}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="text-sm">{item.label}</span>
                        <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <item.icon className="h-5 w-5" />
                          {item.label}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="py-4">
                        {item.label === "Лиды" && (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <h3 className="font-medium">Клиенты</h3>
                              <AddClientModal>
                                <Button size="sm">
                                  <User className="h-4 w-4 mr-2" />
                                  Добавить клиента
                                </Button>
                              </AddClientModal>
                            </div>
                            <ClientsList 
                              onSelectClient={(clientId) => {
                                setActiveChatId(clientId);
                                setActiveChatType('client');
                              }}
                              selectedClientId={activeChatId}
                            />
                          </div>
                        )}
                        {item.label === "Расписание" && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Card>
                                <CardHeader>
                                  <CardTitle>Сегодня</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-2">
                                    <div className="p-2 bg-green-50 rounded border-l-4 border-green-500">
                                      <p className="font-medium">17:20-20:40 Павел</p>
                                      <p className="text-sm text-muted-foreground">Kids Box 2, Ауд. WASHINGTON</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                              <Card>
                                <CardHeader>
                                  <CardTitle>Завтра</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <p className="text-muted-foreground">Занятий нет</p>
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                        )}
                        {item.label === "Финансы" && (
                          <div className="space-y-4">
                            <Card>
                              <CardHeader>
                                <CardTitle>Ближайшие платежи</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2">
                                  <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                                    <p className="font-medium">Мария Петрова - 11490₽</p>
                                    <p className="text-sm text-muted-foreground">Срок: 25.09.2025</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                        {item.label === "Мои задачи" && (
                          <div className="space-y-4">
                            <Card>
                              <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                  Активные задачи
                                  <Search className="h-4 w-4 text-muted-foreground" />
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2">
                                  <div className="p-2 border-l-4 border-blue-500 bg-blue-50">
                                    <p className="font-medium">Связаться с Марией Петровой</p>
                                    <p className="text-sm text-muted-foreground">Обсудить расписание Павла</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                        {!["Расписание", "Финансы", "Мои задачи"].includes(item.label) && (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">Функция "{item.label}" в разработке</p>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="chats" className="flex-1 mt-0 flex flex-col h-0">
              <div className="p-2 border-b space-y-2 shrink-0">
                <SearchInput
                  placeholder="Поиск по чатам..."
                  onSearch={handleChatSearch}
                  onClear={() => setChatSearchQuery("")}
                  size="sm"
                />
                <NewChatModal 
                  onCreateChat={handleCreateNewChat}
                  onExistingClientFound={handleExistingClientFound}
                >
                  <Button size="sm" className="w-full gap-2" variant="outline">
                    <MessageCirclePlus className="h-4 w-4" />
                    Новый чат
                  </Button>
                </NewChatModal>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2">
                  {/* Закрепленные чаты */}
                  {filteredChats.some(chat => chatStates[chat.id]?.pinned) && (
                    <div className="mb-4">
                      <button 
                        className="w-full flex items-center justify-between px-2 py-1 mb-2 hover:bg-muted/50 rounded transition-colors"
                        onClick={() => setIsPinnedSectionOpen(!isPinnedSectionOpen)}
                      >
                        <div className="flex items-center gap-2">
                          {isPinnedSectionOpen ? (
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          )}
                          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Закрепленные (в работе)
                          </h3>
                        </div>
                        <Badge variant="secondary" className="text-xs h-4">
                          {filteredChats.filter(chat => chatStates[chat.id]?.pinned).length}
                        </Badge>
                      </button>
                      {isPinnedSectionOpen && (
                        <div className="space-y-1">
                        {filteredChats
                          .filter(chat => chatStates[chat.id]?.pinned)
                          .map((chat) => {
                            const chatState = chatStates[chat.id] || { pinned: false, archived: false, unread: false };
                            const displayUnread = chatState.unread || chat.unread > 0;
                            return (
                              <ChatContextMenu
                                key={chat.id}
                                onMarkUnread={() => handleChatAction(chat.id, 'unread')}
                                onPinDialog={() => handleChatAction(chat.id, 'pin')}
                                onArchive={() => handleChatAction(chat.id, 'archive')}
                                onBlock={() => handleChatAction(chat.id, 'block')}
                                isPinned={chatState.pinned}
                                isArchived={chatState.archived}
                              >
                                <button 
                                  className={`w-full p-3 text-left rounded-lg transition-colors relative border-l-2 border-orange-400 ${
                                    chat.id === activeChatId 
                                      ? 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-950 dark:hover:bg-orange-900' 
                                      : 'bg-orange-25 hover:bg-orange-50 dark:bg-orange-975 dark:hover:bg-orange-950'
                                  }`}
                                  onClick={() => handleChatClick(chat.id, chat.type)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {chat.type === 'corporate' && (
                                        <Building2 className="h-4 w-4 text-slate-600" />
                                      )}
                                      {chat.type === 'teachers' && (
                                        <GraduationCap className="h-4 w-4 text-slate-600" />
                                      )}
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <p className={`font-medium text-sm ${displayUnread ? 'font-bold' : ''}`}>
                                            {chat.name}
                                          </p>
                                          <Badge variant="outline" className="text-xs h-4 bg-orange-100 text-orange-700 border-orange-300">
                                            В работе
                                          </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{chat.phone}</p>
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                      <Pin className="h-3 w-3 text-orange-600 mb-1" />
                                      <span className="text-xs text-muted-foreground">{chat.time}</span>
                                      {displayUnread && (
                                        <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full mt-1">
                                          {chatState.unread ? '1' : chat.unread}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              </ChatContextMenu>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Активные чаты */}
                  <div>
                    <div className="flex items-center justify-between px-2 py-1 mb-2">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Активные чаты
                      </h3>
                      <Badge variant="secondary" className="text-xs h-4">
                        {filteredChats.filter(chat => !chatStates[chat.id]?.pinned).length}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {filteredChats
                        .filter(chat => !chatStates[chat.id]?.pinned)
                        .map((chat) => {
                          const chatState = chatStates[chat.id] || { pinned: false, archived: false, unread: false };
                          const displayUnread = chatState.unread || chat.unread > 0;
                          return (
                            <ChatContextMenu
                              key={chat.id}
                              onMarkUnread={() => handleChatAction(chat.id, 'unread')}
                              onPinDialog={() => handleChatAction(chat.id, 'pin')}
                              onArchive={() => handleChatAction(chat.id, 'archive')}
                              onBlock={() => handleChatAction(chat.id, 'block')}
                              isPinned={chatState.pinned}
                              isArchived={chatState.archived}
                            >
                              <button 
                                className={`w-full p-3 text-left rounded-lg transition-colors relative ${
                                  chat.id === activeChatId ? 'bg-muted hover:bg-muted/80' : 'hover:bg-muted/50'
                                }`}
                                onClick={() => handleChatClick(chat.id, chat.type)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {chat.type === 'corporate' && (
                                      <Building2 className="h-4 w-4 text-slate-600" />
                                    )}
                                    {chat.type === 'teachers' && (
                                      <GraduationCap className="h-4 w-4 text-slate-600" />
                                    )}
                                    <div>
                                      <p className={`font-medium text-sm ${displayUnread ? 'font-bold' : ''}`}>
                                        {chat.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">{chat.phone}</p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="text-xs text-muted-foreground">{chat.time}</span>
                                    {displayUnread && (
                                      <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                                        {chatState.unread ? '1' : chat.unread}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </button>
                            </ChatContextMenu>
                          );
                        })}
                    </div>
                  </div>

                  {filteredChats.length === 0 && chatSearchQuery && (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">
                        Чаты не найдены
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Center - Chat */}
        {activeChatType === 'corporate' ? (
          <CorporateChatArea onMessageChange={setHasUnsavedChat} />
        ) : activeChatType === 'teachers' ? (
          <TeacherChatArea 
            selectedTeacherId={selectedTeacherId}
            onSelectTeacher={setSelectedTeacherId}
          />
        ) : activeChatId ? (
          <ChatArea 
            clientId={activeChatId}
            clientName={getActiveClientInfo().name}
            clientPhone={getActiveClientInfo().phone}
            clientComment={getActiveClientInfo().comment}
            onMessageChange={setHasUnsavedChat}
            activePhoneId={activePhoneId}
            onOpenTaskModal={() => setShowAddTaskModal(true)}
            onOpenInvoiceModal={() => setShowInvoiceModal(true)}
          />
        ) : (
          <div className="flex-1 bg-background flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Выберите чат</h3>
              <p className="text-sm">Выберите клиента из списка слева, чтобы начать переписку</p>
            </div>
          </div>
        )}

        {/* Right Sidebar - Family Card (только для клиентских чатов) */}
        {activeChatType === 'client' && activeChatId && (
          <div className="w-80 bg-background p-4 overflow-y-auto h-full">
            <FamilyCardWrapper clientId={activeChatId} />
          </div>
        )}
      </div>

      {/* Search Results Modal */}
      <SearchResults
        isOpen={showSearchResults}
        onClose={() => setShowSearchResults(false)}
        query={searchQuery}
        results={globalSearchResults}
        onSelectResult={handleSelectSearchResult}
      />

      {/* Модальные окна с поддержкой закрепления */}
        <AddTaskModal 
          open={showAddTaskModal}
          onOpenChange={handleTaskModalClose}
          clientName={getActiveClientInfo().name}
          clientId={activeChatId || ''}
          isPinned={isPinned(activeChatId, 'task')}
          onPin={handlePinTaskModal}
          onUnpin={() => unpinModal(activeChatId || '', 'task')}
        />

      <CreateInvoiceModal 
        open={showInvoiceModal}
        onOpenChange={handleInvoiceModalClose}
        clientName={getActiveClientInfo().name}
        isPinned={isPinned(activeChatId || '', 'invoice')}
        onPin={handlePinInvoiceModal}
        onUnpin={() => unpinModal(activeChatId || '', 'invoice')}
      />

      {/* Закрепленные модальные окна */}
      {pinnedModals.map((modal) => {
        if (modal.type === 'task' && modal.isOpen) {
          return (
            <AddTaskModal
              key={`pinned-task-${modal.id}`}
              open={true}
              onOpenChange={() => closePinnedModal(modal.id, modal.type)}
              clientName={modal.props.clientName}
              clientId={modal.id}
              isPinned={true}
              onUnpin={() => unpinModal(modal.id, modal.type)}
            />
          );
        }
        if (modal.type === 'invoice' && modal.isOpen) {
          return (
            <CreateInvoiceModal
              key={`pinned-invoice-${modal.id}`}
              open={true}
              onOpenChange={() => closePinnedModal(modal.id, modal.type)}
              clientName={modal.props.clientName}
              isPinned={true}
              onUnpin={() => unpinModal(modal.id, modal.type)}
            />
          );
        }
        return null;
      })}
    </div>
  );
};

const CRM = () => {
  return (
    <ProtectedRoute allowedRoles={['admin', 'manager']}>
      <CRMContent />
    </ProtectedRoute>
  );
};

export default CRM;