import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useClients, useSearchClients, useCreateClient } from "@/hooks/useClients";
import { useClientIdsByPhoneSearch } from "@/hooks/useClientIdsByPhoneSearch";
import { usePhoneSearchThreads } from "@/hooks/usePhoneSearchThreads";
import { useClientStatus } from "@/hooks/useClientStatus";
import { useRealtimeMessages, useMarkAsRead, useMarkAsUnread } from "@/hooks/useChatMessages";
import { useChatThreadsInfinite } from "@/hooks/useChatThreadsInfinite";
import { useMarkChatMessagesAsRead } from "@/hooks/useMessageReadStatus";
import { useStudentsLazy } from "@/hooks/useStudentsLazy";
import { useStudentsCount } from "@/hooks/useStudentsCount";
import { useLeadsCount } from "@/hooks/useLeadsCount";
import { useTasksLazy } from "@/hooks/useTasksLazy";
import { ChatArea } from "@/components/crm/ChatArea";
import { CorporateChatArea } from "@/components/crm/CorporateChatArea";
import { TeacherChatArea } from "@/components/crm/TeacherChatArea";
import { CommunityChatArea } from "@/components/crm/CommunityChatArea";
import { useCommunityChats } from "@/hooks/useCommunityChats";
import { SearchInput } from "@/components/crm/SearchInput";
import { SearchResults } from "@/components/crm/SearchResults";
import { LinkedContacts } from "@/components/crm/LinkedContacts";
import { FamilyCard } from "@/components/crm/FamilyCard";
import { FamilyCardWrapper } from "@/components/crm/FamilyCardWrapper";
import { ChatContextMenu } from "@/components/crm/ChatContextMenu";
import { VirtualizedChatList } from "@/components/crm/VirtualizedChatList";
import { AddClientModal } from "@/components/crm/AddClientModal";
import { ClientsList } from "@/components/crm/ClientsList";
import { NewChatModal } from "@/components/crm/NewChatModal";
import { DeleteChatDialog } from "@/components/crm/DeleteChatDialog";
import { LinkChatToClientModal } from "@/components/crm/LinkChatToClientModal";
import { PinnedModalTabs } from "@/components/crm/PinnedModalTabs";
import { WhatsAppStatusNotification } from "@/components/crm/WhatsAppStatusNotification";
import { WhatsAppSessionsModal } from "@/components/crm/WhatsAppSessionsModal";
import { AddTaskModal } from "@/components/crm/AddTaskModal";
import { EditTaskModal } from "@/components/crm/EditTaskModal";
import { TaskCalendar } from "@/components/crm/TaskCalendar";
import { CreateInvoiceModal } from "@/components/crm/CreateInvoiceModal";
import { PinnableModalHeader, PinnableDialogContent } from "@/components/crm/PinnableModal";
import { ManagerMenu } from "@/components/crm/ManagerMenu";
import { ScriptsModal } from "@/components/crm/ScriptsModal";
import { DashboardModal } from "@/components/dashboards/DashboardModal";
import { ScheduleModal } from "@/components/schedule/ScheduleModal";
import { GroupsModal } from "@/components/learning-groups/GroupsModal";
import { IndividualLessonsModal } from "@/components/individual-lessons/IndividualLessonsModal";
import { MobileBottomNavigation } from "@/components/crm/MobileBottomNavigation";
import { MobileNewChatModal } from "@/components/crm/MobileNewChatModal";
import { EducationSubmenu } from "@/components/learning-groups/EducationSubmenu";
import { usePinnedModalsDB, PinnedModal } from "@/hooks/usePinnedModalsDB";
import { useChatStatesDB } from "@/hooks/useChatStatesDB";
import useSharedChatStates from "@/hooks/useSharedChatStates";
import { useGlobalChatReadStatus } from "@/hooks/useGlobalChatReadStatus";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAllTasks, useCompleteTask, useCancelTask, useUpdateTask } from "@/hooks/useTasks";
import { useRealtimeClients } from "@/hooks/useRealtimeClients";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrganizationRealtimeMessages } from "@/hooks/useOrganizationRealtimeMessages";
import { useManagerBranches } from "@/hooks/useManagerBranches";
import crmLogo from "@/assets/crm-logo.png";
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
  MessageSquare,
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
  UserPlus,
  Filter,
  Plus,
  Upload,
  ListChecks,
  FolderOpen,
  Shield,
  Palette,
  CreditCard,
  MapPin,
  Bot,
  HardDrive
} from "lucide-react";
import { useTypingPresence } from "@/hooks/useTypingPresence";
import { useSystemChatMessages } from '@/hooks/useSystemChatMessages';
import VoiceAssistant from '@/components/VoiceAssistant';
import { TeacherMessagesPanel } from "@/components/crm/TeacherMessagesPanel";
import { UserPermissionsManager } from "@/components/admin/UserPermissionsManager";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

// Lazy load тяжелых компонентов модальных окон для быстрого открытия
const LeadsModalContent = lazy(() => import("@/components/leads/LeadsModalContent").then(m => ({ default: m.LeadsModalContent })));
const StudentsModal = lazy(() => import("@/components/crm/StudentsModal").then(m => ({ default: m.StudentsModal })));
const StudentsLeadsModal = lazy(() => import("@/components/students/StudentsLeadsModal").then(m => ({ default: m.StudentsLeadsModal })));
const ImportStudentsModal = lazy(() => import("@/components/students/ImportStudentsModal").then(m => ({ default: m.ImportStudentsModal })));
const EnhancedStudentCard = lazy(() => import("@/components/students/EnhancedStudentCard").then(m => ({ default: m.EnhancedStudentCard })));
const NewFinancesSection = lazy(() => import("@/components/finances/NewFinancesSection").then(m => ({ default: m.NewFinancesSection })));
const AIHub = lazy(() => import("@/components/ai-hub/AIHub").then(m => ({ default: m.AIHub })));
const ScheduleSection = lazy(() => import("@/components/crm/sections/ScheduleSection"));
const DocumentsSection = lazy(() => import("@/components/documents/DocumentsSection").then(m => ({ default: m.DocumentsSection })));
const AnalyticsSection = lazy(() => import("@/components/analytics/AnalyticsSection").then(m => ({ default: m.AnalyticsSection })));
const CommunicationsSection = lazy(() => import("@/components/communications/CommunicationsSection").then(m => ({ default: m.CommunicationsSection })));
const Sheets = lazy(() => import("./Sheets"));

import { OrganizationSettings } from "@/components/settings/OrganizationSettings";
import { BranchesSettings } from "@/components/settings/BranchesSettings";
import { BrandingSettings } from "@/components/settings/BrandingSettings";
import { SubscriptionSettings } from "@/components/settings/SubscriptionSettings";
import { WppTestPanel } from "@/components/crm/WppTestPanel";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useCRMModals, useCRMState, useCRMTasks, useCRMSearch } from "@/pages/crm/hooks";

const CRMContent = () => {
  const { user, profile, role, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Single organization-wide realtime subscription for all chat messages
  // This replaces per-chat subscriptions, reducing WebSocket connections from N to 1
  useOrganizationRealtimeMessages();
  
  // Custom hooks for state management
  const modals = useCRMModals();
  const crmState = useCRMState();
  const tasks = useCRMTasks();
  const search = useCRMSearch();
  
  // Destructure all states for use in component
  const {
    openModal,
    setOpenModal,
    showAddTaskModal,
    setShowAddTaskModal,
    showEditTaskModal,
    setShowEditTaskModal,
    editTaskId,
    setEditTaskId,
    showInvoiceModal,
    setShowInvoiceModal,
    showGroupsModal,
    setShowGroupsModal,
    showIndividualLessonsModal,
    setShowIndividualLessonsModal,
    showEducationSubmenu,
    setShowEducationSubmenu,
    showNewChatModal,
    setShowNewChatModal,
    showScriptsModal,
    setShowScriptsModal,
    showDashboardModal,
    setShowDashboardModal,
    showScheduleModal,
    setShowScheduleModal,
    showAddClientModal,
    setShowAddClientModal,
    showAddTeacherModal,
    setShowAddTeacherModal,
    showAddStudentModal,
    setShowAddStudentModal,
    isManualModalOpen,
    setIsManualModalOpen,
    showWhatsAppSessionsModal,
    setShowWhatsAppSessionsModal,
  } = modals;

  const {
    activeTab,
    setActiveTab,
    activePhoneId,
    setActivePhoneId,
    activeChatId,
    setActiveChatId,
    activeChatType,
    setActiveChatType,
    selectedTeacherId,
    setSelectedTeacherId,
    isPinnedSectionOpen,
    setIsPinnedSectionOpen,
    showOnlyUnread,
    setShowOnlyUnread,
    showArchived,
    setShowArchived,
    activeClientInfo,
    setActiveClientInfo,
    activeClientName,
    setActiveClientName,
    pinnedTaskClientId,
    setPinnedTaskClientId,
    pinnedInvoiceClientId,
    setPinnedInvoiceClientId,
    adminActiveSection,
    setAdminActiveSection,
    leftSidebarOpen,
    setLeftSidebarOpen,
    rightSidebarOpen,
    setRightSidebarOpen,
    rightPanelCollapsed,
    setRightPanelCollapsed,
    voiceAssistantOpen,
    setVoiceAssistantOpen,
  } = crmState;

  const {
    draggedTask,
    setDraggedTask,
    dragOverColumn,
    setDragOverColumn,
    personalTasksTab,
    setPersonalTasksTab,
    clientTasksTab,
    setClientTasksTab,
    showClientTasks,
    setShowClientTasks,
    showPersonalTasks,
    setShowPersonalTasks,
    allTasksModal,
    setAllTasksModal,
    editingTaskId,
    setEditingTaskId,
    tasksView,
    setTasksView,
  } = tasks;

  const {
    hasUnsavedChat,
    setHasUnsavedChat,
    searchQuery,
    setSearchQuery,
    chatSearchQuery,
    setChatSearchQuery,
    showSearchResults,
    setShowSearchResults,
    globalSearchResults,
    setGlobalSearchResults,
    showFilters,
    setShowFilters,
    selectedBranch,
    setSelectedBranch,
    selectedClientType,
    setSelectedClientType,
    bulkSelectMode,
    setBulkSelectMode,
    selectedChatIds,
    setSelectedChatIds,
  } = search;

  // State for delete and link modals
  const [deleteChatDialog, setDeleteChatDialog] = useState<{ open: boolean; chatId: string; chatName: string }>({ open: false, chatId: '', chatName: '' });
  const [linkChatModal, setLinkChatModal] = useState<{ open: boolean; chatId: string; chatName: string }>({ open: false, chatId: '', chatName: '' });
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  
  // Критичные данные - загружаем ТОЛЬКО threads с infinite scroll (50 за раз)
  // useClients убран из критического пути - 27К клиентов тормозили загрузку
  const { 
    data: threads = [], 
    isLoading: threadsLoading, 
    hasNextPage, 
    isFetchingNextPage, 
    loadMore 
  } = useChatThreadsInfinite();
  const { corporateChats, teacherChats, isLoading: systemChatsLoading } = useSystemChatMessages();
  const { communityChats, totalUnread: communityUnread, latestCommunity, isLoading: communityLoading } = useCommunityChats();
  
  // Клиенты загружаются лениво - только при необходимости (поиск, модалы)
  const clientsNeeded = modals.openModal === "Ученики" || modals.openModal === "Лиды" || chatSearchQuery.length > 0;
  const { clients, isLoading: clientsLoading } = useClients(clientsNeeded);
  
  // Данные для модальных окон - загружаем только при открытии
  const studentsEnabled = modals.openModal === "Ученики" || modals.openModal === "Лиды";
  const tasksEnabled = modals.openModal === "Мои задачи";
  
  const { students, isLoading: studentsLoading } = useStudentsLazy(studentsEnabled);
  const { count: totalStudentsCount } = useStudentsCount();
  const { count: totalLeadsCount } = useLeadsCount();
  const { tasks: allTasks, isLoading: tasksLoading } = useTasksLazy(tasksEnabled);
  
  // Другие хуки
  const { 
    searchResults: clientSearchResults, 
    isSearching, 
    searchClients,
    clearSearch 
  } = useSearchClients();
  const createClient = useCreateClient();
  const markAsReadMutation = useMarkAsRead();
  const markAsUnreadMutation = useMarkAsUnread();
  const markChatMessagesAsReadMutation = useMarkChatMessagesAsRead();
  const { 
    pinnedModals, 
    loading: pinnedLoading,
    pinModal, 
    unpinModal, 
    openPinnedModal, 
    closePinnedModal, 
    isPinned 
  } = usePinnedModalsDB();

  // visibleChatIds теперь берем из threads (не из clients) - объявляем ДО useChatStatesDB
  const visibleChatIds = useMemo(() => {
    const ids = new Set<string>();
    (threads || []).forEach((t: any) => t?.client_id && ids.add(t.client_id));
    (corporateChats || []).forEach((c: any) => c?.id && ids.add(c.id));
    (teacherChats || []).forEach((c: any) => c?.id && ids.add(c.id));
    return Array.from(ids);
  }, [threads, corporateChats, teacherChats]);

  const { 
    chatStates, 
    loading: chatStatesLoading,
    togglePin,
    toggleArchive,
    markAsRead,
    markAsUnread,
    getChatState
  } = useChatStatesDB(visibleChatIds);

  const { isInWorkByOthers, isPinnedByCurrentUser, isPinnedByAnyone, getPinnedByUserName, isLoading: sharedStatesLoading } = useSharedChatStates(visibleChatIds);
  const { markChatAsReadGlobally, isChatReadGlobally } = useGlobalChatReadStatus();
  const completeTask = useCompleteTask();
  const cancelTask = useCancelTask();
  const updateTask = useUpdateTask();
  const { organization, branches } = useOrganization();
  const { canAccessBranch, hasRestrictions: hasManagerBranchRestrictions } = useManagerBranches();
  const isMobile = useIsMobile();
  
  // Auto-manage right panel state based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1200) {
        setRightPanelCollapsed(false); // Открыта на больших экранах
      } else {
        setRightPanelCollapsed(true); // Закрыта на малых экранах
      }
    };
    
    // Initial check
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const { typingByClient } = useTypingPresence();
  
  // Enable real-time updates for clients data
  useRealtimeClients();
  
  // Enable real-time updates for the active chat
  useRealtimeMessages(activeChatId);

  // Real-time refresh for chat threads with smart debouncing
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null;
    let pendingRefetch = false;
    let eventCount = 0;

    const debouncedRefetch = (payload?: any) => {
      pendingRefetch = true;
      eventCount++;
      
      console.log('📩 [CRM] Real-time event received:', { 
        eventCount, 
        clientId: payload?.new?.client_id,
        messageType: payload?.new?.message_type 
      });
      
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      // Wait 500ms after the last event before refetching (faster response)
      debounceTimer = setTimeout(() => {
        if (pendingRefetch) {
          console.log(`🔄 [CRM] Debounced chat-threads refetch (${eventCount} events batched)`);
          queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
          // Also refresh clients list in case a new client was created via webhook
          queryClient.invalidateQueries({ queryKey: ['clients'] });
          pendingRefetch = false;
          eventCount = 0;
        }
        debounceTimer = null;
      }, 500);
    };

    const channel = supabase
      .channel('chat-threads-realtime')
      // Listen to INSERT events for new messages
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, debouncedRefetch)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_logs' }, debouncedRefetch)
      // Also listen for new clients (created via webhook)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clients' }, debouncedRefetch)
      .subscribe((status) => {
        console.log('📡 [CRM] Real-time subscription status:', status);
      });
      
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      supabase.removeChannel(channel);
    };
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

  // Получаем активных студентов по занятиям (для расчета лидов) - загружаем отложенно
  const { data: activeGroupStudents = [], isLoading: groupStudentsLoading } = useQuery({
    queryKey: ['active-group-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_students')
        .select('student_id')
        .eq('status', 'active');
      if (error) throw error;
      return (data || []).map((gs: any) => gs.student_id as string);
    },
    enabled: openModal === "Лиды", // Загружаем только когда открыт модал "Лиды"
  });
  const { data: activeIndividualLessons = [], isLoading: individualLessonsLoading } = useQuery({
    queryKey: ['active-individual-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('individual_lessons')
        .select('student_id')
        .eq('is_active', true)
        .eq('status', 'active');
      if (error) throw error;
      return (data || []).map((il: any) => il.student_id as string);
    },
    enabled: openModal === "Лиды", // Загружаем только когда открыт модал "Лиды"
  });
  const activeStudentIds = useMemo(() => new Set<string>([...activeGroupStudents, ...activeIndividualLessons]), [activeGroupStudents, activeIndividualLessons]);

  // Menu counters - вычисляем только после загрузки всех данных
  const tasksCount = allTasks?.length ?? 0;
  const unreadTotal = (threads || []).reduce((sum, t) => sum + (t.unread_count || 0), 0);
  const leadsCount = totalLeadsCount;
  const studentsCount = totalStudentsCount ?? (students?.length ?? 0);
  
  // Детальная диагностика счётчиков
  useEffect(() => {
    console.log('[CRM Counters] Подробная информация:', { 
      tasksCount, 
      unreadTotal, 
      leadsCount, 
      studentsCount,
      totalStudentsCount,
      studentsLoading,
      studentsArrayLength: students?.length,
      activeGroupStudentsCount: activeGroupStudents.length,
      activeIndividualLessonsCount: activeIndividualLessons.length,
      activeStudentIdsSize: activeStudentIds.size,
      firstStudents: students?.slice(0, 3).map(s => ({ id: s.id, name: s.name, status: s.status })),
      lastStudents: students?.slice(-3).map(s => ({ id: s.id, name: s.name, status: s.status }))
    });
  }, [students, tasksCount, unreadTotal, leadsCount, studentsCount, totalStudentsCount, studentsLoading, activeGroupStudents, activeIndividualLessons, activeStudentIds]);
  const getMenuCount = (label: string) => {
    if (label === "Мои задачи") return tasksCount;
    if (label === "Заявки") return unreadTotal;
    if (label === "Лиды") return leadsCount;
    if (label === "Ученики") return studentsCount;
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
      handleChatClick(clientId, 'client');
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
    // Special handling for WhatsApp sessions
    if (action === "WhatsApp") {
      setShowWhatsAppSessionsModal(true);
      return;
    }
    
    // Special handling for education modules
    if (action === "Обучение") {
      setShowEducationSubmenu(true);
      return;
    }
    
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
    {
      id: 'communities',
      name: 'Сообщества',
      phone: 'Группы мессенджеров',
      lastMessage: latestCommunity?.lastMessage || 'Нет сообщений',
      time: latestCommunity?.lastMessageTime ? formatTime(latestCommunity.lastMessageTime) : '',
      unread: communityUnread,
      type: 'communities' as const,
      timestamp: latestCommunity?.lastMessageTime ? new Date(latestCommunity.lastMessageTime).getTime() : 0,
      avatar_url: null,
    },
  ];
  const threadClientIdsSet = useMemo(() => new Set((threads || []).map(t => t.client_id)), [threads]);

  // Функция для очистки имени от префикса "Клиент"
  const cleanClientName = (name: string) => {
    if (name.startsWith('Клиент ')) {
      return name.replace('Клиент ', '');
    }
    return name;
  };

  // Клиенты без тредов НЕ показываются при первой загрузке для скорости
  // Они появятся только при поиске или открытии модалов
  const clientChatsWithoutThreads: any[] = [];

  const allChats = [
    ...systemChats,
    // Только реальные клиентские чаты из threads (без загрузки всех clients)
    ...threads
      .filter(thread => {
        const nameForCheck = cleanClientName(thread.client_name ?? '');
        return (
          !nameForCheck.includes('Корпоративный чат') &&
          !nameForCheck.includes('Чат педагогов') &&
          !nameForCheck.includes('Преподаватель:') &&
          !nameForCheck.includes('Кастомный чат')
        );
      })
      .map(thread => {
        const typing = typingByClient[thread.client_id];
        const lastMsgDisplay = typing && typing.count > 0
          ? `${typing.names[0] || 'Менеджер'} печатает...`
          : (thread.last_message?.trim?.() || 'Нет сообщений');
          
        // Используем аватары из threads (теперь RPC их возвращает)
        let displayAvatar: string | null = null;
        if (thread.last_unread_messenger === 'telegram' && thread.telegram_avatar_url) {
          displayAvatar = thread.telegram_avatar_url;
        } else if (thread.last_unread_messenger === 'whatsapp' && thread.whatsapp_avatar_url) {
          displayAvatar = thread.whatsapp_avatar_url;
        } else if (thread.last_unread_messenger === 'max' && thread.max_avatar_url) {
          displayAvatar = thread.max_avatar_url;
        } else {
          displayAvatar = thread.telegram_avatar_url || thread.whatsapp_avatar_url || thread.max_avatar_url || thread.avatar_url || null;
        }
          
        return {
          id: thread.client_id,
          name: cleanClientName(thread.client_name ?? 'Без имени'),
          phone: thread.client_phone,
          branch: thread.client_branch,
          lastMessage: lastMsgDisplay,
          time: formatTime(thread.last_message_time),
          unread: thread.unread_count,
          type: 'client' as const,
          timestamp: new Date(thread.last_message_time).getTime(),
          avatar_url: displayAvatar,
          last_unread_messenger: thread.last_unread_messenger
        };
      }),
    // Клиенты без сообщений не показываются при первой загрузке
    ...clientChatsWithoutThreads
  ];

  console.log('[CRM] allChats constructed:', {
    total: allChats.length,
    systemChats: systemChats.length,
    threadChats: threads.length,
    clientsWithoutThreads: clientChatsWithoutThreads.length,
    sample: allChats.slice(0, 5).map(c => ({ id: c.id, name: c.name, type: c.type }))
  });

  const { data: phoneSearchClientIds = [], isLoading: phoneSearchLoading } = useClientIdsByPhoneSearch(chatSearchQuery);
  const phoneSearchClientIdsSet = useMemo(() => new Set(phoneSearchClientIds), [phoneSearchClientIds]);
  
  // Debug logging for phone search
  console.log('[CRM] Phone search state:', { 
    query: chatSearchQuery, 
    clientIdsFound: phoneSearchClientIds.length,
    isLoading: phoneSearchLoading,
    ids: phoneSearchClientIds.slice(0, 5)
  });
  
  // Load full thread data for phone search results that are not in loaded threads
  const { data: phoneSearchThreads = [], isLoading: phoneThreadsLoading } = usePhoneSearchThreads(phoneSearchClientIds, threadClientIdsSet);
  
  console.log('[CRM] Phone search threads:', {
    threadsLoaded: phoneSearchThreads.length,
    isLoading: phoneThreadsLoading
  });
  
  // Merge phone search threads into allChats
  const allChatsWithPhoneSearch = useMemo(() => {
    if (phoneSearchThreads.length === 0) return allChats;
    
    const existingIds = new Set(allChats.map(c => c.id));
    const newChats = phoneSearchThreads
      .filter(thread => !existingIds.has(thread.client_id))
      .map(thread => {
        let displayAvatar: string | null = null;
        if (thread.last_unread_messenger === 'telegram' && thread.telegram_avatar_url) {
          displayAvatar = thread.telegram_avatar_url;
        } else if (thread.last_unread_messenger === 'whatsapp' && thread.whatsapp_avatar_url) {
          displayAvatar = thread.whatsapp_avatar_url;
        } else if (thread.last_unread_messenger === 'max' && thread.max_avatar_url) {
          displayAvatar = thread.max_avatar_url;
        } else {
          displayAvatar = thread.telegram_avatar_url || thread.whatsapp_avatar_url || thread.max_avatar_url || thread.avatar_url || null;
        }
        
        return {
          id: thread.client_id,
          name: thread.client_name?.startsWith('Клиент ') 
            ? thread.client_name.replace('Клиент ', '') 
            : (thread.client_name || 'Без имени'),
          phone: thread.client_phone,
          branch: thread.client_branch,
          lastMessage: thread.last_message?.trim?.() || 'Нет сообщений',
          time: formatTime(thread.last_message_time),
          unread: thread.unread_count,
          type: 'client' as const,
          timestamp: thread.last_message_time ? new Date(thread.last_message_time).getTime() : 0,
          avatar_url: displayAvatar,
          last_unread_messenger: thread.last_unread_messenger
        };
      });
    
    console.log('[CRM] Adding phone search threads:', newChats.length);
    return [...allChats, ...newChats];
  }, [allChats, phoneSearchThreads]);

  // Helper to normalize phone for comparison
  const normalizePhoneForSearch = (phone: string | null | undefined) => 
    (phone || '').replace(/[\s\+\-\(\)]/g, '');
  const normalizedSearchQuery = normalizePhoneForSearch(chatSearchQuery);
  const isPhoneSearch = /^\d{5,}$/.test(normalizedSearchQuery);

  const filteredChats = allChatsWithPhoneSearch
  .filter(chat => 
    chatSearchQuery.length === 0 || 
    (chat.name?.toLowerCase?.().includes(chatSearchQuery.toLowerCase()) ?? false) ||
    (isPhoneSearch && normalizePhoneForSearch(chat.phone).includes(normalizedSearchQuery)) ||
    (chat.type === 'client' && phoneSearchClientIdsSet.has(chat.id))
  )
    .filter(chat => !getChatState(chat.id).isArchived) // Скрываем архивированные чаты
    .filter(chat => {
      // Skip filtering for corporate, teacher and community chats as they don't have client_id
      if (chat.type === "corporate" || chat.type === "teachers" || chat.type === "communities") return true;
      
      // Filter by client type using getClientStatus
      if (selectedClientType !== "all" && 'client_id' in chat && typeof chat.client_id === 'string') {
        const status = getClientStatus(chat.client_id);
        if (!status) return false;
        
        if (selectedClientType === "lead" && !status.isLead) return false;
        if (selectedClientType === "student" && status.isLead) return false;
      }
      
      return true;
    })
    // Фильтр по филиалу клиента (из UI dropdown) - теперь используем branch из chat
    .filter(chat => {
      if (selectedBranch === "all") return true;
      if (chat.type === "corporate" || chat.type === "teachers" || chat.type === "communities") return true;
      
      // Используем branch напрямую из chat (теперь приходит из threads RPC)
      const clientBranch = (chat as any).branch;
      if (!clientBranch) return true; // Если у клиента нет филиала - показываем
      
      // Нормализуем для сравнения: "OKEY ENGLISH Котельники" -> "котельники"
      const normalizedClientBranch = clientBranch
        .toLowerCase()
        .replace(/okey\s*english\s*/gi, '')
        .replace(/o'key\s*english\s*/gi, '')
        .trim();
      
      return normalizedClientBranch === selectedBranch.toLowerCase();
    })
    // Авто-фильтр для менеджеров с ограничениями по филиалу
    .filter(chat => {
      if (chat.type === "corporate" || chat.type === "teachers") return true;
      
      // Используем branch напрямую из chat
      const clientBranch = (chat as any).branch;
      
      return canAccessBranch(clientBranch);
    })
    .sort((a, b) => {
      // Сначала закрепленные чаты (только текущим пользователем)
      const aPinned = getChatState(a.id).isPinned;
      const bPinned = getChatState(b.id).isPinned;
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      
      // В рамках закрепленных/не закрепленных: сначала непрочитанные
      const aChatState = getChatState(a.id);
      const bChatState = getChatState(b.id);
      // Сначала непрочитанные (по сообщениям / ручной отметке)
      const aUnread = a.unread > 0;
      const bUnread = b.unread > 0;
      
      if (aUnread && !bUnread) return -1;
      if (!aUnread && bUnread) return 1;

      // Внутри каждой группы сортируем по времени (новые сверху)
      return (b.timestamp || 0) - (a.timestamp || 0);
    });

  console.log('[CRM] filteredChats after filters:', {
    count: filteredChats.length,
    searchQuery: chatSearchQuery,
    sample: filteredChats.slice(0, 5).map(c => ({ id: c.id, name: c.name, lastMessage: c.lastMessage?.substring(0, 20) }))
  });

  // Use client status hook for lead detection - memoize to prevent unnecessary re-renders
  const clientIds = useMemo(() => 
    filteredChats
      .filter(chat => chat.type === 'client')
      .map(chat => chat.id),
    [filteredChats]
  );
  
  const { getClientStatus, isLoading: statusLoading } = useClientStatus(clientIds);

  // Мемоизация списков чатов для виртуализации
  const pinnedChats = useMemo(() => 
    filteredChats.filter(chat => getChatState(chat.id).isPinned),
    [filteredChats, getChatState]
  );

  const activeChats = useMemo(() => 
    filteredChats
      .filter(chat => !getChatState(chat.id).isPinned)
      .filter(chat => {
        if (!showOnlyUnread) return true;
        const chatState = getChatState(chat.id);
        const showEye = !!chatState?.isUnread;
        const unreadByMessages = chat.unread > 0;
        return showEye || unreadByMessages;
      }),
    [filteredChats, getChatState, showOnlyUnread]
  );

  // Архивные чаты - отдельный список
  const archivedChats = useMemo(() => 
    allChats
      .filter(chat => 
        chatSearchQuery.length === 0 || 
        (chat.name?.toLowerCase?.().includes(chatSearchQuery.toLowerCase()) ?? false) ||
        (chat.phone?.includes(chatSearchQuery) ?? false)
      )
      .filter(chat => getChatState(chat.id).isArchived)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
    [allChats, chatSearchQuery, getChatState]
  );

  const archivedChatsCount = archivedChats.length;

  // Мемоизированный обработчик для bulk select
  const handleBulkSelectToggle = useCallback((chatId: string) => {
    const newSelected = new Set(selectedChatIds);
    if (newSelected.has(chatId)) {
      newSelected.delete(chatId);
    } else {
      newSelected.add(chatId);
    }
    setSelectedChatIds(newSelected);
  }, [selectedChatIds]);

  // Обработчики для чатов
  const handleChatClick = useCallback(async (chatId: string, chatType: 'client' | 'corporate' | 'teachers') => {
    console.log('Переключение на чат:', { chatId, chatType });
    
    // Только переключаемся на новый чат, если это действительно другой чат
    const isNewChat = activeChatId !== chatId || activeChatType !== chatType;
    setActiveChatId(chatId);
    setActiveChatType(chatType);
    
    // Загружаем информацию о клиенте, если её нет в кэше
    if (chatType === 'client' && isNewChat) {
      const existingClient = clients.find(c => c.id === chatId);
      const existingThread = threads.find(t => t.client_id === chatId);
      
      // Helper to get phone: try client.phone first, then fetch from client_phone_numbers
      const getClientPhone = async (clientId: string, clientPhone?: string | null): Promise<string> => {
        if (clientPhone) return clientPhone;
        // First try to get primary phone
        const { data: primaryPhone } = await supabase
          .from('client_phone_numbers')
          .select('phone')
          .eq('client_id', clientId)
          .eq('is_primary', true)
          .maybeSingle();
        if (primaryPhone?.phone) return primaryPhone.phone;
        
        // Fallback: get any phone number for this client
        const { data: anyPhone } = await supabase
          .from('client_phone_numbers')
          .select('phone')
          .eq('client_id', clientId)
          .limit(1)
          .maybeSingle();
        return anyPhone?.phone || '';
      };
      
      if (existingClient) {
        const phone = await getClientPhone(chatId, existingClient.phone);
        setActiveClientInfo({
          name: existingClient.name,
          phone: phone,
          comment: existingClient.notes || 'Клиент'
        });
      } else if (existingThread) {
        const phone = existingThread.client_phone || await getClientPhone(chatId, null);
        setActiveClientInfo({
          name: existingThread.client_name,
          phone: phone,
          comment: 'Клиент'
        });
      } else {
        // Загружаем из базы данных
        try {
          const { data: clientData, error } = await supabase
            .from('clients')
            .select('name, phone, notes')
            .eq('id', chatId)
            .maybeSingle();
          
          if (!error && clientData) {
            // Use the helper function that includes fallback logic
            const phone = await getClientPhone(chatId, clientData.phone);
            setActiveClientInfo({
              name: clientData.name,
              phone: phone,
              comment: clientData.notes || 'Клиент'
            });
          } else {
            setActiveClientInfo(null);
          }
        } catch (err) {
          console.error('Error loading client info:', err);
          setActiveClientInfo(null);
        }
      }
    } else if (chatType !== 'client') {
      setActiveClientInfo(null);
    }
    
    // Помечаем как прочитанное только при переключении на НОВЫЙ чат
    if (isNewChat) {
      // Сначала помечаем чат как прочитанный глобально для всех пользователей
      await markChatAsReadGlobally(chatId);
      
      if (chatType === 'client') {
        // НЕ помечаем все сообщения как прочитанные здесь!
        // ChatArea сам пометит сообщения при переключении вкладки
        
        // Помечаем сообщения как прочитанные в базе данных (старая система)
        // markAsReadMutation.mutate(chatId);
        // Помечаем чат как прочитанный в персональном состоянии (для закрепленных и пр.)
        markAsRead(chatId);
      } else if (chatType === 'corporate') {
        // Папка корпоративных чатов — не отмечаем прочитанным на этом уровне
      } else if (chatType === 'teachers') {
        // Для преподавательских чатов
        teacherChats.forEach(async (chat: any) => {
          if (chat.id) {
            await markChatAsReadGlobally(chat.id);
            markChatMessagesAsReadMutation.mutate(chat.id);
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
    
    if (isMobile) {
      setLeftSidebarOpen(false);
    }
  }, [activeChatId, activeChatType, markChatAsReadGlobally, markChatMessagesAsReadMutation, markAsReadMutation, markAsRead, teacherChats, clients, threads, isMobile]);

  const handleChatAction = useCallback((chatId: string, action: 'unread' | 'pin' | 'archive' | 'block') => {
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
  }, [markAsUnread, markAsUnreadMutation, togglePin, toggleArchive]);

  // Delete chat handler
  const handleDeleteChat = useCallback(async (chatId: string, chatName: string) => {
    setDeleteChatDialog({ open: true, chatId, chatName });
  }, []);

  const confirmDeleteChat = useCallback(async () => {
    if (!deleteChatDialog.chatId) return;
    setIsDeletingChat(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_active: false })
        .eq('id', deleteChatDialog.chatId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      if (activeChatId === deleteChatDialog.chatId) {
        setActiveChatId(null);
      }
      setDeleteChatDialog({ open: false, chatId: '', chatName: '' });
    } catch (error) {
      console.error('Error deleting chat:', error);
    } finally {
      setIsDeletingChat(false);
    }
  }, [deleteChatDialog.chatId, activeChatId, queryClient, setActiveChatId]);

  // Link chat handler
  const handleLinkChat = useCallback((chatId: string, chatName: string) => {
    setLinkChatModal({ open: true, chatId, chatName });
  }, []);

  const handleLinkChatSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    if (activeChatId === linkChatModal.chatId) {
      setActiveChatId(null);
    }
  }, [queryClient, activeChatId, linkChatModal.chatId, setActiveChatId]);

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
    
    // Если запрашиваем активный чат и есть закэшированная информация (с уже загруженным телефоном из client_phone_numbers)
    if (targetClientId === activeChatId && activeClientInfo) {
      return activeClientInfo;
    }
    
    const targetClient = clients.find(client => client.id === targetClientId);
    const targetThread = threads.find(thread => thread.client_id === targetClientId);
    
    if (targetClient) {
      // For clients, we need to check if phone exists in the main field
      // If not, the actual phone will be loaded via handleChatClick and cached in activeClientInfo
      // For now, return what we have - the phone from main table or empty string
      return {
        name: targetClient.name,
        phone: targetClient.phone || '',
        comment: targetClient.notes || 'Клиент'
      };
    }
    if (targetThread) {
      return {
        name: targetThread.client_name,
        phone: targetThread.client_phone || '',
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

  // Обработчики для мобильной навигации
  const handleMobileCorporateClick = () => {
    setActiveChatType('corporate');
    setActiveChatId(null);
    if (isMobile) {
      setLeftSidebarOpen(false);
      setRightSidebarOpen(false);
    }
  };

  const handleMobileTeachersClick = () => {
    setActiveChatType('teachers');
    setActiveChatId(null);
    if (isMobile) {
      setLeftSidebarOpen(false);
      setRightSidebarOpen(false);
    }
  };

  const handleMobileNewChatClick = () => {
    setShowNewChatModal(true);
  };

  const handleMobileAssistantClick = () => {
    setVoiceAssistantOpen(true);
  };

  const handleMobileScheduleClick = () => {
    setShowScheduleModal(true);
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
    } else if (type === 'student') {
      // Открываем закрепленное модальное окно студента
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

  // Обработчик клика по чату из раздела "Чаты" - открывает чат
  const handleChatItemClick = (clientId: string) => {
    handleMenuModalClose(); // Закрываем модальное окно чатов
    setActiveTab('chats'); // Переключаемся на вкладку чатов
    handleChatClick(clientId, 'client'); // Открываем чат с клиентом
  };

  // Check if user is admin or methodist
  const isAdmin = role === 'admin' || roles?.includes?.('admin');
  const isMethodist = role === 'methodist' || roles?.includes?.('methodist');
  const canAccessAdmin = isAdmin || isMethodist;

  const menuItems = [
    { icon: CheckSquare, label: "Мои задачи" },
    { icon: FileText, label: "Заявки" },
    { icon: User, label: "Лиды" },
    { icon: Users, label: "Ученики" },
    { icon: Building, label: "Компания" },
    { icon: GraduationCap, label: "Обучение" },
    { icon: Monitor, label: "Занятия онлайн" },
    // Убираем "Расписание" из меню, так как оно есть в нижней навигации на мобильной версии
    ...(!isMobile ? [{ icon: Calendar, label: "Расписание" }] : []),
    { icon: FolderOpen, label: "Документы" },
    { icon: HardDrive, label: "Диск" },
    { icon: DollarSign, label: "Финансы" },
    { icon: BarChart3, label: "Отчёты" },
    { icon: MessageCircle, label: "Уведомления" },
    { icon: MessageSquare, label: "WhatsApp" },
    { icon: Settings, label: "Настройки" },
    ...(canAccessAdmin ? [{ icon: Shield, label: "Админ-панель" }] : []),
  ];


  // Calculate total unread messages from message-level read flags
  const totalUnreadCount = filteredChats.reduce((total, chat) => {
    return total + (chat.unread || 0);
  }, 0);

  return (
    <TooltipProvider>
      <div className={cn(
        "crm-container h-screen flex flex-col overflow-hidden",
        isMobile && "pb-16" // Добавляем отступ снизу для мобильной навигации
      )}>
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
            {/* Скрипты и аватарка менеджера на мобильной версии - убираем скрипты */}
            <div className="flex items-center px-4 h-14 border-l bg-background gap-2">
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
        <div className="bg-background border-b shrink-0">
          <div className="flex items-center justify-between w-full mx-auto px-4 h-14">
            <div className="flex items-center gap-3 flex-1">
              <img src={crmLogo} alt="CRM Logo" className="h-8 w-8 flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold truncate">
                  {organization?.name || "O'KEY ENGLISH"} CRM
                </h1>
              </div>
              
              {pinnedModals && pinnedModals.length > 0 && (
                <div className="ml-4 flex items-center">
                  <PinnedModalTabs 
                    pinnedModals={pinnedModals}
                    onOpenModal={handleOpenPinnedModal}
                    onUnpinModal={unpinModal}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 h-14">
              {(threadsLoading || pinnedLoading || chatStatesLoading || systemChatsLoading) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                  <span className="hidden sm:inline">Загрузка данных...</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDashboardModal(true)}
                className="flex items-center gap-2 px-3 h-10"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm">Дашборд</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowScriptsModal(true)}
                className="flex items-center gap-2 px-3 h-10"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm">Скрипты</span>
              </Button>
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
        } w-80 lg:w-96 bg-background border-r flex-col h-full min-h-0 transition-all duration-300`}>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full min-h-0">
            <TabsList className="grid w-full grid-cols-2 m-2 shrink-0">
              <TabsTrigger value="menu" className="rounded-xl ml-2">Меню</TabsTrigger>
              <TabsTrigger value="chats" className="relative flex items-center justify-center pr-12 mr-2 rounded-xl">
                <span>Чаты</span>
                <div className="absolute right-3">
                  <NewChatModal 
                    onCreateChat={handleCreateNewChat}
                    onExistingClientFound={handleExistingClientFound}
                  >
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-muted/30 rounded-md">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </NewChatModal>
                </div>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="menu" className="mt-0 flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col">
              <div className="p-2 space-y-1 overflow-y-auto flex-1">
                {menuItems.map((item, index) => (
                  <Dialog key={index} open={openModal === item.label} onOpenChange={(open) => !open && handleMenuModalClose()}>
                    <DialogTrigger asChild>
                      <button
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors text-left"
                        onClick={() => handleMenuClick(item.label)}
                      >
                        <item.icon className="h-4 w-4 shrink-0 text-muted-foreground stroke-1" />
                <span className="text-sm flex-1 text-foreground">
                  {item.label}
                  {getMenuCount(item.label) > 0 && (
                    <span className="text-muted-foreground"> ({getMenuCount(item.label)})</span>
                  )}
                </span>
                        <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground/30" />
                      </button>
                    </DialogTrigger>
                    <PinnableDialogContent className="w-[calc(100vw-3rem)] h-[calc(100vh-3rem)] max-w-full overflow-y-auto">
                      <PinnableModalHeader
                        title={item.label}
                        isPinned={isPinned(`menu-${item.label}`, item.label)}
                        onPin={() => handlePinMenuModal(item.label)}
                        onUnpin={() => handleUnpinMenuModal(item.label)}
                        onClose={handleMenuModalClose}
                      >
                        <item.icon className="h-5 w-5 ml-2" />
                      </PinnableModalHeader>
                      <Suspense fallback={
                        <div className="flex items-center justify-center h-64">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Загрузка...</p>
                          </div>
                        </div>
                      }>
                        <div>
                          {openModal === item.label && item.label === "Лиды" && (
                            <LeadsModalContent />
                          )}
                          {openModal === item.label && item.label === "Расписание" && (
                            <div className="h-full">
                              <ScheduleSection />
                            </div>
                          )}
                          {openModal === item.label && item.label === "Финансы" && (
                            <div className="h-full">
                              <NewFinancesSection />
                            </div>
                          )}
                          {openModal === item.label && item.label === "Отчёты" && (
                            <div className="h-full">
                              <AnalyticsSection />
                            </div>
                          )}
                          {openModal === item.label && item.label === "Уведомления" && (
                            <div className="h-full">
                              <CommunicationsSection />
                            </div>
                          )}
                          {openModal === item.label && item.label === "Документы" && (
                            <div className="h-full">
                              <DocumentsSection />
                            </div>
                          )}
                          {openModal === item.label && item.label === "Диск" && (
                            <div className="h-full">
                              <Sheets />
                            </div>
                          )}
                        {openModal === item.label && item.label === "Мои задачи" && (
                          <div className="space-y-4">
                            {/* Переключение между списком и календарем */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Button 
                                  size="sm"
                                  variant={tasksView === "list" ? "default" : "outline"}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setTasksView("list");
                                  }}
                                  className="gap-2 flex-1 sm:flex-none"
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
                                  className="gap-2 flex-1 sm:flex-none"
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
                                className="gap-1 w-full sm:w-auto"
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
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                           className={`p-3 sm:p-2.5 border-l-4 rounded-md cursor-grab hover:shadow-md transition-all ${
                                             task.priority === 'high' ? 'border-red-500 bg-red-50' :
                                             task.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                                             'border-blue-500 bg-blue-50'
                                           } ${draggedTask === task.id ? 'opacity-50 cursor-grabbing' : ''}`}
                                           onClick={() => task.client_id && handleClientClick(task.client_id)}
                                         >
                                           <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
                                             <div className="flex-1 min-w-0 w-full sm:w-auto">
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
                                             <div className="flex items-center gap-1 shrink-0 mt-2 sm:mt-0">
                                               <Button 
                                                 size="sm" 
                                                 variant="ghost" 
                                                 className="h-8 w-8 sm:h-6 sm:w-6 p-0 text-blue-600 hover:bg-blue-50"
                                                 onClick={(e) => {
                                                   e.stopPropagation();
                                                   setEditingTaskId(task.id);
                                                 }}
                                                 title="Редактировать"
                                               >
                                                 <Edit className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                                               </Button>
                                               <Button 
                                                 size="sm" 
                                                 variant="ghost" 
                                                 className="h-8 w-8 sm:h-6 sm:w-6 p-0 text-green-600 hover:bg-green-50"
                                                 onClick={(e) => {
                                                   e.stopPropagation();
                                                   handleCompleteTask(task.id);
                                                 }}
                                                 title="Отметить выполненной"
                                               >
                                                 <Check className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                                               </Button>
                                               <Button 
                                                 size="sm" 
                                                 variant="ghost" 
                                                 className="h-8 w-8 sm:h-6 sm:w-6 p-0 text-red-600 hover:bg-red-50"
                                                 onClick={(e) => {
                                                   e.stopPropagation();
                                                   handleCancelTask(task.id);
                                                 }}
                                                 title="Отменить задачу"
                                               >
                                                 <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
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
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        
                        {/* Панель сообщений преподавателей - показываем для менеджеров */}
                        {item.label === "Задачи" && (
                          <div className="mt-6">
                            <TeacherMessagesPanel />
                          </div>
                        )}
                        
                        {openModal === item.label && item.label === "Настройки" && (
                          <Tabs defaultValue="organization" className="space-y-6">
                            <TabsList className="grid w-full grid-cols-6">
                              <TabsTrigger value="organization" className="gap-2">
                                <Building2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Организация</span>
                              </TabsTrigger>
                              <TabsTrigger value="branches" className="gap-2">
                                <MapPin className="h-4 w-4" />
                                <span className="hidden sm:inline">Филиалы</span>
                              </TabsTrigger>
                              <TabsTrigger value="branding" className="gap-2">
                                <Palette className="h-4 w-4" />
                                <span className="hidden sm:inline">Брендинг</span>
                              </TabsTrigger>
                              <TabsTrigger value="subscription" className="gap-2">
                                <CreditCard className="h-4 w-4" />
                                <span className="hidden sm:inline">Подписка</span>
                              </TabsTrigger>
                              <TabsTrigger value="users" className="gap-2">
                                <Users className="h-4 w-4" />
                                <span className="hidden sm:inline">Пользователи</span>
                              </TabsTrigger>
                              <TabsTrigger value="wpp-test" className="gap-2">
                                <MessageSquare className="h-4 w-4" />
                                <span className="hidden sm:inline">WPP Тест</span>
                              </TabsTrigger>
                            </TabsList>

                            <TabsContent value="organization" className="space-y-4">
                              <OrganizationSettings />
                            </TabsContent>

                            <TabsContent value="branches" className="space-y-4">
                              <BranchesSettings />
                            </TabsContent>

                            <TabsContent value="branding" className="space-y-4">
                              <BrandingSettings />
                            </TabsContent>

                            <TabsContent value="subscription" className="space-y-4">
                              <SubscriptionSettings />
                            </TabsContent>

                            <TabsContent value="users" className="space-y-4">
                              <UserPermissionsManager />
                            </TabsContent>

                            <TabsContent value="wpp-test" className="space-y-4">
                              <WppTestPanel />
                            </TabsContent>
                          </Tabs>
                        )}
                        
                        {openModal === item.label && item.label === "Админ-панель" && canAccessAdmin && (
                          <SidebarProvider>
                            <div className="flex h-full w-full">
                              <AdminSidebar onSectionChange={setAdminActiveSection} />
                              <div className="flex-1 overflow-auto p-6">
                                <AdminDashboard activeSection={adminActiveSection} />
                              </div>
                            </div>
                          </SidebarProvider>
                        )}
                        
                        {openModal === item.label && item.label === "Ученики" && (
                          <div className="h-full overflow-hidden">
                            <StudentsModal open={true} onOpenChange={() => {}} pinnedModals={{ pinnedModals, loading: pinnedLoading, pinModal, unpinModal, openPinnedModal, closePinnedModal, isPinned }} />
                          </div>
                        )}
                        
                      </div>
                      </Suspense>
                    </PinnableDialogContent>
                  </Dialog>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="chats" className="mt-0 flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col">
              <div className="p-2 border-b space-y-2 shrink-0">
                <div className="flex gap-1">
                  <div className="flex-1">
                    <SearchInput
                      placeholder="Поиск по чатам..."
                      onSearch={handleChatSearch}
                      onClear={() => setChatSearchQuery("")}
                      size="sm"
                    />
                  </div>
                  {!bulkSelectMode && (
                    <>
                      <DropdownMenu open={showFilters} onOpenChange={setShowFilters}>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={cn("h-8 w-8 px-0 rounded-lg border border-muted text-muted-foreground hover:bg-muted hover:text-foreground", (selectedBranch !== "all" || selectedClientType !== "all") && "bg-muted text-foreground")}
                          >
                            <Filter className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Фильтры</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuLabel className="text-xs text-muted-foreground">Филиал</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setSelectedBranch("all")}>
                        <div className="flex items-center gap-2">
                          {selectedBranch === "all" && <Check className="h-3 w-3" />}
                          <span className={selectedBranch !== "all" ? "ml-5" : ""}>Все филиалы</span>
                        </div>
                      </DropdownMenuItem>
                      {branches.map((branch) => {
                        const branchKey = branch.name.toLowerCase()
                          .replace(/okey\s*english\s*/gi, '')
                          .replace(/o'key\s*english\s*/gi, '')
                          .trim();
                        return (
                          <DropdownMenuItem key={branch.id} onClick={() => setSelectedBranch(branchKey)}>
                            <div className="flex items-center gap-2">
                              {selectedBranch === branchKey && <Check className="h-3 w-3" />}
                              <span className={selectedBranch !== branchKey ? "ml-5" : ""}>{branch.name}</span>
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuLabel className="text-xs text-muted-foreground">Тип клиента</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setSelectedClientType("all")}>
                        <div className="flex items-center gap-2">
                          {selectedClientType === "all" && <Check className="h-3 w-3" />}
                          <span className={selectedClientType !== "all" ? "ml-5" : ""}>Все</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSelectedClientType("lead")}>
                        <div className="flex items-center gap-2">
                          {selectedClientType === "lead" && <Check className="h-3 w-3" />}
                          <span className={selectedClientType !== "lead" ? "ml-5" : ""}>Лид</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSelectedClientType("student")}>
                        <div className="flex items-center gap-2">
                          {selectedClientType === "student" && <Check className="h-3 w-3" />}
                          <span className={selectedClientType !== "student" ? "ml-5" : ""}>Ученик</span>
                        </div>
                      </DropdownMenuItem>
                      
                      {(selectedBranch !== "all" || selectedClientType !== "all") && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedBranch("all");
                              setSelectedClientType("all");
                            }}
                            className="text-red-600"
                          >
                            Сбросить фильтры
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg border border-muted text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => {
                      setBulkSelectMode(true);
                      setSelectedChatIds(new Set());
                    }}
                    title="Выбрать чаты"
                  >
                    <ListChecks className="h-4 w-4" />
                  </Button>
                </>
                )}
                {bulkSelectMode && (
                  <div className="flex items-center gap-1 flex-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => {
                        setBulkSelectMode(false);
                        setSelectedChatIds(new Set());
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground ml-1">
                      {selectedChatIds.size} выбрано
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 ml-2"
                      onClick={() => {
                        const allChatIds = new Set(filteredChats.map(chat => chat.id));
                        setSelectedChatIds(allChatIds);
                      }}
                      title="Выбрать все"
                    >
                      <ListChecks className="h-4 w-4 mr-1" />
                      Выбрать все
                    </Button>
                    {selectedChatIds.size > 0 && (
                      <div className="flex gap-1 ml-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => {
                            selectedChatIds.forEach(chatId => {
                              markChatAsReadGlobally(chatId);
                              markChatMessagesAsReadMutation.mutate(chatId);
                              markAsReadMutation.mutate(chatId);
                              markAsRead(chatId);
                            });
                            setBulkSelectMode(false);
                            setSelectedChatIds(new Set());
                          }}
                          title="Прочитать все"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => {
                            selectedChatIds.forEach(chatId => togglePin(chatId));
                            setBulkSelectMode(false);
                            setSelectedChatIds(new Set());
                          }}
                          title="Закрепить"
                        >
                          <Pin className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => {
                            selectedChatIds.forEach(chatId => toggleArchive(chatId));
                            setBulkSelectMode(false);
                            setSelectedChatIds(new Set());
                          }}
                          title="Архивировать"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-auto">
                <div className="p-3 flex flex-col h-full relative z-10 pointer-events-auto bg-background">
                  {/* Закрепленные чаты */}
                   {filteredChats.some(chat => getChatState(chat.id).isPinned) && (
                    <div className="mb-1">
                      <button 
                        className="w-full flex items-center justify-between px-3 py-1.5 mb-2 hover:bg-accent/50 rounded-lg transition-all duration-200 group"
                        onClick={() => setIsPinnedSectionOpen(!isPinnedSectionOpen)}
                      >
                        <div className="flex items-center gap-2.5">
                          {isPinnedSectionOpen ? (
                            <ChevronDown className="h-4 w-4 text-orange-500 group-hover:text-orange-600 transition-colors" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-orange-500 group-hover:text-orange-600 transition-colors" />
                          )}
                          <h3 className="text-sm font-semibold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                            Закрепленные ({filteredChats.filter(chat => getChatState(chat.id).isPinned).length})
                          </h3>
                        </div>
                        {(() => {
                           const pinnedUnreadCount = filteredChats
                             .filter(chat => getChatState(chat.id).isPinned)
                             .filter(chat => {
                               const chatState = getChatState(chat.id);
                               const showEye = !!chatState?.isUnread;
                               const unreadByMessages = chat.unread > 0;
                               return showEye || unreadByMessages;
                             })
                             .length;
                           return pinnedUnreadCount > 0 ? (
                            <Badge variant="destructive" className="text-xs h-4 rounded-sm">
                              {pinnedUnreadCount}
                            </Badge>
                          ) : null;
                        })()}
                      </button>
                       {isPinnedSectionOpen && (
                          <div className="space-y-0">
                         {filteredChats
                           .filter(chat => getChatState(chat.id).isPinned)
                          .map((chat) => {
                            const chatState = getChatState(chat.id);
                            const showEye = !!chatState?.isUnread;
                            const unreadByMessages = chat.unread > 0;
                            const displayUnread = showEye || unreadByMessages;
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
                                   className={`w-full p-2 text-left rounded-lg transition-colors relative border-l-2 border-orange-400 ${
                                     chat.id === activeChatId 
                                       ? 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-950 dark:hover:bg-orange-900' 
                                       : 'bg-orange-25 hover:bg-orange-50 dark:bg-orange-975 dark:hover:bg-orange-950'
                                   }`}
                                   onClick={() => {
                                     if (bulkSelectMode) {
                                       const newSelected = new Set(selectedChatIds);
                                       if (newSelected.has(chat.id)) {
                                         newSelected.delete(chat.id);
                                       } else {
                                         newSelected.add(chat.id);
                                       }
                                       setSelectedChatIds(newSelected);
                                     } else {
                                       handleChatClick(chat.id, chat.type);
                                     }
                                   }}
                                 >
                                   <div className="flex items-center justify-between">
                                     <div className="flex items-center gap-3">
                                       {bulkSelectMode && (
                                         <div 
                                           className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                             selectedChatIds.has(chat.id)
                                               ? 'bg-primary border-primary'
                                               : 'border-muted-foreground'
                                           }`}
                                         >
                                           {selectedChatIds.has(chat.id) && (
                                             <Check className="h-3 w-3 text-primary-foreground" />
                                           )}
                                         </div>
                                       )}
                                        {/* Avatar or icon */}
                                        {chat.type === 'corporate' ? (
                                          <div className="w-10 h-10 rounded-full bg-[hsl(var(--avatar-blue))] flex items-center justify-center flex-shrink-0">
                                            <Building2 className="h-5 w-5 text-white" />
                                          </div>
                                        ) : chat.type === 'teachers' ? (
                                          <div className="w-10 h-10 rounded-full bg-[hsl(var(--avatar-purple))] flex items-center justify-center flex-shrink-0">
                                            <GraduationCap className="h-5 w-5 text-white" />
                                          </div>
                                            ) : chat.avatar_url ? (
                                              <div className="relative flex-shrink-0">
                                                 <img 
                                                   src={(chat.avatar_url || '').replace(/^http:\/\//i, 'https://')} 
                                                   alt={`${chat.name} avatar`} 
                                                   className="w-10 h-10 rounded-full object-cover border-2 border-border/30"
                                                  style={{ borderRadius: '50%' }}
                                                  loading="lazy"
                                                  decoding="async"
                                                  referrerPolicy="no-referrer"
                                                  crossOrigin="anonymous"
                                                 onError={(e) => {
                                                   const target = e.currentTarget as HTMLImageElement;
                                                   target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGM0Y0RjYiLz4KPGF1Y2NsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMzAgMzBDMzAgMjYuNjg2MyAyNi42Mjc0IDI0IDIyLjUgMjRIMTcuNUMxMy4zNzI2IDI0IDEwIDI2LjY4NjMgMTAgMzBWMzBIMzBWMzBaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
                                                 }}
                                               />
                                           {/* Lead indicator */}
                                             {(() => {
                                               const chatInfo = chat as any;
                                               if (chatInfo.type !== 'client') return null;
                                               const clientStatus = getClientStatus(chatInfo.id);
                                               
                                               if (isMobile) {
                                                 console.log(`Mobile lead check for ${chatInfo.name}:`, {
                                                   id: chatInfo.id,
                                                   isLead: clientStatus.isLead,
                                                   hasActiveStudents: clientStatus.hasActiveStudents,
                                                   studentsCount: clientStatus.studentsCount
                                                 });
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
                                            <div className="w-10 h-10 rounded-full bg-[hsl(var(--avatar-blue))] flex items-center justify-center">
                                              <User className="h-5 w-5 text-white" />
                                            </div>
                                            {/* Lead indicator */}
                                             {(() => {
                                               const chatInfo = chat as any;
                                               if (chatInfo.type !== 'client') return null;
                                               const clientStatus = getClientStatus(chatInfo.id);
                                               
                                               if (isMobile) {
                                                 console.log(`Mobile lead check without avatar for ${chatInfo.name}:`, {
                                                   id: chatInfo.id,
                                                   isLead: clientStatus.isLead,
                                                   hasActiveStudents: clientStatus.hasActiveStudents
                                                 });
                                               }
                                               
                                               return clientStatus.isLead ? (
                                                 <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center border border-white z-10">
                                                   <UserPlus className="w-2.5 h-2.5 text-white" />
                                                 </div>
                                               ) : null;
                                             })()}
                                          </div>
                                       )}
                                       
                                          <div className="flex-1 min-w-0 overflow-hidden">
                                            <div className="flex items-center gap-2">
                                              <p className={`font-medium text-sm ${displayUnread ? 'font-bold' : ''} truncate`}>
                                                {chat.name}
                                              </p>
                                                 <Badge variant="outline" className="text-xs h-4 bg-orange-100 text-orange-700 border-orange-300">
                                                   В работе
                                                 </Badge>
                                            </div>
                                           <p className="text-xs text-muted-foreground line-clamp-2 leading-snug break-words overflow-hidden">
                                             {chat.lastMessage || "Привет! Как дела?"}
                                           </p>
                                         </div>
                                     </div>
                                    <div className="flex flex-col items-end">
                                      <Pin className="h-3 w-3 text-orange-600 mb-1" />
                                      <span className="text-xs text-muted-foreground">{chat.time}</span>
{displayUnread && (
       <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-sm mt-1 flex items-center gap-1">
         {showEye ? (
           <>
             <Avatar className="h-4 w-4">
               <AvatarImage src={profile?.avatar_url || ''} alt={`${profile?.first_name || ''} ${profile?.last_name || ''}`} />
               <AvatarFallback className="text-[8px]">{`${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}` || 'M'}</AvatarFallback>
             </Avatar>
             <span>{Math.max(chat.unread || 0, 1)}</span>
           </>
         ) : (
           chat.unread
         )}
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

                  {/* Кнопка переключения на архив */}
                  {!showArchived ? (
                    <>
                      {/* Активные чаты */}
                      <div className="flex-1 min-h-0 flex flex-col">
                        <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-gradient-to-r from-accent/30 to-transparent rounded-lg">
                          <h3 className="text-sm font-semibold text-foreground/80">
                            Активные чаты
                          </h3>
                          <div className="flex items-center gap-2">
                            {/* Unread filter button - only show if there are unread chats */}
                            {filteredChats.filter(chat => !getChatState(chat.id).isPinned && (getChatState(chat.id)?.isUnread || (chat.unread > 0))).length > 0 && (
                              <Button
                                variant={showOnlyUnread ? "default" : "outline"}
                                size="sm"
                                className="h-5 px-2 py-0.5 text-xs min-w-[20px]"
                                onClick={() => setShowOnlyUnread(!showOnlyUnread)}
                              >
                                {filteredChats.filter(chat => !getChatState(chat.id).isPinned && (getChatState(chat.id)?.isUnread || (chat.unread > 0))).length}
                              </Button>
                            )}
                            {/* Archive button */}
                            {archivedChatsCount > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-5 px-2 py-0.5 text-xs gap-1"
                                onClick={() => setShowArchived(true)}
                              >
                                <Archive className="h-3 w-3" />
                                {archivedChatsCount}
                              </Button>
                            )}
                          </div>
                        </div>
                        <VirtualizedChatList
                          chats={activeChats}
                          activeChatId={activeChatId}
                          profile={profile}
                          bulkSelectMode={bulkSelectMode}
                          selectedChatIds={selectedChatIds}
                          getChatState={getChatState}
                          isChatReadGlobally={isChatReadGlobally}
                          isInWorkByOthers={isInWorkByOthers}
                          getPinnedByUserName={getPinnedByUserName}
                          onChatClick={handleChatClick}
                          onChatAction={handleChatAction}
                          onBulkSelect={handleBulkSelectToggle}
                          onDeleteChat={handleDeleteChat}
                          onLinkChat={handleLinkChat}
                          hasNextPage={hasNextPage}
                          isFetchingNextPage={isFetchingNextPage}
                          onLoadMore={loadMore}
                        />
                      </div>
                    </>
                  ) : (
                    /* Архивные чаты */
                    <div className="flex-1 min-h-0 flex flex-col">
                      <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-gradient-to-r from-orange-500/20 to-transparent rounded-lg">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setShowArchived(false)}
                          >
                            <ChevronRight className="h-4 w-4 rotate-180" />
                          </Button>
                          <Archive className="h-4 w-4 text-orange-500" />
                          <h3 className="text-sm font-semibold text-orange-600">
                            Архив ({archivedChatsCount})
                          </h3>
                        </div>
                      </div>
                      <VirtualizedChatList
                        chats={archivedChats}
                        activeChatId={activeChatId}
                        profile={profile}
                        bulkSelectMode={bulkSelectMode}
                        selectedChatIds={selectedChatIds}
                        getChatState={getChatState}
                        isChatReadGlobally={isChatReadGlobally}
                        isInWorkByOthers={isInWorkByOthers}
                        getPinnedByUserName={getPinnedByUserName}
                        onChatClick={handleChatClick}
                        onChatAction={handleChatAction}
                        onBulkSelect={handleBulkSelectToggle}
                        onDeleteChat={handleDeleteChat}
                        onLinkChat={handleLinkChat}
                      />
                    </div>
                  )}

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
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SearchInput
                      placeholder="Поиск по чатам..."
                      onSearch={handleChatSearch}
                      onClear={() => setChatSearchQuery("")}
                      size="sm"
                    />
                  </div>
                  <DropdownMenu open={showFilters} onOpenChange={setShowFilters}>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={cn("h-8 w-8 px-0 rounded-lg border border-muted text-muted-foreground hover:bg-muted hover:text-foreground", (selectedBranch !== "all" || selectedClientType !== "all") && "bg-muted text-foreground")}
                      >
                        <Filter className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Фильтры</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuLabel className="text-xs text-muted-foreground">Филиал</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setSelectedBranch("all")}>
                        <div className="flex items-center gap-2">
                          {selectedBranch === "all" && <Check className="h-3 w-3" />}
                          <span className={selectedBranch !== "all" ? "ml-5" : ""}>Все филиалы</span>
                        </div>
                      </DropdownMenuItem>
                      {branches.map((branch) => {
                        const branchKey = branch.name.toLowerCase()
                          .replace(/okey\s*english\s*/gi, '')
                          .replace(/o'key\s*english\s*/gi, '')
                          .trim();
                        return (
                          <DropdownMenuItem key={branch.id} onClick={() => setSelectedBranch(branchKey)}>
                            <div className="flex items-center gap-2">
                              {selectedBranch === branchKey && <Check className="h-3 w-3" />}
                              <span className={selectedBranch !== branchKey ? "ml-5" : ""}>{branch.name}</span>
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuLabel className="text-xs text-muted-foreground">Тип клиента</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setSelectedClientType("all")}>
                        <div className="flex items-center gap-2">
                          {selectedClientType === "all" && <Check className="h-3 w-3" />}
                          <span className={selectedClientType !== "all" ? "ml-5" : ""}>Все</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSelectedClientType("lead")}>
                        <div className="flex items-center gap-2">
                          {selectedClientType === "lead" && <Check className="h-3 w-3" />}
                          <span className={selectedClientType !== "lead" ? "ml-5" : ""}>Лид</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSelectedClientType("student")}>
                        <div className="flex items-center gap-2">
                          {selectedClientType === "student" && <Check className="h-3 w-3" />}
                          <span className={selectedClientType !== "student" ? "ml-5" : ""}>Ученик</span>
                        </div>
                      </DropdownMenuItem>
                      
                      {(selectedBranch !== "all" || selectedClientType !== "all") && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedBranch("all");
                              setSelectedClientType("all");
                            }}
                            className="text-red-600"
                          >
                            Сбросить фильтры
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <div className="p-4 flex flex-col h-full">
                  {/* Закрепленные чаты */}
                  {filteredChats.some(chat => getChatState(chat.id).isPinned) && (
                    <div className="mb-1">
                      <button 
                        className="w-full flex items-center justify-between px-3 py-1.5 mb-2 hover:bg-accent/50 rounded-lg transition-all duration-200 group"
                        onClick={() => setIsPinnedSectionOpen(!isPinnedSectionOpen)}
                      >
                        <div className="flex items-center gap-2.5">
                          {isPinnedSectionOpen ? (
                            <ChevronDown className="h-4 w-4 text-orange-500 group-hover:text-orange-600 transition-colors" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-orange-500 group-hover:text-orange-600 transition-colors" />
                          )}
                          <h3 className="text-sm font-semibold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                            Закрепленные (в работе)
                          </h3>
                        </div>
                        {(() => {
                           const pinnedUnreadCount = filteredChats
                             .filter(chat => getChatState(chat.id).isPinned)
                             .filter(chat => {
                               const chatState = getChatState(chat.id);
                               const showEye = !!chatState?.isUnread;
                               const unreadByMessages = chat.unread > 0;
                               return showEye || unreadByMessages;
                             })
                            .length;
                          return pinnedUnreadCount > 0 ? (
                            <Badge variant="destructive" className="text-xs h-5 rounded-sm">
                              {pinnedUnreadCount}
                            </Badge>
                          ) : null;
                        })()}
                      </button>
                       {isPinnedSectionOpen && (
                         <div className="space-y-1 mb-2">
                           {filteredChats
                             .filter(chat => getChatState(chat.id).isPinned)
                            .map((chat) => {
                              const chatState = getChatState(chat.id);
                              // Непрочитанность по сообщениям (message-level is_read)
                              const showEye = !!chatState?.isUnread;
                              const unreadByMessages = chat.unread > 0;
                              const displayUnread = showEye || unreadByMessages;
                              return (
                                <div 
                                  key={chat.id}
                                  className="w-full p-3 text-left rounded-lg transition-all duration-200 bg-gradient-to-r from-orange-50 to-orange-100/30 border border-orange-200 hover:shadow-md hover:to-orange-100/50 dark:from-orange-950 dark:to-orange-900/30"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                     <div 
                                       className="flex items-start gap-3 flex-1 cursor-pointer"
                                       onClick={() => {
                                         handleChatClick(chat.id, chat.type as any);
                                       }}
                                     >
                                        {chat.type === 'corporate' ? (
                                          <div className="w-12 h-12 rounded-full bg-[hsl(var(--avatar-blue))] shadow-sm flex items-center justify-center flex-shrink-0 ring-2 ring-border/30">
                                            <Building2 className="h-6 w-6 text-white" />
                                          </div>
                                        ) : chat.type === 'teachers' ? (
                                          <div className="w-12 h-12 rounded-full bg-[hsl(var(--avatar-purple))] shadow-sm flex items-center justify-center flex-shrink-0 ring-2 ring-border/30">
                                            <GraduationCap className="h-6 w-6 text-white" />
                                          </div>
                                       ) : chat.avatar_url ? (
                                         <div className="relative flex-shrink-0">
                                            <img 
                                              src={(chat.avatar_url || '').replace(/^http:\/\//i, 'https://')} 
                                              alt={`${chat.name} avatar`} 
                                              className="w-12 h-12 rounded-full object-cover ring-2 ring-orange-200 shadow-sm"
                                              style={{ borderRadius: '50%' }}
                                              loading="lazy"
                                              decoding="async"
                                              referrerPolicy="no-referrer"
                                              crossOrigin="anonymous"
                                             onError={(e) => {
                                               const target = e.currentTarget as HTMLImageElement;
                                               target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGM0Y0RjYiLz4KPGF1Y2NsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMzAgMzBDMzAgMjYuNjg2MyAyNi42Mjc0IDI0IDIyLjUgMjRIMTcuNUMxMy4zNzI2IDI0IDEwIDI2LjY4NjMgMTAgMzBWMzBIMzBWMzBaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
                                             }}
                                           />
                                         </div>
                                        ) : (
                                          <div className="w-12 h-12 rounded-full bg-[hsl(var(--avatar-blue))] shadow-sm flex items-center justify-center flex-shrink-0 ring-2 ring-border/30">
                                            <User className="h-6 w-6 text-white" />
                                          </div>
                                       )}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                          <p className={`text-sm ${displayUnread ? 'font-semibold' : 'font-medium'} truncate`}>
                                            {chat.name}
                                          </p>
                                          <Pin className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                                        </div>
                                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 mb-1 bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50">
                                          В работе
                                        </Badge>
                                        <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                                          {(typingByClient[chat.id]?.count ?? 0) > 0
                                            ? `${typingByClient[chat.id]?.names?.[0] || 'Менеджер'} печатает...`
                                            : (chat.lastMessage || 'Последнее сообщение')}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-muted-foreground font-medium">{chat.time}</span>
                                        
                                        {/* Mobile Settings Menu */}
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button 
                                              size="sm" 
                                              variant="ghost" 
                                              className="h-7 w-7 p-0 opacity-60 hover:opacity-100"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <MoreVertical className="h-3.5 w-3.5" />
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
                                           <span className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 min-w-[20px] h-5 justify-center">
                                             {showEye ? (
                                               <>
                                                 <Avatar className="h-3.5 w-3.5">
                                                   <AvatarImage src={profile?.avatar_url || ''} alt={`${profile?.first_name || ''} ${profile?.last_name || ''}`} />
                                                   <AvatarFallback className="text-[7px]">{`${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}` || 'M'}</AvatarFallback>
                                                 </Avatar>
                                                 <span className="font-semibold">1</span>
                                               </>
                                             ) : (
                                               <span className="font-semibold">1</span>
                                             )}
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

                  {/* Кнопка переключения на архив - Mobile */}
                  {!showArchived ? (
                    <>
                      {/* Активные чаты */}
                      <div className="flex-1 min-h-0 flex flex-col">
                        <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-gradient-to-r from-accent/30 to-transparent rounded-lg">
                          <h3 className="text-sm font-semibold text-foreground/80">
                            Активные чаты
                          </h3>
                          <div className="flex items-center gap-2">
                            {/* Unread filter button - only show if there are unread chats */}
                            {filteredChats.filter(chat => !getChatState(chat.id).isPinned && (getChatState(chat.id)?.isUnread || (chat.unread > 0))).length > 0 && (
                              <Button
                                variant={showOnlyUnread ? "default" : "outline"}
                                size="sm"
                                className="h-5 px-2 py-0.5 text-xs min-w-[20px]"
                                onClick={() => setShowOnlyUnread(!showOnlyUnread)}
                              >
                                {filteredChats.filter(chat => !getChatState(chat.id).isPinned && (getChatState(chat.id)?.isUnread || (chat.unread > 0))).length}
                              </Button>
                            )}
                            {/* Archive button */}
                            {archivedChatsCount > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-5 px-2 py-0.5 text-xs gap-1"
                                onClick={() => setShowArchived(true)}
                              >
                                <Archive className="h-3 w-3" />
                                {archivedChatsCount}
                              </Button>
                            )}
                          </div>
                        </div>
                        <VirtualizedChatList
                          chats={activeChats}
                          activeChatId={activeChatId}
                          profile={profile}
                          bulkSelectMode={bulkSelectMode}
                          selectedChatIds={selectedChatIds}
                          getChatState={getChatState}
                          isChatReadGlobally={isChatReadGlobally}
                          isInWorkByOthers={isInWorkByOthers}
                          getPinnedByUserName={getPinnedByUserName}
                          onChatClick={handleChatClick}
                          onChatAction={handleChatAction}
                          onBulkSelect={handleBulkSelectToggle}
                          onDeleteChat={handleDeleteChat}
                          onLinkChat={handleLinkChat}
                          hasNextPage={hasNextPage}
                          isFetchingNextPage={isFetchingNextPage}
                          onLoadMore={loadMore}
                        />
                      </div>
                    </>
                  ) : (
                    /* Архивные чаты - Mobile */
                    <div className="flex-1 min-h-0 flex flex-col">
                      <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-gradient-to-r from-orange-500/20 to-transparent rounded-lg">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setShowArchived(false)}
                          >
                            <ChevronRight className="h-4 w-4 rotate-180" />
                          </Button>
                          <Archive className="h-4 w-4 text-orange-500" />
                          <h3 className="text-sm font-semibold text-orange-600">
                            Архив ({archivedChatsCount})
                          </h3>
                        </div>
                      </div>
                      <VirtualizedChatList
                        chats={archivedChats}
                        activeChatId={activeChatId}
                        profile={profile}
                        bulkSelectMode={bulkSelectMode}
                        selectedChatIds={selectedChatIds}
                        getChatState={getChatState}
                        isChatReadGlobally={isChatReadGlobally}
                        isInWorkByOthers={isInWorkByOthers}
                        getPinnedByUserName={getPinnedByUserName}
                        onChatClick={handleChatClick}
                        onChatAction={handleChatAction}
                        onBulkSelect={handleBulkSelectToggle}
                        onDeleteChat={handleDeleteChat}
                        onLinkChat={handleLinkChat}
                      />
                    </div>
                  )}
                </div>
              </div>
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
              rightPanelCollapsed={rightPanelCollapsed}
              onToggleRightPanel={() => setRightPanelCollapsed(!rightPanelCollapsed)}
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
                  handleChatClick(teacherId, 'teachers');
                }
              }}
            />
          ) : activeChatType === 'communities' ? (
            <CommunityChatArea 
              onMessageChange={setHasUnsavedChat}
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
          <div className={cn(
            "bg-background border-l overflow-y-auto h-full transition-all duration-300",
            rightPanelCollapsed ? "w-0" : "w-80 lg:w-96 p-4"
          )}>
            {!rightPanelCollapsed && (
              <FamilyCardWrapper 
                clientId={activeChatId} 
                onOpenChat={(memberId) => handleChatClick(memberId, 'client')}
              />
            )}
          </div>
        )}

        {/* Right Sidebar - Mobile */}
        <Sheet open={rightSidebarOpen} onOpenChange={setRightSidebarOpen}>
          <SheetContent side="right" className="w-80 p-4">
            {activeChatType === 'client' && activeChatId && (
              <FamilyCardWrapper 
                clientId={activeChatId}
                onOpenChat={(memberId) => handleChatClick(memberId, 'client')}
              />
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
        if (modal.type === 'student' && modal.isOpen) {
          return (
            <EnhancedStudentCard
              key={`pinned-student-${modal.id}`}
              student={modal.props.student}
              open={true}
              onOpenChange={() => closePinnedModal(modal.id, modal.type)}
              isPinned={true}
              onPin={() => {}}
              onUnpin={() => unpinModal(modal.id, modal.type)}
            />
          );
        }
        // УБИРАЕМ дублирующие модальные окна из меню - они уже есть в основном меню
        return null;
      })}
      
      {/* Плавающая кнопка AI Центра для десктопа */}
      {!isMobile && !voiceAssistantOpen && (
        <Button
          onClick={() => setVoiceAssistantOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90"
          size="icon"
        >
          <Bot className="h-6 w-6" />
        </Button>
      )}
      
      {/* AI Центр */}
      <AIHub 
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
          addClient: () => setShowAddClientModal(true),
          addTask: () => setShowAddTaskModal(true),
          addTeacher: () => setShowAddTeacherModal(true),
          addStudent: () => setShowAddStudentModal(true),
          addInvoice: () => setShowInvoiceModal(true),
          clientProfile: (clientId: string) => {
            handleChatClick(clientId, 'client');
            setRightSidebarOpen(true);
          },
          editTask: (taskId: string) => {
            setEditTaskId(taskId);
            setShowEditTaskModal(true);
          }
        }}
        onOpenChat={(clientId: string) => {
          handleChatClick(clientId, 'client');
        }}
      />

      {/* Мобильная нижняя навигация - показываем только внутри открытого диалога */}
      {isMobile && !!activeChatId && (
        <MobileBottomNavigation
          onCorporateClick={handleMobileCorporateClick}
          onTeachersClick={handleMobileTeachersClick}
          onNewChatClick={handleMobileNewChatClick}
          onScheduleClick={handleMobileScheduleClick}
          onAssistantClick={handleMobileAssistantClick}
          corporateUnreadCount={corporateChats?.reduce((sum, chat) => sum + (chat.unread_count || 0), 0) || 0}
          teachersUnreadCount={teacherChats?.reduce((sum, chat) => sum + (chat.unread_count || 0), 0) || 0}
          activeChatType={activeChatType}
        />
      )}

      {/* Модальное окно скриптов */}
      <ScriptsModal
        open={showScriptsModal}
        onOpenChange={setShowScriptsModal}
      />

      {/* Модальное окно дашборда */}
      <DashboardModal
        open={showDashboardModal}
        onOpenChange={setShowDashboardModal}
      />

      {/* Модальное окно WhatsApp Sessions */}
      <WhatsAppSessionsModal
        open={showWhatsAppSessionsModal}
        onOpenChange={setShowWhatsAppSessionsModal}
      />

      {/* Модальное окно нового чата */}
      <MobileNewChatModal
        open={showNewChatModal}
        onOpenChange={setShowNewChatModal}
        onCreateChat={handleCreateNewChat}
        onExistingClientFound={handleExistingClientFound}
      />

      {/* Модальное окно расписания */}
      {showScheduleModal && (
        <ScheduleModal
          open={showScheduleModal}
          onOpenChange={setShowScheduleModal}
        />
      )}

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

      {/* Groups Management Modal */}
      <GroupsModal
        open={showGroupsModal}
        onOpenChange={setShowGroupsModal}
      />

      {/* Individual Lessons Management Modal */}
      <IndividualLessonsModal
        open={showIndividualLessonsModal}
        onOpenChange={setShowIndividualLessonsModal}
      />
      {/* Groups Management Modal */}
      <GroupsModal
        open={showGroupsModal}
        onOpenChange={setShowGroupsModal}
      />

      {/* Individual Lessons Management Modal */}
      <IndividualLessonsModal
        open={showIndividualLessonsModal}
        onOpenChange={setShowIndividualLessonsModal}
      />

      {/* Education Submenu */}
      <EducationSubmenu
        open={showEducationSubmenu}
        onOpenChange={setShowEducationSubmenu}
        onGroupsClick={() => setShowGroupsModal(true)}
        onIndividualClick={() => setShowIndividualLessonsModal(true)}
      />

      {/* Delete Chat Dialog */}
      <DeleteChatDialog
        open={deleteChatDialog.open}
        onOpenChange={(open) => setDeleteChatDialog(prev => ({ ...prev, open }))}
        chatName={deleteChatDialog.chatName}
        onConfirm={confirmDeleteChat}
        isDeleting={isDeletingChat}
      />

      {/* Link Chat to Client Modal */}
      <LinkChatToClientModal
        open={linkChatModal.open}
        onOpenChange={(open) => setLinkChatModal(prev => ({ ...prev, open }))}
        chatClientId={linkChatModal.chatId}
        chatClientName={linkChatModal.chatName}
        onSuccess={handleLinkChatSuccess}
      />

      {/* Модальные окна для голосового ассистента */}
      <AddClientModal 
        open={showAddClientModal}
        onOpenChange={setShowAddClientModal}
      />
      
      <Dialog open={showAddTeacherModal} onOpenChange={setShowAddTeacherModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить преподавателя</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Функция добавления преподавателей будет реализована позже.
          </p>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showAddStudentModal} onOpenChange={setShowAddStudentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить студента</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Функция добавления студентов будет реализована позже.
          </p>
        </DialogContent>
      </Dialog>
      
      {/* WhatsApp Status Notification */}
      <WhatsAppStatusNotification />
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