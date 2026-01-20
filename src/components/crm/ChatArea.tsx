import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from "react";
import { Send, Paperclip, Zap, MessageCircle, Mic, Edit2, Search, Plus, FileText, Forward, X, Clock, Calendar, Trash2, Bot, ArrowLeft, Settings, MoreVertical, Pin, Archive, BellOff, Lock, Phone, PanelLeft, PanelRight, CheckCheck, ListTodo, CreditCard, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTypingStatus } from "@/hooks/useTypingStatus";
import { useClientUnreadByMessenger } from "@/hooks/useChatMessages";
import { useChatMessagesOptimized } from "@/hooks/useChatMessagesOptimized";
import { ChatMessage } from "./ChatMessage";
import { DateSeparator, shouldShowDateSeparator } from "./DateSeparator";
import { SalebotCallbackMessage, isSalebotCallback, isHiddenSalebotMessage, isSuccessPayment } from "./SalebotCallbackMessage";
import { ClientTasks } from "./ClientTasks";
import { MessageSkeleton } from "./MessageSkeleton";
// Lazy load heavy modal components for faster initial render
const AddTaskModal = lazy(() => import("./AddTaskModal").then(m => ({ default: m.AddTaskModal })));
const CreateInvoiceModal = lazy(() => import("./CreateInvoiceModal").then(m => ({ default: m.CreateInvoiceModal })));
const ForwardMessageModal = lazy(() => import("./ForwardMessageModal").then(m => ({ default: m.ForwardMessageModal })));
const QuickResponsesModal = lazy(() => import("./QuickResponsesModal").then(m => ({ default: m.QuickResponsesModal })));
import { FileUpload } from "./FileUpload";
import { AttachedFile } from "./AttachedFile";
import { InlinePendingGPTResponse } from "./InlinePendingGPTResponse";
import { TextFormatToolbar } from "./TextFormatToolbar";
import { CallHistory } from "./CallHistory";
import { SendPaymentLinkModal } from "./SendPaymentLinkModal";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { useMaxGreenApi } from "@/hooks/useMaxGreenApi";
import { useMax } from "@/hooks/useMax";
import { useTelegramWappi } from "@/hooks/useTelegramWappi";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePendingGPTResponses } from "@/hooks/usePendingGPTResponses";
import { useMarkChatMessagesAsReadByMessenger, useMarkChatMessagesAsRead } from "@/hooks/useMessageReadStatus";
import { useQueryClient } from "@tanstack/react-query";

interface ChatAreaProps {
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientComment?: string;
  onMessageChange?: (hasUnsaved: boolean) => void;
  activePhoneId?: string;
  onOpenTaskModal?: () => void;
  onOpenInvoiceModal?: () => void;
  managerName?: string; // Add manager name for comments
  onBackToList?: () => void; // Function to go back to chat list on mobile
  onChatAction?: (chatId: string, action: 'unread' | 'pin' | 'archive' | 'block') => void; // Chat actions
  rightPanelCollapsed?: boolean; // State of right panel
  onToggleRightPanel?: () => void; // Toggle right panel
  onOpenClientInfo?: () => void; // Open client info panel on mobile
  initialMessengerTab?: 'whatsapp' | 'telegram' | 'max'; // Initial messenger tab to show
  messengerTabTimestamp?: number; // Timestamp to force tab switch
  initialSearchQuery?: string; // Search query to auto-open search and scroll to match
}

interface ScheduledMessage {
  id: string;
  text: string;
  scheduledDate: Date;
  timeoutId: NodeJS.Timeout;
}

// ChatArea component for CRM chat functionality
export const ChatArea = ({ 
  clientId,
  clientName, 
  clientPhone, 
  clientComment = "Базовый комментарий", 
  onMessageChange, 
  activePhoneId = '1', 
  onOpenTaskModal, 
  onOpenInvoiceModal,
  managerName = "Менеджер",
  onBackToList,
  onChatAction,
  rightPanelCollapsed = false,
  onToggleRightPanel,
  onOpenClientInfo,
  initialMessengerTab,
  messengerTabTimestamp,
  initialSearchQuery
}: ChatAreaProps) => {
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  
  // React Query for messages - replaces useState + loadMessages for caching
  const [messageLimit, setMessageLimit] = useState(100);
  const { 
    data: messagesData, 
    isLoading: loadingMessages, 
    isFetching: fetchingMessages 
  } = useChatMessagesOptimized(clientId, messageLimit);
  
  const hasMoreMessages = messagesData?.hasMore ?? false;
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [pendingMessage, setPendingMessage] = useState<{text: string, countdown: number} | null>(null);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<Array<{
    url: string;
    name: string;
    type: string;
    size: number;
  }>>([]);
  const [fileUploadResetKey, setFileUploadResetKey] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showScheduledMessagesDialog, setShowScheduledMessagesDialog] = useState(false);
  const [editingScheduledMessage, setEditingScheduledMessage] = useState<ScheduledMessage | null>(null);
  const [showQuickResponsesModal, setShowQuickResponsesModal] = useState(false);
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  const [paymentLinkAttachment, setPaymentLinkAttachment] = useState<{
    url: string;
    amount: number;
    description?: string;
  } | null>(null);
  const [commentMode, setCommentMode] = useState(false);
  const [gptGenerating, setGptGenerating] = useState(false);
  const [quotedText, setQuotedText] = useState<string | null>(null);
  const [activeMessengerTab, setActiveMessengerTab] = useState("whatsapp");
  
  
  // Функция для форматирования отображаемого имени (Фамилия Имя, без отчества)
  const formatDisplayName = (name: string, phone?: string) => {
    if (name === 'Без имени' && phone) {
      // Format phone number for display
      const digits = phone.replace(/\D/g, '');
      if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
        return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
      }
      return phone;
    }
    if (name.startsWith('Клиент ')) {
      return name.replace('Клиент ', '');
    }
    // Parse "Фамилия Имя Отчество" -> "Фамилия Имя"
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 3) {
      return `${parts[0]} ${parts[1]}`; // Return only Last + First name
    }
    return name;
  };
  
  const displayName = formatDisplayName(clientName, clientPhone);
  const whatsappEndRef = useRef<HTMLDivElement>(null);
  const maxEndRef = useRef<HTMLDivElement>(null);
  const telegramEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Composer width detection
  const composerRef = useRef<HTMLDivElement>(null);
  const [isCompactComposer, setIsCompactComposer] = useState(false);

  const MAX_MESSAGE_LENGTH = 4000;

  const { sendTextMessage, sendFileMessage, loading, deleteMessage, editMessage, checkAvailability: checkWhatsAppAvailability, getAvatar: getWhatsAppAvatar, sendTyping: sendWhatsAppTyping } = useWhatsApp();
  const { sendMessage: sendMaxMessage, loading: maxLoading } = useMaxGreenApi();
  const { editMessage: editMaxMessage, deleteMessage: deleteMaxMessage, sendTyping: sendMaxTyping, checkAvailability: checkMaxAvailability, getAvatar: getMaxAvatar } = useMax();
  const { sendMessage: sendTelegramMessage } = useTelegramWappi();
  
  // State for availability check (MAX and WhatsApp)
  const [maxAvailability, setMaxAvailability] = useState<{ checked: boolean; available: boolean | null }>({ checked: false, available: null });
  const [whatsappAvailability, setWhatsappAvailability] = useState<{ checked: boolean; available: boolean | null }>({ checked: false, available: null });
  const [maxClientAvatar, setMaxClientAvatar] = useState<string | null>(null);
  const [whatsappClientAvatar, setWhatsappClientAvatar] = useState<string | null>(null);
  const [telegramClientAvatar, setTelegramClientAvatar] = useState<string | null>(null);
  const [checkingMaxAvailability, setCheckingMaxAvailability] = useState(false);
  const [checkingWhatsAppAvailability, setCheckingWhatsAppAvailability] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { updateTypingStatus, getTypingMessage, isOtherUserTyping } = useTypingStatus(clientId);
  const markChatMessagesAsReadByMessengerMutation = useMarkChatMessagesAsReadByMessenger();
  const markChatMessagesAsReadMutation = useMarkChatMessagesAsRead();
  const queryClient = useQueryClient();
  
  // Get unread counts by messenger for badge display
  const {
    unreadCounts: unreadByMessenger,
    lastUnreadMessenger,
    isLoading: unreadLoading,
    isFetching: unreadFetching,
  } = useClientUnreadByMessenger(clientId);
  
  // Get pending GPT responses for this client
  const { data: pendingGPTResponses, isLoading: pendingGPTLoading, error: pendingGPTError } = usePendingGPTResponses(clientId);
  
  // Log pending responses for debugging
  useEffect(() => {
    console.log('ChatArea - clientId:', clientId);
    console.log('ChatArea - pendingGPTResponses:', pendingGPTResponses);
    console.log('ChatArea - pendingGPTLoading:', pendingGPTLoading);
    console.log('ChatArea - pendingGPTError:', pendingGPTError);
  }, [clientId, pendingGPTResponses, pendingGPTLoading, pendingGPTError]);
  // Наблюдение за шириной composer для адаптивной кнопки
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        setIsCompactComposer(w < 560);
      }
    });
    ro.observe(el);
    // Инициализация
    setIsCompactComposer(el.clientWidth < 560);
    return () => ro.disconnect();
  }, []);
  
  // Функция для прокрутки к концу чата (для активного мессенджера)
  const scrollToBottom = (smooth = true, tab?: string) => {
    const t = tab || activeMessengerTab;
    const targetRef = t === 'max' ? maxEndRef : t === 'telegram' ? telegramEndRef : whatsappEndRef;

    targetRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "instant",
    });
  };

  // displayName is now computed directly from clientName, no need for state

  // Track if we've set the initial tab for this client
  const [initialTabSet, setInitialTabSet] = useState<string | null>(null);
  
  // Reset initialTabSet when clientId changes (to allow re-setting tab for new client)
  useEffect(() => {
    // When client changes, reset the flag so we can set the initial tab
    setInitialTabSet(null);
  }, [clientId]);
  
  // Handle initial search query from message search (auto-open search modal)
  const [initialSearchApplied, setInitialSearchApplied] = useState<string | null>(null);
  useEffect(() => {
    if (initialSearchQuery && initialSearchQuery !== initialSearchApplied) {
      console.log('[ChatArea] Auto-opening search with query:', initialSearchQuery);
      setSearchQuery(initialSearchQuery);
      setShowSearchInput(true);
      setInitialSearchApplied(initialSearchQuery);
    }
  }, [initialSearchQuery, initialSearchApplied]);
  
  // Reset initial search when clientId changes
  useEffect(() => {
    setInitialSearchApplied(null);
  }, [clientId]);
  
  // Set initial tab to the one with the last message when client changes
  useEffect(() => {
    // Wait for unread data AND messages to fully settle before setting initial tab
    if (unreadLoading || unreadFetching) return;
    if (loadingMessages) return; // Wait for messages to load too!
    
    // Only set initial tab once per client selection
    if (initialTabSet === clientId) return;
    
    // Priority: 
    // 0. Prop-provided initial messenger tab (from clicking messenger icon)
    // 1. Last unread messenger (if there are unread messages)
    // 2. Messenger type of the most recent message
    // 3. Default to 'whatsapp'
    let tab = initialMessengerTab || lastUnreadMessenger;
    
    // If no unread messages, check the last message's messenger type
    const rawMessages = messagesData?.messages || [];
    if (!tab && rawMessages.length > 0) {
      const lastMessage = rawMessages[rawMessages.length - 1];
      tab = (lastMessage as any)?.messenger_type || 'whatsapp';
      console.log('[ChatArea] Setting initial tab from last message:', tab, 'message:', lastMessage?.id);
    }
    
    // Fallback to whatsapp
    if (!tab) {
      tab = 'whatsapp';
    }
    
    console.log('[ChatArea] Setting initial tab:', tab, 'for client:', clientId, 'lastUnreadMessenger:', lastUnreadMessenger, 'initialMessengerTab:', initialMessengerTab, 'messagesCount:', rawMessages.length);
    
    setActiveMessengerTab(tab);
    setInitialTabSet(clientId);
    // после установки вкладки — прокручиваем именно её к последнему сообщению
    setTimeout(() => scrollToBottom(false, tab), 0);
    
    // НЕ помечаем автоматически сообщения как прочитанные
    // Менеджер должен явно нажать "Не требует ответа" или отправить сообщение
  }, [clientId, unreadLoading, unreadFetching, lastUnreadMessenger, initialTabSet, messagesData?.messages, loadingMessages, initialMessengerTab]);

  // Handle external messenger tab switch (from clicking messenger icon in FamilyCard)
  useEffect(() => {
    if (initialMessengerTab && messengerTabTimestamp) {
      // User clicked a specific messenger icon - force switch
      console.log('[ChatArea] Switching to messenger tab from external click:', initialMessengerTab, 'ts:', messengerTabTimestamp);
      setActiveMessengerTab(initialMessengerTab);
      setTimeout(() => scrollToBottom(false, initialMessengerTab), 0);
    }
  }, [messengerTabTimestamp]); // Only react to timestamp changes

  // Mark messages as read when switching tabs - только прокрутка, НЕ отметка прочитанности
  const handleTabChange = (newTab: string) => {
    setActiveMessengerTab(newTab);
    // при переключении вкладки сразу показываем последние сообщения
    setTimeout(() => scrollToBottom(false, newTab), 0);
    
    // НЕ помечаем автоматически сообщения как прочитанные
    // Менеджер должен явно нажать "Не требует ответа" или отправить сообщение
  };

  // Format message helper - мемоизированная функция
  const formatMessage = useCallback((msg: any) => ({
    id: msg.id,
    type: msg.message_type || (msg.is_outgoing ? 'manager' : 'client'),
    message: msg.message_text || '',
    time: new Date(msg.created_at).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    createdAt: msg.created_at, // Keep original timestamp for date separator
    systemType: msg.system_type,
    callDuration: msg.call_duration,
    messageStatus: msg.message_status,
    // Get avatar based on messenger type, with fallback chain
    clientAvatar: (() => {
      const clients = msg.clients;
      if (!clients) return null;
      const messengerType = msg.messenger_type;
      if (messengerType === 'telegram' && clients.telegram_avatar_url) return clients.telegram_avatar_url;
      if (messengerType === 'whatsapp' && clients.whatsapp_avatar_url) return clients.whatsapp_avatar_url;
      if (messengerType === 'max' && clients.max_avatar_url) return clients.max_avatar_url;
      // Fallback: prefer messenger-specific avatars
      return clients.telegram_avatar_url || clients.whatsapp_avatar_url || clients.max_avatar_url || clients.avatar_url || null;
    })(),
    managerName: managerName,
    fileUrl: msg.file_url,
    fileName: msg.file_name,
    fileType: msg.file_type,
    whatsappChatId: msg.whatsapp_chat_id,
    externalMessageId: msg.external_message_id,
    messengerType: msg.messenger_type || 'whatsapp',
    // Forwarding metadata
    isForwarded: msg.is_forwarded || false,
    forwardedFrom: msg.forwarded_from || null,
    forwardedFromType: msg.forwarded_from_type || null,
  }), [managerName]);

  // Format messages from React Query data using memoization for performance
  const messages = useMemo(() => {
    if (!messagesData?.messages) return [];
    return messagesData.messages.map(formatMessage);
  }, [messagesData?.messages, formatMessage]);

  // Load older messages handler - just increases limit, React Query handles the rest
  const loadOlderMessages = useCallback(() => {
    setLoadingOlderMessages(true);
    const newLimit = messageLimit + 100;
    setMessageLimit(newLimit);
    // React Query will automatically refetch with new limit
    // Reset loading state after a short delay (React Query will update data)
    setTimeout(() => setLoadingOlderMessages(false), 500);
  }, [messageLimit]);

  // Reset limit when client changes
  useEffect(() => {
    setMessageLimit(100);
  }, [clientId]);

  // Scroll to bottom when messages load initially or when switching clients
  const prevClientIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!loadingMessages && messages.length > 0) {
      // Only scroll on initial load or client change
      if (prevClientIdRef.current !== clientId) {
        setTimeout(() => scrollToBottom(false), 50);
        prevClientIdRef.current = clientId;
      }
    }
  }, [loadingMessages, messages.length, clientId]);

  // NOTE: Real-time message updates are handled at CRM level by useOrganizationRealtimeMessages
  // This reduces WebSocket connections from N (per chat) to 1 (per organization)
  // We only need to handle scroll-to-bottom for new messages locally
  useEffect(() => {
    if (!clientId || !messagesData?.messages) return;
    
    // Store the message count to detect new messages
    const currentCount = messagesData.messages.length;
    const prevCountRef = { current: 0 };
    
    // If message count increased, scroll to bottom
    if (currentCount > prevCountRef.current && prevCountRef.current > 0) {
      setTimeout(() => scrollToBottom(true), 100);
    }
    prevCountRef.current = currentCount;
  }, [clientId, messagesData?.messages?.length]);

  // Check MAX availability when switching to MAX tab with no messages
  useEffect(() => {
    const checkMaxForClient = async () => {
      // Count MAX messages from all messages
      const maxMsgCount = messages.filter(m => m.messengerType === 'max').length;
      
      if (activeMessengerTab === 'max' && !loadingMessages && maxMsgCount === 0 && !maxAvailability.checked && clientPhone) {
        setCheckingMaxAvailability(true);
        try {
          const result = await checkMaxAvailability(clientPhone);
          setMaxAvailability({
            checked: true,
            available: result.success ? result.existsWhatsapp : null
          });
        } catch (error) {
          console.error('Error checking MAX availability:', error);
          setMaxAvailability({ checked: true, available: null });
        } finally {
          setCheckingMaxAvailability(false);
        }
      }
    };
    
    checkMaxForClient();
  }, [activeMessengerTab, loadingMessages, messages, maxAvailability.checked, clientPhone, checkMaxAvailability]);

  // Check WhatsApp availability when switching to WhatsApp tab with no messages
  useEffect(() => {
    const checkWhatsAppForClient = async () => {
      // Count WhatsApp messages from all messages
      const whatsappMsgCount = messages.filter(m => m.messengerType === 'whatsapp' || !m.messengerType).length;
      
      if (activeMessengerTab === 'whatsapp' && !loadingMessages && whatsappMsgCount === 0 && !whatsappAvailability.checked && clientPhone) {
        setCheckingWhatsAppAvailability(true);
        try {
          const result = await checkWhatsAppAvailability(clientPhone);
          setWhatsappAvailability({
            checked: true,
            available: result.success ? result.existsWhatsapp : null
          });
        } catch (error) {
          console.error('Error checking WhatsApp availability:', error);
          setWhatsappAvailability({ checked: true, available: null });
        } finally {
          setCheckingWhatsAppAvailability(false);
        }
      }
    };
    
    checkWhatsAppForClient();
  }, [activeMessengerTab, loadingMessages, messages, whatsappAvailability.checked, clientPhone, checkWhatsAppAvailability]);

  // Fetch MAX avatar for client when on MAX tab
  useEffect(() => {
    const fetchMaxAvatar = async () => {
      if (activeMessengerTab === 'max' && clientId && !maxClientAvatar) {
        try {
          const result = await getMaxAvatar(clientId);
          if (result.success && result.urlAvatar) {
            setMaxClientAvatar(result.urlAvatar);
          }
        } catch (error) {
          console.error('Error fetching MAX avatar:', error);
        }
      }
    };
    
    fetchMaxAvatar();
  }, [activeMessengerTab, clientId, maxClientAvatar, getMaxAvatar]);

  // Fetch WhatsApp avatar for client (always fetch on mount/client change for whatsapp tab)
  useEffect(() => {
    const fetchWhatsAppAvatar = async () => {
      // Fetch if we're on whatsapp tab or if activeMessengerTab is default (whatsapp)
      if ((activeMessengerTab === 'whatsapp' || !activeMessengerTab) && clientId && !whatsappClientAvatar) {
        console.log('Fetching WhatsApp avatar for client:', clientId);
        try {
          const result = await getWhatsAppAvatar(clientId);
          console.log('WhatsApp avatar result:', result);
          if (result.success && result.urlAvatar) {
            setWhatsappClientAvatar(result.urlAvatar);
          }
        } catch (error) {
          console.error('Error fetching WhatsApp avatar:', error);
        }
      }
    };
    
    fetchWhatsAppAvatar();
  }, [activeMessengerTab, clientId, whatsappClientAvatar, getWhatsAppAvatar]);

  // Fetch Telegram avatar for client from database
  useEffect(() => {
    const fetchTelegramAvatar = async () => {
      if (activeMessengerTab === 'telegram' && clientId && !telegramClientAvatar) {
        try {
          const { data } = await supabase
            .from('clients')
            .select('telegram_avatar_url')
            .eq('id', clientId)
            .single();
          if (data?.telegram_avatar_url) {
            setTelegramClientAvatar(data.telegram_avatar_url);
          }
        } catch (error) {
          console.error('Error fetching Telegram avatar:', error);
        }
      }
    };
    
    fetchTelegramAvatar();
  }, [activeMessengerTab, clientId, telegramClientAvatar]);

  useEffect(() => {
    setMaxAvailability({ checked: false, available: null });
    setWhatsappAvailability({ checked: false, available: null });
    setMaxClientAvatar(null);
    setWhatsappClientAvatar(null);
    setTelegramClientAvatar(null);
  }, [clientId]);

  // Cleanup pending message interval and scheduled messages on unmount
  useEffect(() => {
    return () => {
      if (pendingTimeoutRef.current) {
        clearInterval(pendingTimeoutRef.current);
      }
      // Cancel all scheduled messages on unmount
      scheduledMessages.forEach(msg => clearTimeout(msg.timeoutId));
    };
  }, [scheduledMessages]);

  const handleMessageChange = (value: string) => {
    setMessage(value);
    onMessageChange?.(value.trim().length > 0);
    
    // Update typing status
    if (value.trim().length > 0) {
      updateTypingStatus(true);
      
      // Send typing notification based on active tab
      if (activeMessengerTab === 'max') {
        sendMaxTyping(clientId);
      } else if (activeMessengerTab === 'whatsapp') {
        sendWhatsAppTyping(clientId);
      }
    } else {
      updateTypingStatus(false);
    }
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  // Функция для пометки чата как "Не требует ответа" - помечает все сообщения как прочитанные
  const handleMarkAsNoResponseNeeded = async () => {
    if (!clientId) return;
    
    try {
      // Помечаем все непрочитанные сообщения клиента как прочитанные
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('client_id', clientId)
        .eq('is_read', false)
        .eq('message_type', 'client');
      
      if (error) {
        console.error('Error marking messages as read:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось пометить сообщения как прочитанные",
          variant: "destructive",
        });
        return;
      }
      
      // Инвалидируем кэши для обновления UI
      queryClient.invalidateQueries({ queryKey: ['client-unread-by-messenger', clientId] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads-unread-priority'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages', clientId] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages-infinite', clientId] });
      
      toast({
        title: "Готово",
        description: "Чат помечен как не требующий ответа",
      });
    } catch (error) {
      console.error('Error in handleMarkAsNoResponseNeeded:', error);
    }
  };

  // Функция для открытия модалки задач и пометки сообщений как прочитанных
  const handleOpenTaskModalAndMarkRead = async () => {
    // Сначала помечаем сообщения как прочитанные
    try {
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('client_id', clientId)
        .eq('is_read', false)
        .eq('message_type', 'client');
      
      queryClient.invalidateQueries({ queryKey: ['client-unread-by-messenger', clientId] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    } catch (error) {
      console.error('Error marking messages as read before opening task:', error);
    }
    
    // Открываем модалку задач
    if (onOpenTaskModal) {
      onOpenTaskModal();
    } else {
      setShowAddTaskModal(true);
    }
  };

  const handleSendMessage = async () => {
    if ((!message.trim() && attachedFiles.length === 0 && !paymentLinkAttachment) || loading || message.length > MAX_MESSAGE_LENGTH) return;

    // Подготавливаем текст с цитатой если есть
    let messageText = message.trim();
    if (quotedText) {
      const quotedLines = quotedText.split('\n').map(line => `> ${line}`).join('\n');
      messageText = `${quotedLines}\n\n${messageText}`;
    }
    
    // Добавляем платёжную ссылку если есть
    if (paymentLinkAttachment) {
      const paymentText = `💳 Направляю Вам счёт на сумму ${paymentLinkAttachment.amount.toLocaleString('ru-RU')} ₽\n${paymentLinkAttachment.url}`;
      messageText = messageText ? `${messageText}\n\n${paymentText}` : paymentText;
    }
    
    const filesToSend = [...attachedFiles];
    
    setMessage(""); // Clear input immediately
    setQuotedText(null); // Clear quoted text
    setPaymentLinkAttachment(null); // Clear payment link attachment
    setAttachedFiles([]); // Clear attached files immediately
    setFileUploadResetKey((k) => k + 1); // Reset FileUpload internal UI
    onMessageChange?.(false);
    
    // Помечаем все непрочитанные сообщения как прочитанные при отправке ответа
    try {
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('client_id', clientId)
        .eq('is_read', false)
        .eq('message_type', 'client');
      
      queryClient.invalidateQueries({ queryKey: ['client-unread-by-messenger', clientId] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    } catch (error) {
      console.error('Error marking messages as read on send:', error);
    }
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Immediately dismiss any pending GPT responses when manager starts sending a message
    if (pendingGPTResponses && pendingGPTResponses.length > 0) {
      console.log('Found pending GPT responses to clear:', pendingGPTResponses.length);
      
      // First optimistically remove from UI
      queryClient.setQueryData(['pending-gpt-responses', clientId], []);
      
      // Then delete from database
      try {
        const { data: deletedData, error: deleteError } = await supabase
          .from('pending_gpt_responses')
          .delete()
          .eq('client_id', clientId)
          .select(); // Select to see what was deleted
        
        console.log('Deleted pending GPT responses:', deletedData?.length || 0, 'Error:', deleteError);
        
        if (deleteError) {
          console.error('Database delete error:', deleteError);
        }
        
        // Force refresh the pending responses query
        queryClient.invalidateQueries({ queryKey: ['pending-gpt-responses', clientId] });
      } catch (error) {
        console.error('Failed to clear pending GPT responses:', error);
        // Even if delete fails, keep UI cleared
      }
    }

    // If in comment mode, save as comment instead of sending
    if (commentMode) {
      await saveComment(messageText);
      setCommentMode(false); // Exit comment mode after saving
      return;
    }

    // Start 5-second countdown for regular messages
    setPendingMessage({ text: messageText, countdown: 5 });
    
    const countdown = () => {
      setPendingMessage(prev => {
        if (!prev) return null;
        
        if (prev.countdown <= 1) {
          // Time's up - send the message
          sendMessageNow(messageText, filesToSend);
          // Clear the interval when countdown finishes
          if (pendingTimeoutRef.current) {
            clearInterval(pendingTimeoutRef.current);
            pendingTimeoutRef.current = null;
          }
          return null;
        }
        
        return { ...prev, countdown: prev.countdown - 1 };
      });
    };

    // Update countdown every second and store interval ID for cleanup
    const intervalId = setInterval(countdown, 1000);
    pendingTimeoutRef.current = intervalId;
  };

  const sendMessageNow = async (messageText: string, filesToSend: Array<{url: string, name: string, type: string, size: number}> = []) => {
    try {
      // Check which messenger tab is active and send via appropriate service
      if (activeMessengerTab === 'max') {
        // Send via MAX
        if (filesToSend.length > 0) {
          for (const file of filesToSend) {
            const result = await sendMaxMessage(clientId, messageText || '', file.url, file.name, file.type);
            if (!result) {
              toast({
                title: "Ошибка отправки файла в MAX",
                description: `Не удалось отправить файл "${file.name}"`,
                variant: "destructive",
              });
              return;
            }
          }
        } else if (messageText) {
          const result = await sendMaxMessage(clientId, messageText);
          if (!result) {
            toast({
              title: "Ошибка отправки в MAX",
              description: "Не удалось отправить сообщение",
              variant: "destructive",
            });
            return;
          }
        }
      } else if (activeMessengerTab === 'telegram') {
        // Send via Telegram
        if (filesToSend.length > 0) {
          for (const file of filesToSend) {
            const result = await sendTelegramMessage(clientId, messageText || '', file.url, file.name, file.type);
            if (!result.success) {
              toast({
                title: "Ошибка отправки файла в Telegram",
                description: `Не удалось отправить файл "${file.name}"`,
                variant: "destructive",
              });
              return;
            }
          }
        } else if (messageText) {
          const result = await sendTelegramMessage(clientId, messageText);
          if (!result.success) {
            toast({
              title: "Ошибка отправки в Telegram",
              description: "Не удалось отправить сообщение",
              variant: "destructive",
            });
            return;
          }
        }
      } else {
        // Send via WhatsApp (default)
        if (filesToSend.length > 0) {
          for (const file of filesToSend) {
            const result = await sendFileMessage(clientId, file.url, file.name, messageText);
            if (!result.success) {
              toast({
                title: "Ошибка отправки файла",
                description: `Не удалось отправить файл "${file.name}": ${result.error}`,
                variant: "destructive",
              });
              return;
            }
          }
          
          // If we have files and text, send text separately only if it's not just a caption
          if (messageText && messageText !== '[Файл]') {
            const textResult = await sendTextMessage(clientId, messageText);
            if (!textResult.success) {
              toast({
                title: "Ошибка отправки текста",
                description: textResult.error || "Не удалось отправить текстовое сообщение",
                variant: "destructive",
              });
              return;
            }
          }
        } else if (messageText) {
          // Send text message only
          const result = await sendTextMessage(clientId, messageText);
          if (!result.success) {
            toast({
              title: "Ошибка отправки",
              description: result.error || "Не удалось отправить сообщение",
              variant: "destructive",
            });
            return;
          }
        }
      }

      // Remove any pending GPT suggestions for this client after a successful send
      try {
        await supabase
          .from('pending_gpt_responses')
          .delete()
          .eq('client_id', clientId)
          .eq('status', 'pending');
        console.log('Cleared pending GPT responses after manual send');
      } catch (e) {
        console.warn('Failed to clear pending GPT responses:', e);
      }
      
      // Mark all client messages as read after sending a reply
      // If we replied - it means we've seen all their messages
      try {
        await markChatMessagesAsReadMutation.mutateAsync(clientId);
        console.log('Marked all client messages as read after sending reply');
      } catch (e) {
        console.warn('Failed to mark messages as read:', e);
      }
      
      // Smooth scroll to bottom after sending message
      setTimeout(() => scrollToBottom(true), 300);
    } catch (error: any) {
      toast({
        title: "Ошибка отправки",
        description: error.message || "Не удалось отправить сообщение",
        variant: "destructive",
      });
    }
  };

  const saveComment = async (commentText: string) => {
    try {
      // Save comment to client's notes field
      const { error: clientError } = await supabase
        .from('clients')
        .update({
          notes: commentText,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId);

      if (clientError) throw clientError;

      // Also add comment as a chat message
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert([{
          client_id: clientId,
          message_text: commentText,
          message_type: 'comment',
          is_outgoing: true,
          messenger_type: 'system'
        }]);

      if (messageError) {
        console.error('Error saving comment message:', messageError);
      }

      // Don't show success toast - just log success
      console.log('Comment saved successfully');

      // Remove any pending GPT suggestions for this client after saving a comment
      try {
        await supabase
          .from('pending_gpt_responses')
          .delete()
          .eq('client_id', clientId)
          .eq('status', 'pending');
        console.log('Cleared pending GPT responses after comment');
      } catch (e) {
        console.warn('Failed to clear pending GPT responses after comment:', e);
      }
    } catch (error: any) {
      toast({
        title: "Ошибка сохранения",
        description: error.message || "Не удалось сохранить комментарий",
        variant: "destructive",
      });
    }
  };

  const generateGPTResponse = async () => {
    if (gptGenerating) return;

    // Don't generate if there's no message
    if (!message.trim()) {
      toast({
        title: "Введите сообщение",
        description: "Для генерации ответа необходимо ввести текст сообщения",
        variant: "destructive",
      });
      return;
    }

    setGptGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-gpt-response', {
        body: { 
          clientId: clientId,
          currentMessage: message.trim()
        }
      });

      if (error) throw error;

      if (data?.generatedText) {
        setMessage(data.generatedText);
        onMessageChange?.(true);
        
        // Auto-resize textarea
        if (textareaRef.current) {
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.style.height = 'auto';
              textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
            }
          }, 0);
        }

        toast({
          title: "Ответ сгенерирован",
          description: "GPT сгенерировал подходящий ответ на основе контекста диалога",
        });
      }
    } catch (error: any) {
      toast({
        title: "Ошибка генерации",
        description: error.message || "Не удалось сгенерировать ответ",
        variant: "destructive",
      });
    } finally {
      setGptGenerating(false);
    }
  };

  const cancelMessage = () => {
    if (pendingTimeoutRef.current) {
      clearInterval(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }
    
    if (pendingMessage) {
      // Restore message to input
      setMessage(pendingMessage.text);
      onMessageChange?.(true);
    }
    
    setPendingMessage(null);
  };

  const handleScheduleMessage = async () => {
    if (!message.trim() || !scheduleDate || !scheduleTime) {
      toast({
        title: "Ошибка",
        description: "Заполните все поля для отложенного сообщения",
        variant: "destructive",
      });
      return;
    }

    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
    const now = new Date();
    
    if (scheduledDateTime <= now) {
      toast({
        title: "Ошибка",
        description: "Время отправки должно быть в будущем",
        variant: "destructive",
      });
      return;
    }

    const messageId = Date.now().toString();
    const messageText = message.trim();
    
    // Calculate delay in milliseconds
    const delay = scheduledDateTime.getTime() - now.getTime();
    
    // Set timeout for sending the message
    const timeoutId = setTimeout(async () => {
      try {
        await sendTextMessage(clientId, messageText);
        setScheduledMessages(prev => prev.filter(msg => msg.id !== messageId));
        toast({
          title: "Сообщение отправлено",
          description: "Запланированное сообщение было отправлено",
        });
      } catch (error) {
        toast({
          title: "Ошибка отправки",
          description: "Не удалось отправить запланированное сообщение",
          variant: "destructive",
        });
        setScheduledMessages(prev => prev.filter(msg => msg.id !== messageId));
      }
    }, delay);

    // Add to scheduled messages
    const scheduledMessage: ScheduledMessage = {
      id: messageId,
      text: messageText,
      scheduledDate: scheduledDateTime,
      timeoutId
    };

    setScheduledMessages(prev => [...prev, scheduledMessage]);

    toast({
      title: "Сообщение запланировано",
      description: `Сообщение будет отправлено ${format(scheduledDateTime, "d MMMM yyyy 'в' HH:mm", { locale: ru })}`,
    });

    setMessage("");
    setScheduleDate("");
    setScheduleTime("");
    setShowScheduleDialog(false);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const cancelScheduledMessage = (messageId: string) => {
    setScheduledMessages(prev => {
      const message = prev.find(msg => msg.id === messageId);
      if (message) {
        clearTimeout(message.timeoutId);
        toast({
          title: "Сообщение отменено",
          description: "Запланированное сообщение было отменено",
        });
      }
      return prev.filter(msg => msg.id !== messageId);
    });
  };

  const editScheduledMessage = (scheduledMessage: ScheduledMessage) => {
    setEditingScheduledMessage(scheduledMessage);
    setMessage(scheduledMessage.text);
    setScheduleDate(format(scheduledMessage.scheduledDate, "yyyy-MM-dd"));
    setScheduleTime(format(scheduledMessage.scheduledDate, "HH:mm"));
    setShowScheduledMessagesDialog(false);
    setShowScheduleDialog(true);
  };

  const updateScheduledMessage = () => {
    if (!editingScheduledMessage || !message.trim() || !scheduleDate || !scheduleTime) {
      return;
    }

    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
    const now = new Date();
    
    if (scheduledDateTime <= now) {
      toast({
        title: "Ошибка",
        description: "Время отправки должно быть в будущем",
        variant: "destructive",
      });
      return;
    }

    // Cancel old timeout
    clearTimeout(editingScheduledMessage.timeoutId);
    
    const messageText = message.trim();
    const delay = scheduledDateTime.getTime() - now.getTime();
    
    // Set new timeout
    const timeoutId = setTimeout(async () => {
      try {
        await sendTextMessage(clientId, messageText);
        setScheduledMessages(prev => prev.filter(msg => msg.id !== editingScheduledMessage.id));
        toast({
          title: "Сообщение отправлено",
          description: "Запланированное сообщение было отправлено",
        });
      } catch (error) {
        toast({
          title: "Ошибка отправки",
          description: "Не удалось отправить запланированное сообщение",
          variant: "destructive",
        });
        setScheduledMessages(prev => prev.filter(msg => msg.id !== editingScheduledMessage.id));
      }
    }, delay);

    // Update scheduled message
    setScheduledMessages(prev => prev.map(msg => 
      msg.id === editingScheduledMessage.id 
        ? { ...msg, text: messageText, scheduledDate: scheduledDateTime, timeoutId }
        : msg
    ));

    toast({
      title: "Сообщение обновлено",
      description: `Сообщение будет отправлено ${format(scheduledDateTime, "d MMMM yyyy 'в' HH:mm", { locale: ru })}`,
    });

    setMessage("");
    setScheduleDate("");
    setScheduleTime("");
    setEditingScheduledMessage(null);
    setShowScheduleDialog(false);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleQuickResponseSelect = (responseText: string) => {
    setMessage(responseText);
    onMessageChange?.(true);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
      }, 0);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSearchToggle = () => {
    setShowSearchInput(!showSearchInput);
    if (showSearchInput) {
      setSearchQuery(""); // Clear search when hiding
    }
  };

  const handlePhoneCall = async () => {
    if (!clientPhone?.trim()) {
      toast({
        title: "Ошибка",
        description: "Номер телефона клиента не указан",
        variant: "destructive"
      });
      return;
    }

    try {
      // Показываем уведомление о начале звонка
      toast({
        title: "Звонок...",
        description: `Звоним на номер ${clientPhone}`,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }

      const { data, error } = await supabase.functions.invoke('onlinepbx-call', {
        body: { 
          to_number: clientPhone,
          from_user: user.id
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Звонок совершён",
          description: "Звонок инициирован через OnlinePBX. Поднимите трубку.",
        });
        
        // Refresh call history to show the new call
        queryClient.invalidateQueries({ queryKey: ['call-logs', clientId] });
      } else {
        throw new Error(data?.error || 'Не удалось совершить звонок');
      }
    } catch (error: any) {
      console.error('OnlinePBX call failed:', error);
      toast({
        title: "Ошибка звонка",
        description: error.message || "Не удалось совершить звонок",
        variant: "destructive"
      });
    }
  };

  // Функции для работы с выделением сообщений
  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedMessages(new Set());
  };

  const handleMessageSelectionChange = (messageId: string, selected: boolean) => {
    const newSelected = new Set(selectedMessages);
    if (selected) {
      newSelected.add(messageId);
    } else {
      newSelected.delete(messageId);
    }
    setSelectedMessages(newSelected);
  };

  // Функция для пересылки одного сообщения через контекстное меню
  const handleForwardSingleMessage = (messageId: string) => {
    setSelectedMessages(new Set([messageId]));
    setShowForwardModal(true);
  };

  // Функция для цитирования текста
  const handleQuoteMessage = (text: string) => {
    setQuotedText(text);
    // Фокус на поле ввода
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  // Функция для включения режима множественного выбора через контекстное меню
  const handleEnterSelectionMode = () => {
    setIsSelectionMode(true);
  };

  const handleForwardMessages = async (recipients: Array<{id: string, type: 'client' | 'teacher' | 'corporate', name: string}>) => {
    const messagesToForward = messages.filter(msg => selectedMessages.has(msg.id));
    
    try {
      // Отправляем каждое сообщение каждому выбранному получателю
      for (const recipient of recipients) {
        for (const msg of messagesToForward) {
          // Отправляем сообщение без префикса "Переслано:"
          switch (recipient.type) {
            case 'client':
              // Отправляем клиенту через WhatsApp с информацией об источнике
              await sendTextMessage(recipient.id, msg.message);
              // Здесь можно добавить логику сохранения информации о пересылке в БД
              break;
            case 'teacher':
              // Отправка преподавателю
              console.log(`Отправка преподавателю ${recipient.name}:`, msg.message);
              break;
            case 'corporate':
              // Отправка в корпоративный чат
              console.log(`Отправка в корпоративный чат ${recipient.name}:`, msg.message);
              break;
          }
        }
      }
      
      const clientCount = recipients.filter(r => r.type === 'client').length;
      const teacherCount = recipients.filter(r => r.type === 'teacher').length;
      const corporateCount = recipients.filter(r => r.type === 'corporate').length;
      
      let description = `${messagesToForward.length} сообщений переслано: `;
      const parts = [];
      if (clientCount > 0) parts.push(`${clientCount} клиентам`);
      if (teacherCount > 0) parts.push(`${teacherCount} преподавателям`);
      if (corporateCount > 0) parts.push(`${corporateCount} корпоративным чатам`);
      description += parts.join(', ');
      
      toast({
        title: "Сообщения переслаты",
        description,
      });
      
      // Сбрасываем режим выделения
      setIsSelectionMode(false);
      setSelectedMessages(new Set());
    } catch (error) {
      toast({
        title: "Ошибка пересылки",
        description: "Не удалось переслать сообщения",
        variant: "destructive",
      });
    }
  };

  const getSelectedMessagesForForward = () => {
    return messages
      .filter(msg => selectedMessages.has(msg.id))
      .map(msg => ({
        id: msg.id,
        message: msg.message,
        time: msg.time,
        type: msg.type
      }));
  };

  // Функция для редактирования сообщения
  const handleEditMessage = async (messageId: string, newMessage: string) => {
    // Find message to check messenger type
    const msg = messages.find(m => m.id === messageId);
    const isMaxMessage = msg?.messengerType === 'max';
    
    const result = isMaxMessage 
      ? await editMaxMessage(messageId, newMessage, clientId)
      : await editMessage(messageId, newMessage, clientId);
    
    if (result.success) {
      toast({
        title: "Сообщение отредактировано",
        description: isMaxMessage ? "Сообщение обновлено" : "Сообщение обновлено в WhatsApp",
      });
      
      // Invalidate React Query cache to refetch messages with updated content
      queryClient.invalidateQueries({ queryKey: ['chat-messages-optimized', clientId] });
    }
  };

  // Функция для удаления сообщения
  const handleDeleteMessage = async (messageId: string) => {
    // Find message to check messenger type
    const msg = messages.find(m => m.id === messageId);
    const isMaxMessage = msg?.messengerType === 'max';
    
    const result = isMaxMessage
      ? await deleteMaxMessage(messageId, clientId)
      : await deleteMessage(messageId, clientId);
    
    if (result.success) {
      // Invalidate React Query cache to refetch messages
      queryClient.invalidateQueries({ queryKey: ['chat-messages-optimized', clientId] });
    }
  };

  // Mock tasks data - in real app this would come from props or API
  const clientTasks = [
    {
      id: '1',
      title: 'Обсудить расписание на следующую неделю',
      student: 'Павел',
      priority: 'high' as const,
      dueDate: 'Сегодня',
    },
    {
      id: '2', 
      title: 'Отправить счет за обучение',
      priority: 'medium' as const,
      dueDate: '25.09.2025',
    }
  ];

  // Filter messages based on search query
  const filteredMessages = messages.filter(msg => {
    const matchesSearch = msg.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Filter messages by messenger type
  const whatsappMessages = filteredMessages.filter(msg => 
    !msg.messengerType || msg.messengerType === 'whatsapp'
  );

  const maxMessages = filteredMessages.filter(msg => 
    msg.messengerType === 'max'
  );

  const telegramMessages = filteredMessages.filter(msg => 
    msg.messengerType === 'telegram'
  );

  // Проверяем, является ли последнее сообщение входящим (от клиента)
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const isLastMessageIncoming = lastMessage ? lastMessage.type === 'client' : false;

  return (
    <div 
      className="flex-1 bg-background flex flex-col min-w-0 min-h-0 relative"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        
        const files = Array.from(e.dataTransfer.files);
        files.forEach(file => {
          // Handle dropped files through FileUpload component
          console.log('File dropped:', file);
        });
      }}
    >
      {/* Chat Header */}
      <div className={`border-b shrink-0 relative ${isMobile ? 'bg-background' : 'p-3'}`}>
        {/* Mobile: Compact header with contact info and actions on the same line */}
        {isMobile && (
          <div className="flex items-center justify-between p-2 bg-background">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {onBackToList && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0 flex-shrink-0"
                  onClick={onBackToList}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-sm text-foreground truncate">{displayName}</h2>
                <p className="text-xs text-muted-foreground truncate">{clientPhone}</p>
                {getTypingMessage() && (
                  <p className="text-xs text-orange-600 italic animate-pulse">
                    {getTypingMessage()}
                  </p>
                )}
              </div>
            </div>
            
            {/* Action buttons moved to the right */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button 
                size="sm" 
                variant="outline" 
                className="crm-btn h-8 w-8 p-0 border-muted-foreground/40 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                title="Добавить задачу"
                onClick={() => (onOpenTaskModal ? onOpenTaskModal() : setShowAddTaskModal(true))}
              >
                <Plus className="h-4 w-4 stroke-1" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="crm-btn h-8 w-8 p-0 border-muted-foreground/40 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                title="Выставить счёт"
                onClick={() => (onOpenInvoiceModal ? onOpenInvoiceModal() : setShowInvoiceModal(true))}
              >
                <FileText className="h-4 w-4 stroke-1" />
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="crm-btn h-8 w-8 p-0 border-muted-foreground/40 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                title="Поиск в чате"
                onClick={handleSearchToggle}
              >
                <Search className="h-4 w-4 stroke-1" />
              </Button>
              <Button
                size="sm" 
                variant="outline"
                className="crm-btn h-8 w-8 p-0 border-muted-foreground/40 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                title="Позвонить"
                onClick={handlePhoneCall}
              >
                <Phone className="h-4 w-4 stroke-1" />
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="h-8 w-8 p-0 border-muted-foreground/40 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                title="Переслать"
                onClick={handleToggleSelectionMode}
              >
                <Forward className="h-4 w-4 stroke-1" />
              </Button>
              {/* Кнопка "О клиенте" */}
              {onOpenClientInfo && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-8 w-8 p-0 border-muted-foreground/40 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                  title="О клиенте"
                  onClick={onOpenClientInfo}
                >
                  <User className="h-4 w-4 stroke-1" />
                </Button>
              )}
              
              {/* Settings dropdown with all the removed options */}
              {onChatAction && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 w-8 p-0"
                      title="Настройки чата"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-background border shadow-lg z-50">
                    <DropdownMenuItem onClick={() => onChatAction(clientId, 'unread')}>
                      <BellOff className="mr-2 h-4 w-4" />
                      <span>Отметить непрочитанным</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onChatAction(clientId, 'pin')}>
                      <Pin className="mr-2 h-4 w-4 text-purple-600" />
                      <span>Закрепить диалог</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onChatAction(clientId, 'block')}>
                      <Lock className="mr-2 h-4 w-4" />
                      <span>Заблокировать клиента</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onChatAction(clientId, 'archive')}>
                      <Archive className="mr-2 h-4 w-4 text-orange-600" />
                      <span>Архивировать</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        )}
        
        {/* Desktop: Inline user info with actions */}
        {!isMobile && (
          <div className="flex items-start justify-between gap-4 p-3">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="font-semibold text-base">{displayName}</h2>
                <p className="text-sm text-muted-foreground">{clientPhone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Добавить задачу"
                onClick={() => (onOpenTaskModal ? onOpenTaskModal() : setShowAddTaskModal(true))}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Выставить счёт"
                onClick={() => (onOpenInvoiceModal ? onOpenInvoiceModal() : setShowInvoiceModal(true))}
              >
                <FileText className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Поиск в чате"
                onClick={handleSearchToggle}
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Позвонить"
                onClick={handlePhoneCall}
              >
                <Phone className="h-4 w-4" />
              </Button>
              
              {/* Toggle right panel button */}
              {onToggleRightPanel && (
                <Button 
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title={rightPanelCollapsed ? "Показать семейную группу" : "Скрыть семейную группу"}
                  onClick={onToggleRightPanel}
                >
                  {rightPanelCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
                </Button>
              )}
              
              {showSearchInput && (
                <Input
                  placeholder="Поиск в чате..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 h-8 ml-2"
                  autoFocus
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center z-50">
          <div className="text-center">
            <Paperclip className="h-12 w-12 text-primary mx-auto mb-2" />
            <p className="text-lg font-medium text-primary">Отпустите файлы для загрузки</p>
          </div>
        </div>
      )}
        
      {/* Панель действий для режима выделения */}
      {isSelectionMode && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 mt-2 mx-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Выбрано: {selectedMessages.size} сообщений
            </span>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                onClick={() => setShowForwardModal(true)}
                disabled={selectedMessages.size === 0}
                className="h-7"
              >
                <Forward className="h-3 w-3 mr-1" />
                Переслать
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleToggleSelectionMode}
                className="h-7"
              >
                <X className="h-3 w-3 mr-1" />
                Отмена
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Client Tasks */}
      <div className="shrink-0">
        <ClientTasks 
          clientName={clientName}
          clientId={clientId}
        />
      </div>

      {/* Chat Messages with Tabs */}
      <div className="flex-1 overflow-hidden min-h-0">
        <Tabs value={activeMessengerTab} onValueChange={handleTabChange} className="h-full flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-5 rounded-none bg-muted/30 border-b">
            <TabsTrigger 
              value="whatsapp" 
              className="text-xs relative data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              WhatsApp
              {unreadByMessenger.whatsapp > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadByMessenger.whatsapp > 99 ? '99+' : unreadByMessenger.whatsapp}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="telegram" 
              className="text-xs relative data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              Telegram
              {unreadByMessenger.telegram > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadByMessenger.telegram > 99 ? '99+' : unreadByMessenger.telegram}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="max" 
              className="text-xs relative data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              Max
              {unreadByMessenger.max > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadByMessenger.max > 99 ? '99+' : unreadByMessenger.max}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="email" 
              className="text-xs relative data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              Email
              {unreadByMessenger.email > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadByMessenger.email > 99 ? '99+' : unreadByMessenger.email}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="calls" 
              className="text-xs relative data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              Звонки
              {unreadByMessenger.calls > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadByMessenger.calls > 99 ? '99+' : unreadByMessenger.calls}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="whatsapp" className="flex-1 p-3 overflow-y-auto mt-0">
            <div className="space-y-1">
              {loadingMessages ? (
                <MessageSkeleton count={6} />
              ) : whatsappMessages.length > 0 ? (
                <>
                  {/* Load older messages button */}
                  {hasMoreMessages && (
                    <div className="flex justify-center py-2 mb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={loadOlderMessages}
                        disabled={loadingOlderMessages}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        {loadingOlderMessages ? (
                          <>
                            <Clock className="h-3 w-3 mr-1 animate-spin" />
                            Загрузка...
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            Загрузить старые сообщения
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {whatsappMessages.map((msg, index) => {
                    const prevMessage = whatsappMessages[index - 1];
                    const nextMessage = whatsappMessages[index + 1];
                    
                    // Check if we need to show date separator
                    const showDateSeparator = shouldShowDateSeparator(
                      msg.createdAt,
                      prevMessage?.createdAt
                    );
                    
                    // Определяем нужно ли показывать аватарку и имя
                    const showAvatar = !prevMessage || 
                      prevMessage.type !== msg.type || 
                      msg.type === 'system' || 
                      msg.type === 'comment' ||
                      showDateSeparator; // Reset grouping after date separator
                      
                    const showName = showAvatar;
                    
                    // Определяем нужно ли добавлять отступ снизу
                    const isLastInGroup = !nextMessage || 
                      nextMessage.type !== msg.type || 
                      nextMessage.type === 'system' || 
                      nextMessage.type === 'comment';
                    
                    // Skip hidden salebot messages (like crm_state_changed)
                    if (isHiddenSalebotMessage(msg.message)) {
                      return null;
                    }
                    
                    // Check if this is a Salebot callback message or success payment
                    const isCallback = isSalebotCallback(msg.message) || isSuccessPayment(msg.message);
                    
                    return (
                      <div key={msg.id || index}>
                        {showDateSeparator && msg.createdAt && (
                          <DateSeparator date={msg.createdAt} />
                        )}
                        {isCallback ? (
                          <SalebotCallbackMessage message={msg.message} time={msg.time} />
                        ) : (
                          <ChatMessage
                            messageId={msg.id}
                            type={msg.type}
                            message={msg.message}
                            time={msg.time}
                            systemType={msg.systemType}
                            callDuration={msg.callDuration}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedMessages.has(msg.id)}
                            onSelectionChange={(selected) => handleMessageSelectionChange(msg.id, selected)}
                            isForwarded={msg.isForwarded}
                            forwardedFrom={msg.forwardedFrom}
                            forwardedFromType={msg.forwardedFromType}
                            onMessageEdit={msg.type === 'manager' ? handleEditMessage : undefined}
                            onMessageDelete={msg.type === 'manager' ? handleDeleteMessage : undefined}
                            messageStatus={msg.messageStatus}
                            clientAvatar={whatsappClientAvatar || msg.clientAvatar}
                            managerName={msg.managerName}
                            fileUrl={msg.fileUrl}
                            fileName={msg.fileName}
                            fileType={msg.fileType}
                            whatsappChatId={msg.whatsappChatId}
                            externalMessageId={msg.externalMessageId}
                            showAvatar={showAvatar}
                            showName={showName}
                            isLastInGroup={isLastInGroup}
                            onForwardMessage={handleForwardSingleMessage}
                            onEnterSelectionMode={handleEnterSelectionMode}
                            onQuoteMessage={handleQuoteMessage}
                          />
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Inline Pending GPT Responses after messages */}
                  {Array.isArray(pendingGPTResponses) && pendingGPTResponses.length > 0 && (
                    <>
                      {pendingGPTResponses.map((response) => (
                    <InlinePendingGPTResponse
                          key={response.id}
                          response={response}
                          onUse={(text) => {
                            setMessage(text);
                            onMessageChange?.(true);
                            // Auto-resize and focus
                            if (textareaRef.current) {
                              textareaRef.current.focus();
                              textareaRef.current.style.height = 'auto';
                              textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
                            }
                            // Scroll to bottom to keep input visible
                            setTimeout(() => scrollToBottom(true), 100);
                          }}
                        />
                      ))}
                    </>
                  )}
                </>
              ) : (
                <div className="text-center text-muted-foreground text-sm py-4">
                  {searchQuery ? (
                    'Сообщения не найдены'
                  ) : checkingWhatsAppAvailability ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></span>
                      Проверка наличия WhatsApp...
                    </span>
                  ) : whatsappAvailability.checked ? (
                    whatsappAvailability.available === true ? (
                      <span className="text-green-600">✓ WhatsApp доступен. Начните переписку!</span>
                    ) : whatsappAvailability.available === false ? (
                      <span className="text-orange-600">✗ У клиента нет WhatsApp</span>
                    ) : (
                      'Нет сообщений WhatsApp'
                    )
                  ) : (
                    'Нет сообщений WhatsApp'
                  )}
                </div>
              )}
              </div>
              {/* Элемент для прокрутки к концу WhatsApp */}
              <div ref={whatsappEndRef} />
            </TabsContent>
          
          <TabsContent value="telegram" className="flex-1 p-3 overflow-y-auto mt-0">
            <div className="space-y-1">
              {loadingMessages ? (
                <MessageSkeleton count={6} />
              ) : telegramMessages.length > 0 ? (
                <>
                  {telegramMessages.map((msg, index) => {
                    const prevMessage = telegramMessages[index - 1];
                    const nextMessage = telegramMessages[index + 1];
                    
                    // Check if we need to show date separator
                    const showDateSeparator = shouldShowDateSeparator(
                      msg.createdAt,
                      prevMessage?.createdAt
                    );
                    
                    const showAvatar = !prevMessage || 
                      prevMessage.type !== msg.type || 
                      msg.type === 'system' || 
                      msg.type === 'comment' ||
                      showDateSeparator;
                      
                    const showName = showAvatar;
                    
                    const isLastInGroup = !nextMessage || 
                      nextMessage.type !== msg.type || 
                      nextMessage.type === 'system' || 
                      nextMessage.type === 'comment';
                    
                    // Skip hidden salebot messages (like crm_state_changed)
                    if (isHiddenSalebotMessage(msg.message)) {
                      return null;
                    }
                    
                    // Check if this is a Salebot callback message or success payment
                    const isCallback = isSalebotCallback(msg.message) || isSuccessPayment(msg.message);
                    
                    return (
                      <div key={msg.id || index}>
                        {showDateSeparator && msg.createdAt && (
                          <DateSeparator date={msg.createdAt} />
                        )}
                        {isCallback ? (
                          <SalebotCallbackMessage message={msg.message} time={msg.time} />
                        ) : (
                          <ChatMessage
                            messageId={msg.id}
                            type={msg.type}
                            message={msg.message}
                            time={msg.time}
                            systemType={msg.systemType}
                            callDuration={msg.callDuration}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedMessages.has(msg.id)}
                            onSelectionChange={(selected) => handleMessageSelectionChange(msg.id, selected)}
                            isForwarded={msg.isForwarded}
                            forwardedFrom={msg.forwardedFrom}
                            forwardedFromType={msg.forwardedFromType}
                            onMessageEdit={msg.type === 'manager' ? handleEditMessage : undefined}
                            onMessageDelete={msg.type === 'manager' ? handleDeleteMessage : undefined}
                            messageStatus={msg.messageStatus}
                            clientAvatar={telegramClientAvatar || msg.clientAvatar}
                            managerName={msg.managerName}
                            fileUrl={msg.fileUrl}
                            fileName={msg.fileName}
                            fileType={msg.fileType}
                            externalMessageId={msg.externalMessageId}
                            showAvatar={showAvatar}
                            showName={showName}
                            isLastInGroup={isLastInGroup}
                            onForwardMessage={handleForwardSingleMessage}
                            onEnterSelectionMode={handleEnterSelectionMode}
                            onQuoteMessage={handleQuoteMessage}
                          />
                        )}
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="text-center text-muted-foreground text-sm py-4">
                  {searchQuery ? 'Сообщения не найдены' : 'Нет сообщений Telegram'}
                </div>
              )}
            </div>
            {/* Элемент для прокрутки к концу Telegram */}
            <div ref={telegramEndRef} />
          </TabsContent>
          
          <TabsContent value="max" className="flex-1 p-3 overflow-y-auto mt-0">
            <div className="space-y-1">
              {loadingMessages ? (
                <MessageSkeleton count={6} />
              ) : maxMessages.length > 0 ? (
                <>
                  {maxMessages.map((msg, index) => {
                    const prevMessage = maxMessages[index - 1];
                    const nextMessage = maxMessages[index + 1];
                    
                    // Check if we need to show date separator
                    const showDateSeparator = shouldShowDateSeparator(
                      msg.createdAt,
                      prevMessage?.createdAt
                    );
                    
                    const showAvatar = !prevMessage || 
                      prevMessage.type !== msg.type || 
                      msg.type === 'system' || 
                      msg.type === 'comment' ||
                      showDateSeparator;
                      
                    const showName = showAvatar;
                    
                    const isLastInGroup = !nextMessage || 
                      nextMessage.type !== msg.type || 
                      nextMessage.type === 'system' || 
                      nextMessage.type === 'comment';
                    
                    // Skip hidden salebot messages (like crm_state_changed)
                    if (isHiddenSalebotMessage(msg.message)) {
                      return null;
                    }
                    
                    // Check if this is a Salebot callback message or success payment
                    const isCallback = isSalebotCallback(msg.message) || isSuccessPayment(msg.message);
                    
                    return (
                      <div key={msg.id || index}>
                        {showDateSeparator && msg.createdAt && (
                          <DateSeparator date={msg.createdAt} />
                        )}
                        {isCallback ? (
                          <SalebotCallbackMessage message={msg.message} time={msg.time} />
                        ) : (
                          <ChatMessage
                            messageId={msg.id}
                            type={msg.type}
                            message={msg.message}
                            time={msg.time}
                            systemType={msg.systemType}
                            callDuration={msg.callDuration}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedMessages.has(msg.id)}
                            onSelectionChange={(selected) => handleMessageSelectionChange(msg.id, selected)}
                            isForwarded={msg.isForwarded}
                            forwardedFrom={msg.forwardedFrom}
                            forwardedFromType={msg.forwardedFromType}
                            onMessageEdit={msg.type === 'manager' ? handleEditMessage : undefined}
                            onMessageDelete={msg.type === 'manager' ? handleDeleteMessage : undefined}
                            messageStatus={msg.messageStatus}
                            clientAvatar={maxClientAvatar || msg.clientAvatar}
                            managerName={msg.managerName}
                            fileUrl={msg.fileUrl}
                            fileName={msg.fileName}
                            fileType={msg.fileType}
                            whatsappChatId={msg.whatsappChatId}
                            externalMessageId={msg.externalMessageId}
                            showAvatar={showAvatar}
                            showName={showName}
                            isLastInGroup={isLastInGroup}
                            onForwardMessage={handleForwardSingleMessage}
                            onEnterSelectionMode={handleEnterSelectionMode}
                            onQuoteMessage={handleQuoteMessage}
                          />
                        )}
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="text-center text-muted-foreground text-sm py-4">
                  {searchQuery ? (
                    'Сообщения не найдены'
                  ) : checkingMaxAvailability ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></span>
                      Проверка наличия MAX...
                    </span>
                  ) : maxAvailability.checked ? (
                    maxAvailability.available === true ? (
                      <span className="text-green-600">✓ MAX доступен. Начните переписку!</span>
                    ) : maxAvailability.available === false ? (
                      <span className="text-orange-600">✗ У клиента нет MAX</span>
                    ) : (
                      'Нет сообщений Max'
                    )
                  ) : (
                    'Нет сообщений Max'
                  )}
                </div>
              )}
            </div>
            {/* Элемент для прокрутки к концу Max */}
            <div ref={maxEndRef} />
          </TabsContent>
          
          <TabsContent value="email" className="flex-1 p-3 overflow-y-auto mt-0">
            <div className="space-y-1">
              <div className="text-center text-muted-foreground text-sm py-4">
                История переписки Email
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="calls" className="flex-1 p-3 overflow-y-auto mt-0">
            <CallHistory clientId={clientId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Message Input */}
      <div className={`border-t p-2 shrink-0 ${isMobile ? 'pb-20' : ''}`}>
        {/* Pending message with countdown */}
        {pendingMessage && (
          <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded animate-pulse"></div>
              <span className="text-sm text-yellow-800">
                Отправка через {pendingMessage.countdown} сек...
              </span>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={cancelMessage}
              className="text-yellow-800 border-yellow-300 hover:bg-yellow-100"
            >
              Отменить
            </Button>
          </div>
        )}
        
          <div className="space-y-1">
            {/* Character counter and warning */}
            {message.length > 0 && (
              <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
                <span className={message.length > MAX_MESSAGE_LENGTH ? "text-red-500" : ""}>
                  {message.length}/{MAX_MESSAGE_LENGTH} символов
                </span>
                {message.length > MAX_MESSAGE_LENGTH && (
                  <span className="text-red-500">Превышен лимит символов</span>
                )}
              </div>
            )}

            {/* Attached files preview */}
            {attachedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Прикрепленные файлы:</p>
                <div className="flex flex-wrap gap-2">
                  {attachedFiles.map((file, index) => (
                    <AttachedFile
                      key={index}
                      url={file.url}
                      name={file.name}
                      type={file.type}
                      size={file.size}
                      className="max-w-xs"
                    />
                  ))}
                </div>
              </div>
            )}
          
          <div className="space-y-1 relative">
            {/* Payment link attachment preview */}
            {paymentLinkAttachment && (
              <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-md border-l-4 border-amber-500">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-amber-700 mb-1">💳 Ссылка на оплату ({paymentLinkAttachment.amount.toLocaleString('ru-RU')} ₽):</p>
                  <p className="text-sm text-amber-800 truncate">{paymentLinkAttachment.description || paymentLinkAttachment.url}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 flex-shrink-0"
                  onClick={() => setPaymentLinkAttachment(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            {/* Quoted text preview */}
            {quotedText && (
              <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-md border-l-4 border-primary">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Цитата:</p>
                  <p className="text-sm text-foreground line-clamp-2">{quotedText}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 flex-shrink-0"
                  onClick={() => setQuotedText(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            {/* Text Format Toolbar - appears on selection */}
            <TextFormatToolbar
              textareaRef={textareaRef}
              value={message}
              onChange={(newValue) => handleMessageChange(newValue)}
              messengerType={activeMessengerTab === 'max' ? 'max' : activeMessengerTab === 'telegram' ? 'telegram' : 'whatsapp'}
              disabled={loading || !!pendingMessage || isOtherUserTyping || commentMode}
            />
            
            {/* Textarea */}
            <Textarea
              ref={textareaRef}
              placeholder={
                isOtherUserTyping 
                  ? getTypingMessage() || "Менеджер печатает..." 
                  : commentMode 
                    ? "Введите комментарий..." 
                    : "Введите сообщение..."
              }
              value={message}
              onChange={(e) => handleMessageChange(e.target.value)}
              onKeyPress={handleKeyPress}
              onKeyDown={() => updateTypingStatus(true)}
              onFocus={() => updateTypingStatus(true)}
              onBlur={() => updateTypingStatus(false)}
              className={`min-h-[48px] max-h-[120px] resize-none text-base ${
                commentMode ? "bg-yellow-50 border-yellow-300" : ""
              } ${isOtherUserTyping ? "bg-orange-50 border-orange-200" : ""}`}
              disabled={loading || !!pendingMessage || isOtherUserTyping}
            />
            
            {/* Bottom row: All icons fit screen on mobile */}
            <div ref={composerRef} className="flex items-center gap-0.5 w-full">
              {/* Action icons */}
              <div className="flex items-center gap-0.5 flex-1 min-w-0">
                <FileUpload
                  key={`file-upload-${fileUploadResetKey}`}
                  onFileUpload={(fileInfo) => {
                    setAttachedFiles(prev => [...prev, fileInfo]);
                  }}
                  onFileRemove={(url) => {
                    setAttachedFiles(prev => prev.filter(f => f.url !== url));
                  }}
                  disabled={!!pendingMessage}
                  maxFiles={5}
                  maxSize={10}
                />
                <Button size="sm" variant="ghost" className="h-6 w-6 md:h-8 md:w-8 p-0" disabled={!!pendingMessage} onClick={() => setShowQuickResponsesModal(true)}>
                  <Zap className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className={`h-6 w-6 md:h-8 md:w-8 p-0 ${commentMode ? "bg-yellow-100 text-yellow-700" : ""}`}
                  disabled={!!pendingMessage}
                  onClick={() => setCommentMode(!commentMode)}
                  title="Режим комментариев"
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className={`h-6 w-6 md:h-8 md:w-8 p-0 ${gptGenerating ? "bg-blue-100 text-blue-700" : ""}`}
                  disabled={!!pendingMessage || gptGenerating}
                  onClick={generateGPTResponse}
                  title="Генерировать ответ с помощью GPT"
                >
                  <Bot className={`h-4 w-4 ${gptGenerating ? "animate-pulse" : ""}`} />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 md:h-8 md:w-8 p-0" disabled={!!pendingMessage}>
                  <Mic className="h-4 w-4" />
                </Button>
                
                {/* Desktop: show all icons, Mobile: hide in dropdown */}
                {/* Payment link button - desktop only */}
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="hidden md:flex h-8 w-8 p-0"
                  disabled={!!pendingMessage}
                  onClick={() => setShowPaymentLinkModal(true)}
                  title="Выставить счёт"
                >
                  <CreditCard className="h-4 w-4" />
                </Button>
                
                {/* Schedule message button - desktop only */}
                <Dialog open={showScheduleDialog} onOpenChange={(open) => {
                  setShowScheduleDialog(open);
                  if (!open) {
                    setEditingScheduledMessage(null);
                    if (!message.trim()) {
                      setScheduleDate("");
                      setScheduleTime("");
                    }
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="hidden md:flex h-8 w-8 p-0"
                      disabled={loading || !message.trim() || message.length > MAX_MESSAGE_LENGTH || !!pendingMessage}
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                       <DialogTitle className="flex items-center gap-2">
                         <Clock className="h-5 w-5" />
                         <span>{editingScheduledMessage ? "Редактировать запланированное сообщение" : "Запланировать сообщение"}</span>
                       </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Дата</label>
                        <Input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Время</label>
                        <Input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Сообщение</label>
                        <div className="p-3 bg-muted rounded-md text-sm">
                          {message || "Сообщение не введено"}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
                          Отмена
                        </Button>
                        <Button onClick={editingScheduledMessage ? updateScheduledMessage : handleScheduleMessage}>
                          {editingScheduledMessage ? "Обновить" : "Запланировать"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Scheduled messages button - desktop only */}
                {scheduledMessages.length > 0 && (
                  <Dialog open={showScheduledMessagesDialog} onOpenChange={setShowScheduledMessagesDialog}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="hidden md:flex h-8 w-8 p-0 relative"
                      >
                        <Calendar className="h-4 w-4" />
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center"
                        >
                          {scheduledMessages.length}
                        </Badge>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          <span>Запланированные сообщения ({scheduledMessages.length})</span>
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {scheduledMessages.map((scheduledMsg) => (
                          <div key={scheduledMsg.id} className="border rounded-lg p-3 space-y-2">
                            <div className="text-sm font-medium">
                              {format(scheduledMsg.scheduledDate, "d MMMM yyyy 'в' HH:mm", { locale: ru })}
                            </div>
                            <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                              {scheduledMsg.text}
                            </div>
                            <div className="flex justify-end gap-1">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => editScheduledMessage(scheduledMsg)}
                              >
                                <Edit2 className="h-3 w-3 mr-1" />
                                Изменить
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => cancelScheduledMessage(scheduledMsg.id)}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Отменить
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                
                {/* Разделитель и кнопка "Не требует ответа" - только desktop */}
                {isLastMessageIncoming && (
                  <>
                    <div className="h-6 w-px bg-border mx-1 hidden md:block" />
                    
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="hidden lg:flex h-8 w-auto px-3 text-sm gap-2 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                      onClick={handleMarkAsNoResponseNeeded}
                      disabled={!!pendingMessage}
                      title="Пометить как не требующий ответа"
                    >
                      <CheckCheck className="h-4 w-4" />
                      <span>Не требует ответа</span>
                    </Button>
                  </>
                )}
                
                {/* Кнопка "Поставить задачу" - только desktop */}
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="hidden lg:flex h-8 w-auto px-3 text-sm gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                  onClick={handleOpenTaskModalAndMarkRead}
                  disabled={!!pendingMessage}
                  title="Поставить задачу"
                >
                  <ListTodo className="h-4 w-4" />
                  <span>Поставить задачу</span>
                </Button>
                
                {/* Mobile: More actions dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 w-6 p-0 md:hidden"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-background z-50">
                    <DropdownMenuItem 
                      onClick={() => setShowPaymentLinkModal(true)}
                      disabled={!!pendingMessage}
                      className="flex items-center gap-2"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Выставить счёт</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => message.trim() && setShowScheduleDialog(true)}
                      disabled={loading || !message.trim() || !!pendingMessage}
                      className="flex items-center gap-2"
                    >
                      <Clock className="h-4 w-4" />
                      <span>Запланировать</span>
                    </DropdownMenuItem>
                    {scheduledMessages.length > 0 && (
                      <DropdownMenuItem 
                        onClick={() => setShowScheduledMessagesDialog(true)}
                        className="flex items-center gap-2"
                      >
                        <Calendar className="h-4 w-4" />
                        <span>Запланированные ({scheduledMessages.length})</span>
                      </DropdownMenuItem>
                    )}
                    {isLastMessageIncoming && (
                      <DropdownMenuItem 
                        onClick={handleMarkAsNoResponseNeeded}
                        disabled={!!pendingMessage}
                        className="flex items-center gap-2 text-green-700"
                      >
                        <CheckCheck className="h-4 w-4" />
                        <span>Не требует ответа</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={handleOpenTaskModalAndMarkRead}
                      disabled={!!pendingMessage}
                      className="flex items-center gap-2 text-blue-700"
                    >
                      <ListTodo className="h-4 w-4" />
                      <span>Поставить задачу</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              
              {/* Send button - icon only on mobile/tablet, icon+text on large desktop */}
              <Button 
                className={`h-8 w-8 p-0 lg:h-[40px] lg:w-auto lg:px-8 lg:gap-2 ml-auto ${
                  commentMode ? "bg-yellow-500 hover:bg-yellow-600" : ""
                }`}
                onClick={handleSendMessage}
                disabled={(loading || maxLoading) || (!message.trim() && attachedFiles.length === 0) || message.length > MAX_MESSAGE_LENGTH || !!pendingMessage}
              >
                <Send className="h-4 w-4" />
                <span className="hidden lg:inline">Отправить</span>
              </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Модальные окна (только если не используются внешние обработчики) - lazy loaded */}
      {!onOpenTaskModal && showAddTaskModal && (
        <Suspense fallback={null}>
          <AddTaskModal 
            open={showAddTaskModal}
            onOpenChange={setShowAddTaskModal}
            clientName={clientName}
            clientId={clientId}
          />
        </Suspense>
      )}

      {!onOpenInvoiceModal && showInvoiceModal && (
        <Suspense fallback={null}>
          <CreateInvoiceModal 
            open={showInvoiceModal}
            onOpenChange={setShowInvoiceModal}
            clientName={clientName}
          />
        </Suspense>
      )}
      
      {/* Модальное окно пересылки сообщений - lazy loaded */}
      {showForwardModal && (
        <Suspense fallback={null}>
          <ForwardMessageModal
            open={showForwardModal}
            onOpenChange={setShowForwardModal}
            selectedMessages={getSelectedMessagesForForward()}
            currentClientId={clientId}
            onForward={handleForwardMessages}
          />
        </Suspense>
      )}

      {showQuickResponsesModal && (
        <Suspense fallback={null}>
          <QuickResponsesModal
            open={showQuickResponsesModal}
            onOpenChange={setShowQuickResponsesModal}
            onSelectResponse={handleQuickResponseSelect}
          />
        </Suspense>
      )}

      {/* Payment Link Modal */}
      <SendPaymentLinkModal
        open={showPaymentLinkModal}
        onOpenChange={setShowPaymentLinkModal}
        clientId={clientId}
        clientName={displayName || clientName}
        onPaymentLinkGenerated={(data) => {
          // Добавляем как вложение над полем ввода
          setPaymentLinkAttachment(data);
          // Фокус на поле ввода
          setTimeout(() => textareaRef.current?.focus(), 100);
        }}
      />

    </div>
  );
};
