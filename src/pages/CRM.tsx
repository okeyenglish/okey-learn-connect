import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChatArea } from "@/components/crm/ChatArea";
import { SearchInput } from "@/components/crm/SearchInput";
import { SearchResults } from "@/components/crm/SearchResults";
import { LinkedContacts } from "@/components/crm/LinkedContacts";
import { FamilyCard } from "@/components/crm/FamilyCard";
import { ChatContextMenu } from "@/components/crm/ChatContextMenu";
import { NewChatModal } from "@/components/crm/NewChatModal";
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
  Pin
} from "lucide-react";

const CRM = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [hasUnsavedChat, setHasUnsavedChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [chatStates, setChatStates] = useState<Record<string, { pinned: boolean; archived: boolean; unread: boolean }>>({});
  
  const handleAuth = () => {
    if (password === "12345") {
      setIsAuthenticated(true);
    } else {
      alert("Неверный пароль");
    }
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
    // Клиенты
    { id: '1', type: 'client', title: 'Мария Петрова', subtitle: '+7 (985) 261-50-56', description: 'Родитель Павла и Марии', metadata: { phone: '+7 (985) 261-50-56', branch: 'Котельники' } },
    { id: '2', type: 'client', title: 'Анна Смирнова', subtitle: '+7 (916) 123-45-67', description: 'Родитель Алексея', metadata: { phone: '+7 (916) 123-45-67', branch: 'Люберцы' } },
    { id: '3', type: 'client', title: 'Игорь Волков', subtitle: '+7 (903) 987-65-43', description: 'Родитель Дианы', metadata: { phone: '+7 (903) 987-65-43', branch: 'Мытищи' } },
    
    // Ученики
    { id: '4', type: 'student', title: 'Павел Петров', subtitle: '8 лет', description: 'Kids Box 2, группа вечерняя', metadata: { course: 'Kids Box 2', branch: 'Котельники' } },
    { id: '5', type: 'student', title: 'Мария Петрова', subtitle: '6 лет', description: 'Super Safari 1, утренняя группа', metadata: { course: 'Super Safari 1', branch: 'Котельники' } },
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
      const filtered = mockSearchData.filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.subtitle?.toLowerCase().includes(query.toLowerCase()) ||
        item.description?.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
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

  // Фильтрация чатов на основе поиска
  const allChats = [
    { id: '1', name: 'Мария Петрова', phone: '+7 (985) 261-50-56', time: '10:32', unread: 2 },
    { id: '2', name: 'Анна Смирнова', phone: '+7 (916) 123-45-67', time: '09:15', unread: 0 },
    { id: '3', name: 'Игорь Волков', phone: '+7 (903) 987-65-43', time: 'Вчера', unread: 0 },
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
      return 0;
    });

  // Mock данные для семейных связей
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

  const handleCreateNewChat = (contactInfo: any) => {
    console.log('Создание нового чата с:', contactInfo);
    // Здесь будет логика создания нового чата
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Вход в CRM</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
            />
            <Button onClick={handleAuth} className="w-full">
              Войти
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-muted/30 flex flex-col">
      {/* Search Bar */}
      <div className="bg-background border-b p-4 shrink-0">
        <div className="relative max-w-7xl mx-auto">
          <SearchInput
            placeholder="Поиск клиентов, учеников, чатов, платежей..."
            onSearch={handleGlobalSearch}
            onClear={() => {
              setSearchQuery("");
              setShowSearchResults(false);
              setSearchResults([]);
            }}
            size="lg"
          />
        </div>
      </div>

      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        {/* Left Unified Sidebar */}
        <div className="w-80 bg-background border-r flex flex-col">
          <Tabs defaultValue="chats" className="flex flex-col h-full">
            <TabsList className="grid w-full grid-cols-2 m-2">
              <TabsTrigger value="menu">Меню</TabsTrigger>
              <TabsTrigger value="chats">Чаты</TabsTrigger>
            </TabsList>
            
            <TabsContent value="menu" className="flex-1 mt-0">
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
                                <CardTitle>Активные задачи</CardTitle>
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
            
            <TabsContent value="chats" className="flex-1 mt-0 flex flex-col">
              <div className="p-2 border-b space-y-2">
                <SearchInput
                  placeholder="Поиск по чатам..."
                  onSearch={handleChatSearch}
                  onClear={() => setChatSearchQuery("")}
                  size="sm"
                />
                <NewChatModal onCreateChat={handleCreateNewChat}>
                  <Button size="sm" className="w-full gap-2" variant="outline">
                    <MessageCirclePlus className="h-4 w-4" />
                    Новый чат
                  </Button>
                </NewChatModal>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="p-2 space-y-1">
                  {filteredChats.map((chat, index) => {
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
                            index === 0 ? 'bg-muted hover:bg-muted/80' : 'hover:bg-muted/50'
                          }`}
                        >
                          {chatState.pinned && (
                            <Pin className="absolute top-2 right-2 h-3 w-3 text-muted-foreground" />
                          )}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className={`font-medium text-sm ${displayUnread ? 'font-bold' : ''}`}>
                                {chat.name}
                              </p>
                              <p className="text-xs text-muted-foreground">{chat.phone}</p>
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
                  {filteredChats.length === 0 && chatSearchQuery && (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">
                        Чаты не найдены
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Center - Chat */}
        <ChatArea 
          clientName="Мария Петрова"
          clientPhone="+7 (985) 261-50-56"
          clientComment="Мама Павла, активная, всегда интересуется успехами"
          onMessageChange={setHasUnsavedChat}
        />

        {/* Right Sidebar - Family Card */}
        <div className="w-80 bg-background p-4 overflow-y-auto">
          <FamilyCard
            familyGroupId="550e8400-e29b-41d4-a716-446655440000"
            activeMemberId={activeFamilyMemberId}
            onSwitchMember={handleSwitchFamilyMember}
            onOpenChat={handleOpenLinkedChat}
            onCall={handleCallFamilyMember}
          />
        </div>
      </div>

      {/* Search Results Modal */}
      <SearchResults
        isOpen={showSearchResults}
        onClose={() => setShowSearchResults(false)}
        query={searchQuery}
        results={searchResults}
        onSelectResult={handleSelectSearchResult}
      />
    </div>
  );
};

export default CRM;