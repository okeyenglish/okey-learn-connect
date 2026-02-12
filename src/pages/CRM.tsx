import { useState, useEffect, useMemo, useCallback, lazy, Suspense, useRef } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/typedClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { useClients, useSearchClients, useCreateClient } from "@/hooks/useClients";
import { useClientIdsByPhoneSearch } from "@/hooks/useClientIdsByPhoneSearch";
import { usePhoneSearchThreads } from "@/hooks/usePhoneSearchThreads";
import { usePinnedChatThreads } from "@/hooks/usePinnedChatThreads";
import { useUnifiedSearch } from "@/hooks/useUnifiedSearch";
import { useClientStatus } from "@/hooks/useClientStatus";
import { useRealtimeMessages, useMarkAsRead } from "@/hooks/useChatMessages";
import { useChatThreadsInfinite } from "@/hooks/useChatThreadsInfinite";
// useTeacherLinkedClientIds removed - now using teacher_id directly in chat_messages
import { useMarkChatMessagesAsRead, useBulkMarkChatsAsRead } from "@/hooks/useMessageReadStatus";
import { useStudentsLazy } from "@/hooks/useStudentsLazy";
import { useStudentsCount } from "@/hooks/useStudentsCount";
import { useLeadsCount } from "@/hooks/useLeadsCount";
import { useTasksLazy } from "@/hooks/useTasksLazy";
import { CRMRealtimeProvider, useCRMRealtime } from "@/pages/crm/providers/CRMRealtimeProvider";
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
import { ShareClientCardModal } from "@/components/crm/ShareClientCardModal";
import { ChatContextMenu } from "@/components/crm/ChatContextMenu";
import { ChatListItem } from "@/components/crm/ChatListItem";
import { VirtualizedChatList } from "@/components/crm/VirtualizedChatList";
import { AddClientModal } from "@/components/crm/AddClientModal";
import { ClientsList } from "@/components/crm/ClientsList";
import { NewChatModal } from "@/components/crm/NewChatModal";
import { DeleteChatDialog } from "@/components/crm/DeleteChatDialog";
import { LinkChatToClientModal } from "@/components/crm/LinkChatToClientModal";
import { ConvertToTeacherModal } from "@/components/crm/ConvertToTeacherModal";
import { PinnedModalTabs } from "@/components/crm/PinnedModalTabs";
import { WhatsAppStatusNotification } from "@/components/crm/WhatsAppStatusNotification";
// Static imports для компонентов, используемых в нескольких местах
import { AddTaskModal } from "@/components/crm/AddTaskModal";
import { EditTaskModal } from "@/components/crm/EditTaskModal";
import { TaskCalendar } from "@/components/crm/TaskCalendar";
import { CreateInvoiceModal } from "@/components/crm/CreateInvoiceModal";
import { AddEmployeeModal } from "@/components/employees/AddEmployeeModal";

// Lazy load только уникальных тяжелых модальных окон
const ScriptsModal = lazy(() => import("@/components/crm/ScriptsModal").then(m => ({ default: m.ScriptsModal })));
const DashboardModal = lazy(() => import("@/components/dashboards/DashboardModal").then(m => ({ default: m.DashboardModal })));
const ScheduleModal = lazy(() => import("@/components/schedule/ScheduleModal").then(m => ({ default: m.ScheduleModal })));
const GroupsModal = lazy(() => import("@/components/learning-groups/GroupsModal").then(m => ({ default: m.GroupsModal })));
const IndividualLessonsModal = lazy(() => import("@/components/individual-lessons/IndividualLessonsModal").then(m => ({ default: m.IndividualLessonsModal })));
const WhatsAppSessionsModal = lazy(() => import("@/components/crm/WhatsAppSessionsModal").then(m => ({ default: m.WhatsAppSessionsModal })));

import { PinnableModalHeader, PinnableDialogContent } from "@/components/crm/PinnableModal";
import { UnifiedManagerWidget } from "@/components/crm/UnifiedManagerWidget";
import { MobileChatNavigation } from "@/components/crm/MobileChatNavigation";
import { MobileNewChatModal } from "@/components/crm/MobileNewChatModal";
import { PostCallModerationModal } from "@/components/crm/PostCallModerationModal";
import { usePostCallModeration } from "@/hooks/usePostCallModeration";


import { EducationSubmenu } from "@/components/learning-groups/EducationSubmenu";
import { usePinnedModalsDB, PinnedModal } from "@/hooks/usePinnedModalsDB";
import { useChatStatesDB } from "@/hooks/useChatStatesDB";
import { usePinnedChatIds } from "@/hooks/usePinnedChatIds";
import useSharedChatStates from "@/hooks/useSharedChatStates";
import { useGlobalChatReadStatus } from "@/hooks/useGlobalChatReadStatus";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAllTasks, useCompleteTask, useCancelTask, useUpdateTask } from "@/hooks/useTasks";
import { useRealtimeClients } from "@/hooks/useRealtimeClients";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrganizationRealtimeMessages } from "@/hooks/useOrganizationRealtimeMessages";
import { useRealtimeHub } from "@/hooks/useRealtimeHub";
import { RealtimeStatusIndicator } from "@/components/crm/RealtimeStatusIndicator";
import { useManagerBranches } from "@/hooks/useManagerBranches";
import { useUserAllowedBranches } from "@/hooks/useUserAllowedBranches";
import { toBranchKey } from "@/lib/branchUtils";
import { useClientBranchValues } from "@/hooks/useClientBranchValues";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useAssistantMessages } from "@/hooks/useAssistantMessages";
import { useStaffUnreadCount } from "@/hooks/useInternalStaffMessages";
import { useChatNotificationSound } from "@/hooks/useChatNotificationSound";
import { useStaffMessageNotifications } from "@/hooks/useStaffMessageNotifications";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ChatBubbleNotification } from "@/components/ai-hub/ChatBubbleNotification";

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
  HardDrive,
  Sparkles,
  Trash2,
  Loader2
} from "lucide-react";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { useChatPresenceTracker } from "@/hooks/useChatPresence";
import { useActiveCallPresence } from "@/hooks/useActiveCallPresence";
import { useStaffOnlinePresence } from "@/hooks/useStaffOnlinePresence";
import { useSystemChatMessages } from '@/hooks/useSystemChatMessages';
import { toast } from "sonner";
import { useBulkActionUndo, BulkActionState } from "@/hooks/useBulkActionUndo";
import VoiceAssistant from '@/components/VoiceAssistant';
import { TeacherMessagesPanel } from "@/components/crm/TeacherMessagesPanel";
import { UserPermissionsManager } from "@/components/admin/UserPermissionsManager";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { useMissedCallNotifications } from "@/hooks/useMissedCallNotifications";
import { useIncomingCallRingtone } from "@/hooks/useIncomingCallRingtone";
import { IncomingCallNotification } from "@/components/crm/IncomingCallNotification";
import { TrashDialog } from "@/components/crm/TrashDialog";
import { useDeletedChats } from "@/hooks/useDeletedChats";
// Lazy load тяжелых компонентов модальных окон для быстрого открытия
const LeadsModalContent = lazy(() => import("@/components/leads/LeadsModalContent").then(m => ({ default: m.LeadsModalContent })));
const StudentsModal = lazy(() => import("@/components/crm/StudentsModal").then(m => ({ default: m.StudentsModal })));
const StudentsLeadsModal = lazy(() => import("@/components/students/StudentsLeadsModal").then(m => ({ default: m.StudentsLeadsModal })));
const ImportStudentsModal = lazy(() => import("@/components/students/ImportStudentsModal").then(m => ({ default: m.ImportStudentsModal })));
const EnhancedStudentCard = lazy(() => import("@/components/students/EnhancedStudentCard").then(m => ({ default: m.EnhancedStudentCard })));
const NewFinancesSection = lazy(() => import("@/components/finances/NewFinancesSection").then(m => ({ default: m.NewFinancesSection })));
import { AIHub } from "@/components/ai-hub/AIHub";
import { AIHubInline } from "@/components/ai-hub/AIHubInline";
const ScheduleSection = lazy(() => import("@/components/crm/sections/ScheduleSection"));
const DocumentsSection = lazy(() => import("@/components/documents/DocumentsSection").then(m => ({ default: m.DocumentsSection })));
const AnalyticsSection = lazy(() => import("@/components/analytics/AnalyticsSection").then(m => ({ default: m.AnalyticsSection })));
const CommunicationsSection = lazy(() => import("@/components/communications/CommunicationsSection").then(m => ({ default: m.CommunicationsSection })));
const EmployeeKPISection = lazy(() => import("@/components/crm/EmployeeKPISection").then(m => ({ default: m.EmployeeKPISection })));
const Sheets = lazy(() => import("./Sheets"));

import { OrganizationSettings } from "@/components/settings/OrganizationSettings";
import { BranchesSettings } from "@/components/settings/BranchesSettings";
import { BrandingSettings } from "@/components/settings/BrandingSettings";
import { SubscriptionSettings } from "@/components/settings/SubscriptionSettings";
import { WppTestPanel } from "@/components/crm/WppTestPanel";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useCRMModals, useCRMState, useCRMTasks, useCRMSearch } from "@/pages/crm/hooks";
import type { CRMChat, ClientCRMChat, SystemCRMChat, CorporateChat, PinnedModalType, RealtimePayload, GroupStudentRow } from "@/pages/crm/types";
import { isClientChat } from "@/pages/crm/types";
import { useTabFeedback, TAB_FEEDBACK_MESSAGE } from "@/hooks/useTabFeedback";
import { useActivityTracker } from "@/hooks/useActivityTracker";

const LOW_ACTIVITY_MESSAGE = `⚠️ Внимание! Твоя активность за сегодняшнюю сессию упала ниже нормы. 

Что произошло? Выбери один из вариантов ниже или напиши свою причину:`;

const CRMContent = () => {
  const { user, profile, role, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // Single organization-wide realtime subscription for all chat messages
  // This replaces per-chat subscriptions, reducing WebSocket connections from N to 1
  // Falls back to polling if WebSocket is unavailable
  const { connectionStatus } = useOrganizationRealtimeMessages();
  
  // Consolidated realtime hub for tasks, lesson_sessions, chat_states
  // Reduces WebSocket connections further by combining multiple table subscriptions
  useRealtimeHub();
  
  // Listen for missed call events and show notifications
  useMissedCallNotifications();
  
  // Play ringtone for incoming calls
  useIncomingCallRingtone();
  
  // Post-call moderation modal - shows after manager's call ends
  const postCallModeration = usePostCallModeration({ analysisDelay: 8000 });
  
  // Custom hooks for state management
  const modals = useCRMModals();
  const crmState = useCRMState();
  const tasks = useCRMTasks();
  const search = useCRMSearch();

  // Tab feedback - ВРЕМЕННО ОТКЛЮЧЕНО
  // useTabFeedback({
  //   minAwayTime: 30000,
  //   onShowFeedbackRequest: () => {
  //     setVoiceAssistantOpen(true);
  //     setInitialAssistantMessage(TAB_FEEDBACK_MESSAGE);
  //     setQuickReplyCategory('tab_feedback');
  //   }
  // });
  
  // Activity tracker - ВРЕМЕННО ОТКЛЮЧЕНО (алерты низкой активности)
  // useActivityTracker({
  //   onLowActivity: (activityPercentage) => {
  //     console.log('[CRM] Low activity detected:', activityPercentage, '% - opening AI Hub popup');
  //     setVoiceAssistantOpen(true);
  //     setInitialAssistantMessage(LOW_ACTIVITY_MESSAGE);
  //     setQuickReplyCategory('activity_warning');
  //   }
  // });
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
    showAddEmployeeModal,
    setShowAddEmployeeModal,
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
    resetBranch,
    validateAgainstAvailable,
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
  const [convertToTeacherModal, setConvertToTeacherModal] = useState<{ 
    open: boolean; 
    clientId: string; 
    clientName: string; 
    clientPhone?: string; 
    clientEmail?: string; 
  }>({ open: false, clientId: '', clientName: '' });
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [shareCardClient, setShareCardClient] = useState<{ open: boolean; id: string; name: string; phone?: string; avatar_url?: string | null; branch?: string | null }>({ open: false, id: '', name: '' });
  const [selectedMessengerTab, setSelectedMessengerTab] = useState<{ tab: 'whatsapp' | 'telegram' | 'max'; ts: number } | undefined>(undefined);
  // Search query to pass to ChatArea when chat was found via message search
  const [chatInitialSearchQuery, setChatInitialSearchQuery] = useState<string | undefined>(undefined);
  // Message ID to highlight and scroll to when navigating from search
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | undefined>(undefined);
  // Bulk action confirmation dialog
  const [bulkActionConfirm, setBulkActionConfirm] = useState<{ 
    open: boolean; 
    action: 'read' | 'unread' | 'pin' | 'archive' | null;
    count: number;
  }>({ open: false, action: null, count: 0 });
  
  // Trash dialog state
  const [trashDialogOpen, setTrashDialogOpen] = useState(false);
  
  // ChatOS - target staff user ID to auto-open a chat with
  const [initialStaffUserId, setInitialStaffUserId] = useState<string | null>(null);
  // ChatOS - target group chat ID to auto-open
  const [initialGroupChatId, setInitialGroupChatId] = useState<string | null>(null);
  // ChatOS - initial message for AI assistant (e.g., from tab feedback)
  const [initialAssistantMessage, setInitialAssistantMessage] = useState<string | null>(null);
  // ChatOS - quick reply category for AI assistant
  const [quickReplyCategory, setQuickReplyCategory] = useState<'activity_warning' | 'tab_feedback' | null>(null);
  
  // Memoized AIHub callbacks (stable refs that don't depend on late-defined functions)
  const handleAIHubToggle = useCallback((open?: boolean) => {
    setVoiceAssistantOpen(prev => typeof open === 'boolean' ? open : !prev);
  }, []);
  const handleAIHubOpenScripts = useCallback(() => setShowScriptsModal(true), []);
  const handleClearInitialAssistantMessage = useCallback(() => {
    setInitialAssistantMessage(null);
    setQuickReplyCategory(null);
  }, []);
  const handleClearInitialStaffUserId = useCallback(() => setInitialStaffUserId(null), []);
  const handleClearInitialGroupChatId = useCallback(() => setInitialGroupChatId(null), []);

  const { data: deletedChats = [] } = useDeletedChats();
  
  // Manager branch restrictions — needed before loading threads
  const { canAccessBranch, hasRestrictions: hasManagerBranchRestrictions, allowedBranchNames } = useManagerBranches();
  
  const { organization, branches } = useOrganization();
  const { getRawValues } = useClientBranchValues();

  // Combine manager branch restrictions with UI branch filter for server-side filtering
  // Uses dynamic lookup of raw DB values instead of manual alias maps
  const effectiveBranches = useMemo(() => {
    const managerBranches = hasManagerBranchRestrictions ? allowedBranchNames : null;
    
    if (selectedBranch && selectedBranch !== 'all') {
      // selectedBranch is already a normalized key (from usePersistedBranch)
      if (managerBranches) {
        const managerKeys = new Set(managerBranches.map(toBranchKey));
        if (!managerKeys.has(selectedBranch)) return undefined; // not allowed
      }
      const rawValues = getRawValues(selectedBranch);
      return rawValues.length > 0 ? rawValues : undefined;
    }
    
    if (managerBranches) {
      const allRaw = managerBranches.flatMap(b => getRawValues(toBranchKey(b)));
      return allRaw.length > 0 ? allRaw : undefined;
    }
    
    return undefined;
  }, [selectedBranch, hasManagerBranchRestrictions, allowedBranchNames, getRawValues]);

  // Критичные данные - загружаем ТОЛЬКО threads с infinite scroll (50 за раз)
  const { 
    data: threads = [], 
    isLoading: threadsLoading, 
    hasNextPage, 
    isFetchingNextPage, 
    loadMore,
    refetch: refetchThreads,
  } = useChatThreadsInfinite(effectiveBranches);

  const { corporateChats, teacherChats, isLoading: systemChatsLoading } = useSystemChatMessages();
  const { communityChats, totalUnread: communityUnread, latestCommunity, isLoading: communityLoading } = useCommunityChats();
  
  // Teacher conversations now use teacher_id directly in chat_messages
  // No need for teacherLinkedClientIds - messages with teacher_id have client_id = NULL
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
  const markChatMessagesAsReadMutation = useMarkChatMessagesAsRead();
  const bulkMarkChatsAsReadMutation = useBulkMarkChatsAsRead();
  const { 
    pinnedModals, 
    loading: pinnedLoading,
    pinModal, 
    unpinModal, 
    openPinnedModal, 
    closePinnedModal, 
    isPinned 
  } = usePinnedModalsDB();

  // Get pinned chat IDs first - they must always be in visibleChatIds
  const { pinnedChatIds } = usePinnedChatIds();

  // visibleChatIds - ограничиваем только реально видимыми (первые 200) + активный + системные + закреплённые
  // Это предотвращает огромные запросы к chat_states при infinite scroll
  const visibleChatIds = useMemo(() => {
    const ids = new Set<string>();
    
    // ВАЖНО: Всегда включаем закреплённые чаты
    pinnedChatIds.forEach(id => ids.add(id));
    
    // Только первые 200 threads (достаточно для viewport + буфер)
    const visibleThreads = (threads || []).slice(0, 200);
    visibleThreads.forEach((t: any) => t?.client_id && ids.add(t.client_id));
    
    // Всегда добавляем активный чат
    if (activeChatId) {
      ids.add(activeChatId);
    }
    
    // Системные чаты (их мало)
    (corporateChats || []).forEach((c: any) => c?.id && ids.add(c.id));
    (teacherChats || []).forEach((c: any) => c?.id && ids.add(c.id));
    
    return Array.from(ids);
  }, [threads, corporateChats, teacherChats, activeChatId, pinnedChatIds]);

  const { 
    chatStates, 
    loading: chatStatesLoading,
    togglePin,
    toggleArchive,
    markAsRead,
    markAsUnread,
    getChatState
  } = useChatStatesDB(visibleChatIds);

  const { isInWorkByOthers, isPinnedByCurrentUser, isPinnedByAnyone, getPinnedByUserName, getPinnedByUserId, getAllPinners, isLoading: sharedStatesLoading } = useSharedChatStates(visibleChatIds);
  const { markChatAsReadGlobally, isChatReadGlobally } = useGlobalChatReadStatus();
  const completeTask = useCompleteTask();
  const cancelTask = useCancelTask();
  const updateTask = useUpdateTask();
  // organization & branches already declared above (line ~412)
  // useManagerBranches() already called above (line ~410)
  const { filterAllowedBranches, hasRestrictions: hasUserBranchRestrictions } = useUserAllowedBranches();
  const { unreadCount: assistantUnreadCount, markAllAsRead: markAssistantAsRead } = useAssistantMessages();
  const { data: staffUnreadCount = 0 } = useStaffUnreadCount();

  // Validate persisted branch selection against current list of branches
  const availableBranchKeys = useMemo(
    () => (filterAllowedBranches(branches) || [])
      .map((b: any) => toBranchKey(b?.name))
      .filter(Boolean),
    [branches, filterAllowedBranches]
  );

  useEffect(() => {
    validateAgainstAvailable?.(availableBranchKeys);
  }, [validateAgainstAvailable, availableBranchKeys]);
  const { isUserOnline } = useStaffOnlinePresence();
  const isMobile = useIsMobile();
  
  // Play notification sound when new incoming messages arrive
  useChatNotificationSound(activeChatId);
  
  // Staff message notifications with toast and click-to-open chat
  const handleStaffMessageClick = useCallback((staffUserId: string, isGroupChat?: boolean, groupChatId?: string) => {
    // Open AI Hub Sheet and auto-open the staff/group chat inside it
    if (isGroupChat && groupChatId) {
      setInitialGroupChatId(groupChatId);
    } else {
      setInitialStaffUserId(staffUserId);
    }
    setVoiceAssistantOpen(true);
  }, []);
  
  useStaffMessageNotifications({
    onOpenChat: handleStaffMessageClick,
  });

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
  const { typingByClient, presenceByClient, newMessageClientIds } = useCRMRealtime();
  
  // Track current user's presence in the active chat
  const { updatePresence } = useChatPresenceTracker(activeChatId);
  
  // Auto-update presence to 'on_call' when call is active
  useActiveCallPresence(activeChatId, updatePresence);
  // Enable real-time updates for clients data
  useRealtimeClients();
  
  // Enable real-time updates for the active chat
  useRealtimeMessages(activeChatId);

  // Real-time refresh for chat threads with smart debouncing
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null;
    let pendingRefetch = false;
    let eventCount = 0;

    const debouncedRefetch = (payload?: RealtimePayload) => {
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
      // Listen for client updates (e.g. has_pending_payment changes)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'clients' }, (payload: any) => {
        debouncedRefetch();
        // Update activeClientInfo if this is the currently active client
        const updatedClient = payload.new;
        if (updatedClient && updatedClient.id === activeChatId) {
          setActiveClientInfo(prev => {
            if (!prev) return prev;
            return { ...prev, has_pending_payment: updatedClient.has_pending_payment || false };
          });
        }
      })
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

  // Deep link URL parameter ref - processed once after handleChatClick is available
  const deepLinkProcessedRef = useRef(false);

  // Получаем активных студентов по занятиям (для расчета лидов) - загружаем отложенно
  const { data: activeGroupStudents = [], isLoading: groupStudentsLoading } = useQuery({
    queryKey: ['active-group-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_students')
        .select('student_id')
        .eq('status', 'active');
      if (error) throw error;
      return (data || []).map((gs: GroupStudentRow) => gs.student_id);
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
  
  // Debug logging removed for performance
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
    
    // Special handling for employees - opens modal directly
    if (action === "Сотрудники") {
      setShowAddEmployeeModal(true);
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
    
    // Check if same calendar day (not just < 24 hours)
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    
    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    }
    
    // Show date for older messages
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };

  // Системные чаты из БД - агрегируем корпоративные в одну "папку"
  const corporateUnread = (corporateChats || []).reduce((sum: number, c: CorporateChat) => sum + (c.unreadCount || 0), 0);
  const latestCorporate = (corporateChats || []).reduce<CorporateChat | null>((latest, c: CorporateChat) => {
    if (!c?.lastMessageTime) return latest;
    if (!latest) return c;
    return new Date(c.lastMessageTime) > new Date(latest.lastMessageTime) ? c : latest;
  }, null);

  const teacherUnread = (teacherChats || []).reduce((sum: number, c: CorporateChat) => sum + (c.unreadCount || 0), 0);
  const latestTeacher = (teacherChats || []).reduce<CorporateChat | null>((latest, c: CorporateChat) => {
    if (!c?.lastMessageTime) return latest;
    if (!latest) return c;
    return new Date(c.lastMessageTime) > new Date(latest.lastMessageTime) ? c : latest;
  }, null);

  // Total unread for document title (all sources)
  const clientsUnread = (threads || []).reduce((sum, t) => sum + (t.unread_count || 0), 0);
  const allUnreadCount = clientsUnread + corporateUnread + teacherUnread + (communityUnread || 0);
  
  // Track previous unread count to detect new messages
  const prevUnreadCountRef = useRef(allUnreadCount);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  
  // Detect new incoming messages (unread count increased)
  useEffect(() => {
    if (allUnreadCount > prevUnreadCountRef.current) {
      // New message arrived
      setHasNewMessage(true);
    }
    prevUnreadCountRef.current = allUnreadCount;
  }, [allUnreadCount]);
  
  // Reset new message flag when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setHasNewMessage(false);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
  
  // Update document title with unread count and flash on new messages
  useDocumentTitle(allUnreadCount, undefined, hasNewMessage);

  // Системные чаты (мемоизированы для предотвращения лишних пересчётов allChats)
  // Communities убраны отсюда - они теперь в AI Hub
  const systemChats = useMemo(() => [
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
  ], [latestCorporate, corporateUnread, latestTeacher, teacherUnread]);
  
  const threadClientIdsSet = useMemo(() => new Set((threads || []).map(t => t.client_id)), [threads]);

  // Функция для форматирования имени клиента
  // Показывает "Фамилия Имя" (без отчества) в списке чатов
  // Если нет имени, показывает форматированный телефон
  const formatClientDisplayName = (
    name: string,
    firstName?: string | null,
    lastName?: string | null,
    whatsappChatId?: string | null,
    telegramChatId?: string | null,
    maxChatId?: string | null,
    phone?: string | null
  ) => {
    // If we have first_name or last_name, use them (without middle_name)
    if (firstName || lastName) {
      const displayName = [lastName, firstName].filter(Boolean).join(' ').trim();
      if (displayName) return displayName;
    }

    // Parse from full name if it's not a placeholder
    if (name && name !== 'Без имени' && !name.startsWith('Клиент ')) {
      // Parse "Фамилия Имя Отчество" -> "Фамилия Имя"
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0]} ${parts[1]}`; // Last + First only
      }
      return name;
    }
    
    if (name.startsWith('Клиент ')) {
      return name.replace('Клиент ', '');
    }
    
    // If name is "Без имени" or empty, extract phone from messenger chat_id and format it
    if (!name || name === 'Без имени') {
      // Try to extract phone from whatsapp_chat_id (format: 79123456789@c.us)
      if (whatsappChatId) {
        const waPhone = whatsappChatId.replace('@c.us', '').replace('@s.whatsapp.net', '');
        if (waPhone && /^\d{10,}$/.test(waPhone)) {
          if (waPhone.length === 11 && (waPhone.startsWith('7') || waPhone.startsWith('8'))) {
            return `+7 ${waPhone.slice(1, 4)} ${waPhone.slice(4, 7)}-${waPhone.slice(7, 9)}-${waPhone.slice(9)}`;
          }
          return `+${waPhone}`;
        }
      }
      
      // Try telegram_chat_id
      if (telegramChatId && /^\d{10,}$/.test(telegramChatId)) {
        const tgPhone = telegramChatId;
        if (tgPhone.length === 11 && (tgPhone.startsWith('7') || tgPhone.startsWith('8'))) {
          return `+7 ${tgPhone.slice(1, 4)} ${tgPhone.slice(4, 7)}-${tgPhone.slice(7, 9)}-${tgPhone.slice(9)}`;
        }
        return `+${tgPhone}`;
      }
      
      // Try max_chat_id
      if (maxChatId && /^\d{10,}$/.test(maxChatId)) {
        const maxPhone = maxChatId;
        if (maxPhone.length === 11 && (maxPhone.startsWith('7') || maxPhone.startsWith('8'))) {
          return `+7 ${maxPhone.slice(1, 4)} ${maxPhone.slice(4, 7)}-${maxPhone.slice(7, 9)}-${maxPhone.slice(9)}`;
        }
        return `+${maxPhone}`;
      }
      
      // Fallback to phone field
      if (phone) {
        const digits = phone.replace(/\D/g, '');
        if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
          return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
        }
        return phone;
      }
      
      return 'Без имени';
    }
    
    return name;
  };

  // Клиенты без тредов НЕ показываются при первой загрузке для скорости
  // Они появятся только при поиске или открытии модалов
  const clientChatsWithoutThreads: ClientCRMChat[] = [];

  const allChats = useMemo(() => [
    ...systemChats,
    // Только реальные клиентские чаты из threads (без загрузки всех clients)
    // Исключаем клиентов, связанных с преподавателями (они в папке "Преподаватели")
    ...threads
      .filter(thread => {
        // Teacher conversations now use teacher_id directly - no need to filter
        // Messages with teacher_id have client_id = NULL, so they won't appear here
        
        const nameForCheck = formatClientDisplayName(thread.client_name ?? '', thread.first_name, thread.last_name);
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
          
        // Используем аватар из threads: сначала мессенджер-специфичный (если есть), затем общий.
        const displayAvatar =
          thread.whatsapp_avatar_url ||
          thread.telegram_avatar_url ||
          thread.max_avatar_url ||
          thread.avatar_url ||
          null;
          
        return {
          id: thread.client_id,
          name: formatClientDisplayName(thread.client_name ?? 'Без имени', thread.first_name, thread.last_name, thread.whatsapp_chat_id, thread.telegram_chat_id, thread.max_chat_id, thread.client_phone),
          phone: thread.client_phone,
          branch: thread.client_branch,
          lastMessage: lastMsgDisplay,
          time: formatTime(thread.last_message_time),
          unread: thread.unread_count,
          type: 'client' as const,
          timestamp: thread.last_message_time ? new Date(thread.last_message_time).getTime() : 0,
          avatar_url: displayAvatar,
          last_message_messenger: thread.last_message_messenger,
          last_unread_messenger: thread.last_unread_messenger,
          last_message_failed: thread.last_message_failed,
        };
      }),
    // Клиенты без сообщений не показываются при первой загрузке
    ...clientChatsWithoutThreads
  ], [systemChats, threads, typingByClient, clientChatsWithoutThreads]);

  // Debug logging removed for performance

  // === UNIFIED SEARCH: 1 RPC вместо 3 отдельных запросов ===
  const { 
    phoneIds: phoneSearchClientIds,
    nameIds: nameSearchClientIds, 
    messageIds: messageSearchClientIds,
    allClientIds: allSearchClientIdsArray,
    isLoading: unifiedSearchLoading,
    getMessengerType 
  } = useUnifiedSearch(chatSearchQuery);
  
  // Combine all search results into a single Set
  const allSearchClientIds = useMemo(() => {
    return new Set(allSearchClientIdsArray);
  }, [allSearchClientIdsArray]);
  
  // Debug logging removed for performance
  
  // Load full thread data for search results that are not in loaded threads
  const { data: phoneSearchThreads = [], isLoading: phoneThreadsLoading } = usePhoneSearchThreads(allSearchClientIdsArray, threadClientIdsSet);
  
  // Load pinned chat threads that are NOT in the loaded threads
  const { data: pinnedChatThreads = [], isLoading: pinnedThreadsLoading } = usePinnedChatThreads(pinnedChatIds, threadClientIdsSet);
  
  // Debug logging removed for performance
  
  // Combined search loading state
  const isSearchLoading = chatSearchQuery.length >= 2 && (unifiedSearchLoading || phoneThreadsLoading);
  
  // Merge search threads and pinned threads into allChats
  const allChatsWithPhoneSearch = useMemo(() => {
    const existingIds = new Set(allChats.map(c => c.id));
    
    // Helper to convert thread to chat format
    const threadToChat = (thread: any, foundInMessages = false) => {
      const displayAvatar =
        thread.whatsapp_avatar_url ||
        thread.telegram_avatar_url ||
        thread.max_avatar_url ||
        thread.avatar_url ||
        null;
      
      return {
        id: thread.client_id,
        name: formatClientDisplayName(thread.client_name ?? 'Без имени', thread.first_name, thread.last_name, thread.whatsapp_chat_id, thread.telegram_chat_id, thread.max_chat_id, thread.client_phone),
        phone: thread.client_phone,
        branch: thread.client_branch,
        lastMessage: thread.last_message?.trim?.() || 'Нет сообщений',
        time: formatTime(thread.last_message_time),
        unread: thread.unread_count,
        type: 'client' as const,
        timestamp: thread.last_message_time ? new Date(thread.last_message_time).getTime() : 0,
        avatar_url: displayAvatar,
        last_message_messenger: thread.last_message_messenger,
        last_unread_messenger: thread.last_unread_messenger,
        last_message_failed: thread.last_message_failed,
        foundInMessages
      };
    };
    
    // Add pinned threads first (they should always be visible)
    const pinnedChatsFromThreads = pinnedChatThreads
      .filter(thread => !existingIds.has(thread.client_id))
      .map(thread => {
        existingIds.add(thread.client_id); // Mark as added
        return threadToChat(thread, false);
      });
    
    // Add search threads
    const searchChats = phoneSearchThreads
      .filter(thread => !existingIds.has(thread.client_id))
      .map(thread => threadToChat(thread, messageSearchClientIds.includes(thread.client_id)));
    
    // Debug logging removed for performance
    
    return [...allChats, ...pinnedChatsFromThreads, ...searchChats];
  }, [allChats, phoneSearchThreads, pinnedChatThreads, allSearchClientIds, phoneThreadsLoading, messageSearchClientIds]);

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
    (chat.type === 'client' && allSearchClientIds.has(chat.id))
  )
    .filter(chat => !getChatState(chat.id).isArchived) // Скрываем архивированные чаты
    .filter(chat => {
      // Skip filtering for corporate and teacher chats as they don't have client_id
      if (chat.type === "corporate" || chat.type === "teachers") return true;
      
      // Filter by client type using getClientStatus
      if (selectedClientType !== "all" && 'client_id' in chat && typeof chat.client_id === 'string') {
        const status = getClientStatus(chat.client_id);
        if (!status) return false;
        
        if (selectedClientType === "lead" && !status.isLead) return false;
        if (selectedClientType === "student" && status.isLead) return false;
      }
      
      return true;
    })
    // Фильтр по филиалу клиента (из UI dropdown) - сравнение через единый ключ
    .filter(chat => {
      if (selectedBranch === "all") return true;
      if (chat.type === "corporate" || chat.type === "teachers") return true;
      
      // Используем branch напрямую из chat (теперь приходит из threads RPC)
      const clientBranch = isClientChat(chat) ? chat.branch : null;
      if (!clientBranch) return true; // Если у клиента нет филиала - показываем

      // Сравниваем через единый нормализованный ключ
      return toBranchKey(clientBranch) === selectedBranch;
    })
    // Авто-фильтр для менеджеров с ограничениями по филиалу
    .filter(chat => {
      if (chat.type === "corporate" || chat.type === "teachers") return true;
      
      // Используем branch напрямую из chat
      const clientBranch = isClientChat(chat) ? chat.branch : null;
      
      return canAccessBranch(clientBranch);
    })
    .sort((a, b) => {
      // Сначала закрепленные чаты (только текущим пользователем)
      const aPinned = getChatState(a.id).isPinned;
      const bPinned = getChatState(b.id).isPinned;
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      
      // Затем чаты с ожидающей оплатой (закреплены наверху до подтверждения менеджером)
      const aPending = !!(a as any).has_pending_payment;
      const bPending = !!(b as any).has_pending_payment;
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;
      
      // При активном поиске: сначала люди (имя/телефон), потом сообщения
      if (chatSearchQuery.length >= 2) {
        const aFoundInMessages = (a as any).foundInMessages || messageSearchClientIds.includes(a.id);
        const bFoundInMessages = (b as any).foundInMessages || messageSearchClientIds.includes(b.id);
        // Люди (не найденные в сообщениях) идут первыми
        if (!aFoundInMessages && bFoundInMessages) return -1;
        if (aFoundInMessages && !bFoundInMessages) return 1;
      }
      
      // Сначала непрочитанные (по сообщениям / ручной отметке)
      const aShowEye = !!getChatState(a.id)?.isUnread;
      const bShowEye = !!getChatState(b.id)?.isUnread;
      const aUnread = a.unread > 0 || aShowEye;
      const bUnread = b.unread > 0 || bShowEye;
      
      if (aUnread && !bUnread) return -1;
      if (!aUnread && bUnread) return 1;

      // Чаты без сообщений — в конец списка
      const aNoMessages = a.lastMessage === 'Нет сообщений';
      const bNoMessages = b.lastMessage === 'Нет сообщений';
      if (aNoMessages && !bNoMessages) return 1;
      if (!aNoMessages && bNoMessages) return -1;

      // Внутри каждой группы сортируем по времени (новые сверху)
      return (b.timestamp || 0) - (a.timestamp || 0);
    });

  // Debug logging removed for performance

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

  // Только клиентские чаты для мобильного списка (без корпоративных, преподавателей, сообществ)
  const mobileClientChats = useMemo(() => 
    filteredChats.filter(chat => chat.type === 'client'),
    [filteredChats]
  );

  const activeChats = useMemo(() => 
    filteredChats
      .filter(chat => !getChatState(chat.id).isPinned)
      .filter(chat => {
        // Системные папки всегда отображаются
        if (chat.type === 'corporate' || chat.type === 'teachers') {
          return true;
        }
        if (!showOnlyUnread) return true;
        const chatState = getChatState(chat.id);
        const showEye = !!chatState?.isUnread;
        const unreadByMessages = chat.unread > 0;
        return showEye || unreadByMessages;
      }),
    [filteredChats, getChatState, showOnlyUnread]
  );

  // Активные чаты только клиентов для мобильной версии
  const mobileActiveChats = useMemo(() => 
    mobileClientChats
      .filter(chat => !getChatState(chat.id).isPinned)
      .filter(chat => {
        if (!showOnlyUnread) return true;
        const chatState = getChatState(chat.id);
        const showEye = !!chatState?.isUnread;
        const unreadByMessages = chat.unread > 0;
        return showEye || unreadByMessages;
      }),
    [mobileClientChats, getChatState, showOnlyUnread]
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
  const handleChatClick = useCallback((chatId: string, chatType: 'client' | 'corporate' | 'teachers' | 'communities', foundInMessages?: boolean, messengerType?: 'whatsapp' | 'telegram' | 'max' | null) => {
    console.log('Переключение на чат:', { chatId, chatType, foundInMessages, messengerType });
    
    // Только переключаемся на новый чат, если это действительно другой чат
    const isNewChat = activeChatId !== chatId || activeChatType !== chatType;
    
    // ВАЖНО: Сначала сбрасываем activeClientInfo чтобы избежать race condition
    // где старая информация клиента показывается для нового чата
    if (isNewChat) {
      setActiveClientInfo(null);
    }
    
    // МГНОВЕННОЕ переключение UI - без await
    setActiveChatId(chatId);
    setActiveChatType(chatType);
    
    // If chat was found via message search, pass search query to ChatArea
    // and switch to the messenger tab where the message was found
    if (foundInMessages && chatSearchQuery && chatSearchQuery.length >= 3) {
      setChatInitialSearchQuery(chatSearchQuery);
      
      // Switch to the messenger tab where the message was found
      const foundMessenger = messengerType || getMessengerType(chatId);
      if (foundMessenger) {
        setSelectedMessengerTab({ tab: foundMessenger, ts: Date.now() });
        // Clear after consumed so it doesn't block manual tab switching
        setTimeout(() => setSelectedMessengerTab(undefined), 500);
      }
    } else {
      setChatInitialSearchQuery(undefined);
      // Мгновенное переключение вкладки мессенджера из данных списка чатов
      if (messengerType) {
        setSelectedMessengerTab({ tab: messengerType, ts: Date.now() });
        setTimeout(() => setSelectedMessengerTab(undefined), 500);
      } else {
        setSelectedMessengerTab(undefined);
      }
    }
    
    // Сначала СИНХРОННО устанавливаем данные из кэша
    if (chatType === 'client' && isNewChat) {
      const existingClient = clients.find(c => c.id === chatId);
      const existingThread = threads.find(t => t.client_id === chatId);
      
      // Немедленно показываем данные из кэша (без ожидания загрузки телефона)
      if (existingClient) {
        setActiveClientInfo({
          name: existingClient.name,
          phone: existingClient.phone || existingThread?.client_phone || '',
          comment: existingClient.notes || 'Клиент',
          telegram_user_id: (existingClient as any).telegram_user_id || null,
          max_chat_id: (existingClient as any).max_chat_id || null,
          has_pending_payment: (existingClient as any).has_pending_payment || false
        });
      } else if (existingThread) {
        setActiveClientInfo({
          name: existingThread.client_name,
          phone: existingThread.client_phone || '',
          comment: 'Клиент',
          telegram_user_id: null,
          max_chat_id: null,
          has_pending_payment: (existingThread as any).has_pending_payment || false
        });
      }
      
      // Асинхронно подгружаем телефон и telegram_user_id в фоне (не блокируя UI)
      // Также загружаем базовые данные если не нашли в кэше (после восстановления из корзины)
      const currentChatId = chatId; // Замыкаем для проверки актуальности
      const needsFullFetch = !existingClient && !existingThread;
      setTimeout(() => {
        // NOTE: don't make the setTimeout handler itself `async` (can break TS typings in some builds)
        void (async () => {
          try {
            // Fetch phone from client_phone_numbers
            const { data: primaryPhone } = await supabase
              .from('client_phone_numbers')
              .select('phone, max_chat_id')
              .eq('client_id', currentChatId)
              .eq('is_primary', true)
              .maybeSingle();

            // Fetch client data - always get all needed fields
            const { data: clientData } = await supabase
              .from('clients')
              .select('name, notes, telegram_user_id, phone, max_chat_id, has_pending_payment')
              .eq('id', currentChatId)
              .single();

            const phone = primaryPhone?.phone || (clientData as any)?.phone;
            const telegramUserId = (clientData as any)?.telegram_user_id;
            const maxChatId = (primaryPhone as any)?.max_chat_id || (clientData as any)?.max_chat_id || null;
            
            // If we needed full fetch (restored from trash), set all data
            if (needsFullFetch && clientData) {
              setActiveClientInfo({
                name: (clientData as any).name || 'Без имени',
                phone: phone || '',
                comment: (clientData as any).notes || 'Клиент',
                telegram_user_id: telegramUserId || null,
                max_chat_id: maxChatId,
                has_pending_payment: (clientData as any).has_pending_payment || false
              });
            } else if (phone || telegramUserId || maxChatId) {
              setActiveClientInfo(prev => {
                if (!prev) return null;
                return { 
                  ...prev, 
                  phone: phone || prev.phone,
                  telegram_user_id: telegramUserId || prev.telegram_user_id,
                  max_chat_id: maxChatId || prev.max_chat_id
                };
              });
            }
          } catch (err) {
            console.error('Error loading client data async:', err);
          }
        })();
      }, 50); // Небольшая задержка чтобы не блокировать рендер
    } else if (chatType !== 'client') {
      setActiveClientInfo(null);
    }
    
    // НЕ помечаем клиентский чат автоматически как прочитанный при открытии
    // Чат помечается прочитанным только при:
    // 1. Отправке сообщения клиенту
    // 2. Нажатии "Не требует ответа"
    // 3. Нажатии "Отметить прочитанным" в контекстном меню
    if (isNewChat && chatType === 'teachers') {
      // Для преподавательских чатов сохраняем старое поведение
      setTimeout(() => {
        teacherChats.forEach((chat: any) => {
          if (chat.id) {
            markChatAsReadGlobally(chat.id).catch(() => {});
            markChatMessagesAsReadMutation.mutate(chat.id);
            markAsReadMutation.mutate(chat.id);
            markAsRead(chat.id);
          }
        });
      }, 100);
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
  }, [activeChatId, activeChatType, markChatAsReadGlobally, markChatMessagesAsReadMutation, markAsReadMutation, markAsRead, teacherChats, clients, threads, isMobile, chatSearchQuery, getMessengerType]);

  const handleChatAction = useCallback((chatId: string, action: 'unread' | 'read' | 'pin' | 'archive' | 'block') => {
    if (action === 'unread') {
      // Personal marker only (no DB updates for message-level is_read)
      markAsUnread(chatId);
    } else if (action === 'read') {
      // Отметить как прочитанное
      markAsRead(chatId);
      markAsReadMutation.mutate(chatId);
    } else if (action === 'pin') {
      togglePin(chatId);
    } else if (action === 'archive') {
      toggleArchive(chatId);
    }
    console.log(`${action} для чата:`, chatId);
  }, [markAsUnread, markAsRead, markAsReadMutation, togglePin, toggleArchive]);

  // "Не требует ответа" - marks chat as read both personally and globally
  const handleNoResponseNeeded = useCallback((chatId: string) => {
    markAsRead(chatId);
    markAsReadMutation.mutate(chatId);
    markChatAsReadGlobally(chatId).catch(err => 
      console.error('Error marking chat as read globally:', err)
    );
    console.log('No response needed for chat:', chatId);
  }, [markAsRead, markAsReadMutation, markChatAsReadGlobally]);

  // Handle URL parameter for deep linking from push notifications
  const handleShareClientCard = useCallback((chatId: string, chatName: string, chatPhone?: string, avatarUrl?: string | null, branch?: string | null) => {
    setShareCardClient({ open: true, id: chatId, name: chatName, phone: chatPhone, avatar_url: avatarUrl, branch });
  }, []);

  // This effect runs after handleChatClick is defined
  useEffect(() => {
    if (deepLinkProcessedRef.current) return;
    
    const clientIdFromUrl = searchParams.get('clientId');
    const tabFromUrl = searchParams.get('tab');
    
    if (clientIdFromUrl) {
      console.log('[CRM] Deep link detected: clientId =', clientIdFromUrl, 'tab =', tabFromUrl);
      deepLinkProcessedRef.current = true;
      
      // Open the chat with this client
      handleChatClick(clientIdFromUrl, 'client');
      setActiveTab('chats');
      
      // If tab=calls specified, switch to calls tab
      if (tabFromUrl === 'calls') {
        setActiveTab('calls');
      }
      
      // Clear URL params after processing to avoid re-triggering
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, handleChatClick, setActiveTab]);

  // Delete chat handler
  const handleDeleteChat = useCallback(async (chatId: string, chatName: string) => {
    setDeleteChatDialog({ open: true, chatId, chatName });
  }, []);

  const confirmDeleteChat = useCallback(async () => {
    if (!deleteChatDialog.chatId) return;
    const chatName = deleteChatDialog.chatName;
    setIsDeletingChat(true);
    try {
      // Use self-hosted API since clients live on the self-hosted DB
      const { selfHostedFetch, SELF_HOSTED_URL, SELF_HOSTED_ANON_KEY } = await import('@/lib/selfHostedApi');
      const { getAuthToken } = await import('@/lib/selfHostedApi');
      const token = await getAuthToken();
      const res = await fetch(`${SELF_HOSTED_URL}/rest/v1/clients?id=eq.${deleteChatDialog.chatId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SELF_HOSTED_ANON_KEY,
          'Authorization': `Bearer ${token || SELF_HOSTED_ANON_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ is_active: false }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `HTTP ${res.status}`);
      }
      
      // Invalidate all chat-related queries
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads-unread-priority'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-client-ids'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-chats'] });
      
      if (activeChatId === deleteChatDialog.chatId) {
        setActiveChatId(null);
      }
      setDeleteChatDialog({ open: false, chatId: '', chatName: '' });
      toast.success(`Чат с "${chatName}" удалён`);
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Не удалось удалить чат');
    } finally {
      setIsDeletingChat(false);
    }
  }, [deleteChatDialog.chatId, deleteChatDialog.chatName, activeChatId, queryClient, setActiveChatId]);

  // Link chat handler
  const handleLinkChat = useCallback((chatId: string, chatName: string) => {
    setLinkChatModal({ open: true, chatId, chatName });
  }, []);

  const handleLinkChatSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    queryClient.invalidateQueries({ queryKey: ['chat-threads-infinite'] });
    queryClient.invalidateQueries({ queryKey: ['chat-threads-unread-priority'] });
    queryClient.invalidateQueries({ queryKey: ['deleted-client-ids'] });
    queryClient.invalidateQueries({ queryKey: ['deleted-chats'] });
    queryClient.invalidateQueries({ queryKey: ['family-data'] }); // Refresh FamilyCard after merge
    if (activeChatId === linkChatModal.chatId) {
      setActiveChatId(null);
    }
  }, [queryClient, activeChatId, linkChatModal.chatId, setActiveChatId]);

  // Convert to teacher handler
  const handleConvertToTeacher = useCallback((chatId: string, chatName: string, phone?: string, email?: string) => {
    setConvertToTeacherModal({ 
      open: true, 
      clientId: chatId, 
      clientName: chatName,
      clientPhone: phone,
      clientEmail: email,
    });
  }, []);

  const handleConvertToTeacherSuccess = useCallback((teacherId?: string) => {
    queryClient.invalidateQueries({ queryKey: ['teachers'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-chats'] });
    queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    // Don't invalidate chat-threads-infinite — already updated optimistically in ConvertToTeacherModal
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    // Switch to teachers tab and open the teacher's chat
    setActiveTab('teachers');
    if (teacherId) {
      handleChatClick(teacherId, 'teachers');
    } else {
      setActiveChatId(null);
    }
  }, [queryClient, setActiveTab, setActiveChatId, handleChatClick]);

  // Bulk read/unread works only for client chats where chatId is a UUID (client_id).
  // If any non-UUID IDs slip into the selection (e.g. system chats), a single DB query may fail entirely.
  const isUuid = useCallback(
    (value: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
    []
  );

  const handleBulkUndo = useCallback((actionState: BulkActionState) => {
    console.log('[CRM] Undoing bulk action:', actionState.action, 'for', actionState.chatIds.length, 'chats');

    // Collect chat IDs for batch operations (read only)
    const chatsToMarkAsRead: string[] = [];

    actionState.chatIds.forEach(chatId => {
      const prevState = actionState.previousStates.get(chatId);

      if (actionState.action === 'read' && prevState) {
        // Restore unread state (personal marker only)
        if (!prevState.isRead) {
          if (isUuid(chatId)) {
            markAsUnread(chatId);
          }
        }
      } else if (actionState.action === 'unread' && prevState) {
        // Restore read state
        if (prevState.isRead) {
          if (isUuid(chatId)) {
            chatsToMarkAsRead.push(chatId);
            markChatAsReadGlobally(chatId);
            markAsRead(chatId);
          }
        }
      } else if (actionState.action === 'pin' && prevState) {
        // Restore previous pin state
        if (!prevState.isPinned) {
          togglePin(chatId); // Toggle back to unpinned
        }
      } else if (actionState.action === 'archive' && prevState) {
        // Restore previous archive state
        if (!prevState.isArchived) {
          toggleArchive(chatId); // Toggle back to unarchived
        }
      }
    });

    // Execute batch operations
    if (chatsToMarkAsRead.length > 0) {
      bulkMarkChatsAsReadMutation.mutate(chatsToMarkAsRead);
    }
  }, [markAsUnread, markAsRead, markChatAsReadGlobally, bulkMarkChatsAsReadMutation, togglePin, toggleArchive, isUuid]);

  const { startUndoTimer } = useBulkActionUndo({
    onUndo: handleBulkUndo,
    timeoutMs: 10000, // 10 seconds
  });

  // Bulk action confirmation handler
  const confirmBulkAction = useCallback(() => {
    const chatIdsArray = Array.from(selectedChatIds);
    const action = bulkActionConfirm.action;

    if (!action) return;

    const requiresDbUpdate = action === 'read';
    const actionableChatIds = requiresDbUpdate ? chatIdsArray.filter(isUuid) : chatIdsArray;
    const skippedChatIds = requiresDbUpdate ? chatIdsArray.filter((id) => !isUuid(id)) : [];
    if (requiresDbUpdate && skippedChatIds.length > 0) {
      toast.message(`Пропущено системных чатов: ${skippedChatIds.length}`);
    }
    if (requiresDbUpdate && actionableChatIds.length === 0) {
      toast.message('Выбраны только системные чаты — действие недоступно');
      setBulkSelectMode(false);
      setSelectedChatIds(new Set());
      setBulkActionConfirm({ open: false, action: null, count: 0 });
      return;
    }

    console.log('[CRM] Bulk action confirmed:', action, 'for', actionableChatIds.length, 'chats');

    // Save previous states for undo
    const previousStates = new Map<string, { isRead?: boolean; isPinned?: boolean; isArchived?: boolean }>();
    actionableChatIds.forEach(chatId => {
      const state = getChatState(chatId);
      previousStates.set(chatId, {
        isRead: isChatReadGlobally(chatId),
        isPinned: state?.isPinned || false,
        isArchived: state?.isArchived || false,
      });
    });

    // Execute action
    if (action === 'read') {
      // Use batch operation for efficiency - single database query
      bulkMarkChatsAsReadMutation.mutate(actionableChatIds, {
        onError: (err) => {
          console.error('[CRM] Bulk mark as read failed:', err);
          toast.error('Не удалось отметить как прочитанное');
        }
      });

      // Update local state immediately for all chats
      actionableChatIds.forEach(chatId => {
        markChatAsReadGlobally(chatId);
        markAsRead(chatId);
      });
    } else if (action === 'unread') {
      // Personal marker only (no DB updates for message-level is_read)
      actionableChatIds.forEach(chatId => {
        markAsUnread(chatId);
      });
    } else if (action === 'pin') {
      actionableChatIds.forEach(chatId => togglePin(chatId));
    } else if (action === 'archive') {
      actionableChatIds.forEach(chatId => toggleArchive(chatId));
    }

    // Start undo timer with toast
    startUndoTimer({
      action,
      chatIds: actionableChatIds,
      previousStates,
      timestamp: Date.now(),
    });

    setBulkSelectMode(false);
    setSelectedChatIds(new Set());
    setBulkActionConfirm({ open: false, action: null, count: 0 });
  }, [selectedChatIds, bulkActionConfirm.action, markChatAsReadGlobally, bulkMarkChatsAsReadMutation, markAsRead, markAsUnread, togglePin, toggleArchive, setBulkSelectMode, setSelectedChatIds, getChatState, isChatReadGlobally, startUndoTimer, isUuid]);

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
        comment: targetClient.notes || 'Клиент',
        telegram_user_id: (targetClient as any).telegram_user_id || null,
        max_chat_id: (targetClient as any).max_chat_id || null,
        has_pending_payment: (targetClient as any).has_pending_payment || false
      };
    }
    if (targetThread) {
      return {
        name: targetThread.client_name,
        phone: targetThread.client_phone || '',
        comment: 'Клиент',
        telegram_user_id: null,
        max_chat_id: null,
        has_pending_payment: (targetThread as any).has_pending_payment || false
      };
    }
    return {
      name: 'Выберите чат',
      phone: '',
      comment: '',
      telegram_user_id: null,
      max_chat_id: null,
      has_pending_payment: false
    };
  };

  // Memoized AIHub props that depend on handleChatClick / getActiveClientInfo
  const handleAIHubOpenChat = useCallback((clientId: string, messageId?: string) => {
    if (messageId) setHighlightedMessageId(messageId);
    handleChatClick(clientId, 'client');
  }, [handleChatClick]);
  const aiHubContext = useMemo(() => ({
    currentPage: 'CRM',
    activeClientId: activeChatId,
    activeClientName: activeChatId ? getActiveClientInfo(activeChatId).name : null,
    userRole: role,
    userBranch: profile?.branch,
    activeChatType
  }), [activeChatId, role, profile?.branch, activeChatType]);
  const aiHubOnOpenModal = useMemo(() => ({
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
  }), [handleChatClick]);

  // Вызываем getActiveClientInfo ОДИН раз, чтобы избежать race conditions
  const currentChatClientInfo = useMemo(() => {
    if (!activeChatId || activeChatType !== 'client') {
      return { name: 'Выберите чат', phone: '', comment: '', telegram_user_id: null, max_chat_id: null, has_pending_payment: false };
    }
    return getActiveClientInfo(activeChatId);
  }, [activeChatId, activeChatType, activeClientInfo, clients, threads]);

  const handleCreateNewChat = async (clientData: any) => {
    try {
      // clientData is the already created client from NewChatModal
      const clientId = clientData?.id;
      const clientName = clientData?.name;
      
      if (!clientId) {
        console.error('handleCreateNewChat: no client id provided');
        return;
      }
      
      // Create initial system message directly
      await supabase.from('chat_messages').insert([
        {
          client_id: clientId,
          message_text: `Создан чат с ${clientName || 'клиентом'}`,
          message_type: 'system',
          is_read: false,
        }
      ]);

      // Refresh threads and messages
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages', clientId] });
      
      // Switch to the new client's chat
      handleChatClick(clientId, 'client');
      
      console.log('Новый клиент создан:', clientData);
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
  const handleMobileChatOSClick = () => {
    // ChatOS shows inline AI Hub section (like clients list)
    setActiveChatType('chatos');
    setActiveChatId(null);
    setActiveTab('chats');
    if (isMobile) {
      setLeftSidebarOpen(false);
      setRightSidebarOpen(false);
    }
  };

  const handleMobileTeachersClick = () => {
    setActiveChatType('teachers');
    setActiveChatId(null);
    setActiveTab('chats');
    if (isMobile) {
      setLeftSidebarOpen(false);
      setRightSidebarOpen(false);
    }
  };

  const handleMobileClientsClick = () => {
    setActiveChatType('client');
    setActiveChatId(null);
    setActiveTab('chats');
    if (isMobile) {
      setLeftSidebarOpen(false);
      setRightSidebarOpen(false);
    }
  };

  const handleMobileKPIClick = () => {
    // KPI opens employee dashboard
    setActiveChatType('communities'); // Reuse communities type for now, will show KPI content
    setActiveChatId(null);
    if (isMobile) {
      setLeftSidebarOpen(false);
      setRightSidebarOpen(false);
    }
  };

  const handleMobileNewChatClick = () => {
    setShowNewChatModal(true);
  };

  const handleMobileEmployeeClick = () => {
    setShowAddEmployeeModal(true);
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
      type: modalType as PinnedModalType,
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

  // Обработчик для написания сообщения пользователю через ChatOS
  const handleMessageUser = useCallback((userId: string, userName: string) => {
    // Set target staff user ID for AIHubInline to auto-open their chat
    setInitialStaffUserId(userId);
    // Switch to ChatOS
    setActiveChatType('chatos');
    setActiveTab('chats');
    toast.info(`Открываем чат с ${userName}`);
  }, [setActiveTab, setActiveChatType]);

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
    { icon: BarChart3, label: "KPI" },
    { icon: MessageCircle, label: "Уведомления" },
    { icon: MessageSquare, label: "WhatsApp" },
    { icon: UserPlus, label: "Сотрудники", isAction: true },
    { icon: Settings, label: "Настройки" },
    ...(canAccessAdmin ? [{ icon: Shield, label: "Админ-панель" }] : []),
  ];


  // Calculate total unread messages from message-level read flags
  const totalUnreadCount = filteredChats.reduce((total, chat) => {
    return total + (chat.unread || 0);
  }, 0);

  return (
      <TooltipProvider>
        <div className="crm-container h-[100svh] flex flex-col overflow-hidden relative">
          {!voiceAssistantOpen && <ChatBubbleNotification floating />}
      {/* Фиксированный хедер сверху на мобильной версии - скрываем когда открыт чат с клиентом */}
      {isMobile && !(activeChatId && activeChatType === 'client') && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b">
          <div className="flex items-center justify-end h-11 px-3">
            <UnifiedManagerWidget
              managerName={profile && profile.first_name && profile.last_name 
                ? `${profile.first_name} ${profile.last_name}` 
                : 'Менеджер'}
              onSignOut={handleSignOut}
              onDashboardClick={() => setShowDashboardModal(true)}
            />
          </div>
        </div>
      )}
      
      {/* User Header - скрыт на мобильной версии */}
      {!isMobile && (
        <div className="bg-background border-b shrink-0">
          <div className="flex items-center justify-between w-full mx-auto px-4 h-14">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-primary font-bold text-xl flex-shrink-0">🎓</span>
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
              <UnifiedManagerWidget
                managerName={profile && profile.first_name && profile.last_name 
                  ? `${profile.first_name} ${profile.last_name}` 
                  : 'Менеджер'}
                onSignOut={handleSignOut}
                onDashboardClick={() => setShowDashboardModal(true)}
              />
            </div>
          </div>
        </div>
      )}

      <div className={`flex flex-1 min-h-0 w-full overflow-hidden ${isMobile && !(activeChatId && activeChatType === 'client') ? 'pt-12' : ''}`}> 
        {/* Left Unified Sidebar - Desktop */}
        <div className={`${
          isMobile ? 'hidden' : 'flex'
        } w-80 lg:w-96 shrink-0 bg-background border-r flex-col h-full min-h-0 transition-all duration-300`}>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full min-h-0">
            <div className="relative m-2 shrink-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="menu" className="rounded-xl ml-2">Меню</TabsTrigger>
                <TabsTrigger value="chats" className="mr-2 rounded-xl">
                  <span>Чаты</span>
                </TabsTrigger>
              </TabsList>
              {/* NewChatModal moved outside TabsTrigger to avoid button nesting */}
              <div className="absolute right-5 top-1/2 -translate-y-1/2 z-10">
                <NewChatModal 
                  onCreateChat={handleCreateNewChat}
                  onExistingClientFound={handleExistingClientFound}
                >
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-muted/30 rounded-md">
                    <Plus className="h-3 w-3" />
                  </Button>
                </NewChatModal>
              </div>
            </div>
            
            <TabsContent value="menu" className="mt-0 flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col">
              {/* Плашка "Скоро" для не-админов */}
              {!isAdmin && (
                <div className="mx-2 mt-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2 text-primary">
                    <span className="text-lg">🚀</span>
                    <div>
                      <p className="font-medium text-sm">Скоро</p>
                      <p className="text-xs text-muted-foreground">Меню будет доступно всем пользователям</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="p-2 space-y-1 overflow-y-auto flex-1">
                {menuItems.map((item, index) => (
                  'isAction' in item && item.isAction ? (
                    // Simple action button (opens modal directly without Dialog wrapper)
                    <button
                      key={index}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${isAdmin ? 'hover:bg-muted/30 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                      onClick={() => isAdmin && handleMenuClick(item.label)}
                      disabled={!isAdmin}
                    >
                      <item.icon className="h-4 w-4 shrink-0 text-muted-foreground stroke-1" />
                      <span className="text-sm flex-1 text-foreground">
                        {item.label}
                      </span>
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground/30" />
                    </button>
                  ) : (
                  <Dialog key={index} open={openModal === item.label} onOpenChange={(open) => !open && handleMenuModalClose()}>
                    <DialogTrigger asChild>
                      <button
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${isAdmin ? 'hover:bg-muted/30 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                        onClick={(e) => {
                          if (!isAdmin) {
                            e.preventDefault();
                            e.stopPropagation();
                            return;
                          }
                          handleMenuClick(item.label);
                        }}
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
                          {openModal === item.label && item.label === "KPI" && (
                            <div className="h-full">
                              <EmployeeKPISection />
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
                  )
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
                      <DropdownMenu>
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
                          <MapPin className={`h-3 w-3 text-muted-foreground ${selectedBranch !== "all" ? "ml-5" : ""}`} />
                          <span>Все филиалы</span>
                        </div>
                      </DropdownMenuItem>
                      {filterAllowedBranches(branches).map((branch) => {
                        const branchKey = toBranchKey(branch.name);
                        if (!branchKey) return null;

                        return (
                          <DropdownMenuItem key={branch.id} onClick={() => setSelectedBranch(branchKey)}>
                            <div className="flex items-center gap-2">
                              {selectedBranch === branchKey && <Check className="h-3 w-3" />}
                              <MapPin className={`h-3 w-3 text-muted-foreground ${selectedBranch !== branchKey ? "ml-5" : ""}`} />
                              <span>{branch.name}</span>
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
                              resetBranch();
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 w-8 p-0 rounded-lg border border-muted text-muted-foreground hover:bg-muted hover:text-foreground relative",
                      deletedChats.length > 0 && "text-destructive border-destructive/30"
                    )}
                    onClick={() => setTrashDialogOpen(true)}
                    title="Корзина"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletedChats.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium flex items-center justify-center px-1">
                        {deletedChats.length > 99 ? '99+' : deletedChats.length}
                      </span>
                    )}
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
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 ml-2"
                        >
                          <ListChecks className="h-4 w-4 mr-1" />
                          Выбрать все
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-1" align="start">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-8 px-2"
                          onClick={() => {
                            const allChatIds = new Set(filteredChats.map(chat => chat.id));
                            console.log('[CRM] Select all:', allChatIds.size, 'chats');
                            setSelectedChatIds(allChatIds);
                          }}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Выбрать все ({filteredChats.length})
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-8 px-2"
                          onClick={() => {
                            setSelectedChatIds(new Set());
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Снять выбор
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-8 px-2"
                          onClick={() => {
                            // Инвертировать выбор
                            const allIds = new Set(filteredChats.map(chat => chat.id));
                            const newSelected = new Set<string>();
                            allIds.forEach(id => {
                              if (!selectedChatIds.has(id)) {
                                newSelected.add(id);
                              }
                            });
                            setSelectedChatIds(newSelected);
                          }}
                        >
                          <ListChecks className="h-4 w-4 mr-2" />
                          Инвертировать
                        </Button>
                        
                        {/* Bulk actions when items selected */}
                        {selectedChatIds.size > 0 && (
                          <>
                            <div className="h-px bg-border my-1" />
                            <div className="px-2 py-1 text-xs text-muted-foreground font-medium">
                              Действия ({selectedChatIds.size})
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start h-8 px-2"
                              onClick={() => {
                                setBulkActionConfirm({ 
                                  open: true, 
                                  action: 'read', 
                                  count: selectedChatIds.size 
                                });
                              }}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Отметить прочитанным
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start h-8 px-2"
                              onClick={() => {
                                setBulkActionConfirm({ 
                                  open: true, 
                                  action: 'unread', 
                                  count: selectedChatIds.size 
                                });
                              }}
                            >
                              <EyeOff className="h-4 w-4 mr-2" />
                              Отметить непрочитанным
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start h-8 px-2"
                              onClick={() => {
                                setBulkActionConfirm({ 
                                  open: true, 
                                  action: 'pin', 
                                  count: selectedChatIds.size 
                                });
                              }}
                            >
                              <Pin className="h-4 w-4 mr-2" />
                              Закрепить
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start h-8 px-2"
                              onClick={() => {
                                setBulkActionConfirm({ 
                                  open: true, 
                                  action: 'archive', 
                                  count: selectedChatIds.size 
                                });
                              }}
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              Архивировать
                            </Button>
                          </>
                        )}
                      </PopoverContent>
                    </Popover>
                    {selectedChatIds.size > 0 && (
                      <div className="flex gap-1 ml-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => {
                            setBulkActionConfirm({ 
                              open: true, 
                              action: 'read', 
                              count: selectedChatIds.size 
                            });
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
                            setBulkActionConfirm({ 
                              open: true, 
                              action: 'unread', 
                              count: selectedChatIds.size 
                            });
                          }}
                          title="Отметить непрочитанным"
                        >
                          <EyeOff className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => {
                            setBulkActionConfirm({ 
                              open: true, 
                              action: 'pin', 
                              count: selectedChatIds.size 
                            });
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
                            setBulkActionConfirm({ 
                              open: true, 
                              action: 'archive', 
                              count: selectedChatIds.size 
                            });
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
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <div className="p-3 flex flex-col flex-1 min-h-0 relative z-10 pointer-events-auto bg-background">
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
                             const unreadByMessages = Number(chat.unread) > 0;
                             const displayUnread = showEye || unreadByMessages;
                             const foundInMessages = (chat as any).foundInMessages || messageSearchClientIds.includes(chat.id);
                             const messengerType = foundInMessages && getMessengerType 
                               ? getMessengerType(chat.id) 
                               : ((chat as any).last_unread_messenger || (chat as any).last_message_messenger || null);

                             return (
                               <ChatListItem
                                 key={chat.id}
                                 chat={chat}
                                 isActive={chat.id === activeChatId}
                                 isPinned={chatState.isPinned}
                                 isArchived={chatState.isArchived}
                                 displayUnread={displayUnread}
                                 showEye={showEye}
                                 isInWorkByOthers={isInWorkByOthers(chat.id)}
                                 pinnedByUserName={getPinnedByUserName(chat.id)}
                                 pinnedByUserId={getPinnedByUserId ? getPinnedByUserId(chat.id) : undefined}
                                 isPinnedByUserOnline={isUserOnline && getPinnedByUserId ? isUserOnline(getPinnedByUserId(chat.id) || '') : false}
                                 allPinners={getAllPinners(chat.id)}
                                 onMessageUser={handleMessageUser}
                                 profile={profile}
                                 bulkSelectMode={bulkSelectMode}
                                 isSelected={selectedChatIds.has(chat.id)}
                                 foundInMessages={foundInMessages}
                                 searchQuery={chatSearchQuery}
                                 typingInfo={typingByClient[chat.id] || null}
                                 presenceInfo={presenceByClient[chat.id] || null}
                                 isNewMessage={newMessageClientIds.has(chat.id)}
                                 onChatClick={() => handleChatClick(chat.id, chat.type, foundInMessages, messengerType)}
                                 onMarkUnread={() => handleChatAction(chat.id, 'unread')}
                                 onMarkRead={() => handleChatAction(chat.id, 'read')}
                                 onPinDialog={() => handleChatAction(chat.id, 'pin')}
                                 onArchive={() => handleChatAction(chat.id, 'archive')}
                                 onBlock={chat.type === 'client' ? () => handleChatAction(chat.id, 'block') : undefined}
                                 onDelete={chat.type === 'client' ? () => handleDeleteChat(chat.id, chat.name) : undefined}
                                 onLinkToClient={chat.type === 'client' ? () => handleLinkChat(chat.id, chat.name) : undefined}
                                 onConvertToTeacher={chat.type === 'client' ? () => handleConvertToTeacher(chat.id, chat.name, chat.phone, (chat as any).email) : undefined}
                                 onNoResponseNeeded={() => handleNoResponseNeeded(chat.id)}
                                 onShareClientCard={chat.type === 'client' ? () => handleShareClientCard(chat.id, chat.name, chat.phone, chat.avatar_url, (chat as any).branch) : undefined}
                                 onBulkSelect={() => handleBulkSelectToggle(chat.id)}
                               />
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
                          getPinnedByUserId={getPinnedByUserId}
                          isUserOnline={isUserOnline}
                          getAllPinners={getAllPinners}
                          onMessageUser={handleMessageUser}
                          messageSearchClientIds={messageSearchClientIds}
                          getMessengerType={getMessengerType}
                          searchQuery={chatSearchQuery}
                          typingByClient={typingByClient}
                          presenceByClient={presenceByClient}
                          newMessageClientIds={newMessageClientIds}
                          onChatClick={handleChatClick}
                          onChatAction={handleChatAction}
                          onBulkSelect={handleBulkSelectToggle}
                          onDeleteChat={handleDeleteChat}
                          onLinkChat={handleLinkChat}
                          onConvertToTeacher={handleConvertToTeacher}
                          onNoResponseNeeded={handleNoResponseNeeded}
                          onShareClientCard={handleShareClientCard}
                          isLoading={threadsLoading}
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
                        getPinnedByUserId={getPinnedByUserId}
                        isUserOnline={isUserOnline}
                        getAllPinners={getAllPinners}
                        onMessageUser={handleMessageUser}
                        messageSearchClientIds={messageSearchClientIds}
                        getMessengerType={getMessengerType}
                        searchQuery={chatSearchQuery}
                        typingByClient={typingByClient}
                        presenceByClient={presenceByClient}
                        newMessageClientIds={newMessageClientIds}
                        onChatClick={handleChatClick}
                        onChatAction={handleChatAction}
                        onBulkSelect={handleBulkSelectToggle}
                        onDeleteChat={handleDeleteChat}
                        onLinkChat={handleLinkChat}
                        onNoResponseNeeded={handleNoResponseNeeded}
                        onShareClientCard={handleShareClientCard}
                      />
                    </div>
                  )}

                  {chatSearchQuery && isSearchLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm z-10">
                      <div className="relative">
                        <Search className="h-10 w-10 text-primary animate-bounce" />
                        <div className="absolute inset-0 h-10 w-10 rounded-full border-2 border-primary/30 animate-ping" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Поиск...
                      </p>
                    </div>
                  )}

                  {filteredChats.length === 0 && chatSearchQuery && !isSearchLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
                      <div className="relative">
                        <Search className="h-10 w-10 text-muted-foreground/50" />
                        <X className="h-4 w-4 text-destructive absolute -bottom-1 -right-1 bg-background rounded-full" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Ничего не найдено
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        Попробуйте изменить запрос
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Center - Chat Area или Мобильный контент */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-background relative">
          {/* Показываем меню на мобильной версии когда активна вкладка menu */}
          {isMobile && activeTab === 'menu' ? (
            <div className="p-4 space-y-2 overflow-y-auto">
              {/* Плашка "Скоро" для не-админов */}
              {!isAdmin && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg mb-4">
                  <div className="flex items-center gap-2 text-primary">
                    <span className="text-lg">🚀</span>
                    <div>
                      <p className="font-medium text-sm">Скоро</p>
                      <p className="text-xs text-muted-foreground">Меню будет доступно всем пользователям</p>
                    </div>
                  </div>
                </div>
              )}
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left border bg-card ${isAdmin ? 'hover:bg-muted cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                  onClick={() => isAdmin && handleMenuClick(item.label)}
                  disabled={!isAdmin}
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
          ) : isMobile && activeTab === 'chats' && !activeChatId && activeChatType === 'client' ? (
            <div className="flex flex-col flex-1 min-h-0">
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
                  <DropdownMenu>
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
                          <MapPin className={`h-3 w-3 text-muted-foreground ${selectedBranch !== "all" ? "ml-5" : ""}`} />
                          <span>Все филиалы</span>
                        </div>
                      </DropdownMenuItem>
                      {filterAllowedBranches(branches).map((branch) => {
                        const branchKey = toBranchKey(branch.name);
                        if (!branchKey) return null;

                        return (
                          <DropdownMenuItem key={branch.id} onClick={() => setSelectedBranch(branchKey)}>
                            <div className="flex items-center gap-2">
                              {selectedBranch === branchKey && <Check className="h-3 w-3" />}
                              <MapPin className={`h-3 w-3 text-muted-foreground ${selectedBranch !== branchKey ? "ml-5" : ""}`} />
                              <span>{branch.name}</span>
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
                              resetBranch();
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
                    className={cn(
                      "h-8 w-8 p-0 rounded-lg border border-muted text-muted-foreground hover:bg-muted hover:text-foreground relative",
                      deletedChats.length > 0 && "text-destructive border-destructive/30"
                    )}
                    onClick={() => setTrashDialogOpen(true)}
                    title="Корзина"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletedChats.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium flex items-center justify-center px-1">
                        {deletedChats.length > 99 ? '99+' : deletedChats.length}
                      </span>
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  {/* Закрепленные чаты */}
                  {mobileClientChats.some(chat => getChatState(chat.id).isPinned) && (
                    <div className="px-4 pt-4 mb-1 shrink-0">
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
                           const pinnedUnreadCount = mobileClientChats
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
                           {mobileClientChats
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
                                  className="w-full p-3 text-left rounded-lg transition-all duration-200 bg-card border border-border/50 hover:shadow-md hover:bg-accent/30"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                     <div 
                                        className="flex items-start gap-3 flex-1 cursor-pointer"
                                        onClick={() => {
                                          handleChatClick(chat.id, chat.type);
                                        }}
                                      >
                                        <div className="relative flex-shrink-0">
                                        {chat.avatar_url ? (
                                          <img 
                                            src={(chat.avatar_url || '').replace(/^http:\/\//i, 'https://')} 
                                            alt={`${chat.name} avatar`} 
                                            className="w-12 h-12 rounded-full object-cover ring-2 ring-border/30 shadow-sm"
                                            loading="lazy"
                                            decoding="async"
                                            referrerPolicy="no-referrer"
                                            crossOrigin="anonymous"
                                            onError={(e) => {
                                              const target = e.currentTarget as HTMLImageElement;
                                              target.style.display = 'none';
                                              const fallback = target.nextElementSibling as HTMLElement;
                                              if (fallback) fallback.style.display = 'flex';
                                            }}
                                          />
                                        ) : null}
                                        <div 
                                          className={`w-12 h-12 rounded-full bg-[hsl(var(--avatar-blue))] shadow-sm flex items-center justify-center text-[hsl(var(--text-primary))] font-medium text-base ring-2 ring-border/30 ${chat.avatar_url ? 'hidden' : ''}`}
                                        >
                                          {chat.name?.split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '?'}
                                        </div>
                                        {/* Messenger icon badge */}
                                        {(() => {
                                          const messenger = (chat as any).last_unread_messenger;
                                          if (!messenger) return null;
                                          return (
                                            <div 
                                              className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-background shadow-sm ${
                                                messenger === 'whatsapp' ? 'bg-[#25D366]' :
                                                messenger === 'telegram' ? 'bg-[#0088cc]' :
                                                messenger === 'max' ? 'bg-purple-500' :
                                                messenger === 'calls' ? 'bg-red-500' : 'bg-gray-500'
                                              }`}
                                            >
                                              {messenger === 'whatsapp' && <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>}
                                              {messenger === 'telegram' && <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-white"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>}
                                              {messenger === 'max' && <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>}
                                              {messenger === 'calls' && <Phone className="w-2 h-2 text-white" />}
                                            </div>
                                          );
                                        })()}
                                        </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                          <p className={`text-sm ${displayUnread ? 'font-semibold' : 'font-medium'} truncate`}>
                                            {chat.name}
                                          </p>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Pin className="h-3.5 w-3.5 text-orange-500 flex-shrink-0 cursor-default" />
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-xs">
                                              📌 Закреплено вами
                                            </TooltipContent>
                                          </Tooltip>
                                        </div>
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
                                            <DropdownMenuItem onClick={() => handleConvertToTeacher(chat.id, chat.name, chat.phone, (chat as any).email)}>
                                              <GraduationCap className="mr-2 h-4 w-4 text-purple-600" />
                                              <span>Перевести в преподаватели</span>
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
                      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-1.5 mb-2 bg-gradient-to-r from-accent/30 to-transparent rounded-lg shrink-0">
                          <h3 className="text-sm font-semibold text-foreground/80">
                            Активные чаты
                          </h3>
                          <div className="flex items-center gap-2">
                            {/* Unread filter button - only show if there are unread chats */}
                            {mobileClientChats.filter(chat => !getChatState(chat.id).isPinned && (getChatState(chat.id)?.isUnread || (chat.unread > 0))).length > 0 && (
                              <Button
                                variant={showOnlyUnread ? "default" : "outline"}
                                size="sm"
                                className="h-5 px-2 py-0.5 text-xs min-w-[20px]"
                                onClick={() => setShowOnlyUnread(!showOnlyUnread)}
                              >
                                {mobileClientChats.filter(chat => !getChatState(chat.id).isPinned && (getChatState(chat.id)?.isUnread || (chat.unread > 0))).length}
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
                          chats={mobileActiveChats}
                          activeChatId={activeChatId}
                          profile={profile}
                          bulkSelectMode={bulkSelectMode}
                          selectedChatIds={selectedChatIds}
                          getChatState={getChatState}
                          isChatReadGlobally={isChatReadGlobally}
                          isInWorkByOthers={isInWorkByOthers}
                          getPinnedByUserName={getPinnedByUserName}
                          getPinnedByUserId={getPinnedByUserId}
                          isUserOnline={isUserOnline}
                          getAllPinners={getAllPinners}
                          onMessageUser={handleMessageUser}
                          messageSearchClientIds={messageSearchClientIds}
                          getMessengerType={getMessengerType}
                          searchQuery={chatSearchQuery}
                          typingByClient={typingByClient}
                          presenceByClient={presenceByClient}
                          newMessageClientIds={newMessageClientIds}
                          onChatClick={handleChatClick}
                          onChatAction={handleChatAction}
                          onBulkSelect={handleBulkSelectToggle}
                          onDeleteChat={handleDeleteChat}
                          onLinkChat={handleLinkChat}
                          onConvertToTeacher={handleConvertToTeacher}
                          onNoResponseNeeded={handleNoResponseNeeded}
                          onShareClientCard={handleShareClientCard}
                          isLoading={threadsLoading}
                          onRefresh={refetchThreads}
                          hasNextPage={hasNextPage}
                          isFetchingNextPage={isFetchingNextPage}
                          onLoadMore={loadMore}
                          bottomPadding={'calc(4rem + env(safe-area-inset-bottom, 0px))'}
                        />
                      </div>
                    </>
                  ) : (
                    /* Архивные чаты - Mobile */
                    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-1.5 mb-2 bg-gradient-to-r from-orange-500/20 to-transparent rounded-lg shrink-0">
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
                        getPinnedByUserId={getPinnedByUserId}
                        isUserOnline={isUserOnline}
                        getAllPinners={getAllPinners}
                        onMessageUser={handleMessageUser}
                        messageSearchClientIds={messageSearchClientIds}
                        getMessengerType={getMessengerType}
                        searchQuery={chatSearchQuery}
                        typingByClient={typingByClient}
                        presenceByClient={presenceByClient}
                        newMessageClientIds={newMessageClientIds}
                        onChatClick={handleChatClick}
                        onChatAction={handleChatAction}
                        onBulkSelect={handleBulkSelectToggle}
                        onDeleteChat={handleDeleteChat}
                        onLinkChat={handleLinkChat}
                        onNoResponseNeeded={handleNoResponseNeeded}
                        onShareClientCard={handleShareClientCard}
                      />
                    </div>
                  )}
              </div>
            </div>
          ) : activeChatId && activeChatType === 'client' ? (
            <div className="flex-1 flex flex-col min-h-0 animate-fade-in" key={`chat-wrapper-${activeChatId}`}>
              <ChatArea
                key={activeChatId}
                clientId={activeChatId}
                clientName={currentChatClientInfo.name}
                clientPhone={currentChatClientInfo.phone}
                clientTelegramUserId={currentChatClientInfo.telegram_user_id}
                clientMaxId={currentChatClientInfo.max_chat_id}
                clientComment={currentChatClientInfo.comment}
                onMessageChange={setHasUnsavedChat}
                activePhoneId={activePhoneId}
                onOpenTaskModal={() => {
                  setPinnedTaskClientId(activeChatId || '');
                  setShowAddTaskModal(true);
                }}
                onOpenInvoiceModal={() => setShowInvoiceModal(true)}
                managerName={[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Менеджер поддержки'}
                onBackToList={isMobile ? () => {
                  setActiveChatId('');
                  setActiveTab('chats');
                } : undefined}
                onChatAction={handleChatAction}
                rightPanelCollapsed={rightPanelCollapsed}
                onToggleRightPanel={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                onOpenClientInfo={isMobile ? () => setRightSidebarOpen(true) : undefined}
                initialMessengerTab={selectedMessengerTab?.tab}
                messengerTabTimestamp={selectedMessengerTab?.ts}
                initialSearchQuery={chatInitialSearchQuery}
                highlightedMessageId={highlightedMessageId}
                hasPendingPayment={(currentChatClientInfo as any).has_pending_payment || false}
                onForwardSent={(recipient) => {
                  if (recipient.type === 'group') {
                    setInitialGroupChatId(recipient.id);
                  } else {
                    setInitialStaffUserId(recipient.id);
                  }
                  setVoiceAssistantOpen(true);
                }}
                onOpenAssistant={() => {
                  markAssistantAsRead();
                  setVoiceAssistantOpen(true);
                }}
              />
            </div>
          ) : activeChatType === 'corporate' ? (
            <CorporateChatArea 
              onMessageChange={setHasUnsavedChat}
            />
          ) : activeChatType === 'teachers' ? (
            <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden w-full animate-fade-in" key={`teacher-wrapper-${activeChatId}`}>
              <TeacherChatArea 
                selectedTeacherId={activeChatId === 'teachers' ? 'teachers-group' : activeChatId}
                onSelectTeacher={(teacherId: string | null) => {
                  setSelectedTeacherId(teacherId);
                  if (teacherId) {
                    handleChatClick(teacherId, 'teachers');
                  } else {
                    // Back to the teachers list inside the teachers folder (mobile + desktop)
                    setActiveChatId(null);
                  }
                }}
              />
            </div>
          ) : activeChatType === 'chatos' ? (
            <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden w-full animate-fade-in">
              <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                <AIHubInline 
                  context={{
                    currentPage: 'crm',
                    activeClientId: activeChatId,
                    activeClientName: currentChatClientInfo.name,
                    userBranch: profile?.branch || undefined,
                    activeChatType
                  }}
                  onOpenChat={(clientId: string, messageId?: string) => {
                    if (messageId) setHighlightedMessageId(messageId);
                    handleChatClick(clientId, 'client');
                  }}
                  onBack={() => setActiveChatType('client')}
                  initialStaffUserId={initialStaffUserId}
                  initialGroupChatId={initialGroupChatId}
                  onClearInitialGroupChatId={() => setInitialGroupChatId(null)}
                  onClearInitialStaffUserId={() => setInitialStaffUserId(null)}
                  initialAssistantMessage={initialAssistantMessage}
                  onClearInitialAssistantMessage={() => {
                    setInitialAssistantMessage(null);
                    // Clear quick reply category after first user response
                    setQuickReplyCategory(null);
                  }}
                  quickReplyCategory={quickReplyCategory}
                  onOpenScripts={() => setShowScriptsModal(true)}
                />
              </Suspense>
            </div>
          ) : activeChatType === 'communities' ? (
            isMobile ? (
              <EmployeeKPISection className="flex-1" />
            ) : (
              <CommunityChatArea 
                onMessageChange={setHasUnsavedChat}
              />
            )
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
          
          {/* Плавающая кнопка ассистента для десктопа - доступна на всех вкладках */}
          {!isMobile && !voiceAssistantOpen && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => {
                    markAssistantAsRead();
                    setVoiceAssistantOpen(true);
                  }}
                  className={cn(
                    "fixed z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all group",
                    activeChatId ? "bottom-20 right-4 xl:bottom-6 xl:right-6" : "bottom-6 right-6",
                    assistantUnreadCount > 0 && "animate-pulse ring-4 ring-primary/30"
                  )}
                  size="icon"
                >
                  <Sparkles className="h-6 w-6 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-125" />
                  {assistantUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs font-medium flex items-center justify-center">
                      {assistantUnreadCount > 99 ? '99+' : assistantUnreadCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{assistantUnreadCount > 0 ? `Ассистент (${assistantUnreadCount} новых)` : 'Ассистент'}</p>
              </TooltipContent>
            </Tooltip>
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
                onOpenChat={(memberId, messengerType) => {
                  if (messengerType) {
                    setSelectedMessengerTab({ tab: messengerType, ts: Date.now() });
                  }
                  handleChatClick(memberId, 'client');
                }}
                activeMessengerTab={selectedMessengerTab?.tab}
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
                onOpenChat={(memberId, messengerType) => {
                  if (messengerType) {
                    setSelectedMessengerTab({ tab: messengerType, ts: Date.now() });
                  }
                  handleChatClick(memberId, 'client');
                }}
                activeMessengerTab={selectedMessengerTab?.tab}
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
            pinnedTaskClientId && pinnedTaskClientId !== 'client-task'
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
      
      
      {/* AI Центр */}
      <ErrorBoundary>
          <AIHub 
            isOpen={voiceAssistantOpen}
            onToggle={handleAIHubToggle}
            context={aiHubContext}
            onOpenModal={aiHubOnOpenModal}
            onOpenChat={handleAIHubOpenChat}
            onOpenScripts={handleAIHubOpenScripts}
            initialAssistantMessage={initialAssistantMessage}
            onClearInitialAssistantMessage={handleClearInitialAssistantMessage}
            quickReplyCategory={quickReplyCategory}
            initialStaffUserId={initialStaffUserId}
            onClearInitialStaffUserId={handleClearInitialStaffUserId}
            initialGroupChatId={initialGroupChatId}
            onClearInitialGroupChatId={handleClearInitialGroupChatId}
          />
      </ErrorBoundary>

      {/* Мобильная нижняя навигация чатов - показываем когда не открыт диалог с клиентом */}
      {isMobile && !activeChatId && (
        <MobileChatNavigation
          onChatOSClick={handleMobileChatOSClick}
          onTeachersClick={handleMobileTeachersClick}
          onClientsClick={handleMobileClientsClick}
          onMenuClick={() => handleTabChange('menu')}
          onNewChatClick={handleMobileNewChatClick}
          onPaymentClick={() => setShowInvoiceModal(true)}
          onTaskClick={() => setShowAddTaskModal(true)}
          onEmployeeClick={handleMobileEmployeeClick}
          chatOSUnreadCount={staffUnreadCount + (assistantUnreadCount || 0)}
          teachersUnreadCount={teacherChats?.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0) || 0}
          clientsUnreadCount={threads?.filter((t: any) => t.unread_count > 0).length || 0}
          activeChatType={activeTab === 'menu' ? 'menu' : activeChatType}
          isAdmin={isAdmin}
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

      {/* Модальное окно добавления сотрудника */}
      <AddEmployeeModal
        open={showAddEmployeeModal}
        onOpenChange={setShowAddEmployeeModal}
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

      {/* Trash Dialog */}
      <TrashDialog
        open={trashDialogOpen}
        onOpenChange={setTrashDialogOpen}
      />

      {/* Link Chat to Client Modal */}
      <LinkChatToClientModal
        open={linkChatModal.open}
        onOpenChange={(open) => setLinkChatModal(prev => ({ ...prev, open }))}
        chatClientId={linkChatModal.chatId}
        chatClientName={linkChatModal.chatName}
        onSuccess={handleLinkChatSuccess}
      />

      {/* Bulk Action Confirmation Dialog */}
      <AlertDialog open={bulkActionConfirm.open} onOpenChange={(open) => setBulkActionConfirm(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkActionConfirm.action === 'read' && 'Отметить как прочитанные?'}
              {bulkActionConfirm.action === 'unread' && 'Отметить как непрочитанные?'}
              {bulkActionConfirm.action === 'pin' && 'Закрепить чаты?'}
              {bulkActionConfirm.action === 'archive' && 'Архивировать чаты?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkActionConfirm.action === 'read' && `Вы уверены, что хотите отметить ${bulkActionConfirm.count} чатов как прочитанные? Действие можно отменить в течение 10 секунд.`}
              {bulkActionConfirm.action === 'unread' && `Вы уверены, что хотите отметить ${bulkActionConfirm.count} чатов как непрочитанные? Действие можно отменить в течение 10 секунд.`}
              {bulkActionConfirm.action === 'pin' && `Вы уверены, что хотите закрепить ${bulkActionConfirm.count} чатов?`}
              {bulkActionConfirm.action === 'archive' && `Вы уверены, что хотите архивировать ${bulkActionConfirm.count} чатов?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkAction}>
              {bulkActionConfirm.action === 'read' && 'Прочитать'}
              {bulkActionConfirm.action === 'unread' && 'Не прочитано'}
              {bulkActionConfirm.action === 'pin' && 'Закрепить'}
              {bulkActionConfirm.action === 'archive' && 'Архивировать'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
      
      {/* Convert to Teacher Modal */}
      <ConvertToTeacherModal
        open={convertToTeacherModal.open}
        onClose={() => setConvertToTeacherModal({ open: false, clientId: '', clientName: '' })}
        clientId={convertToTeacherModal.clientId}
        clientName={convertToTeacherModal.clientName}
        clientPhone={convertToTeacherModal.clientPhone}
        clientEmail={convertToTeacherModal.clientEmail}
        onSuccess={handleConvertToTeacherSuccess}
      />
      
      {/* Share Client Card Modal */}
      <ShareClientCardModal
        open={shareCardClient.open}
        onOpenChange={(open) => setShareCardClient(prev => ({ ...prev, open }))}
        client={{
          id: shareCardClient.id,
          name: shareCardClient.name,
          phone: shareCardClient.phone,
          avatar_url: shareCardClient.avatar_url,
          branch: shareCardClient.branch,
        }}
        onSent={(recipient) => {
          // Open AIHub modal and navigate to the recipient's chat
          if (recipient.type === 'group') {
            setInitialGroupChatId(recipient.id);
          } else {
            setInitialStaffUserId(recipient.id);
          }
          setVoiceAssistantOpen(true);
        }}
      />
      
      {/* WhatsApp Status Notification */}
      <WhatsAppStatusNotification />
      
      {/* Incoming Call Notification */}
      <IncomingCallNotification 
        onOpenClient={(clientId) => {
          handleChatClick(clientId, 'client');
          setActiveTab('chats');
        }}
      />
      
      {/* Post-Call Moderation Modal */}
      <PostCallModerationModal
        callData={postCallModeration.callData}
        open={postCallModeration.isModalOpen}
        onOpenChange={postCallModeration.onOpenChange}
        onConfirmed={postCallModeration.onConfirmed}
      />
      </div>
    </TooltipProvider>
  );
};

const CRM = () => {
  return (
    <ProtectedRoute allowedRoles={['admin', 'manager']}>
      <CRMRealtimeProvider>
        <CRMContent key={import.meta.hot ? Date.now() : 'stable'} />
      </CRMRealtimeProvider>
    </ProtectedRoute>
  );
};

export default CRM;