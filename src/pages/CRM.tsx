import { useState, useEffect } from "react";
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useClients, useSearchClients, useCreateClient } from "@/hooks/useClients";
import { useClientStatus } from "@/hooks/useClientStatus";
import { useChatThreads, useRealtimeMessages, useMarkAsRead, useMarkAsUnread } from "@/hooks/useChatMessages";
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
import { EditTaskModal } from "@/components/crm/EditTaskModal";
import { TaskCalendar } from "@/components/crm/TaskCalendar";
import { CreateInvoiceModal } from "@/components/crm/CreateInvoiceModal";
import { PinnableModalHeader, PinnableDialogContent } from "@/components/crm/PinnableModal";
import { ManagerMenu } from "@/components/crm/ManagerMenu";
import { usePinnedModalsDB, PinnedModal } from "@/hooks/usePinnedModalsDB";
import { useChatStatesDB } from "@/hooks/useChatStatesDB";
import { useSharedChatStates } from "@/hooks/useSharedChatStates";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAllTasks, useCompleteTask, useCancelTask, useUpdateTask } from "@/hooks/useTasks";
import { useIsMobile } from "@/hooks/use-mobile";
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
  EyeOff,
  Eye,
  List,
  LogOut,
  Users,
  Menu,
  X,
  PanelLeft,
  PanelRight,
  MoreVertical,
  Archive,
  BellOff,
  Check,
  Clock,
  Lock,
  Edit,
  UserPlus
} from "lucide-react";
import { useTypingPresence } from "@/hooks/useTypingPresence";

import { useSystemChatMessages } from '@/hooks/useSystemChatMessages';
import VoiceAssistant from '@/components/VoiceAssistant';

const CRMContent = () => {
  const { user, profile, role, signOut } = useAuth();
  const { clients, isLoading: clientsLoading } = useClients();
  const { threads, isLoading: threadsLoading } = useChatThreads();
  const { students, isLoading: studentsLoading } = useStudents();
  const { corporateChats, teacherChats, isLoading: systemChatsLoading } = useSystemChatMessages();
  const { 
    searchResults: clientSearchResults, 
    isSearching, 
    searchClients,
    clearSearch 
  } = useSearchClients();
  const createClient = useCreateClient();
  const markAsReadMutation = useMarkAsRead();
  const markAsUnreadMutation = useMarkAsUnread();
  const queryClient = useQueryClient();
  const { 
    pinnedModals, 
    loading: pinnedLoading,
    pinModal, 
    unpinModal, 
    openPinnedModal, 
    closePinnedModal, 
    isPinned 
  } = usePinnedModalsDB();
  const { 
    chatStates, 
    loading: chatStatesLoading,
    togglePin,
    toggleArchive,
    markAsRead,
    markAsUnread,
    getChatState
  } = useChatStatesDB();
  const { isInWorkByOthers, isPinnedByCurrentUser, isPinnedByAnyone, getPinnedByUserName = () => 'Неизвестный пользователь', isLoading: sharedStatesLoading } = useSharedChatStates();
  const { tasks: allTasks, isLoading: tasksLoading } = useAllTasks();
  const completeTask = useCompleteTask();
  const cancelTask = useCancelTask();
  const updateTask = useUpdateTask();
  
  // Drag and drop state
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  
  // Personal tasks tab state
  const [personalTasksTab, setPersonalTasksTab] = useState<"active" | "overdue">("active");
  
  // Client tasks tab state
  const [clientTasksTab, setClientTasksTab] = useState<"active" | "overdue">("active");
  
  // Tasks visibility state
  const [showClientTasks, setShowClientTasks] = useState(true);
  const [showPersonalTasks, setShowPersonalTasks] = useState(true);
  
  // Tasks modal state
  const [allTasksModal, setAllTasksModal] = useState<{
    open: boolean;
    type: 'today' | 'tomorrow';
    title: string;
    tasks: any[];
  }>({
    open: false,
    type: 'today',
    title: '',
    tasks: []
  });

  // Task editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  
  // Local view state for tasks section
  const [tasksView, setTasksView] = useState<"list" | "calendar">("list");
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("chats");
  const [hasUnsavedChat, setHasUnsavedChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  // Добавим несколько чатов в закрепленные для демонстрации
  const [activePhoneId, setActivePhoneId] = useState<string>('1');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChatType, setActiveChatType] = useState<'client' | 'corporate' | 'teachers'>('client');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [isPinnedSectionOpen, setIsPinnedSectionOpen] = useState(false);
  
  // Состояния для модальных окон
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string>('');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [activeClientName, setActiveClientName] = useState('');
  
  // Состояния для закрепленных модальных окон
  const [pinnedTaskClientId, setPinnedTaskClientId] = useState<string>('');
  const [pinnedInvoiceClientId, setPinnedInvoiceClientId] = useState<string>('');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  
  // Мобильные состояния для адаптивности
  const isMobile = useIsMobile();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [voiceAssistantOpen, setVoiceAssistantOpen] = useState(false);
  const { typingByClient } = useTypingPresence();
  
  // Enable real-time updates for the active chat
  useRealtimeMessages(activeChatId);

  // Also refresh chat thread list in real-time for any chat changes
  useEffect(() => {
    const channel = supabase
      .channel('chat-threads-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);
  // Автоматическое восстановление открытых модальных окон после загрузки
  useEffect(() => {
    if (!pinnedLoading && pinnedModals.length > 0 && !isManualModalOpen) {
      pinnedModals.forEach(modal => {
        if (modal.isOpen) {
          if (modal.type === 'task') {
            setPinnedTaskClientId(modal.id);
            setShowAddTaskModal(true);
          } else if (modal.type === 'invoice') {
            setPinnedInvoiceClientId(modal.id);
            setShowInvoiceModal(true);
          } else {
            setActiveTab("menu");
            setOpenModal(modal.type);
          }
        }
      });
    }
  }, [pinnedLoading, pinnedModals, isManualModalOpen]);

  // Menu counters
  const tasksCount = allTasks?.length ?? 0;
  const unreadTotal = (threads || []).reduce((sum, t) => sum + (t.unread_count || 0), 0);
  const leadsCount = clients?.length ?? 0;
  const getMenuCount = (label: string) => {
    if (label === "Мои задачи") return tasksCount;
    if (label === "Заявки") return unreadTotal;
    if (label === "Лиды") return leadsCount;
    return 0;
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // Обработчик переключения вкладок
  const handleCompleteTask = async (taskId: string) => {
    const task = allTasks?.find(t => t.id === taskId);
    try {
      await completeTask.mutateAsync(taskId);
      // Task notifications will be handled by individual components
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleCancelTask = async (taskId: string) => {
    const task = allTasks?.find(t => t.id === taskId);
    try {
      await cancelTask.mutateAsync(taskId);
      // Task notifications will be handled by individual components
    } catch (error) {
      console.error('Error cancelling task:', error);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, column: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(column);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drag over if we're leaving the drop zone completely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault();
    
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId || !draggedTask) {
      // Clear drag state even if no valid task
      setDraggedTask(null);
      setDragOverColumn(null);
      return;
    }

    // Calculate target date
    const targetDate = new Date();
    if (targetColumn === 'tomorrow') {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    const targetDateStr = targetDate.toISOString().split('T')[0];

    // Find the task to update
    const task = allTasks.find(t => t.id === taskId);
    if (!task || task.due_date === targetDateStr) {
      // Clear drag state
      setDraggedTask(null);
      setDragOverColumn(null);
      return;
    }

    try {
      await updateTask.mutateAsync({
        id: taskId,
        due_date: targetDateStr
      });
    } catch (error) {
      console.error('Error updating task date:', error);
    }

    // Always clear drag state after drop
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  // Auto-clear drag state as a safety measure
  useEffect(() => {
    if (draggedTask) {
      const timeout = setTimeout(() => {
        setDraggedTask(null);
        setDragOverColumn(null);
      }, 5000); // Clear after 5 seconds if not cleared otherwise

      return () => clearTimeout(timeout);
    }
  }, [draggedTask]);

  // Open all tasks modal for a specific day
  const openAllTasksModal = (type: 'today' | 'tomorrow', tasks: any[]) => {
    const title = type === 'today' ? 'Все задачи на сегодня' : 'Все задачи на завтра';
    setAllTasksModal({
      open: true,
      type,
      title,
      tasks
    });
  };

  const handleClientClick = (clientId: string | null) => {
    if (clientId) {
      setActiveChatId(clientId);
      setActiveChatType('client');
      setActiveTab('chats');
    }
  };

  const handleTabChange = (newTab: string) => {
    setOpenModal(null);
    setShowAddTaskModal(false);
    setShowEditTaskModal(false);
    setShowInvoiceModal(false);
    
    // Закрываем все закрепленные модальные окна
    pinnedModals.forEach(modal => {
      if (modal.isOpen) {
        closePinnedModal(modal.id, modal.type);
      }
    });
    
    setActiveTab(newTab);
  };

  const handleMenuClick = (action: string) => {
    // Проверяем, что мы на правильной вкладке
    if (activeTab !== "menu") {
      setActiveTab("menu");
    }
    
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

  // Системные чаты из БД - агрегируем корпоративные в одну "папку"
  const corporateUnread = (corporateChats || []).reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
  const latestCorporate = (corporateChats || []).reduce((latest: any, c: any) => {
    if (!c?.lastMessageTime) return latest;
    if (!latest) return c;
    return new Date(c.lastMessageTime) > new Date(latest.lastMessageTime) ? c : latest;
  }, null as any);

  const teacherUnread = (teacherChats || []).reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
  const latestTeacher = (teacherChats || []).reduce((latest: any, c: any) => {
    if (!c?.lastMessageTime) return latest;
    if (!latest) return c;
    return new Date(c.lastMessageTime) > new Date(latest.lastMessageTime) ? c : latest;
  }, null as any);

  // Системные чаты (корпоративные как одна запись)
  const systemChats = [
    {
      id: 'corporate',
      name: 'Корпоративный чат',
      phone: 'Внутренние чаты по филиалам',
      lastMessage: latestCorporate?.lastMessage || 'Нет сообщений',
      time: latestCorporate?.lastMessageTime ? formatTime(latestCorporate.lastMessageTime) : '',
      unread: corporateUnread,
      type: 'corporate' as const,
      timestamp: latestCorporate?.lastMessageTime ? new Date(latestCorporate.lastMessageTime).getTime() : 0,
      avatar_url: null,
    },
    {
      id: 'teachers',
      name: 'Преподаватели',
      phone: 'Чаты с преподавателями',
      lastMessage: latestTeacher?.lastMessage || 'Нет сообщений',
      time: latestTeacher?.lastMessageTime ? formatTime(latestTeacher.lastMessageTime) : '',
      unread: teacherUnread,
      type: 'teachers' as const,
      timestamp: latestTeacher?.lastMessageTime ? new Date(latestTeacher.lastMessageTime).getTime() : 0,
      avatar_url: null,
    },
  ];
  const allChats = [
    ...systemChats,
    // Только реальные клиентские чаты (исключаем системные)
    ...threads
      .filter(thread => {
        const clientData = clients.find(c => c.id === thread.client_id);
        return clientData && !clientData.name.includes('Корпоративный чат') && 
               !clientData.name.includes('Чат педагогов') && 
               !clientData.name.includes('Преподаватель:');
      })
      .map(thread => {
        const clientData = clients.find(c => c.id === thread.client_id);
        const typing = typingByClient[thread.client_id];
        const lastMsgDisplay = typing && typing.count > 0
          ? `${typing.names[0] || 'Менеджер'} печатает...`
          : (thread.last_message?.trim?.() || 'Нет сообщений');
        return {
          id: thread.client_id,
          name: thread.client_name,
          phone: thread.client_phone,
          lastMessage: lastMsgDisplay,
          time: formatTime(thread.last_message_time),
          unread: thread.unread_count,
          type: 'client' as const,
          timestamp: new Date(thread.last_message_time).getTime(),
          avatar_url: clientData?.avatar_url || null
        };
      })
  ];

  const filteredChats = allChats
    .filter(chat => 
      chatSearchQuery.length === 0 || 
      chat.name.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
      chat.phone.includes(chatSearchQuery)
    )
    .filter(chat => !getChatState(chat.id).isArchived) // Скрываем архивированные чаты
    .sort((a, b) => {
      // Сначала закрепленные чаты (только текущим пользователем)
      const aPinned = isPinnedByCurrentUser(a.id);
      const bPinned = isPinnedByCurrentUser(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      
      // В рамках закрепленных/не закрепленных: сначала непрочитанные
      const aChatState = getChatState(a.id);
      const bChatState = getChatState(b.id);
      const aUnread = aChatState.isUnread || a.unread > 0;
      const bUnread = bChatState.isUnread || b.unread > 0;
      
      if (aUnread && !bUnread) return -1;
      if (!aUnread && bUnread) return 1;
      
      // Внутри каждой группы сортируем по времени (новые сверху)
      return (b.timestamp || 0) - (a.timestamp || 0);
    });

  // Use client status hook for lead detection
  const clientIds = filteredChats
    .filter(chat => chat.type === 'client')
    .map(chat => chat.id);
  console.log('Client IDs for status check:', clientIds);
  const { getClientStatus } = useClientStatus(clientIds);

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
  const getFamilyGroupId = (clientId?: string | null) => {
    // Get the family group ID for the active client
    const targetClientId = clientId || activeChatId;
    if (!targetClientId) return undefined;
    
    // Map client IDs to their family group IDs (in real app this would come from DB query)
    const clientFamilyGroupMap: Record<string, string> = {
      '750e8400-e29b-41d4-a716-446655440001': '550e8400-e29b-41d4-a716-446655440001', // Мария Петрова
      '750e8400-e29b-41d4-a716-446655440002': '550e8400-e29b-41d4-a716-446655440002', // Анна Смирнова
      '750e8400-e29b-41d4-a716-446655440003': '550e8400-e29b-41d4-a716-446655440003', // Игорь Волков
      '56250660-4ed7-443a-9674-948b1114b392': '5323f75d-5a8a-46e0-9f5e-060ca2a5420f', // Даниил
      // Add mock mapping for demo clients
      '1': '550e8400-e29b-41d4-a716-446655440001', // Mock ID maps to Mария Петрова family
      '2': '550e8400-e29b-41d4-a716-446655440002',
      '3': '550e8400-e29b-41d4-a716-446655440003'
    };
    
    return clientFamilyGroupMap[targetClientId];
  };

  const getActiveClientInfo = (clientId?: string | null) => {
    const targetClientId = clientId || activeChatId;
    const targetClient = clients.find(client => client.id === targetClientId);
    const targetThread = threads.find(thread => thread.client_id === targetClientId);
    
    if (targetClient) {
      return {
        name: targetClient.name,
        phone: targetClient.phone,
        comment: targetClient.notes || 'Клиент'
      };
    }
    if (targetThread) {
      return {
        name: targetThread.client_name,
        phone: targetThread.client_phone,
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
      handleChatClick(newClient.id, 'client');
      
      console.log('Новый клиент создан:', newClient);
    } catch (error) {
      console.error('Ошибка при создании клиента:', error);
    }
  };

  const handleExistingClientFound = (clientId: string) => {
    // Switch to the existing client's chat
    handleChatClick(clientId, 'client');
    
    // Refresh threads and messages to ensure data is current
    queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    queryClient.invalidateQueries({ queryKey: ['chat-messages', clientId] });
  };

  const handleChatAction = (chatId: string, action: 'unread' | 'pin' | 'archive' | 'block') => {
    if (action === 'unread') {
      // 1) Флаг чата для текущего пользователя
      markAsUnread(chatId);
      // 2) Обновим сообщения в таблице, чтобы счётчик нитей тоже мог обновиться
      markAsUnreadMutation.mutate(chatId);
    } else if (action === 'pin') {
      togglePin(chatId);
    } else if (action === 'archive') {
      toggleArchive(chatId);
    }
    console.log(`${action} для чата:`, chatId);
  };

  const handleChatClick = (chatId: string, chatType: 'client' | 'corporate' | 'teachers') => {
    console.log('Переключение на чат:', { chatId, chatType });
    
    // Только переключаемся на новый чат, если это действительно другой чат
    const isNewChat = activeChatId !== chatId || activeChatType !== chatType;
    setActiveChatId(chatId);
    setActiveChatType(chatType);
    
    // Помечаем как прочитанное только при переключении на НОВЫЙ чат
      if (isNewChat) {
        if (chatType === 'client') {
          // Помечаем сообщения как прочитанные в базе данных
          markAsReadMutation.mutate(chatId);
          // Помечаем чат как прочитанный в состоянии чата
          markAsRead(chatId);
        } else if (chatType === 'corporate') {
          // Папка корпоративных чатов — не отмечаем прочитанным на этом уровне
        } else if (chatType === 'teachers') {
          // Для преподавательских чатов
          teacherChats.forEach((chat: any) => {
            if (chat.id) {
              markAsReadMutation.mutate(chat.id);
              markAsRead(chat.id);
            }
          });
        }
      }
    
    // Обновляем имя активного клиента для модальных окон
    if (chatType === 'client') {
      const activeClient = clients.find(client => client.id === chatId);
      if (activeClient) {
        setActiveClientName(activeClient.name);
      }
    }
  };

  // Обработчики для закрепления модальных окон
  const handlePinTaskModal = () => {
    const clientInfo = getActiveClientInfo();
    pinModal({
      id: activeChatId,
      type: 'task',
      title: `Задача: ${clientInfo.name}`,
      props: { 
        clientName: clientInfo.name,
        familyGroupId: getFamilyGroupId()
      }
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

  // Обработчики для модальных окон из меню
  const handlePinMenuModal = (modalType: string) => {
    pinModal({
      id: `menu-${modalType}`,
      type: modalType as any,
      title: modalType,
      props: {}
    });
  };

  const handleUnpinMenuModal = (modalType: string) => {
    unpinModal(`menu-${modalType}`, modalType);
  };

  // Обработчик открытия закрепленных модальных окон
  const handleOpenPinnedModal = (id: string, type: string) => {
    setIsManualModalOpen(true);
    
    // Для модальных окон из меню - просто устанавливаем состояние, БЕЗ дублирования
    if (type === 'Мои задачи' || type === 'Заявки' || type === 'Лиды' || 
        type === 'Компания' || type === 'Обучение' || type === 'Занятия онлайн' || 
        type === 'Расписание' || type === 'Финансы') {
      if (activeTab !== "menu") {
        setActiveTab("menu");
      }
      setOpenModal(type);
      // НЕ вызываем openPinnedModal для меню - используем только основные модальные окна
    } else if (type === 'task') {
      setPinnedTaskClientId(id);
      setShowAddTaskModal(true);
      openPinnedModal(id, type);
    } else if (type === 'invoice') {
      setPinnedInvoiceClientId(id);
      setShowInvoiceModal(true);
      openPinnedModal(id, type);
    } else {
      // Для других модальных окон - закрываем обычное меню-диалог и открываем только закрепленную версию
      setOpenModal(null);
      openPinnedModal(id, type);
    }
    
    // Сбрасываем флаг через небольшую задержку
    setTimeout(() => setIsManualModalOpen(false), 100);
  };

  // Обработчики для модальных окон
  const handleTaskModalClose = () => {
    setShowAddTaskModal(false);
    const clientId = pinnedTaskClientId || activeChatId;
    closePinnedModal(clientId, 'task');
    setPinnedTaskClientId('');
  };

  const handleInvoiceModalClose = () => {
    setShowInvoiceModal(false);
    const clientId = pinnedInvoiceClientId || activeChatId;
    closePinnedModal(clientId, 'invoice');
    setPinnedInvoiceClientId('');
  };

  // Обработчик закрытия модальных окон из меню
  const handleMenuModalClose = () => {
    if (openModal) {
      closePinnedModal(`menu-${openModal}`, openModal);
    }
    setOpenModal(null);
    setIsManualModalOpen(false);
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


  // Calculate total unread messages
  const totalUnreadCount = filteredChats.reduce((total, chat) => {
    const chatState = getChatState(chat.id);
    const unreadCount = chatState.isUnread ? 1 : chat.unread;
    return total + unreadCount;
  }, 0);

  return (
    <TooltipProvider>
      <div className="h-screen bg-muted/30 flex flex-col overflow-hidden">
      {/* Фиксированные вкладки сверху на мобильной версии */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b shadow-sm">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleTabChange('menu')}
              className={`flex-1 rounded-none h-12 font-medium transition-colors ${
                activeTab === 'menu' 
                  ? 'bg-muted text-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Меню
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                handleTabChange('chats');
                // При нажатии на "Чаты" сбрасываем активный чат и возвращаемся к списку
                if (isMobile && activeChatId) {
                  setActiveChatId('');
                }
              }}
              className={`flex-1 rounded-none h-12 font-medium transition-colors ${
                activeTab === 'chats' 
                  ? 'bg-muted text-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Чаты{totalUnreadCount > 0 && ` (${totalUnreadCount})`}
            </Button>
            {/* Кнопка О клиенте - показывается только при активном чате с клиентом */}
            {activeChatId && activeChatType === 'client' && (
              <Sheet open={rightSidebarOpen} onOpenChange={setRightSidebarOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`px-4 h-12 font-medium rounded-none transition-colors border-l ${
                      rightSidebarOpen 
                        ? 'bg-muted text-foreground' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    О клиенте
                  </Button>
                </SheetTrigger>
              </Sheet>
            )}
            {/* Только аватарка менеджера на мобильной версии */}
            <div className="flex items-center px-4 h-12 border-l bg-background">
              <ManagerMenu
                managerName={profile && profile.first_name && profile.last_name 
                  ? `${profile.first_name} ${profile.last_name}` 
                  : 'Менеджер'}
                managerEmail={user?.email}
                onSignOut={handleSignOut}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* User Header - скрыт на мобильной версии */}
      {!isMobile && (
        <div className="bg-background border-b p-4 shrink-0">
          <div className="flex items-center justify-between w-full mx-auto px-2 sm:px-4">
            <div className="flex items-center gap-3 flex-1">
              <Building2 className="h-6 w-6 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold truncate">O'KEY ENGLISH CRM</h1>
              </div>
              
              {pinnedModals && pinnedModals.length > 0 && (
                <div className="ml-4 flex">
                  <PinnedModalTabs 
                    pinnedModals={pinnedModals}
                    onOpenModal={handleOpenPinnedModal}
                    onUnpinModal={unpinModal}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(clientsLoading || threadsLoading || studentsLoading || pinnedLoading || chatStatesLoading || systemChatsLoading) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                  <span className="hidden sm:inline">Загрузка данных...</span>
                </div>
              )}
              <ManagerMenu
                managerName={profile && profile.first_name && profile.last_name 
                  ? `${profile.first_name} ${profile.last_name}` 
                  : 'Менеджер'}
                managerEmail={user?.email}
                onSignOut={handleSignOut}
              />
            </div>
          </div>
        </div>
      )}

      {/* Основная область */}
      <div className={`relative z-0 isolate flex flex-1 w-full overflow-hidden ${isMobile ? 'pt-12' : ''}`}>
        {/* Left Unified Sidebar - Desktop */}
        <div className={`${
          isMobile ? 'hidden' : 'flex'
        } w-80 lg:w-96 bg-background border-r flex-col h-full min-h-0 overflow-y-auto transition-all duration-300`}>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col">
            <TabsList className="grid w-full grid-cols-2 m-2 shrink-0">
              <TabsTrigger value="menu">Меню</TabsTrigger>
              <TabsTrigger value="chats">Чаты</TabsTrigger>
            </TabsList>
            
            <TabsContent value="menu" className="flex-1 mt-0 min-h-0 data-[state=active]:flex">
              <div className="p-2 space-y-1 overflow-y-auto flex-1">
                {menuItems.map((item, index) => (
                  <Dialog key={index} open={openModal === item.label} onOpenChange={(open) => !open && handleMenuModalClose()}>
                    <DialogTrigger asChild>
                      <button
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
                        onClick={() => handleMenuClick(item.label)}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="text-sm flex-1">
                          {item.label}
                          {getMenuCount(item.label) > 0 && (
                            <span className="text-muted-foreground"> ({getMenuCount(item.label)})</span>
                          )}
                        </span>
                        <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                      </button>
                    </DialogTrigger>
                    <PinnableDialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <PinnableModalHeader
                        title={item.label}
                        isPinned={isPinned(`menu-${item.label}`, item.label)}
                        onPin={() => handlePinMenuModal(item.label)}
                        onUnpin={() => handleUnpinMenuModal(item.label)}
                        onClose={handleMenuModalClose}
                      >
                        <item.icon className="h-5 w-5 ml-2" />
                      </PinnableModalHeader>
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
                                handleChatClick(clientId, 'client');
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
                            {/* Переключение между списком и календарем */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Button 
                                  size="sm"
                                  variant={tasksView === "list" ? "default" : "outline"}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setTasksView("list");
                                  }}
                                  className="gap-2"
                                  type="button"
                                >
                                  📋 Список
                                </Button>
                                <Button 
                                  size="sm"
                                  variant={tasksView === "calendar" ? "default" : "outline"}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setTasksView("calendar");
                                  }}
                                  className="gap-2"
                                  type="button"
                                >
                                  📅 Календарь
                                </Button>
                              </div>
                              <Button 
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setShowAddTaskModal(true);
                                }}
                                className="gap-1"
                                type="button"
                              >
                                + Добавить
                              </Button>
                            </div>

                            {tasksView === "list" ? (
                              <>
                                 {/* Клиентские задачи */}
                                {showClientTasks && (
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          {(() => {
                                            const today = new Date().toISOString().split('T')[0];
                                            const clientTasks = allTasks.filter(t => t.client_id);
                                            const overdueClientTasks = clientTasks.filter(t => t.due_date && t.due_date < today);
                                            return (
                                              <span>
                                                Задачи по клиентам ({clientTasks.length})
                                                {overdueClientTasks.length > 0 && (
                                                  <span className="text-red-600 ml-2">
                                                    · {overdueClientTasks.length} просрочено
                                                  </span>
                                                )}
                                              </span>
                                            );
                                          })()}
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => setShowClientTasks(false)}
                                          className="text-muted-foreground"
                                        >
                                          <EyeOff className="h-4 w-4" />
                                        </Button>
                                      </CardTitle>
                                    </CardHeader>
                                  <CardContent>
                                    {/* Tabs for Active and Overdue client tasks */}
                                    <Tabs value={clientTasksTab} onValueChange={(value: any) => setClientTasksTab(value)} className="w-full">
                                      <TabsList className="grid w-full grid-cols-2 mb-4">
                                        <TabsTrigger value="active">Активные</TabsTrigger>
                                        <TabsTrigger value="overdue" className="text-red-600">Просроченные</TabsTrigger>
                                      </TabsList>
                                      
                                      <TabsContent value="active">
                                        {tasksLoading ? (
                                          <div className="text-center py-4 text-muted-foreground">
                                            Загрузка задач...
                                          </div>
                                        ) : (() => {
                                          const today = new Date().toISOString().split('T')[0];
                                          const activeClientTasks = allTasks.filter(t => t.client_id && (!t.due_date || t.due_date >= today));
                                          
                                          if (activeClientTasks.length === 0) {
                                            return (
                                              <div className="text-center py-4 text-muted-foreground">
                                                <p>Нет активных задач по клиентам</p>
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  className="mt-2"
                                                  onClick={() => setShowAddTaskModal(true)}
                                                >
                                                  Создать задачу
                                                </Button>
                                              </div>
                                            );
                                          }
                                          
                                          return (
                                            <div className="grid grid-cols-2 gap-4">
                                              {/* Сегодня */}
                                              <div 
                                                onDragOver={(e) => handleDragOver(e, 'today')}
                                                onDragLeave={handleDragLeave}
                                                onDrop={(e) => handleDrop(e, 'today')}
                                                className={`transition-colors ${dragOverColumn === 'today' ? 'bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-2' : ''}`}
                                              >
                                                <h4 className="font-medium text-sm mb-2 text-primary">Сегодня:</h4>
                                                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                                                  {(() => {
                                                    const todayTasks = activeClientTasks.filter(t => t.due_date === today);
                                                    const displayTasks = todayTasks.slice(0, 5);
                                                    
                                                    return (
                                                      <>
                                                        {displayTasks.map((task) => (
                                                          <div 
                                                            key={task.id}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, task.id)}
                                                            onDragEnd={handleDragEnd}
                                                            className={`p-2.5 border-l-4 rounded-md cursor-grab hover:shadow-md transition-all ${
                                                              task.priority === 'high' ? 'border-red-500 bg-red-50' :
                                                              task.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                                                              'border-blue-500 bg-blue-50'
                                                            } ${draggedTask === task.id ? 'opacity-50 cursor-grabbing' : ''}`}
                                                            onClick={() => task.client_id && handleClientClick(task.client_id)}
                                                          >
                                                            <div className="flex items-start justify-between gap-2">
                                                              <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-sm leading-tight mb-1">{task.title}</p>
                                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                                  <span>
                                                                    Клиент: <span className="text-primary font-medium">
                                                                      {task.clients?.name || 'Неизвестен'}
                                                                    </span>
                                                                  </span>
                                                                  {task.due_time && (
                                                                    <span className="flex items-center gap-1">
                                                                      <Clock className="h-3 w-3" />
                                                                      {task.due_time.slice(0, 5)}
                                                                    </span>
                                                                  )}
                                                                </div>
                                                              </div>
                                                              <div className="flex items-center gap-1 shrink-0">
                                                                <Button 
                                                                  size="sm" 
                                                                  variant="ghost" 
                                                                  className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-50"
                                                                  onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingTaskId(task.id);
                                                                  }}
                                                                  title="Редактировать"
                                                                >
                                                                  <Edit className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <Button 
                                                                  size="sm" 
                                                                  variant="ghost" 
                                                                  className="h-6 w-6 p-0 text-green-600 hover:bg-green-50"
                                                                  onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCompleteTask(task.id);
                                                                  }}
                                                                  title="Отметить выполненной"
                                                                >
                                                                  <Check className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <Button 
                                                                  size="sm" 
                                                                  variant="ghost" 
                                                                  className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                                                                  onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCancelTask(task.id);
                                                                  }}
                                                                  title="Отменить задачу"
                                                                >
                                                                  <X className="h-3.5 w-3.5" />
                                                                </Button>
                                                              </div>
                                                            </div>
                                                          </div>
                                                        ))}
                                                        {todayTasks.length > 5 && (
                                                          <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openAllTasksModal('today', todayTasks)}
                                                            className="w-full mt-2 text-xs"
                                                          >
                                                            <List className="h-3 w-3 mr-1" />
                                                            Показать все {todayTasks.length} задач
                                                          </Button>
                                                        )}
                                                        {todayTasks.length === 0 && (
                                                          <p className="text-xs text-muted-foreground">Нет задач на сегодня</p>
                                                        )}
                                                      </>
                                                    );
                                                  })()}
                                                </div>
                                              </div>
                                              
                                              {/* Завтра */}
                                              <div 
                                                onDragOver={(e) => handleDragOver(e, 'tomorrow')}
                                                onDragLeave={handleDragLeave}
                                                onDrop={(e) => handleDrop(e, 'tomorrow')}
                                                className={`transition-colors ${dragOverColumn === 'tomorrow' ? 'bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-2' : ''}`}
                                              >
                                                <h4 className="font-medium text-sm mb-2 text-primary">Завтра:</h4>
                                                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                                                  {(() => {
                                                    const tomorrow = new Date();
                                                    tomorrow.setDate(tomorrow.getDate() + 1);
                                                    const tomorrowStr = tomorrow.toISOString().split('T')[0];
                                                    const tomorrowTasks = activeClientTasks.filter(t => t.due_date === tomorrowStr);
                                                    const displayTasks = tomorrowTasks.slice(0, 5);
                                                    
                                                    return (
                                                      <>
                                                        {displayTasks.map((task) => (
                                                          <div 
                                                            key={task.id}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, task.id)}
                                                            onDragEnd={handleDragEnd}
                                                            className={`p-2.5 border-l-4 rounded-md cursor-grab hover:shadow-md transition-all ${
                                                              task.priority === 'high' ? 'border-red-500 bg-red-50' :
                                                              task.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                                                              'border-blue-500 bg-blue-50'
                                                            } ${draggedTask === task.id ? 'opacity-50 cursor-grabbing' : ''}`}
                                                            onClick={() => task.client_id && handleClientClick(task.client_id)}
                                                          >
                                                            <div className="flex items-start justify-between gap-2">
                                                              <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-sm leading-tight mb-1">{task.title}</p>
                                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                                  <span>
                                                                    Клиент: <span className="text-primary font-medium">
                                                                      {task.clients?.name || 'Неизвестен'}
                                                                    </span>
                                                                  </span>
                                                                  {task.due_time && (
                                                                    <span className="flex items-center gap-1">
                                                                      <Clock className="h-3 w-3" />
                                                                      {task.due_time.slice(0, 5)}
                                                                    </span>
                                                                  )}
                                                                </div>
                                                              </div>
                                                              <div className="flex items-center gap-1 shrink-0">
                                                                <Button 
                                                                  size="sm" 
                                                                  variant="ghost" 
                                                                  className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-50"
                                                                  onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingTaskId(task.id);
                                                                  }}
                                                                  title="Редактировать"
                                                                >
                                                                  <Edit className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <Button 
                                                                  size="sm" 
                                                                  variant="ghost" 
                                                                  className="h-6 w-6 p-0 text-green-600 hover:bg-green-50"
                                                                  onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCompleteTask(task.id);
                                                                  }}
                                                                  title="Отметить выполненной"
                                                                >
                                                                  <Check className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <Button 
                                                                  size="sm" 
                                                                  variant="ghost" 
                                                                  className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                                                                  onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCancelTask(task.id);
                                                                  }}
                                                                  title="Отменить задачу"
                                                                >
                                                                  <X className="h-3.5 w-3.5" />
                                                                </Button>
                                                              </div>
                                                            </div>
                                                          </div>
                                                        ))}
                                                        {tomorrowTasks.length > 5 && (
                                                          <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openAllTasksModal('tomorrow', tomorrowTasks)}
                                                            className="w-full mt-2 text-xs"
                                                          >
                                                            <List className="h-3 w-3 mr-1" />
                                                            Показать все {tomorrowTasks.length} задач
                                                          </Button>
                                                        )}
                                                        {tomorrowTasks.length === 0 && (
                                                          <p className="text-xs text-muted-foreground">Нет задач на завтра</p>
                                                        )}
                                                      </>
                                                    );
                                                  })()}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </TabsContent>
                                      
                                      <TabsContent value="overdue">
                                        {(() => {
                                          const today = new Date().toISOString().split('T')[0];
                                          const overdueClientTasks = allTasks.filter(t => t.client_id && t.due_date && t.due_date < today);
                                          
                                          if (overdueClientTasks.length === 0) {
                                            return (
                                              <div className="text-center py-4 text-muted-foreground">
                                                <p>Нет просроченных задач по клиентам! 🎉</p>
                                              </div>
                                            );
                                          }
                                          
                                          return (
                                            <div className="space-y-1.5 max-h-96 overflow-y-auto">
                                              {overdueClientTasks.map((task) => {
                                                const daysPassed = Math.floor((new Date().getTime() - new Date(task.due_date!).getTime()) / (1000 * 60 * 60 * 24));
                                                return (
                                                  <div 
                                                    key={task.id} 
                                                    className="p-2.5 border-l-4 border-red-500 bg-red-50 rounded-md hover:shadow-md transition-shadow cursor-pointer"
                                                    onClick={() => task.client_id && handleClientClick(task.client_id)}
                                                  >
                                                    <div className="flex items-start justify-between gap-2">
                                                      <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm leading-tight mb-1">{task.title}</p>
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                          <span>
                                                            Клиент: <span className="text-primary font-medium">
                                                              {task.clients?.name || 'Неизвестен'}
                                                            </span>
                                                          </span>
                                                          <span className="text-red-600 font-medium">
                                                            Просрочено на {daysPassed} {daysPassed === 1 ? 'день' : daysPassed < 5 ? 'дня' : 'дней'}
                                                          </span>
                                                          {task.due_date && (
                                                            <span className="flex items-center gap-1">
                                                              <Clock className="h-3 w-3" />
                                                              {new Date(task.due_date).toLocaleDateString('ru-RU')}
                                                              {task.due_time && ` в ${task.due_time.slice(0, 5)}`}
                                                            </span>
                                                          )}
                                                        </div>
                                                      </div>
                                                      <div className="flex items-center gap-1 shrink-0">
                                                        <Button 
                                                          size="sm" 
                                                          variant="ghost" 
                                                          className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-50"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingTaskId(task.id);
                                                          }}
                                                          title="Редактировать"
                                                        >
                                                          <Edit className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button 
                                                          size="sm" 
                                                          variant="ghost" 
                                                          className="h-6 w-6 p-0 text-green-600 hover:bg-green-50"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCompleteTask(task.id);
                                                          }}
                                                          title="Отметить выполненной"
                                                        >
                                                          <Check className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button 
                                                          size="sm" 
                                                          variant="ghost" 
                                                          className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCancelTask(task.id);
                                                          }}
                                                          title="Отменить задачу"
                                                        >
                                                          <X className="h-3.5 w-3.5" />
                                                        </Button>
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          );
                                        })()}
                                      </TabsContent>
                                    </Tabs>
                                  </CardContent>
                                </Card>
                                )}

                                {/* Кнопка показать скрытые клиентские задачи */}
                                {!showClientTasks && (
                                  <Card className="border-dashed border-muted-foreground/30">
                                    <CardContent className="flex items-center justify-center py-6">
                                      <Button
                                        variant="outline"
                                        onClick={() => setShowClientTasks(true)}
                                        className="gap-2"
                                      >
                                        <Eye className="h-4 w-4" />
                                        Показать задачи по клиентам
                                      </Button>
                                    </CardContent>
                                  </Card>
                                )}

                                {/* Личные задачи менеджера */}
                                {showPersonalTasks && (
                                  <Card className="border-purple-200 bg-purple-50/30">
                                    <CardHeader>
                                      <CardTitle className="flex items-center justify-between text-purple-800">
                                        <span>📝 Мой личный планер ({allTasks.filter(t => !t.client_id).length})</span>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => setShowPersonalTasks(false)}
                                          className="text-muted-foreground"
                                        >
                                          <EyeOff className="h-4 w-4" />
                                        </Button>
                                      </CardTitle>
                                    </CardHeader>
                                  <CardContent>
                                    {/* Tabs for Active and Overdue tasks */}
                                    <Tabs value={personalTasksTab} onValueChange={(value: any) => setPersonalTasksTab(value)} className="w-full">
                                      <TabsList className="grid w-full grid-cols-2 mb-4">
                                        <TabsTrigger value="active">Активные</TabsTrigger>
                                        <TabsTrigger value="overdue" className="text-red-600">Просроченные</TabsTrigger>
                                      </TabsList>
                                      
                                      <TabsContent value="active">
                                        {(() => {
                                          const today = new Date().toISOString().split('T')[0];
                                          const tomorrow = new Date();
                                          tomorrow.setDate(tomorrow.getDate() + 1);
                                          const tomorrowStr = tomorrow.toISOString().split('T')[0];
                                          
                                          const activeTasks = allTasks.filter(t => !t.client_id && (!t.due_date || t.due_date >= today));
                                          
                                          if (activeTasks.length === 0) {
                                            return (
                                              <div className="text-center py-4 text-muted-foreground">
                                                <p>У вас нет активных личных задач</p>
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  className="mt-2 border-purple-300 text-purple-700 hover:bg-purple-100"
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setPinnedTaskClientId('');
                                                    setShowAddTaskModal(true);
                                                  }}
                                                  type="button"
                                                >
                                                  Создать личную задачу
                                                </Button>
                                              </div>
                                            );
                                          }
                                          
                                          return (
                                            <div className="grid grid-cols-2 gap-4">
                                              {/* Сегодня */}
                                              <div 
                                                onDragOver={(e) => handleDragOver(e, 'today')}
                                                onDragLeave={handleDragLeave}
                                                onDrop={(e) => handleDrop(e, 'today')}
                                                className={`transition-colors ${dragOverColumn === 'today' ? 'bg-purple-50 border-2 border-dashed border-purple-300 rounded-lg p-2' : ''}`}
                                              >
                                                <h4 className="font-medium text-sm mb-2 text-purple-700">Сегодня:</h4>
                                                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                                  {activeTasks.filter(t => t.due_date === today).map((task) => (
                                                    <div 
                                                      key={task.id}
                                                      draggable
                                                      onDragStart={(e) => handleDragStart(e, task.id)}
                                                      onDragEnd={handleDragEnd}
                                                      className={`p-2.5 border-l-4 rounded-md cursor-grab hover:shadow-md transition-all bg-white ${
                                                        task.priority === 'high' ? 'border-red-500' :
                                                        task.priority === 'medium' ? 'border-yellow-500' :
                                                        'border-purple-400'
                                                      } ${draggedTask === task.id ? 'opacity-50 cursor-grabbing' : ''}`}
                                                    >
                                                      <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                          <p className="font-medium text-sm leading-tight mb-1">{task.title}</p>
                                                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                            <span className="text-purple-600 font-medium">Личная</span>
                                                            {task.due_time && (
                                                              <span className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {task.due_time.slice(0, 5)}
                                                              </span>
                                                            )}
                                                          </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                          <Button 
                                                            size="sm" 
                                                            variant="ghost" 
                                                            className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-50"
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              setEditingTaskId(task.id);
                                                            }}
                                                            title="Редактировать"
                                                          >
                                                            <Edit className="h-3.5 w-3.5" />
                                                          </Button>
                                                          <Button 
                                                            size="sm" 
                                                            variant="ghost" 
                                                            className="h-6 w-6 p-0 text-green-600 hover:bg-green-50"
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              handleCompleteTask(task.id);
                                                            }}
                                                            title="Отметить выполненной"
                                                          >
                                                            <Check className="h-3.5 w-3.5" />
                                                          </Button>
                                                          <Button 
                                                            size="sm" 
                                                            variant="ghost" 
                                                            className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              handleCancelTask(task.id);
                                                            }}
                                                            title="Отменить задачу"
                                                          >
                                                            <X className="h-3.5 w-3.5" />
                                                          </Button>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  ))}
                                                  {activeTasks.filter(t => t.due_date === today).length === 0 && (
                                                    <p className="text-xs text-muted-foreground">Нет задач на сегодня</p>
                                                  )}
                                                </div>
                                              </div>
                                              
                                              {/* Завтра */}
                                              <div 
                                                onDragOver={(e) => handleDragOver(e, 'tomorrow')}
                                                onDragLeave={handleDragLeave}
                                                onDrop={(e) => handleDrop(e, 'tomorrow')}
                                                className={`transition-colors ${dragOverColumn === 'tomorrow' ? 'bg-purple-50 border-2 border-dashed border-purple-300 rounded-lg p-2' : ''}`}
                                              >
                                                <h4 className="font-medium text-sm mb-2 text-purple-700">Завтра:</h4>
                                                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                                  {activeTasks.filter(t => t.due_date === tomorrowStr).map((task) => (
                                                    <div 
                                                      key={task.id}
                                                      draggable
                                                      onDragStart={(e) => handleDragStart(e, task.id)}
                                                      onDragEnd={handleDragEnd}
                                                      className={`p-2.5 border-l-4 rounded-md cursor-grab hover:shadow-md transition-all bg-white ${
                                                        task.priority === 'high' ? 'border-red-500' :
                                                        task.priority === 'medium' ? 'border-yellow-500' :
                                                        'border-purple-400'
                                                      } ${draggedTask === task.id ? 'opacity-50 cursor-grabbing' : ''}`}
                                                    >
                                                      <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                          <p className="font-medium text-sm leading-tight mb-1">{task.title}</p>
                                                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                            <span className="text-purple-600 font-medium">Личная</span>
                                                            {task.due_time && (
                                                              <span className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {task.due_time.slice(0, 5)}
                                                              </span>
                                                            )}
                                                          </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                          <Button 
                                                            size="sm" 
                                                            variant="ghost" 
                                                            className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-50"
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              setEditingTaskId(task.id);
                                                            }}
                                                            title="Редактировать"
                                                          >
                                                            <Edit className="h-3.5 w-3.5" />
                                                          </Button>
                                                          <Button 
                                                            size="sm" 
                                                            variant="ghost" 
                                                            className="h-6 w-6 p-0 text-green-600 hover:bg-green-50"
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              handleCompleteTask(task.id);
                                                            }}
                                                            title="Отметить выполненной"
                                                          >
                                                            <Check className="h-3.5 w-3.5" />
                                                          </Button>
                                                          <Button 
                                                            size="sm" 
                                                            variant="ghost" 
                                                            className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              handleCancelTask(task.id);
                                                            }}
                                                            title="Отменить задачу"
                                                          >
                                                            <X className="h-3.5 w-3.5" />
                                                          </Button>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  ))}
                                                  {activeTasks.filter(t => t.due_date === tomorrowStr).length === 0 && (
                                                    <p className="text-xs text-muted-foreground">Нет задач на завтра</p>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </TabsContent>
                                      
                                      <TabsContent value="overdue">
                                        {(() => {
                                          const today = new Date().toISOString().split('T')[0];
                                          const overdueTasks = allTasks.filter(t => !t.client_id && t.due_date && t.due_date < today);
                                          
                                          if (overdueTasks.length === 0) {
                                            return (
                                              <div className="text-center py-4 text-muted-foreground">
                                                <p>У вас нет просроченных задач! 🎉</p>
                                              </div>
                                            );
                                          }
                                          
                                          return (
                                            <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                              {overdueTasks.map((task) => {
                                                const daysPassed = Math.floor((new Date().getTime() - new Date(task.due_date!).getTime()) / (1000 * 60 * 60 * 24));
                                                return (
                                                  <div 
                                                    key={task.id} 
                                                    className="p-2.5 border-l-4 border-red-500 bg-red-50 rounded-md hover:shadow-md transition-shadow"
                                                  >
                                                    <div className="flex items-start justify-between gap-2">
                                                      <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm leading-tight mb-1">{task.title}</p>
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                          <span className="text-red-600 font-medium">
                                                            Просрочено на {daysPassed} {daysPassed === 1 ? 'день' : daysPassed < 5 ? 'дня' : 'дней'}
                                                          </span>
                                                          {task.due_date && (
                                                            <span className="flex items-center gap-1">
                                                              <Clock className="h-3 w-3" />
                                                              {new Date(task.due_date).toLocaleDateString('ru-RU')}
                                                              {task.due_time && ` в ${task.due_time.slice(0, 5)}`}
                                                            </span>
                                                          )}
                                                        </div>
                                                      </div>
                                                      <div className="flex items-center gap-1 shrink-0">
                                                        <Button 
                                                          size="sm" 
                                                          variant="ghost" 
                                                          className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-50"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingTaskId(task.id);
                                                          }}
                                                          title="Редактировать"
                                                        >
                                                          <Edit className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button 
                                                          size="sm" 
                                                          variant="ghost" 
                                                          className="h-6 w-6 p-0 text-green-600 hover:bg-green-50"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCompleteTask(task.id);
                                                          }}
                                                          title="Отметить выполненной"
                                                        >
                                                          <Check className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button 
                                                          size="sm" 
                                                          variant="ghost" 
                                                          className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCancelTask(task.id);
                                                          }}
                                                          title="Отменить задачу"
                                                        >
                                                          <X className="h-3.5 w-3.5" />
                                                        </Button>
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          );
                                        })()}
                                      </TabsContent>
                                    </Tabs>
                                  </CardContent>
                                </Card>
                                )}

                                {/* Кнопка показать скрытые личные задачи */}
                                {!showPersonalTasks && (
                                  <Card className="border-dashed border-muted-foreground/30">
                                    <CardContent className="flex items-center justify-center py-6">
                                      <Button
                                        variant="outline"
                                        onClick={() => setShowPersonalTasks(true)}
                                        className="gap-2"
                                      >
                                        <Eye className="h-4 w-4" />
                                        Показать личные задачи
                                      </Button>
                                    </CardContent>
                                  </Card>
                                )}
                              </>
                            ) : (
                              <TaskCalendar 
                                onTaskClick={(taskId) => setEditTaskId(taskId)}
                                activeClientId={activeChatId || undefined}
                                activeClientName={activeChatId ? getActiveClientInfo().name : undefined}
                              />
                            )}
                          </div>
                        )}
                        {!["Расписание", "Финансы", "Мои задачи"].includes(item.label) && (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">Функция "{item.label}" в разработке</p>
                          </div>
                        )}
                      </div>
                    </PinnableDialogContent>
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
                  {filteredChats.some(chat => isPinnedByCurrentUser(chat.id)) && (
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
                          {filteredChats.filter(chat => isPinnedByCurrentUser(chat.id)).length}
                        </Badge>
                      </button>
                      {isPinnedSectionOpen && (
                        <div className="space-y-1">
                        {filteredChats
                          .filter(chat => isPinnedByCurrentUser(chat.id))
                          .map((chat) => {
                            const chatState = getChatState(chat.id);
                            const displayUnread = chatState.isUnread || chat.unread > 0;
                            return (
                              <ChatContextMenu
                                key={chat.id}
                                onMarkUnread={() => handleChatAction(chat.id, 'unread')}
                                onPinDialog={() => handleChatAction(chat.id, 'pin')}
                                onArchive={() => handleChatAction(chat.id, 'archive')}
                                onBlock={() => handleChatAction(chat.id, 'block')}
                                isPinned={chatState.isPinned}
                                isArchived={chatState.isArchived}
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
                                     <div className="flex items-center gap-3">
                                       {/* Avatar or icon */}
                                       {chat.type === 'corporate' ? (
                                         <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                           <Building2 className="h-5 w-5 text-blue-600" />
                                         </div>
                                       ) : chat.type === 'teachers' ? (
                                         <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                           <GraduationCap className="h-5 w-5 text-purple-600" />
                                         </div>
                                        ) : chat.avatar_url ? (
                                          <div className="relative flex-shrink-0">
                                            <img 
                                              src={chat.avatar_url} 
                                              alt={`${chat.name} avatar`} 
                                              className="w-10 h-10 rounded-full object-cover border-2 border-green-200"
                                              onError={(e) => {
                                                const target = e.currentTarget as HTMLImageElement;
                                                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGM0Y0RjYiLz4KPGF1Y2NsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMzAgMzBDMzAgMjYuNjg2MyAyNi42Mjc0IDI0IDIyLjUgMjRIMTcuNUMxMy4zNzI2IDI0IDEwIDI2LjY4NjMgMTAgMzBWMzBIMzBWMzBaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
                                              }}
                                            />
                                            {/* Lead indicator */}
                                            {(() => {
                                              const chatInfo = chat as any; // Временно для отладки 
                                              console.log(`Processing chat for lead indicator: ${chatInfo.id} (${chatInfo.name}) type: ${chatInfo.type}`);
                                              if (chatInfo.type !== 'client') {
                                                console.log(`Skipping ${chatInfo.name} - not client type (${chatInfo.type})`);
                                                return null;
                                              }
                                              const clientStatus = getClientStatus(chatInfo.id);
                                              console.log(`Client ${chatInfo.id} (${chatInfo.name}) status:`, clientStatus);
                                              console.log(`Should show lead icon for ${chatInfo.name}:`, clientStatus.isLead);
                                              if (clientStatus.isLead) {
                                                console.log(`RENDERING LEAD ICON FOR ${chatInfo.name}`);
                                              }
                                              return clientStatus.isLead ? (
                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center border border-white z-10">
                                                  <UserPlus className="w-2.5 h-2.5 text-white" />
                                                </div>
                                              ) : null;
                                            })()}
                                          </div>
                                       ) : (
                                         <div className="relative flex-shrink-0">
                                           <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                             <User className="h-5 w-5 text-green-600" />
                                           </div>
                                           {/* Lead indicator */}
                                            {(() => {
                                              const chatInfo = chat as any; // Временно для отладки
                                              if (chatInfo.type !== 'client') return null;
                                              const clientStatus = getClientStatus(chatInfo.id);
                                              console.log(`Lead check without avatar for ${chatInfo.name}:`, clientStatus.isLead);
                                              return clientStatus.isLead ? (
                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center border border-white z-10">
                                                  <UserPlus className="w-2.5 h-2.5 text-white" />
                                                </div>
                                              ) : null;
                                            })()}
                                          </div>
                                       )}
                                       
                                         <div className="flex-1 min-w-0">
                                           <div className="flex items-center gap-2">
                                             <p className={`font-medium text-sm ${displayUnread ? 'font-bold' : ''} truncate`}>
                                               {chat.name}
                                             </p>
                                                <Badge variant="outline" className="text-xs h-4 bg-orange-100 text-orange-700 border-orange-300">
                                                  В работе
                                                </Badge>
                                           </div>
                                          <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                                            {chat.lastMessage || "Привет! Как дела?"}
                                          </p>
                                         </div>
                                     </div>
                                    <div className="flex flex-col items-end">
                                      <Pin className="h-3 w-3 text-orange-600 mb-1" />
                                      <span className="text-xs text-muted-foreground">{chat.time}</span>
                                      {displayUnread && (
                                        <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full mt-1">
                                            {chatState.isUnread ? '1' : chat.unread}
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
                        {filteredChats.filter(chat => !isPinnedByCurrentUser(chat.id)).length}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {filteredChats
                        .filter(chat => !isPinnedByCurrentUser(chat.id))
                        .map((chat) => {
                          const chatState = getChatState(chat.id);
                          const displayUnread = chatState.isUnread || chat.unread > 0;
                          return (
                            <ChatContextMenu
                              key={chat.id}
                              onMarkUnread={() => handleChatAction(chat.id, 'unread')}
                              onPinDialog={() => handleChatAction(chat.id, 'pin')}
                              onArchive={() => handleChatAction(chat.id, 'archive')}
                              onBlock={() => handleChatAction(chat.id, 'block')}
                              isPinned={chatState.isPinned}
                              isArchived={chatState.isArchived}
                            >
                              <button 
                                className={`w-full p-3 text-left rounded-lg transition-colors relative ${
                                  chat.id === activeChatId ? 'bg-muted hover:bg-muted/80' : 'hover:bg-muted/50'
                                }`}
                                onClick={() => handleChatClick(chat.id, chat.type)}
                              >
                                 <div className="flex items-center justify-between">
                                   <div className="flex items-center gap-3">
                                     {/* Avatar or icon */}
                                     {chat.type === 'corporate' ? (
                                       <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                         <Building2 className="h-5 w-5 text-blue-600" />
                                       </div>
                                     ) : chat.type === 'teachers' ? (
                                       <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                         <GraduationCap className="h-5 w-5 text-purple-600" />
                                       </div>
                                      ) : chat.avatar_url ? (
                                        <div className="relative flex-shrink-0">
                                          <img 
                                            src={chat.avatar_url} 
                                            alt={`${chat.name} avatar`} 
                                            className="w-10 h-10 rounded-full object-cover border-2 border-green-200"
                                            onError={(e) => {
                                              const target = e.currentTarget as HTMLImageElement;
                                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGM0Y0RjYiLz4KPGF1Y2NsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMzAgMzBDMzAgMjYuNjg2MyAyNi42Mjc0IDI0IDIyLjUgMjRIMTcuNUMxMy4zNzI2IDI0IDEwIDI2LjY4NjMgMTAgMzBWMzBIMzBWMzBaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
                                            }}
                                          />
                                          {/* Lead indicator */}
                                          {(() => {
                                            const chatInfo = chat as any; // Временно для отладки 
                                            console.log(`Processing chat for lead indicator (second list): ${chatInfo.id} (${chatInfo.name}) type: ${chatInfo.type}`);
                                            if (chatInfo.type !== 'client') {
                                              console.log(`Skipping ${chatInfo.name} - not client type (${chatInfo.type})`);
                                              return null;
                                            }
                                            const clientStatus = getClientStatus(chatInfo.id);
                                            console.log(`Client ${chatInfo.id} (${chatInfo.name}) status (second list):`, clientStatus);
                                            return clientStatus.isLead ? (
                                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center border border-white">
                                                <UserPlus className="w-2.5 h-2.5 text-white" />
                                              </div>
                                            ) : null;
                                          })()}
                                        </div>
                                     ) : (
                                       <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                         <User className="h-5 w-5 text-green-600" />
                                       </div>
                                     )}
                                     
                                       <div className="flex-1 min-w-0">
                                         <div className="flex items-center gap-2">
                                           <p className={`font-medium text-sm ${displayUnread ? 'font-bold' : ''} truncate`}>
                                             {chat.name}
                                           </p>
                                           {isInWorkByOthers(chat.id) && (
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Badge variant="outline" className="text-xs h-4 bg-orange-100 text-orange-700 border-orange-300 cursor-help">
                                                    В работе
                                                  </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>Закреплен у: {getPinnedByUserName(chat.id)}</p>
                                                </TooltipContent>
                                              </Tooltip>
                                           )}
                                         </div>
                                         <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                                           {chat.lastMessage || "Последнее сообщение"}
                                         </p>
                                       </div>
                                   </div>
                                  <div className="flex flex-col items-end">
                                    <span className="text-xs text-muted-foreground">{chat.time}</span>
                                    {displayUnread && (
                                      <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                                        {chatState.isUnread ? '1' : chat.unread}
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

        {/* Center - Chat Area или Мобильный контент */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-background">
          {/* Показываем меню на мобильной версии когда активна вкладка menu */}
          {isMobile && activeTab === 'menu' ? (
            <div className="p-4 space-y-2 overflow-y-auto">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-left border bg-card"
                  onClick={() => handleMenuClick(item.label)}
                >
                  <item.icon className="h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm flex-1 font-medium">
                    {item.label}
                    {getMenuCount(item.label) > 0 && (
                      <span className="text-muted-foreground"> ({getMenuCount(item.label)})</span>
                    )}
                  </span>
                  <ExternalLink className="h-4 w-4 ml-auto opacity-50" />
                </button>
              ))}
            </div>
          ) : isMobile && activeTab === 'chats' && !activeChatId ? (
            <div className="flex flex-col h-full">
              <div className="p-3 border-b space-y-3 shrink-0 bg-card">
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
                <div className="p-3">
                  {/* Закрепленные чаты */}
                  {filteredChats.some(chat => isPinnedByCurrentUser(chat.id)) && (
                    <div className="mb-6">
                      <button 
                        className="w-full flex items-center justify-between px-2 py-2 mb-3 hover:bg-muted/50 rounded transition-colors"
                        onClick={() => setIsPinnedSectionOpen(!isPinnedSectionOpen)}
                      >
                        <div className="flex items-center gap-2">
                          {isPinnedSectionOpen ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            Закрепленные (в работе)
                          </h3>
                        </div>
                        <Badge variant="secondary" className="text-xs h-5">
                          {filteredChats.filter(chat => isPinnedByCurrentUser(chat.id)).length}
                        </Badge>
                      </button>
                      {isPinnedSectionOpen && (
                        <div className="space-y-2 mb-6">
                          {filteredChats
                            .filter(chat => isPinnedByCurrentUser(chat.id))
                            .map((chat) => {
                              const chatState = getChatState(chat.id);
                              const displayUnread = chatState.isUnread || chat.unread > 0;
                              return (
                                <div 
                                  key={chat.id}
                                  className="w-full p-3 text-left rounded-lg transition-colors bg-card border hover:bg-muted/50 shadow-sm"
                                >
                                  <div className="flex items-center justify-between">
                                    <div 
                                      className="flex items-center gap-3 flex-1 cursor-pointer"
                                      onClick={() => {
                                        setActiveChatId(chat.id);
                                        setActiveChatType(chat.type as any);
                                        handleChatClick(chat.id, chat.type);
                                      }}
                                    >
                                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                        <User className="h-6 w-6 text-green-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <p className={`font-medium text-sm ${displayUnread ? 'font-bold' : ''} truncate`}>
                                            {chat.name}
                                          </p>
                                           <Badge variant="outline" className="text-xs h-5 bg-orange-100 text-orange-700 border-orange-300">
                                             В работе
                                           </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                                          {(typingByClient[chat.id]?.count ?? 0) > 0
                                            ? `${typingByClient[chat.id]?.names?.[0] || 'Менеджер'} печатает...`
                                            : (chat.lastMessage || 'Последнее сообщение')}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                      <div className="flex items-center gap-2">
                                        <Pin className="h-4 w-4 text-orange-600" />
                                        <span className="text-xs text-muted-foreground">{chat.time}</span>
                                        
                                        {/* Mobile Settings Menu */}
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button 
                                              size="sm" 
                                              variant="ghost" 
                                              className="h-8 w-8 p-0 opacity-60 hover:opacity-100"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <MoreVertical className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="w-56">
                                            <DropdownMenuItem onClick={() => handleChatAction(chat.id, 'unread')}>
                                              <BellOff className="mr-2 h-4 w-4" />
                                              <span>Отметить непрочитанным</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleChatAction(chat.id, 'pin')}>
                                              <Pin className="mr-2 h-4 w-4 text-purple-600" />
                                              <span>Открепить диалог</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleChatAction(chat.id, 'block')}>
                                              <Lock className="mr-2 h-4 w-4" />
                                              <span>Заблокировать клиента</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleChatAction(chat.id, 'archive')}>
                                              <Archive className="mr-2 h-4 w-4 text-orange-600" />
                                              <span>Архивировать</span>
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                      
                                      {displayUnread && (
                                        <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                                          {chatState.isUnread ? '1' : chat.unread}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Активные чаты */}
                  <div>
                    <div className="flex items-center justify-between px-2 py-2 mb-3">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Активные чаты
                      </h3>
                      <Badge variant="secondary" className="text-xs h-5">
                        {filteredChats.filter(chat => !isPinnedByCurrentUser(chat.id)).length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {filteredChats
                        .filter(chat => !isPinnedByCurrentUser(chat.id))
                        .map((chat) => {
                          const chatState = getChatState(chat.id);
                          const displayUnread = chatState.isUnread || chat.unread > 0;
                          return (
                            <div 
                              key={chat.id}
                              className="w-full p-3 text-left rounded-lg transition-colors bg-card border hover:bg-muted/50 shadow-sm"
                            >
                               <div className="flex items-center justify-between">
                                 <div 
                                   className="flex items-center gap-3 flex-1 cursor-pointer"
                                   onClick={() => {
                                     setActiveChatId(chat.id);
                                     setActiveChatType(chat.type as any);
                                     handleChatClick(chat.id, chat.type);
                                   }}
                                 >
                                   <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                     <User className="h-6 w-6 text-green-600" />
                                   </div>
                                         <div className="flex-1 min-w-0">
                                           <div className="flex items-center gap-2">
                                             <p className={`font-medium text-sm ${displayUnread ? 'font-bold' : ''} truncate`}>
                                               {chat.name}
                                             </p>
                                             {isInWorkByOthers(chat.id) && (
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <Badge variant="outline" className="text-xs h-5 bg-orange-100 text-orange-700 border-orange-300 cursor-help">
                                                      В работе
                                                    </Badge>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                    <p>Закреплен у: {getPinnedByUserName(chat.id)}</p>
                                                  </TooltipContent>
                                                </Tooltip>
                                             )}
                                           </div>
                                           <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                                             {chat.lastMessage || "Последнее сообщение"}
                                           </p>
                                         </div>
                                 </div>
                                 <div className="flex flex-col items-end gap-2">
                                   <div className="flex items-center gap-2">
                                     <span className="text-xs text-muted-foreground">{chat.time}</span>
                                     
                                     {/* Mobile Settings Menu */}
                                     <DropdownMenu>
                                       <DropdownMenuTrigger asChild>
                                         <Button 
                                           size="sm" 
                                           variant="ghost" 
                                           className="h-8 w-8 p-0 opacity-60 hover:opacity-100"
                                           onClick={(e) => e.stopPropagation()}
                                         >
                                           <MoreVertical className="h-4 w-4" />
                                         </Button>
                                       </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-md">
                                          <DropdownMenuItem onClick={() => handleChatAction(chat.id, 'unread')}>
                                            <BellOff className="mr-2 h-4 w-4" />
                                            <span>Отметить непрочитанным</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleChatAction(chat.id, 'pin')}>
                                            <Pin className="mr-2 h-4 w-4 text-purple-600" />
                                            <span>Закрепить диалог</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleChatAction(chat.id, 'block')}>
                                            <Lock className="mr-2 h-4 w-4" />
                                            <span>Заблокировать клиента</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleChatAction(chat.id, 'archive')}>
                                            <Archive className="mr-2 h-4 w-4 text-orange-600" />
                                            <span>Архивировать</span>
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                     </DropdownMenu>
                                   </div>
                                   
                                   {displayUnread && (
                                     <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                                       {chatState.isUnread ? '1' : chat.unread}
                                     </span>
                                   )}
                                 </div>
                               </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          ) : activeChatId && activeChatType === 'client' ? (
            <ChatArea 
              clientId={activeChatId}
              clientName={getActiveClientInfo().name}
              clientPhone={getActiveClientInfo().phone}
              clientComment={getActiveClientInfo().comment}
              onMessageChange={setHasUnsavedChat}
              activePhoneId={activePhoneId}
              onOpenTaskModal={() => setShowAddTaskModal(true)}
              onOpenInvoiceModal={() => setShowInvoiceModal(true)}
              onBackToList={isMobile ? () => {
                setActiveChatId('');
                setActiveTab('chats');
              } : undefined}
              onChatAction={handleChatAction}
            />
          ) : activeChatType === 'corporate' ? (
            <CorporateChatArea 
              onMessageChange={setHasUnsavedChat}
            />
          ) : activeChatType === 'teachers' ? (
            <TeacherChatArea 
              selectedTeacherId={activeChatId === 'teachers' ? 'teachers-group' : activeChatId}
              onSelectTeacher={(teacherId: string | null) => {
                setSelectedTeacherId(teacherId);
                if (teacherId) {
                  setActiveChatId(teacherId);
                }
              }}
            />
          ) : (
            <div className="flex-1 bg-background flex items-center justify-center p-4">
              <div className="text-center text-muted-foreground max-w-sm mx-auto">
                <MessageCircle className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-base sm:text-lg font-semibold mb-2">Выберите чат</h3>
                <p className="text-xs sm:text-sm">
                  {isMobile 
                    ? "Выберите клиента из вкладки 'Чаты' для начала переписки" 
                    : "Выберите клиента из списка слева, чтобы начать переписку"
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Desktop */}
        {!isMobile && activeChatType === 'client' && activeChatId && (
          <div className="w-80 lg:w-96 bg-background border-l p-4 overflow-y-auto h-full transition-all duration-300">
            <FamilyCardWrapper clientId={activeChatId} />
          </div>
        )}

        {/* Right Sidebar - Mobile */}
        <Sheet open={rightSidebarOpen} onOpenChange={setRightSidebarOpen}>
          <SheetContent side="right" className="w-80 p-4">
            {activeChatType === 'client' && activeChatId && (
              <FamilyCardWrapper clientId={activeChatId} />
            )}
          </SheetContent>
        </Sheet>
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
          clientName={
            pinnedTaskClientId && 
            pinnedTaskClientId !== 'client-task' &&
            getActiveClientInfo(pinnedTaskClientId).name !== 'Выберите чат' 
              ? getActiveClientInfo(pinnedTaskClientId).name 
              : undefined
          }
          clientId={
            pinnedTaskClientId && 
            pinnedTaskClientId !== 'client-task' &&
            getActiveClientInfo(pinnedTaskClientId).name !== 'Выберите чат' 
              ? pinnedTaskClientId 
              : undefined
          }
          familyGroupId={
            pinnedTaskClientId && 
            pinnedTaskClientId !== 'client-task' &&
            getActiveClientInfo(pinnedTaskClientId).name !== 'Выберите чат' 
              ? getFamilyGroupId(pinnedTaskClientId)
              : undefined
          }
          isPinned={
            pinnedTaskClientId && 
            pinnedTaskClientId !== 'client-task' &&
            getActiveClientInfo(pinnedTaskClientId).name !== 'Выберите чат' 
              ? isPinned(pinnedTaskClientId, 'task')
              : false
          }
          onPin={handlePinTaskModal}
          onUnpin={() => unpinModal(pinnedTaskClientId || '', 'task')}
        />

      <EditTaskModal 
        open={showEditTaskModal}
        onOpenChange={(open) => {
          setShowEditTaskModal(open);
          if (!open) setEditTaskId('');
        }}
        taskId={editTaskId}
      />

      <CreateInvoiceModal 
        open={showInvoiceModal}
        onOpenChange={handleInvoiceModalClose}
        clientName={getActiveClientInfo(pinnedInvoiceClientId || activeChatId).name}
        isPinned={isPinned(pinnedInvoiceClientId || activeChatId || '', 'invoice')}
        onPin={handlePinInvoiceModal}
        onUnpin={() => unpinModal(pinnedInvoiceClientId || activeChatId || '', 'invoice')}
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
              familyGroupId={modal.props.familyGroupId}
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
        // УБИРАЕМ дублирующие модальные окна из меню - они уже есть в основном меню
        return null;
      })}
      
      {/* Голосовой ассистент */}
      <VoiceAssistant 
        isOpen={voiceAssistantOpen}
        onToggle={() => setVoiceAssistantOpen(!voiceAssistantOpen)}
        context={{
          currentPage: 'CRM',
          activeClientId: activeChatId,
          activeClientName: activeChatId ? getActiveClientInfo(activeChatId).name : null,
          userRole: role,
          userBranch: profile?.branch,
          activeChatType
        }}
        onOpenModal={{
          addClient: () => setOpenModal('Добавить клиента'),
          addTask: () => setShowAddTaskModal(true),
          addTeacher: () => setOpenModal('Добавить преподавателя'),
          addStudent: () => setOpenModal('Добавить студента'),
          addInvoice: () => setShowInvoiceModal(true),
          clientProfile: (clientId: string) => {
            setActiveChatId(clientId);
            setActiveChatType('client');
            setRightSidebarOpen(true);
          },
          editTask: (taskId: string) => {
            setEditTaskId(taskId);
            setShowEditTaskModal(true);
          }
        }}
        onOpenChat={(clientId: string) => {
          setActiveChatId(clientId);
          setActiveChatType('client');
        }}
      />

      {/* Modal для просмотра всех задач */}
      <Dialog open={allTasksModal.open} onOpenChange={(open) => setAllTasksModal(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {allTasksModal.title}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="mt-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-3">
              {allTasksModal.tasks.map((task) => (
                <div 
                  key={task.id}
                  className={`p-3 border-l-4 rounded-md hover:shadow-md transition-shadow ${
                    task.priority === 'high' ? 'border-red-500 bg-red-50' :
                    task.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                    'border-blue-500 bg-blue-50'
                  }`}
                  onClick={() => task.client_id && handleClientClick(task.client_id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm mb-2">{task.title}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                        <span>
                          Клиент: <span className="text-primary font-medium">
                            {task.clients?.name || 'Неизвестен'}
                          </span>
                        </span>
                        {task.due_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {task.due_time.slice(0, 5)}
                          </span>
                        )}
                        <Badge variant={
                          task.priority === 'high' ? 'destructive' : 
                          task.priority === 'medium' ? 'default' : 'secondary'
                        }>
                          {task.priority === 'high' ? 'Высокий' : 
                           task.priority === 'medium' ? 'Средний' : 'Низкий'}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTaskId(task.id);
                        }}
                        title="Редактировать"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCompleteTask(task.id);
                          // Remove completed task from modal
                          setAllTasksModal(prev => ({
                            ...prev,
                            tasks: prev.tasks.filter(t => t.id !== task.id)
                          }));
                        }}
                        title="Отметить выполненной"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelTask(task.id);
                          // Remove cancelled task from modal
                          setAllTasksModal(prev => ({
                            ...prev,
                            tasks: prev.tasks.filter(t => t.id !== task.id)
                          }));
                        }}
                        title="Отменить задачу"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {allTasksModal.tasks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Нет задач для отображения</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit Task Modal */}
      {editingTaskId && (
        <EditTaskModal
          open={!!editingTaskId}
          onOpenChange={(open) => !open && setEditingTaskId(null)}
          taskId={editingTaskId}
        />
      )}
      </div>
    </TooltipProvider>
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