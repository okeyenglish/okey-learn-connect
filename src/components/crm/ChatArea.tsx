import { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from "react";
import { Send, Paperclip, Zap, MessageCircle, Mic, Edit2, Search, Plus, FileText, Forward, X, Clock, Calendar, Trash2, Bot, ArrowLeft, Settings, MoreVertical, Pin, Archive, BellOff, Lock, Phone, PanelLeft, PanelRight, CheckCheck, ListTodo, CreditCard, User, ArrowRightLeft, Banknote, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTypingStatus } from "@/hooks/useTypingStatus";
import { useClientUnreadByMessenger, type ChatMessage as ChatMessageRow } from "@/hooks/useChatMessages";
import { useViewedMissedCalls } from "@/hooks/useViewedMissedCalls";
import { useChatMessagesOptimized, useMessageStatusRealtime, useNewMessageRealtime } from "@/hooks/useChatMessagesOptimized";
import { useTeacherChatMessages as useTeacherChatMessagesByClientId } from "@/hooks/useTeacherChats";
import { useTeacherChatMessages as useTeacherChatMessagesByTeacherId } from "@/hooks/useTeacherChatMessagesV2";
import { useAutoRetryMessages } from "@/hooks/useAutoRetryMessages";
import { useAutoCacheImages, ImageCacheProgress } from "@/hooks/useAutoCacheImages";
import { useCallLogsRealtime } from "@/hooks/useCallLogsRealtime";
import { ChatMessage } from "./ChatMessage";
import { DateSeparator, shouldShowDateSeparator } from "./DateSeparator";
import { SalebotCallbackMessage, isSalebotCallback, isHiddenSalebotMessage, isSuccessPayment } from "./SalebotCallbackMessage";
import { ClientTasks } from "./ClientTasks";
import { MessageSkeleton, ChatSwitchIndicator, MessengerTabLoadingOverlay } from "./MessageSkeleton";
import { AddTaskModal } from "./AddTaskModal";
import { CreateInvoiceModal } from "./CreateInvoiceModal";
import { ForwardMessageModal } from "./ForwardMessageModal";
import { QuickResponsesModal } from "./QuickResponsesModal";
import { FileUpload, FileUploadRef } from "./FileUpload";
import { AttachedFile } from "./AttachedFile";
import { ChatGalleryProvider } from "./ChatGalleryContext";
import { ReactionsProvider } from "@/contexts/ReactionsContext";
import { InlinePendingGPTResponse } from "./InlinePendingGPTResponse";
import { TextFormatToolbar } from "./TextFormatToolbar";
import { CallHistory } from "./CallHistory";
import { NewMessageIndicator } from "./NewMessageIndicator";
import { ChatSearchBar } from "./ChatSearchBar";
import { ImageCacheIndicator } from "./ImageCacheIndicator";
import { SendPaymentLinkModal } from "./SendPaymentLinkModal";
import { SendRetryIndicator } from "./SendRetryIndicator";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { formatPhoneForDisplay } from "@/utils/phoneNormalization";
import { useMaxGreenApi } from "@/hooks/useMaxGreenApi";
import { useMax } from "@/hooks/useMax";
import { useTelegramWappi } from "@/hooks/useTelegramWappi";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/typedClient";
import { usePendingGPTResponses } from "@/hooks/usePendingGPTResponses";
import { useMarkChatMessagesAsReadByMessenger, useMarkChatMessagesAsRead } from "@/hooks/useMessageReadStatus";
import { useAutoMarkChatAsRead } from "@/hooks/useAutoMarkChatAsRead";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from '@/lib/errorUtils';
import { useClientAvatars } from '@/hooks/useClientAvatars';
import { useMessengerIntegrationStatus, useAllIntegrationsStatus, MessengerType } from '@/hooks/useMessengerIntegrationStatus';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { useMessageDrafts } from '@/hooks/useMessageDrafts';
import { useChatTakeover } from '@/hooks/useChatTakeover';
import { TakeoverRequestDialog } from './TakeoverRequestDialog';
import { useChatOSMessages, useSendChatOSMessage } from '@/hooks/useChatOSMessages';
import { isValidUUID, safeUUID } from '@/lib/uuidValidation';

interface ChatAreaProps {
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientTelegramUserId?: string | number | null; // Telegram user ID for context-aware display
  clientMaxId?: string | null; // MAX chat ID for context-aware display
  clientComment?: string;
  onMessageChange?: (hasUnsaved: boolean) => void;
  activePhoneId?: string;
  onOpenTaskModal?: () => void;
  onOpenInvoiceModal?: () => void;
  managerName?: string; // Add manager name for comments
  onBackToList?: () => void; // Function to go back to chat list on mobile
  onChatAction?: (chatId: string, action: 'unread' | 'read' | 'pin' | 'archive' | 'block') => void; // Chat actions
  rightPanelCollapsed?: boolean; // State of right panel
  onToggleRightPanel?: () => void; // Toggle right panel
  onOpenClientInfo?: () => void; // Open client info panel on mobile
  initialMessengerTab?: 'whatsapp' | 'telegram' | 'max'; // Initial messenger tab to show
  messengerTabTimestamp?: number; // Timestamp to force tab switch
  initialSearchQuery?: string; // Search query to auto-open search and scroll to match
  highlightedMessageId?: string; // Message ID to highlight and scroll to
  messagesSource?: 'default' | 'teacher'; // Teacher chats load history via SECURITY DEFINER RPC
  simplifiedToolbar?: boolean; // Show simplified toolbar with only basic icons and dropdown (for teacher chats)
  hasPendingPayment?: boolean; // True when client has an unacknowledged payment
  onPaymentProcessed?: () => void; // Callback when payment is marked as processed
  onForwardSent?: (recipient: { type: 'staff' | 'group'; id: string; name: string }) => void; // Open AI Hub after forwarding
  onOpenAssistant?: () => void; // Open ChatOS assistant
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
  clientTelegramUserId,
  clientMaxId,
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
  initialSearchQuery,
  highlightedMessageId,
  messagesSource = 'default',
  simplifiedToolbar = false,
  hasPendingPayment = false,
  onPaymentProcessed,
  onForwardSent,
  onOpenAssistant
}: ChatAreaProps) => {
  // Use persistent draft hook to preserve message across tab switches
  const { draft: message, setDraft: setMessage, clearDraft } = useMessageDrafts(clientId);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  
  const isTeacherMessages = messagesSource === 'teacher';
  
  // Detect if this is a direct teacher message (teacher:xxx marker pattern)
  const isDirectTeacherMessage = clientId?.startsWith('teacher:') ?? false;
  const actualTeacherId = isDirectTeacherMessage ? clientId.replace('teacher:', '') : null;
  
  // Safe UUID for hooks that require a real client UUID (not teacher:xxx markers)
  // Returns null if clientId is not a valid UUID - hooks will be disabled
  const clientUUID = safeUUID(clientId);
  // String version for hooks that expect string (empty string disables them)
  const clientIdForUuidHooks = clientUUID ?? '';
  
  // Debug logging for teacher chat resolution
  console.log('[ChatArea] Mount/Update:', { 
    clientId, 
    isDirectTeacherMessage, 
    clientUUID, 
    messagesSource,
    isTeacherMessages 
  });
  
  // Helper to build message record with correct client_id/teacher_id
  const buildMessageRecord = (baseRecord: Record<string, any>) => {
    if (isDirectTeacherMessage && actualTeacherId) {
      // For direct teacher messages, use teacher_id instead of client_id
      const { client_id, ...rest } = baseRecord;
      return {
        ...rest,
        teacher_id: actualTeacherId,
        client_id: null, // Explicitly null for teacher messages
      };
    }
    return baseRecord;
  };

  // React Query for messages - replaces useState + loadMessages for caching
  const [messageLimit, setMessageLimit] = useState(100);

  // Default (clients) source
  const {
    data: defaultMessagesData,
    isLoading: defaultLoadingMessages,
    isFetching: defaultFetchingMessages,
  } = useChatMessagesOptimized(clientId, messageLimit, !isTeacherMessages && !isDirectTeacherMessage);

  // Teacher source via client_id (legacy - SECURITY DEFINER RPC)
  const teacherMessagesQueryByClientId = useTeacherChatMessagesByClientId(
    clientId, 
    isTeacherMessages && !isDirectTeacherMessage
  );
  
  // Teacher source via teacher_id directly (new architecture for self-hosted)
  // CRITICAL: Only pass non-empty teacherId to prevent "pages is undefined" error
  // The hook internally guards against empty string, but we use actualTeacherId directly
  const teacherIdForQuery = isDirectTeacherMessage && actualTeacherId ? actualTeacherId : '';
  const teacherMessagesQueryByTeacherId = useTeacherChatMessagesByTeacherId(teacherIdForQuery);
  
  // Select the appropriate teacher messages query based on pattern
  const teacherMessagesQuery = isDirectTeacherMessage 
    ? teacherMessagesQueryByTeacherId 
    : teacherMessagesQueryByClientId;

  const normalizedTeacherMessages = useMemo<ChatMessageRow[]>(() => {
    // Process teacher messages for both legacy (messagesSource='teacher') and direct (teacher:xxx) modes
    if (!isTeacherMessages && !isDirectTeacherMessage) return [];
    const rows = (teacherMessagesQuery.messages || []) as Array<Record<string, unknown>>;
    const mapped = rows.map((m) => {
      const anyMsg = m as Record<string, any>;
      const messageText = anyMsg.message_text ?? anyMsg.content ?? '';
      const isOutgoing = anyMsg.is_outgoing ?? anyMsg.direction === 'outgoing';
      const rawMessageType = anyMsg.message_type;
      const messageType: ChatMessageRow['message_type'] =
        rawMessageType === 'client' || rawMessageType === 'manager' || rawMessageType === 'system'
          ? rawMessageType
          : (isOutgoing ? 'manager' : 'client');

      return {
        id: String(anyMsg.id),
        client_id: String(anyMsg.client_id ?? clientId),
        message_text: String(messageText ?? ''),
        message_type: messageType,
        system_type: anyMsg.system_type ?? undefined,
        is_read: Boolean(anyMsg.is_read ?? false),
        created_at: String(anyMsg.created_at ?? new Date().toISOString()),
        file_url: anyMsg.file_url ?? anyMsg.media_url ?? undefined,
        file_name: anyMsg.file_name ?? undefined,
        file_type: anyMsg.file_type ?? anyMsg.media_type ?? undefined,
        external_message_id: anyMsg.external_message_id ?? anyMsg.external_id ?? undefined,
        messenger_type: anyMsg.messenger_type ?? anyMsg.messenger ?? undefined,
        message_status: anyMsg.message_status ?? anyMsg.status ?? undefined,
        call_duration: anyMsg.call_duration ?? undefined,
        metadata: anyMsg.metadata ?? undefined,
      } satisfies ChatMessageRow;
    });

    // Teacher RPC/direct queries typically return DESC (latest first).
    // ChatArea expects chronological order (ASC) so the newest messages appear at the bottom.
    return mapped.sort((a, b) => {
      const at = new Date(a.created_at).getTime();
      const bt = new Date(b.created_at).getTime();
      if (at !== bt) return at - bt;
      // Deterministic tie-breaker when created_at is equal
      return String(a.id).localeCompare(String(b.id));
    });
  }, [clientId, isTeacherMessages, isDirectTeacherMessage, teacherMessagesQuery.messages]);

  // Use teacher messages when either messagesSource='teacher' or clientId starts with 'teacher:'
  const useTeacherSource = isTeacherMessages || isDirectTeacherMessage;
  
  const messagesData = useTeacherSource
    ? { messages: normalizedTeacherMessages, hasMore: false, totalCount: normalizedTeacherMessages.length }
    : defaultMessagesData;

  const loadingMessages = useTeacherSource ? teacherMessagesQuery.isLoading : defaultLoadingMessages;
  const fetchingMessages = useTeacherSource ? teacherMessagesQuery.isFetching : defaultFetchingMessages;

  const hasMoreMessages = messagesData?.hasMore ?? false;
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  
  // Auto-cache images for offline viewing
  const imageCacheProgress = useAutoCacheImages(messagesData?.messages, !loadingMessages);
  
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
  const fileUploadRef = useRef<FileUploadRef>(null);
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
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);
  const [isChatSwitching, setIsChatSwitching] = useState(false);
  // State for highlighted message (from search navigation)
  const [currentHighlightedId, setCurrentHighlightedId] = useState<string | null>(null);
  // Track recently sent message IDs for animation (messages sent in last 2 seconds)
  const recentlySentIds = useRef<Set<string>>(new Set());
  
  // Helper to mark a message as just sent
  const markAsSent = useCallback((messageId: string) => {
    recentlySentIds.current.add(messageId);
    // Remove after animation completes (1.5 seconds)
    setTimeout(() => {
      recentlySentIds.current.delete(messageId);
    }, 1500);
  }, []);
  
  // Check if a message is "just sent" - either in our set OR created within last 2 seconds (outgoing only)
  const isMessageJustSent = useCallback((msg: { id: string; type: string; createdAt?: string }) => {
    if (recentlySentIds.current.has(msg.id)) return true;
    // For outgoing messages created in last 2 seconds, also animate
    if (msg.type === 'manager' && msg.createdAt) {
      const created = new Date(msg.createdAt).getTime();
      const now = Date.now();
      if (now - created < 2000) return true;
    }
    return false;
  }, []);
  
  
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
  const chatosEndRef = useRef<HTMLDivElement>(null);
  const whatsappScrollRef = useRef<HTMLDivElement>(null);
  const telegramScrollRef = useRef<HTMLDivElement>(null);
  const maxScrollRef = useRef<HTMLDivElement>(null);
  const chatosScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevMessageCountRef = useRef<number>(0);
  const lastMessageIdRef = useRef<string | null>(null);
  
  // Composer width detection
  const composerRef = useRef<HTMLDivElement>(null);
  const [isCompactComposer, setIsCompactComposer] = useState(false);

  const MAX_MESSAGE_LENGTH = 4000;

  const { sendTextMessage, sendFileMessage, loading, deleteMessage, editMessage, checkAvailability: checkWhatsAppAvailability, getAvatar: getWhatsAppAvatar, sendTyping: sendWhatsAppTyping, retryStatus: whatsappRetryStatus, isRetrying: isWhatsappRetrying } = useWhatsApp();
  const { sendMessage: sendMaxMessage, loading: maxLoading, retryStatus: maxRetryStatus, isRetrying: isMaxRetrying } = useMaxGreenApi();
  const { editMessage: editMaxMessage, deleteMessage: deleteMaxMessage, sendTyping: sendMaxTyping, checkAvailability: checkMaxAvailability, getAvatar: getMaxAvatar } = useMax();
  const { sendMessage: sendTelegramMessage, retryStatus: telegramRetryStatus, isRetrying: isTelegramRetrying } = useTelegramWappi();
  const { checkIntegrationStatus } = useMessengerIntegrationStatus();
  // State for availability check (MAX and WhatsApp)
  const [maxAvailability, setMaxAvailability] = useState<{ checked: boolean; available: boolean | null }>({ checked: false, available: null });
  const [whatsappAvailability, setWhatsappAvailability] = useState<{ checked: boolean; available: boolean | null }>({ checked: false, available: null });
  // Use cached avatars hook instead of separate state
  const { avatars: cachedAvatars, fetchExternalAvatar } = useClientAvatars(clientId);
  const maxClientAvatar = cachedAvatars.max;
  const whatsappClientAvatar = cachedAvatars.whatsapp;
  const telegramClientAvatar = cachedAvatars.telegram;
  const [checkingMaxAvailability, setCheckingMaxAvailability] = useState(false);
  const [checkingWhatsAppAvailability, setCheckingWhatsAppAvailability] = useState(false);
  const { toast } = useToast();
  const { user: authUser, profile: authProfile } = useAuth();
  const isMobile = useIsMobile();
  const { updateTypingStatus, getTypingInfo, isOtherUserTyping } = useTypingStatus(clientId);
  const typingInfo = getTypingInfo();
  const markChatMessagesAsReadByMessengerMutation = useMarkChatMessagesAsReadByMessenger();
  const markChatMessagesAsReadMutation = useMarkChatMessagesAsRead();
  const queryClient = useQueryClient();
  
  // Auto-mark chat as read when opened with retry and fallback polling
  // CRITICAL: Only use valid UUID, never teacher markers like "teacher:xxx"
  const { forceSync } = useAutoMarkChatAsRead({
    clientId: clientUUID, // Only for client chats with valid UUID
    chatType: 'client',
    isActive: !!clientId,
    messengerType: activeMessengerTab === 'chatos' ? null : activeMessengerTab
  });
  
  // Chat takeover functionality
  const { 
    incomingRequest, 
    receivedDraft, 
    requestTakeover, 
    respondToRequest, 
    clearReceivedDraft 
  } = useChatTakeover(clientId);

  // Auto-retry logic for failed messages (30 sec delay, max 3 attempts)
  const handleAutoRetry = useCallback(async (messageId: string, retryCount: number): Promise<boolean> => {
    console.log(`[AutoRetry] Attempting retry #${retryCount} for message ${messageId.slice(0, 8)}`);
    
    // Find the message in current cache
    const msg = messagesData?.messages?.find(m => m.id === messageId);
    if (!msg) {
      console.log(`[AutoRetry] Message not found in cache`);
      return false;
    }

    const messengerType = msg.messenger_type || 'whatsapp';
    
    try {
      // Update status to 'queued'
      await supabase
        .from('chat_messages')
        .update({ message_status: 'queued' })
        .eq('id', messageId);
      
      queryClient.invalidateQueries({ queryKey: ['chat-messages-optimized', clientId] });

      let success = false;
      
      if (messengerType === 'max') {
        const result = await sendMaxMessage(
          clientId,
          msg.message_text || '',
          msg.file_url,
          msg.file_name,
          msg.file_type,
          isDirectTeacherMessage ? { phoneNumber: clientPhone } : undefined
        );
        success = !!result;
      } else if (messengerType === 'telegram') {
        const result = await sendTelegramMessage(
          clientId,
          msg.message_text || '',
          msg.file_url,
          msg.file_name,
          msg.file_type,
          isDirectTeacherMessage ? { phoneNumber: clientPhone } : undefined
        );
        success = result.success;
      } else {
        // WhatsApp
        if (msg.file_url) {
          const result = await sendFileMessage(clientId, msg.file_url, msg.file_name || 'file', msg.message_text || '');
          success = result.success;
        } else {
          const result = await sendTextMessage(clientId, msg.message_text || '');
          success = result.success;
        }
      }

      if (success) {
        // Update status - retry metadata will be cleared by clearRetryCountInDB
        await supabase
          .from('chat_messages')
          .update({ message_status: 'sent' })
          .eq('id', messageId);
        
        queryClient.invalidateQueries({ queryKey: ['chat-messages-optimized', clientId] });
        
        toast({
          title: "Автоповтор успешен",
          description: `Сообщение доставлено (попытка ${retryCount})`,
        });
        return true;
      } else {
        throw new Error('Send failed');
      }
    } catch (error) {
      console.error(`[AutoRetry] Retry #${retryCount} failed:`, error);
      
      await supabase
        .from('chat_messages')
        .update({ message_status: 'failed' })
        .eq('id', messageId);
      
      queryClient.invalidateQueries({ queryKey: ['chat-messages-optimized', clientId] });
      return false;
    }
  }, [clientId, clientPhone, isDirectTeacherMessage, messagesData?.messages, queryClient, sendMaxMessage, sendTelegramMessage, sendFileMessage, sendTextMessage, toast]);

  const handleMaxRetriesReached = useCallback((messageId: string) => {
    toast({
      title: "Автоповтор исчерпан",
      description: "Не удалось доставить сообщение после 3 попыток. Проверьте настройки интеграции.",
      variant: "destructive",
    });
  }, [toast]);

  const { scheduleRetry, resetRetryState, cancelRetry, getRetryCount, canAutoRetry } = useAutoRetryMessages(
    clientId,
    handleAutoRetry,
    handleMaxRetriesReached
  );

  // Handler for cancelling auto-retry
  const handleCancelRetry = useCallback((messageId: string) => {
    console.log(`[ChatArea] Cancelling auto-retry for: ${messageId.slice(0, 8)}`);
    cancelRetry(messageId);
  }, [cancelRetry]);

  // Handler for failed delivery events - schedules auto-retry with metadata check
  const handleDeliveryFailed = useCallback((messageId: string) => {
    console.log(`[ChatArea] Message failed, scheduling auto-retry: ${messageId.slice(0, 8)}`);
    // Find message to get its metadata for retry count
    const msg = messagesData?.messages?.find(m => m.id === messageId);
    const metadata = msg?.metadata as Record<string, unknown> | null;
    
    if (canAutoRetry(messageId, metadata)) {
      scheduleRetry(messageId, metadata);
    }
  }, [canAutoRetry, scheduleRetry, messagesData?.messages]);

  // Subscribe to realtime message status updates with failed delivery notification
  useMessageStatusRealtime(clientId, handleDeliveryFailed);

  // Get unread counts by messenger for badge display
  // Use safe UUID to prevent DB errors with teacher:xxx markers
  const {
    unreadCounts: unreadByMessenger,
    lastUnreadMessenger,
    isLoading: unreadLoading,
    isFetching: unreadFetching,
  } = useClientUnreadByMessenger(clientIdForUuidHooks);
  
  // Hook for marking calls as viewed - use safe UUID
  const { markCallsAsViewed } = useViewedMissedCalls(clientIdForUuidHooks);
  
  // Realtime subscription for call logs updates - use safe UUID (undefined for global, UUID for specific client)
  useCallLogsRealtime(clientUUID ?? undefined);
  
  // Get integration statuses for all messengers (for tab indicators)
  const { data: integrationsStatus } = useAllIntegrationsStatus();
  
  // Get pending GPT responses for this client (skip for teacher messages - they use teacher:xxx format which is not a valid UUID)
  const { data: pendingGPTResponses, isLoading: pendingGPTLoading, error: pendingGPTError } = usePendingGPTResponses(
    isDirectTeacherMessage ? undefined : clientId
  );
  
  // Log pending responses for debugging
  useEffect(() => {
    console.log('ChatArea - clientId:', clientId);
    console.log('ChatArea - pendingGPTResponses:', pendingGPTResponses);
    console.log('ChatArea - pendingGPTLoading:', pendingGPTLoading);
    console.log('ChatArea - pendingGPTError:', pendingGPTError);
  }, [clientId, pendingGPTResponses, pendingGPTLoading, pendingGPTError]);
  
  // Listen for failed delivery events and show toast
  useEffect(() => {
    const handleDeliveryFailed = (event: Event) => {
      const customEvent = event as CustomEvent<{ messageId: string; messagePreview: string }>;
      toast({
        title: "Ошибка доставки",
        description: `Сообщение не доставлено: "${customEvent.detail.messagePreview}..."`,
        variant: "destructive",
      });
    };
    
    window.addEventListener('message-delivery-failed', handleDeliveryFailed);
    return () => {
      window.removeEventListener('message-delivery-failed', handleDeliveryFailed);
    };
  }, [toast]);
  
  // Force sync unread counts when page becomes visible again (e.g., after switching tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && clientId) {
        console.log('[ChatArea] Page visible, forcing sync');
        forceSync();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [clientId, forceSync]);
  
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
  const scrollToBottom = useCallback((smooth = true, tab?: string) => {
    const t = tab || activeMessengerTab;
    const targetRef = 
      t === 'max' ? maxEndRef : 
      t === 'telegram' ? telegramEndRef : 
      t === 'chatos' ? chatosEndRef :
      whatsappEndRef;

    if (targetRef.current) {
      targetRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "instant",
      });
    }
  }, [activeMessengerTab]);

  // Subscribe to new messages for instant scroll when payment/new message arrives
  const handleNewMessageRealtime = useCallback(() => {
    // Scroll to bottom when new message arrives via realtime
    requestAnimationFrame(() => {
      scrollToBottom(true);
    });
  }, [scrollToBottom]);
  useNewMessageRealtime(clientId, handleNewMessageRealtime);

  // displayName is now computed directly from clientName, no need for state

  // Track if we've set the initial tab for this client
  const [initialTabSet, setInitialTabSet] = useState<string | null>(null);
  
  // Reset initialTabSet when clientId changes (to allow re-setting tab for new client)
  useEffect(() => {
    // When client changes, reset the flag so we can set the initial tab
    setInitialTabSet(null);
    // Reset message tracking refs for new client
    prevMessageCountRef.current = 0;
    lastMessageIdRef.current = null;
  }, [clientId]);
  
  // Handle initial search query from message search - just track it, don't open search UI
  const [initialSearchApplied, setInitialSearchApplied] = useState<string | null>(null);
  useEffect(() => {
    if (initialSearchQuery && initialSearchQuery !== initialSearchApplied) {
      console.log('[ChatArea] Received search query for highlight (no search bar):', initialSearchQuery);
      setInitialSearchApplied(initialSearchQuery);
    }
  }, [initialSearchQuery, initialSearchApplied]);
  
  // Reset initial search when clientId changes
  useEffect(() => {
    setInitialSearchApplied(null);
    setCurrentHighlightedId(null);
  }, [clientId]);

  // Handle received draft from chat takeover
  useEffect(() => {
    if (receivedDraft) {
      console.log('[ChatArea] Received draft from takeover:', receivedDraft);
      setMessage(receivedDraft);
      clearReceivedDraft();
      toast({
        title: "Черновик получен",
        description: "Текст от предыдущего менеджера добавлен в поле ввода",
      });
    }
  }, [receivedDraft, clearReceivedDraft, toast]);

  // Handle highlighted message - scroll to it and highlight
  // Also auto-find first matching message when initialSearchQuery is provided
  useEffect(() => {
    if (loadingMessages) return;
    
    const allMessages = messagesData?.messages || [];
    
    // If we have a direct messageId, use it
    if (highlightedMessageId) {
      const targetMessage = allMessages.find(m => m.id === highlightedMessageId);
      if (targetMessage) {
        console.log('[ChatArea] Scrolling to highlighted message:', highlightedMessageId);
        
        const messengerType = targetMessage.messenger_type || 'whatsapp';
        if (messengerType !== activeMessengerTab) {
          setActiveMessengerTab(messengerType);
        }
        
        setCurrentHighlightedId(highlightedMessageId);
        
        setTimeout(() => {
          const messageElement = document.getElementById(`message-${highlightedMessageId}`);
          if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        
        setTimeout(() => setCurrentHighlightedId(null), 3000);
      }
      return;
    }
    
    // Auto-find first matching message from search query
    if (initialSearchQuery && initialSearchQuery.length >= 2 && allMessages.length > 0 && !currentHighlightedId) {
      const lowerQuery = initialSearchQuery.toLowerCase();
      const matchingMessage = allMessages.find(m => 
        m.message_text?.toLowerCase().includes(lowerQuery)
      );
      
      if (matchingMessage) {
        console.log('[ChatArea] Found matching message for search:', matchingMessage.id);
        
        const messengerType = matchingMessage.messenger_type || 'whatsapp';
        if (messengerType !== activeMessengerTab) {
          setActiveMessengerTab(messengerType);
        }
        
        setCurrentHighlightedId(matchingMessage.id);
        
        setTimeout(() => {
          const messageElement = document.getElementById(`message-${matchingMessage.id}`);
          if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 150);
        
        setTimeout(() => setCurrentHighlightedId(null), 3000);
      }
    }
  }, [highlightedMessageId, initialSearchQuery, messagesData?.messages, loadingMessages]);
  
   // Set initial tab to the one with the last message when client changes
  useEffect(() => {
    // Мгновенная установка вкладки из данных списка чатов (без ожидания загрузки сообщений)
    if (initialMessengerTab && initialTabSet !== clientId) {
      console.log('[ChatArea] Instant tab set from chat list:', initialMessengerTab, 'for client:', clientId);
      setActiveMessengerTab(initialMessengerTab);
      setInitialTabSet(clientId);
      requestAnimationFrame(() => {
        setTimeout(() => scrollToBottom(false, initialMessengerTab), 100);
      });
      return;
    }
    
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
      tab = lastMessage?.messenger_type || 'whatsapp';
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
    // после установки вкладки — прокручиваем именно её к последнему сообщению
    requestAnimationFrame(() => {
      setTimeout(() => scrollToBottom(false, tab), 100);
    });
    
    // НЕ помечаем автоматически сообщения как прочитанные
    // Менеджер должен явно нажать "Не требует ответа" или отправить сообщение
  }, [clientId, unreadLoading, unreadFetching, lastUnreadMessenger, initialTabSet, messagesData?.messages, loadingMessages, initialMessengerTab, scrollToBottom]);

  // Handle external messenger tab switch (from clicking messenger icon in FamilyCard)
  useEffect(() => {
    if (initialMessengerTab && messengerTabTimestamp) {
      // User clicked a specific messenger icon - force switch
      console.log('[ChatArea] Switching to messenger tab from external click:', initialMessengerTab, 'ts:', messengerTabTimestamp);
      setActiveMessengerTab(initialMessengerTab);
      // Прокрутка к последнему сообщению после рендера
      requestAnimationFrame(() => {
        setTimeout(() => scrollToBottom(false, initialMessengerTab), 100);
      });
    }
  }, [messengerTabTimestamp, scrollToBottom]); // Only react to timestamp changes

  // Mark messages as read when switching tabs - только прокрутка, НЕ отметка прочитанности
  const handleTabChange = async (newTab: string) => {
    if (newTab === activeMessengerTab) return;
    
    // Start transition animation
    setIsTabTransitioning(true);
    setActiveMessengerTab(newTab);
    
    // при переключении вкладки сразу показываем последние сообщения
    // Используем requestAnimationFrame + небольшую задержку для гарантии рендера
    requestAnimationFrame(() => {
      setTimeout(() => {
        scrollToBottom(false, newTab);
        // End transition after scroll completes
        setIsTabTransitioning(false);
      }, 100);
    });
    
    // При переходе на вкладку "Звонки" помечаем пропущенные звонки как просмотренные
    if (newTab === 'calls') {
      try {
        // Получаем непросмотренные звонки с сервера и помечаем их как просмотренные
        const response = await selfHostedPost<{
          success: boolean;
          unviewedCount: number;
          unviewedIds: string[];
        }>('mark-calls-viewed', { 
          action: 'get-unviewed-count', 
          clientId,
        });
        
        if (response.success && response.data?.unviewedIds?.length) {
          await markCallsAsViewed(response.data.unviewedIds);
        }
      } catch (error) {
        console.warn('[handleTabChange] Failed to mark calls as viewed:', error);
      }
    }
    
    // НЕ помечаем автоматически сообщения как прочитанные
    // Менеджер должен явно нажать "Не требует ответа" или отправить сообщение
  };

  // Format message helper - мемоизированная функция
  const formatMessage = useCallback((msg: any) => {
    const meta = msg.metadata || null;
    return {
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
    messageStatus: msg.status || msg.message_status || 'sent',
    // Get avatar based on messenger type, with fallback chain
    // Self-hosted schema only has avatar_url (no messenger-specific avatars)
    clientAvatar: msg.clients?.avatar_url || null,
    managerName: msg.sender_name || managerName,
    fileUrl: msg.file_url,
    fileName: msg.file_name,
    fileType: msg.file_type || msg.media_type,
    // Message type hint for media detection (imageMessage, videoMessage, etc.)
    messageTypeHint: msg.media_type || msg.content_type || msg.raw_message_type,
    whatsappChatId: msg.whatsapp_chat_id,
    externalMessageId: msg.external_message_id,
    messengerType: msg.messenger_type || 'whatsapp',
    // Forwarding metadata
    isForwarded: msg.is_forwarded || false,
    forwardedFrom: msg.forwarded_from || null,
    forwardedFromType: msg.forwarded_from_type || null,
    // Edited/deleted status from metadata
    isEdited: meta?.is_edited === true,
    editedTime: meta?.edited_at ? new Date(meta.edited_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : undefined,
    // Task notification metadata
    metadata: meta,
  };
  }, [managerName]);

  // Format messages from React Query data using memoization for performance
  const messages = useMemo(() => {
    if (!messagesData?.messages) return [];
    return messagesData.messages.map(formatMessage);
  }, [messagesData?.messages, formatMessage]);

  // Мемоизируем ID сообщений для batch-загрузки реакций (устраняет N+1 проблему)
  const messageIds = useMemo(
    () => messages.map(m => m.id).filter(Boolean),
    [messages]
  );

  // Load older messages handler - just increases limit, React Query handles the rest
  const loadOlderMessages = useCallback(() => {
    setLoadingOlderMessages(true);
    const newLimit = messageLimit + 100;
    setMessageLimit(newLimit);
    // React Query will automatically refetch with new limit
    // Reset loading state after a short delay (React Query will update data)
    setTimeout(() => setLoadingOlderMessages(false), 500);
  }, [messageLimit]);

  // Reset limit and show switching indicator when client changes
  const prevClientIdForSwitch = useRef<string | null>(null);
  useEffect(() => {
    if (prevClientIdForSwitch.current && prevClientIdForSwitch.current !== clientId) {
      // Show switching animation
      setIsChatSwitching(true);
      setTimeout(() => setIsChatSwitching(false), 250);
    }
    prevClientIdForSwitch.current = clientId;
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
    if (!clientId || !messagesData?.messages?.length) return;
    
    const currentMessages = messagesData.messages;
    const currentCount = currentMessages.length;
    const lastMessage = currentMessages[currentMessages.length - 1];
    const lastMessageId = lastMessage?.id;
    
    // Detect truly new message (different ID, not just count change from loading older)
    if (lastMessageId && lastMessageId !== lastMessageIdRef.current) {
      // For teacher messages (useTeacherSource), always scroll on new message
      // since refs may not track properly after query invalidation
      if (useTeacherSource) {
        // Check if it's actually a new message (not initial load or loading older)
        // by comparing timestamps - new messages have recent timestamps
        const lastMsgTime = new Date(lastMessage.created_at).getTime();
        const now = Date.now();
        const isRecentMessage = now - lastMsgTime < 60000; // Within last minute
        
        if (isRecentMessage && lastMessageIdRef.current !== null) {
          // This is a new incoming message - scroll to it
          requestAnimationFrame(() => {
            scrollToBottom(true);
          });
        }
      } else {
        // Original logic for regular client chats
        // Check if this is a NEW message (not loading older messages)
        // New messages have newer timestamps, older messages have older timestamps
        const isNewMessage = prevMessageCountRef.current > 0 && currentCount > prevMessageCountRef.current;
        
        if (isNewMessage) {
          // Scroll to bottom immediately when new message arrives (like in messengers)
          requestAnimationFrame(() => {
            scrollToBottom(true);
          });
        }
      }
      
      lastMessageIdRef.current = lastMessageId;
    }
    
    prevMessageCountRef.current = currentCount;
  }, [clientId, messagesData?.messages, scrollToBottom, useTeacherSource]);

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

  // Fetch MAX avatar using cached hook when on MAX tab
  useEffect(() => {
    if (activeMessengerTab === 'max' && clientId && !cachedAvatars.max) {
      fetchExternalAvatar('max', () => getMaxAvatar(clientId));
    }
  }, [activeMessengerTab, clientId, cachedAvatars.max, fetchExternalAvatar, getMaxAvatar]);

  // Fetch WhatsApp avatar using cached hook
  useEffect(() => {
    if ((activeMessengerTab === 'whatsapp' || !activeMessengerTab) && clientId && !cachedAvatars.whatsapp) {
      fetchExternalAvatar('whatsapp', () => getWhatsAppAvatar(clientId));
    }
  }, [activeMessengerTab, clientId, cachedAvatars.whatsapp, fetchExternalAvatar, getWhatsAppAvatar]);

  // Fetch Telegram avatar using cached hook
  useEffect(() => {
    if (activeMessengerTab === 'telegram' && clientId && !cachedAvatars.telegram) {
      fetchExternalAvatar('telegram', async () => {
        const response = await selfHostedPost<{ success: boolean; avatarUrl?: string }>('telegram-get-avatar', { clientId });
        return {
          success: response.success && response.data?.success,
          avatarUrl: response.data?.avatarUrl
        };
      });
    }
  }, [activeMessengerTab, clientId, cachedAvatars.telegram, fetchExternalAvatar]);

  // Reset availability checks when client changes (avatars are cached, no need to reset)
  useEffect(() => {
    setMaxAvailability({ checked: false, available: null });
    setWhatsappAvailability({ checked: false, available: null });
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
    
    // Update typing status with draft text (first 100 chars)
    if (value.trim().length > 0) {
      updateTypingStatus(true, value.slice(0, 100));
      
      // Send typing notification based on active tab
      if (activeMessengerTab === 'max') {
        sendMaxTyping(clientId);
      } else if (activeMessengerTab === 'whatsapp') {
        sendWhatsAppTyping(clientId, true);
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
      const isTeacher = isTeacherMessages || isDirectTeacherMessage;

      if (isTeacher) {
        // Для преподавательских чатов — используем teacher_id
        const teacherId = actualTeacherId || clientId?.replace('teacher:', '') || clientId;

        const { error } = await (supabase
          .from('chat_messages') as any)
          .update({ is_read: true })
          .eq('teacher_id', teacherId)
          .eq('is_outgoing', false)
          .or('is_read.is.null,is_read.eq.false');

        if (error) {
          console.error('Error marking teacher messages as read:', error);
          toast({
            title: "Ошибка",
            description: "Не удалось пометить сообщения как прочитанные",
            variant: "destructive",
          });
          return;
        }

        // Оптимистичное обновление кэшей преподавателей
        queryClient.setQueriesData(
          { queryKey: ['teacher-conversations'] },
          (old: any[] | undefined) => {
            if (!old) return old;
            return old.map((c: any) =>
              c.teacherId === teacherId ? { ...c, unreadCount: 0 } : c
            );
          }
        );
        queryClient.setQueriesData(
          { queryKey: ['teacher-chats'] },
          (old: any[] | undefined) => {
            if (!old) return old;
            return old.map((t: any) =>
              t.id === teacherId ? { ...t, unreadMessages: 0 } : t
            );
          }
        );
        queryClient.setQueriesData(
          { queryKey: ['teacher-chat-messages-v2-infinite'] },
          (old: any) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                messages: page.messages?.map((m: any) => ({ ...m, is_read: true })),
              })),
            };
          }
        );
      } else {
        // Для клиентских чатов — оригинальная логика
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

        // Оптимистичное обновление кэша chat-threads
        queryClient.setQueriesData(
          { queryKey: ['chat-threads'] },
          (old: any[] | undefined) => {
            if (!old) return old;
            return old.map((t: any) => 
              t.client_id === clientId ? { ...t, unread_count: 0 } : t
            );
          }
        );
        queryClient.setQueriesData(
          { queryKey: ['unread-client-ids'] },
          (old: string[] | undefined) => {
            if (!old) return old;
            return old.filter((id: string) => id !== clientId);
          }
        );
        queryClient.setQueriesData(
          { queryKey: ['chat-threads-infinite'] },
          (old: any) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                threads: page.threads?.map((t: any) =>
                  t.client_id === clientId ? { ...t, unread_count: 0 } : t
                ),
              })),
            };
          }
        );
        queryClient.invalidateQueries({ queryKey: ['client-unread-by-messenger', clientId] });
        queryClient.invalidateQueries({ queryKey: ['chat-threads-unread-priority'] });
        queryClient.invalidateQueries({ queryKey: ['chat-messages', clientId] });
        queryClient.invalidateQueries({ queryKey: ['chat-messages-infinite', clientId] });
      }
      
      // Clear personal unread marker
      onChatAction?.(clientId, 'read');
      
      toast({
        title: "Готово",
        description: "Чат помечен как не требующий ответа",
      });
    } catch (error) {
      console.error('Error in handleMarkAsNoResponseNeeded:', error);
    }
  };

  // Функция для подтверждения получения оплаты
  const handlePaymentProcessed = async () => {
    if (!clientId) return;
    
    try {
      // Сначала помечаем сообщения как прочитанные
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('client_id', clientId)
        .eq('is_read', false)
        .eq('message_type', 'client');
      
      // Сбрасываем флаг ожидающей оплаты
      await supabase
        .from('clients')
        .update({ has_pending_payment: false } as any)
        .eq('id', clientId);
      
      // Инвалидируем кэши
      queryClient.invalidateQueries({ queryKey: ['client-unread-by-messenger', clientId] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads-unread-priority'] });
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      
      // Вызываем callback если есть
      if (onPaymentProcessed) {
        onPaymentProcessed();
      }
      
      toast({
        title: "Готово",
        description: "Оплата отмечена как проведённая",
      });
    } catch (error) {
      console.error('Error in handlePaymentProcessed:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отметить оплату",
        variant: "destructive",
      });
    }
  };

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
    
    // Prevent duplicate sends if countdown already in progress
    if (pendingMessage) {
      console.log('[ChatArea] Ignoring send - countdown already active');
      return;
    }

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
    
    clearDraft(); // Clear input immediately (persisted)
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
      // Clear personal unread marker when sending a message
      onChatAction?.(clientId, 'read');
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
      // Compute sender name from auth profile for saving with messages
      const senderName = authProfile
        ? [((authProfile as any).first_name), ((authProfile as any).last_name)].filter(Boolean).join(' ') || 'Менеджер поддержки'
        : 'Менеджер поддержки';

      // For direct teacher messages (teacher:xxx), we need special handling
      // Use teacher's phone directly since clientId is not a valid UUID
      const effectiveClientId = isDirectTeacherMessage ? null : clientId;
      const effectivePhone = isDirectTeacherMessage ? clientPhone : undefined;
      
      // Determine which messenger to use
      const messengerType: MessengerType = activeMessengerTab === 'max' ? 'max' 
        : activeMessengerTab === 'telegram' ? 'telegram' 
        : 'whatsapp';
      
      // Check integration status before sending
      const integrationStatus = await checkIntegrationStatus(messengerType);
      
      if (!integrationStatus.isEnabled || !integrationStatus.isConfigured) {
        toast({
          title: "Интеграция недоступна",
          description: integrationStatus.errorMessage || "Мессенджер не настроен",
          variant: "destructive",
        });
        
        // Save message to database with failed status so user can retry later
        await supabase.from('chat_messages').insert({
          client_id: clientId,
          message_text: messageText,
          message_type: 'manager',
          is_outgoing: true,
          messenger_type: messengerType,
          message_status: 'failed',
          sender_name: senderName
        });
        
        queryClient.invalidateQueries({ queryKey: ['chat-messages-optimized', clientId] });
        return;
      }
      
      // Check which messenger tab is active and send via appropriate service
      if (activeMessengerTab === 'max') {
        // Send via MAX - pass phoneNumber and teacherId for teachers
        const maxOptions = effectivePhone ? { phoneNumber: effectivePhone, teacherId: actualTeacherId, senderName } : { senderName };
        
        if (filesToSend.length > 0) {
          for (const file of filesToSend) {
            const result = await sendMaxMessage(
              isDirectTeacherMessage ? '' : clientId, 
              messageText || '', 
              file.url, 
              file.name, 
              file.type,
              maxOptions
            );
            if (!result) {
              toast({
                title: "Ошибка отправки файла в MAX",
                description: `Не удалось отправить файл "${file.name}"`,
                variant: "destructive",
              });
              // Save failed message so user can retry
              await supabase.from('chat_messages').insert(buildMessageRecord({
                client_id: clientId,
                message_text: messageText || `[Файл: ${file.name}]`,
                message_type: 'manager',
                is_outgoing: true,
                messenger_type: 'max',
                message_status: 'failed',
                file_url: file.url,
                file_name: file.name,
                file_type: file.type,
                sender_name: senderName
              }));
              queryClient.invalidateQueries({ queryKey: ['chat-messages-optimized', clientId] });
              if (isDirectTeacherMessage) {
                queryClient.invalidateQueries({ queryKey: ['teacher-chat-messages-v2', actualTeacherId] });
              }
              return;
            }
          }
        } else if (messageText) {
          const result = await sendMaxMessage(
            isDirectTeacherMessage ? '' : clientId, 
            messageText,
            undefined,
            undefined,
            undefined,
            maxOptions
          );
          if (!result) {
            toast({
              title: "Ошибка отправки в MAX",
              description: "Не удалось отправить сообщение",
              variant: "destructive",
            });
            // Save failed message so user can retry
            await supabase.from('chat_messages').insert(buildMessageRecord({
              client_id: clientId,
              message_text: messageText,
              message_type: 'manager',
              is_outgoing: true,
              messenger_type: 'max',
              message_status: 'failed',
              sender_name: senderName
            }));
            queryClient.invalidateQueries({ queryKey: ['chat-messages-optimized', clientId] });
            if (isDirectTeacherMessage) {
              queryClient.invalidateQueries({ queryKey: ['teacher-chat-messages-v2', actualTeacherId] });
            }
            return;
          }
        }
      } else if (activeMessengerTab === 'telegram') {
        // Send via Telegram - pass phoneNumber and teacherId for teachers
        const telegramOptions = effectivePhone ? { phoneNumber: effectivePhone, teacherId: actualTeacherId, senderName } : { senderName };
        
        if (filesToSend.length > 0) {
          for (const file of filesToSend) {
            const result = await sendTelegramMessage(
              isDirectTeacherMessage ? '' : clientId, 
              messageText || '', 
              file.url, 
              file.name, 
              file.type,
              telegramOptions
            );
            if (!result.success) {
              toast({
                title: "Ошибка отправки файла в Telegram",
                description: `Не удалось отправить файл "${file.name}"`,
                variant: "destructive",
              });
              // Save failed message so user can retry
              await supabase.from('chat_messages').insert(buildMessageRecord({
                client_id: clientId,
                message_text: messageText || `[Файл: ${file.name}]`,
                message_type: 'manager',
                is_outgoing: true,
                messenger_type: 'telegram',
                message_status: 'failed',
                file_url: file.url,
                file_name: file.name,
                file_type: file.type,
                sender_name: senderName
              }));
              queryClient.invalidateQueries({ queryKey: ['chat-messages-optimized', clientId] });
              if (isDirectTeacherMessage) {
                queryClient.invalidateQueries({ queryKey: ['teacher-chat-messages-v2', actualTeacherId] });
              }
              return;
            }
          }
        } else if (messageText) {
          const result = await sendTelegramMessage(
            isDirectTeacherMessage ? '' : clientId, 
            messageText,
            undefined,
            undefined,
            undefined,
            telegramOptions
          );
          if (!result.success) {
            toast({
              title: "Ошибка отправки в Telegram",
              description: "Не удалось отправить сообщение",
              variant: "destructive",
            });
            // Save failed message so user can retry
            await supabase.from('chat_messages').insert(buildMessageRecord({
              client_id: clientId,
              message_text: messageText,
              message_type: 'manager',
              is_outgoing: true,
              messenger_type: 'telegram',
              message_status: 'failed',
              sender_name: senderName
            }));
            queryClient.invalidateQueries({ queryKey: ['chat-messages-optimized', clientId] });
            if (isDirectTeacherMessage) {
              queryClient.invalidateQueries({ queryKey: ['teacher-chat-messages-v2', actualTeacherId] });
            }
            return;
          }
        }
      } else if (activeMessengerTab === 'chatos') {
        // Send via ChatOS (internal chat)
        try {
          const { data: orgId } = await supabase.rpc('get_user_organization_id');
          
          // Get sender name from auth context
          let senderName = 'Компания';
          if (authProfile) {
            const profileData = authProfile as any;
            senderName = [profileData.first_name, profileData.last_name].filter(Boolean).join(' ') || 'Компания';
          }

          const { error: insertError } = await supabase
            .from('chat_messages')
            .insert({
              client_id: clientId,
              message_text: messageText,
              messenger_type: 'chatos',
              message_type: filesToSend.length > 0 ? 'file' : 'text',
              is_outgoing: true,
              sender_id: authUser?.id,
              sender_name: senderName,
              file_url: filesToSend[0]?.url,
              file_name: filesToSend[0]?.name,
              file_type: filesToSend[0]?.type,
              is_read: true,
              message_status: 'sent',
              organization_id: orgId as string,
            });

          if (insertError) {
            toast({
              title: "Ошибка отправки в ChatOS",
              description: insertError.message,
              variant: "destructive",
            });
            return;
          }
          
          // Invalidate cache
          queryClient.invalidateQueries({ queryKey: ['chat-messages', clientId] });
          queryClient.invalidateQueries({ queryKey: ['chat-messages-optimized', clientId] });
        } catch (chatosError) {
          toast({
            title: "Ошибка отправки в ChatOS",
            description: getErrorMessage(chatosError),
            variant: "destructive",
          });
          return;
        }
      } else {
        // Send via WhatsApp (default)
        // For teachers, use phone directly; for clients, use clientId lookup
        const whatsappClientId = isDirectTeacherMessage ? '' : clientId;
        
        if (filesToSend.length > 0) {
          for (const file of filesToSend) {
            const result = await sendFileMessage(whatsappClientId, file.url, file.name, messageText, effectivePhone, actualTeacherId || undefined, senderName);
            if (!result.success) {
              toast({
                title: "Ошибка отправки файла",
                description: `Не удалось отправить файл "${file.name}": ${result.error}`,
                variant: "destructive",
              });
              // Save failed message so user can retry
              await supabase.from('chat_messages').insert(buildMessageRecord({
                client_id: clientId,
                message_text: messageText || `[Файл: ${file.name}]`,
                message_type: 'manager',
                is_outgoing: true,
                messenger_type: 'whatsapp',
                message_status: 'failed',
                file_url: file.url,
                file_name: file.name,
                file_type: file.type,
                sender_name: senderName
              }));
              queryClient.invalidateQueries({ queryKey: ['chat-messages-optimized', clientId] });
              if (isDirectTeacherMessage) {
                queryClient.invalidateQueries({ queryKey: ['teacher-chat-messages-v2', actualTeacherId] });
              }
              return;
            }
          }
          
          // If we have files and text, send text separately only if it's not just a caption
          if (messageText && messageText !== '[Файл]') {
            const textResult = await sendTextMessage(whatsappClientId, messageText, effectivePhone, actualTeacherId || undefined, senderName);
            if (!textResult.success) {
              toast({
                title: "Ошибка отправки текста",
                description: textResult.error || "Не удалось отправить текстовое сообщение",
                variant: "destructive",
              });
              // Save failed message so user can retry
              await supabase.from('chat_messages').insert(buildMessageRecord({
                client_id: clientId,
                message_text: messageText,
                message_type: 'manager',
                is_outgoing: true,
                messenger_type: 'whatsapp',
                message_status: 'failed',
                sender_name: senderName
              }));
              queryClient.invalidateQueries({ queryKey: ['chat-messages-optimized', clientId] });
              if (isDirectTeacherMessage) {
                queryClient.invalidateQueries({ queryKey: ['teacher-chat-messages-v2', actualTeacherId] });
              }
              return;
            }
          }
        } else if (messageText) {
          // Send text message only
          const result = await sendTextMessage(whatsappClientId, messageText, effectivePhone, actualTeacherId || undefined, senderName);
          if (!result.success) {
            toast({
              title: "Ошибка отправки",
              description: result.error || "Не удалось отправить сообщение",
              variant: "destructive",
            });
            // Save failed message so user can retry
            await supabase.from('chat_messages').insert(buildMessageRecord({
              client_id: clientId,
              message_text: messageText,
              message_type: 'manager',
              is_outgoing: true,
              messenger_type: 'whatsapp',
              message_status: 'failed',
              sender_name: senderName
            }));
            queryClient.invalidateQueries({ queryKey: ['chat-messages-optimized', clientId] });
            if (isDirectTeacherMessage) {
              queryClient.invalidateQueries({ queryKey: ['teacher-chat-messages-v2', actualTeacherId] });
            }
            return;
          }
        }
      }

      // Invalidate message cache to show the newly sent message
      queryClient.invalidateQueries({ queryKey: ['chat-messages-optimized', clientId] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages', clientId] });

      // Remove any pending GPT suggestions for this client after a successful send
      // Skip for teacher messages since they don't have pending GPT responses
      if (!isDirectTeacherMessage) {
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
      }
      
      // Mark all messages as read after sending a reply
      // If we replied - it means we've seen all their messages
      try {
        if (isDirectTeacherMessage && actualTeacherId) {
          // Mark teacher messages as read
          // @ts-ignore - teacher_id exists in self-hosted
          await (supabase.from('chat_messages') as any)
            .update({ is_read: true })
            .eq('teacher_id', actualTeacherId)
            .eq('is_read', false);
          // Await query refetch before scrolling for teacher messages
          await queryClient.refetchQueries({ queryKey: ['teacher-chat-messages-v2', actualTeacherId] });
          queryClient.invalidateQueries({ queryKey: ['teacher-conversations'] });
          
          // For teacher messages, wait for DOM update then scroll
          requestAnimationFrame(() => {
            setTimeout(() => scrollToBottom(true), 100);
          });
        } else {
          await markChatMessagesAsReadMutation.mutateAsync(clientId);
          // Smooth scroll to bottom after sending message
          setTimeout(() => scrollToBottom(true), 300);
        }
        console.log('Marked all messages as read after sending reply');
      } catch (e) {
        console.warn('Failed to mark messages as read:', e);
      }
    } catch (error: unknown) {
      toast({
        title: "Ошибка отправки",
        description: getErrorMessage(error),
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
          messenger_type: activeMessengerTab === 'chatos' ? 'whatsapp' : activeMessengerTab
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
    } catch (error: unknown) {
      toast({
        title: "Ошибка сохранения",
        description: getErrorMessage(error),
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
      const response = await selfHostedPost<{ generatedText?: string }>('generate-gpt-response', { 
        clientId: clientId,
        currentMessage: message.trim()
      });

      if (!response.success) throw new Error(response.error || 'Generation failed');

      if (response.data?.generatedText) {
        setMessage(response.data.generatedText);
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
    } catch (error: unknown) {
      toast({
        title: "Ошибка генерации",
        description: getErrorMessage(error),
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

    clearDraft();
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

    clearDraft();
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
      setCurrentHighlightedId(null);
    }
  };

  // Navigate to a specific message (for search results)
  const handleNavigateToMessage = useCallback((messageId: string) => {
    // Find the message to determine which tab it's in
    const allMessages = messagesData?.messages || [];
    const targetMessage = allMessages.find(m => m.id === messageId);
    
    if (targetMessage) {
      // Switch to correct messenger tab if needed
      const messengerType = targetMessage.messenger_type || 'whatsapp';
      if (messengerType !== activeMessengerTab) {
        setActiveMessengerTab(messengerType);
      }
      
      // Highlight the message
      setCurrentHighlightedId(messageId);
      
      // Scroll to message
      setTimeout(() => {
        const messageElement = document.getElementById(`message-${messageId}`);
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      
      // Clear highlight after animation
      setTimeout(() => {
        setCurrentHighlightedId(null);
      }, 2500);
    }
  }, [messagesData?.messages, activeMessengerTab]);

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

      if (!authUser) {
        throw new Error('Пользователь не авторизован');
      }

      const response = await selfHostedPost<{ success?: boolean; error?: string }>('onlinepbx-call', { 
        to_number: clientPhone,
        from_user: authUser.id
      });

      if (!response.success) {
        throw new Error(response.error || 'Не удалось совершить звонок');
      }

      if (response.data?.success) {
        toast({
          title: "Звонок совершён",
          description: "Звонок инициирован через OnlinePBX. Поднимите трубку.",
        });
        
        // Refresh call history to show the new call
        queryClient.invalidateQueries({ queryKey: ['call-logs', clientId] });
      } else {
        throw new Error(response.data?.error || 'Не удалось совершить звонок');
      }
    } catch (error: unknown) {
      console.error('OnlinePBX call failed:', error);
      toast({
        title: "Ошибка звонка",
        description: getErrorMessage(error),
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
  const handleForwardSingleMessage = useCallback((messageId: string) => {
    setSelectedMessages(new Set([messageId]));
    setShowForwardModal(true);
  }, []);

  // Функция для цитирования текста
  const handleQuoteMessage = useCallback((text: string) => {
    setQuotedText(text);
    // Фокус на поле ввода
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  }, []);

  // Функция для включения режима множественного выбора через контекстное меню
  const handleEnterSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
  }, []);

  const handleForwardMessages = async (recipients: Array<{id: string, type: 'staff' | 'group', name: string}>) => {
    // ForwardMessageModal now handles sending via useSendStaffMessage internally
    // This callback is kept for resetting selection mode
    setIsSelectionMode(false);
    setSelectedMessages(new Set());
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
  const handleEditMessage = useCallback(async (messageId: string, newMessage: string) => {
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
  }, [messages, clientId, editMaxMessage, editMessage, toast, queryClient]);

  // Функция для удаления сообщения
  const handleDeleteMessage = useCallback(async (messageId: string) => {
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
  }, [messages, clientId, deleteMaxMessage, deleteMessage, queryClient]);

  // Функция для повторной отправки сообщения с ошибкой
  const handleResendMessage = useCallback(async (messageId: string) => {
    // Find the failed message
    const msg = messages.find(m => m.id === messageId);
    if (!msg) {
      toast({
        title: "Ошибка",
        description: "Сообщение не найдено",
        variant: "destructive",
      });
      return;
    }

    const messengerType = msg.messengerType || 'whatsapp';
    
    // Cancel any scheduled auto-retry for this message
    resetRetryState(messageId);
    
    // Update status to 'queued' optimistically
    await supabase
      .from('chat_messages')
      .update({ message_status: 'queued' })
      .eq('id', messageId);
    
    // Invalidate cache to show queued status
    queryClient.invalidateQueries({ queryKey: ['chat-messages-optimized', clientId] });

    toast({
      title: "Повторная отправка",
      description: "Отправляем сообщение повторно...",
    });

    try {
      let result;
      
      // For direct teacher messages, use phone as fallback
      const resendPhone = isDirectTeacherMessage ? clientPhone : undefined;
      const resendClientId = isDirectTeacherMessage ? '' : clientId;
      const resendOptions = resendPhone ? { phoneNumber: resendPhone } : undefined;
      
      if (messengerType === 'max') {
        result = await sendMaxMessage(resendClientId, msg.message, msg.fileUrl, msg.fileName, msg.fileType, resendOptions);
        if (!result) {
          throw new Error('Не удалось отправить сообщение в MAX');
        }
      } else if (messengerType === 'telegram') {
        result = await sendTelegramMessage(resendClientId, msg.message, msg.fileUrl, msg.fileName, msg.fileType, resendOptions);
        if (!result.success) {
          throw new Error(result.error || 'Не удалось отправить сообщение в Telegram');
        }
      } else {
        // WhatsApp - already supports phone via additional params
        if (msg.fileUrl) {
          result = await sendFileMessage(resendClientId, msg.fileUrl, msg.fileName || 'file', msg.message, resendPhone, actualTeacherId || undefined);
        } else {
          result = await sendTextMessage(resendClientId, msg.message, resendPhone, actualTeacherId || undefined);
        }
        if (!result.success) {
          throw new Error(result.error || 'Не удалось отправить сообщение в WhatsApp');
        }
      }

      // Update original message status to 'sent' and remove the old failed record
      await supabase
        .from('chat_messages')
        .update({ message_status: 'sent' })
        .eq('id', messageId);

      queryClient.invalidateQueries({ queryKey: ['chat-messages-optimized', clientId] });

      toast({
        title: "Успешно",
        description: "Сообщение отправлено повторно",
      });
    } catch (error: unknown) {
      // Update status back to 'failed'
      await supabase
        .from('chat_messages')
        .update({ message_status: 'failed' })
        .eq('id', messageId);

      queryClient.invalidateQueries({ queryKey: ['chat-messages-optimized', clientId] });

      toast({
        title: "Ошибка повторной отправки",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  }, [messages, clientId, clientPhone, isDirectTeacherMessage, resetRetryState, queryClient, toast, sendMaxMessage, sendTelegramMessage, sendFileMessage, sendTextMessage]);

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

  // Note: We no longer filter messages by search query
  // Instead, we use navigation to jump between results (ChatSearchBar component)

  // Filter messages by messenger type
  const whatsappMessages = messages.filter(msg => 
    !msg.messengerType || msg.messengerType === 'whatsapp'
  );

  const maxMessages = messages.filter(msg => 
    msg.messengerType === 'max'
  );

  const telegramMessages = messages.filter(msg => 
    msg.messengerType === 'telegram'
  );

  const chatosMessages = messages.filter(msg => 
    msg.messengerType === 'chatos'
  );

  // Проверяем, является ли последнее сообщение входящим (от клиента)
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const isLastMessageIncoming = lastMessage ? lastMessage.type === 'client' : false;

  return (
    <ChatGalleryProvider>
      <ReactionsProvider messageIds={messageIds}>
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
          if (files.length > 0 && fileUploadRef.current) {
            console.log('File dropped, uploading:', files.map(f => f.name));
            fileUploadRef.current.uploadFiles(files);
          }
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
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-sm text-foreground truncate">{displayName}</h2>
                  <ImageCacheIndicator progress={imageCacheProgress} compact />
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {activeMessengerTab === 'telegram' && clientTelegramUserId 
                    ? `ID: ${clientTelegramUserId}` 
                    : activeMessengerTab === 'max' && clientMaxId
                    ? `MAX ID: ${clientMaxId}`
                    : formatPhoneForDisplay(clientPhone) || (clientTelegramUserId ? `ID: ${clientTelegramUserId}` : '')}
                </p>
                {isOtherUserTyping && typingInfo && (
                  <p className="text-xs text-orange-600 italic animate-pulse">
                    {typingInfo.managerName} печатает...
                  </p>
                )}
              </div>
            </div>
            
            {/* Action buttons moved to the right - only Search, Phone, User visible, rest in dropdown */}
            <div className="flex items-center gap-1 flex-shrink-0">
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
              
              {/* More actions dropdown - contains all other actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 w-8 p-0 border-muted-foreground/40 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    title="Ещё"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-background border shadow-lg z-50">
                  <DropdownMenuItem onClick={() => (onOpenTaskModal ? onOpenTaskModal() : setShowAddTaskModal(true))}>
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Добавить задачу</span>
                  </DropdownMenuItem>
                  {!isTeacherMessages && (
                    <DropdownMenuItem onClick={() => (onOpenInvoiceModal ? onOpenInvoiceModal() : setShowInvoiceModal(true))}>
                      <FileText className="mr-2 h-4 w-4" />
                      <span>Выставить счёт</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleToggleSelectionMode}>
                    <Forward className="mr-2 h-4 w-4" />
                    <span>Переслать</span>
                  </DropdownMenuItem>
                  {onChatAction && (
                    <>
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
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
        
        {/* Desktop: Inline user info with actions */}
        {!isMobile && (
          <div className="flex items-center justify-between gap-2 p-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-base truncate">{displayName}</h2>
                  <ImageCacheIndicator progress={imageCacheProgress} />
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {activeMessengerTab === 'telegram' && clientTelegramUserId 
                    ? `ID: ${clientTelegramUserId}` 
                    : activeMessengerTab === 'max' && clientMaxId
                    ? `MAX ID: ${clientMaxId}`
                    : formatPhoneForDisplay(clientPhone) || (clientTelegramUserId ? `ID: ${clientTelegramUserId}` : '')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Icons visible on larger screens, hidden on very small */}
              <Button 
                variant="ghost"
                size="icon"
                className="h-8 w-8 hidden sm:flex"
                title="Добавить задачу"
                onClick={() => (onOpenTaskModal ? onOpenTaskModal() : setShowAddTaskModal(true))}
              >
                <Plus className="h-4 w-4" />
              </Button>
              {!isTeacherMessages && (
                <Button 
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hidden sm:flex"
                  title="Выставить счёт"
                  onClick={() => (onOpenInvoiceModal ? onOpenInvoiceModal() : setShowInvoiceModal(true))}
                >
                  <FileText className="h-4 w-4" />
                </Button>
              )}
              
              {/* Always visible icons */}
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
              
              {/* ChatOS assistant shortcut */}
              {onOpenAssistant && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="ChatOS Ассистент"
                  onClick={onOpenAssistant}
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              )}
              
              {/* Toggle right panel button - visible on larger screens */}
              {onToggleRightPanel && (
                <Button 
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hidden sm:flex"
                  title={rightPanelCollapsed ? "Показать семейную группу" : "Скрыть семейную группу"}
                  onClick={onToggleRightPanel}
                >
                  {rightPanelCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
                </Button>
              )}
              
              {/* Dropdown for hidden icons on small screens */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:hidden"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => (onOpenTaskModal ? onOpenTaskModal() : setShowAddTaskModal(true))}>
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Добавить задачу</span>
                  </DropdownMenuItem>
                  {!isTeacherMessages && (
                    <DropdownMenuItem onClick={() => (onOpenInvoiceModal ? onOpenInvoiceModal() : setShowInvoiceModal(true))}>
                      <FileText className="mr-2 h-4 w-4" />
                      <span>Выставить счёт</span>
                    </DropdownMenuItem>
                  )}
                  {onToggleRightPanel && (
                    <DropdownMenuItem onClick={onToggleRightPanel}>
                      {rightPanelCollapsed ? <PanelLeft className="mr-2 h-4 w-4" /> : <PanelRight className="mr-2 h-4 w-4" />}
                      <span>{rightPanelCollapsed ? "Показать карточку" : "Скрыть карточку"}</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              
            </div>
          </div>
        )}
        
        {/* Chat Search Bar */}
        <ChatSearchBar
          messages={messagesData?.messages || []}
          isOpen={showSearchInput}
          onClose={() => {
            setShowSearchInput(false);
            setSearchQuery('');
            setCurrentHighlightedId(null);
          }}
          onNavigateToMessage={handleNavigateToMessage}
          onSearchQueryChange={setSearchQuery}
        />
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
          currentMessengerType={activeMessengerTab}
        />
      </div>

      {/* Chat Messages with Tabs */}
      <div className="flex-1 overflow-hidden min-h-0">
        <Tabs value={activeMessengerTab} onValueChange={handleTabChange} className="h-full flex flex-col min-h-0">
          <TabsList className="flex w-full rounded-none bg-muted/30 border-b shrink-0 gap-0.5 p-0.5 overflow-x-auto">
            <TabsTrigger 
              value="whatsapp" 
              className="text-xs relative px-2 py-1.5 flex-shrink-0 data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              <span className="flex items-center gap-1 whitespace-nowrap">
                {/* Integration status indicator */}
                <span 
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${
                    integrationsStatus?.whatsapp?.isEnabled && integrationsStatus?.whatsapp?.isConfigured
                      ? 'bg-green-400 data-[state=active]:bg-white'
                      : 'bg-red-400 data-[state=active]:bg-red-200'
                  }`}
                  title={
                    integrationsStatus?.whatsapp?.isEnabled && integrationsStatus?.whatsapp?.isConfigured
                      ? 'Интеграция активна'
                      : 'Интеграция отключена или не настроена'
                  }
                />
                WhatsApp
              </span>
              {unreadByMessenger.whatsapp > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadByMessenger.whatsapp > 99 ? '99+' : unreadByMessenger.whatsapp}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="telegram" 
              className="text-xs relative px-2 py-1.5 flex-shrink-0 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              <span className="flex items-center gap-1 whitespace-nowrap">
                <span 
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${
                    integrationsStatus?.telegram?.isEnabled && integrationsStatus?.telegram?.isConfigured
                      ? 'bg-green-400 data-[state=active]:bg-white'
                      : 'bg-red-400 data-[state=active]:bg-red-200'
                  }`}
                  title={
                    integrationsStatus?.telegram?.isEnabled && integrationsStatus?.telegram?.isConfigured
                      ? 'Интеграция активна'
                      : 'Интеграция отключена или не настроена'
                  }
                />
                Telegram
              </span>
              {unreadByMessenger.telegram > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadByMessenger.telegram > 99 ? '99+' : unreadByMessenger.telegram}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="max" 
              className="text-xs relative px-2 py-1.5 flex-shrink-0 data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              <span className="flex items-center gap-1 whitespace-nowrap">
                <span 
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${
                    integrationsStatus?.max?.isEnabled && integrationsStatus?.max?.isConfigured
                      ? 'bg-green-400 data-[state=active]:bg-white'
                      : 'bg-red-400 data-[state=active]:bg-red-200'
                  }`}
                  title={
                    integrationsStatus?.max?.isEnabled && integrationsStatus?.max?.isConfigured
                      ? 'Интеграция активна'
                      : 'Интеграция отключена или не настроена'
                  }
                />
                Max
              </span>
              {unreadByMessenger.max > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadByMessenger.max > 99 ? '99+' : unreadByMessenger.max}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="chatos" 
              className="text-xs relative px-2 py-1.5 flex-shrink-0 data-[state=active]:bg-teal-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              <span className="flex items-center gap-1 whitespace-nowrap">
                <span 
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-green-400 data-[state=active]:bg-white transition-colors"
                  title="Внутренний чат"
                />
                ChatOS
              </span>
              {unreadByMessenger.chatos > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadByMessenger.chatos > 99 ? '99+' : unreadByMessenger.chatos}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="email" 
              className="text-xs relative px-2 py-1.5 flex-shrink-0 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              <span className="whitespace-nowrap">Email</span>
              {unreadByMessenger.email > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadByMessenger.email > 99 ? '99+' : unreadByMessenger.email}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="calls" 
              className="text-xs relative px-2 py-1.5 flex-shrink-0 data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              <span className="whitespace-nowrap">Звонки</span>
              {unreadByMessenger.calls > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadByMessenger.calls > 99 ? '99+' : unreadByMessenger.calls}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="whatsapp" ref={whatsappScrollRef} className={`relative flex-1 min-h-0 p-3 overflow-y-auto overscroll-contain mt-0 ${isTabTransitioning || isChatSwitching ? 'chat-transition-exit' : 'chat-transition-active'}`}>
            {/* Tab switching overlay */}
            <MessengerTabLoadingOverlay visible={isTabTransitioning} messengerType="whatsapp" />
            
            <NewMessageIndicator
              scrollContainerRef={whatsappScrollRef}
              bottomRef={whatsappEndRef}
              newMessagesCount={whatsappMessages.length}
            />
            <div className="space-y-1">
              {loadingMessages || isChatSwitching ? (
                <ChatSwitchIndicator visible={isChatSwitching && !loadingMessages} />
              ) : null}
              {loadingMessages ? (
                <MessageSkeleton count={6} animated />
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
                      <div key={msg.id || index} id={`message-${msg.id}`}>
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
                            onResendMessage={msg.type === 'manager' && msg.messageStatus === 'failed' ? handleResendMessage : undefined}
                            onCancelRetry={msg.type === 'manager' && msg.messageStatus === 'failed' ? handleCancelRetry : undefined}
                            messageStatus={msg.messageStatus}
                            clientAvatar={whatsappClientAvatar || msg.clientAvatar}
                            managerName={msg.managerName}
                            fileUrl={msg.fileUrl}
                            fileName={msg.fileName}
                            fileType={msg.fileType}
                            messageTypeHint={msg.messageTypeHint}
                            whatsappChatId={msg.whatsappChatId}
                            externalMessageId={msg.externalMessageId}
                            showAvatar={showAvatar}
                            showName={showName}
                            isLastInGroup={isLastInGroup}
                            onForwardMessage={handleForwardSingleMessage}
                            onEnterSelectionMode={handleEnterSelectionMode}
                            onQuoteMessage={handleQuoteMessage}
                            isHighlighted={msg.id === currentHighlightedId}
                            searchQuery={searchQuery}
                            isJustSent={isMessageJustSent(msg)}
                            isEdited={msg.isEdited}
                            editedTime={msg.editedTime}
                            metadata={msg.metadata}
                            clientId={clientId}
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
          
          <TabsContent value="telegram" ref={telegramScrollRef} className={`relative flex-1 min-h-0 p-3 overflow-y-auto overscroll-contain mt-0 ${isTabTransitioning || isChatSwitching ? 'chat-transition-exit' : 'chat-transition-active'}`}>
            {/* Tab switching overlay */}
            <MessengerTabLoadingOverlay visible={isTabTransitioning} messengerType="telegram" />
            
            <NewMessageIndicator
              scrollContainerRef={telegramScrollRef}
              bottomRef={telegramEndRef}
              newMessagesCount={telegramMessages.length}
            />
            <div className="space-y-1">
              {loadingMessages ? (
                <MessageSkeleton count={6} animated />
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
                      <div key={msg.id || index} id={`message-${msg.id}`}>
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
                            onResendMessage={msg.type === 'manager' && msg.messageStatus === 'failed' ? handleResendMessage : undefined}
                            onCancelRetry={msg.type === 'manager' && msg.messageStatus === 'failed' ? handleCancelRetry : undefined}
                            messageStatus={msg.messageStatus}
                            clientAvatar={telegramClientAvatar || msg.clientAvatar}
                            managerName={msg.managerName}
                            fileUrl={msg.fileUrl}
                            fileName={msg.fileName}
                            fileType={msg.fileType}
                            messageTypeHint={msg.messageTypeHint}
                            externalMessageId={msg.externalMessageId}
                            showAvatar={showAvatar}
                            showName={showName}
                            isLastInGroup={isLastInGroup}
                            onForwardMessage={handleForwardSingleMessage}
                            onEnterSelectionMode={handleEnterSelectionMode}
                            onQuoteMessage={handleQuoteMessage}
                            isHighlighted={msg.id === currentHighlightedId}
                            searchQuery={searchQuery}
                            isJustSent={isMessageJustSent(msg)}
                            isEdited={msg.isEdited}
                            editedTime={msg.editedTime}
                            metadata={msg.metadata}
                            clientId={clientId}
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
          
          <TabsContent value="max" ref={maxScrollRef} className={`relative flex-1 min-h-0 p-3 overflow-y-auto overscroll-contain mt-0 ${isTabTransitioning || isChatSwitching ? 'chat-transition-exit' : 'chat-transition-active'}`}>
            {/* Tab switching overlay */}
            <MessengerTabLoadingOverlay visible={isTabTransitioning} messengerType="max" />
            
            <NewMessageIndicator
              scrollContainerRef={maxScrollRef}
              bottomRef={maxEndRef}
              newMessagesCount={maxMessages.length}
            />
            <div className="space-y-1">
              {loadingMessages ? (
                <MessageSkeleton count={6} animated />
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
                      <div key={msg.id || index} id={`message-${msg.id}`}>
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
                            onResendMessage={msg.type === 'manager' && msg.messageStatus === 'failed' ? handleResendMessage : undefined}
                            onCancelRetry={msg.type === 'manager' && msg.messageStatus === 'failed' ? handleCancelRetry : undefined}
                            messageStatus={msg.messageStatus}
                            clientAvatar={maxClientAvatar || msg.clientAvatar}
                            managerName={msg.managerName}
                            fileUrl={msg.fileUrl}
                            fileName={msg.fileName}
                            fileType={msg.fileType}
                            messageTypeHint={msg.messageTypeHint}
                            whatsappChatId={msg.whatsappChatId}
                            externalMessageId={msg.externalMessageId}
                            showAvatar={showAvatar}
                            showName={showName}
                            isLastInGroup={isLastInGroup}
                            onForwardMessage={handleForwardSingleMessage}
                            onEnterSelectionMode={handleEnterSelectionMode}
                            onQuoteMessage={handleQuoteMessage}
                            isHighlighted={msg.id === currentHighlightedId}
                            searchQuery={searchQuery}
                            isJustSent={isMessageJustSent(msg)}
                            isEdited={msg.isEdited}
                            editedTime={msg.editedTime}
                            metadata={msg.metadata}
                            clientId={clientId}
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
          
          <TabsContent value="chatos" ref={chatosScrollRef} className={`relative flex-1 min-h-0 p-3 overflow-y-auto overscroll-contain mt-0 ${isTabTransitioning || isChatSwitching ? 'chat-transition-exit' : 'chat-transition-active'}`}>
            {/* Tab switching overlay */}
            <MessengerTabLoadingOverlay visible={isTabTransitioning} messengerType="chatos" />
            
            <NewMessageIndicator
              scrollContainerRef={chatosScrollRef}
              bottomRef={chatosEndRef}
              newMessagesCount={chatosMessages.length}
            />
            <div className="space-y-1">
              {loadingMessages ? (
                <MessageSkeleton count={6} animated />
              ) : chatosMessages.length > 0 ? (
                <>
                  {chatosMessages.map((msg, index) => {
                    const prevMessage = chatosMessages[index - 1];
                    const nextMessage = chatosMessages[index + 1];
                    
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
                    
                    if (isHiddenSalebotMessage(msg.message)) {
                      return null;
                    }
                    
                    const isCallback = isSalebotCallback(msg.message) || isSuccessPayment(msg.message);
                    
                    return (
                      <div key={msg.id || index} id={`message-${msg.id}`}>
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
                            onResendMessage={msg.type === 'manager' && msg.messageStatus === 'failed' ? handleResendMessage : undefined}
                            onCancelRetry={msg.type === 'manager' && msg.messageStatus === 'failed' ? handleCancelRetry : undefined}
                            messageStatus={msg.messageStatus}
                            clientAvatar={msg.clientAvatar}
                            managerName={msg.managerName}
                            fileUrl={msg.fileUrl}
                            fileName={msg.fileName}
                            fileType={msg.fileType}
                            messageTypeHint={msg.messageTypeHint}
                            externalMessageId={msg.externalMessageId}
                            showAvatar={showAvatar}
                            showName={showName}
                            isLastInGroup={isLastInGroup}
                            onForwardMessage={handleForwardSingleMessage}
                            onEnterSelectionMode={handleEnterSelectionMode}
                            onQuoteMessage={handleQuoteMessage}
                            isHighlighted={msg.id === currentHighlightedId}
                            searchQuery={searchQuery}
                            isJustSent={isMessageJustSent(msg)}
                            isEdited={msg.isEdited}
                            editedTime={msg.editedTime}
                            metadata={msg.metadata}
                            clientId={clientId}
                          />
                        )}
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="text-center text-muted-foreground text-sm py-4">
                  <div className="flex flex-col items-center gap-2">
                    <MessageCircle className="h-8 w-8 opacity-50" />
                    <p>Нет сообщений во внутреннем чате</p>
                    <p className="text-xs">Начните общение с клиентом через ChatOS</p>
                  </div>
                </div>
              )}
            </div>
            <div ref={chatosEndRef} />
          </TabsContent>
          
          <TabsContent value="email" className={`flex-1 min-h-0 p-3 overflow-y-auto overscroll-contain mt-0 ${isTabTransitioning || isChatSwitching ? 'chat-transition-exit' : 'chat-transition-active'}`}>
            <div className="space-y-1">
              <div className="text-center text-muted-foreground text-sm py-4">
                История переписки Email
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="calls" className={`flex-1 min-h-0 p-3 overflow-y-auto overscroll-contain mt-0 ${isTabTransitioning || isChatSwitching ? 'chat-transition-exit' : 'chat-transition-active'}`}>
            {/* CRITICAL: Only pass valid UUID to CallHistory, never teacher markers */}
            <CallHistory clientId={clientIdForUuidHooks} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Message Input - hidden on calls tab */}
      {activeMessengerTab !== 'calls' && (
      <div className={`border-t p-2 pb-6 shrink-0 ${isMobile && !onBackToList ? 'pb-20' : ''}`}>
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

            {/* Attached files preview with delete button */}
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
                      onRemove={() => setAttachedFiles(prev => prev.filter((_, i) => i !== index))}
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
            
            
            {/* Retry indicator - shows when message send is being retried */}
            {activeMessengerTab === 'whatsapp' && (
              <SendRetryIndicator
                status={whatsappRetryStatus?.status || 'idle'}
                currentAttempt={whatsappRetryStatus?.currentAttempt}
                maxAttempts={whatsappRetryStatus?.maxAttempts}
              />
            )}
            {activeMessengerTab === 'telegram' && (
              <SendRetryIndicator
                status={telegramRetryStatus?.status || 'idle'}
                currentAttempt={telegramRetryStatus?.currentAttempt}
                maxAttempts={telegramRetryStatus?.maxAttempts}
              />
            )}
            {activeMessengerTab === 'max' && (
              <SendRetryIndicator
                status={maxRetryStatus?.status || 'idle'}
                currentAttempt={maxRetryStatus?.currentAttempt}
                maxAttempts={maxRetryStatus?.maxAttempts}
              />
            )}
            
            {/* Typing indicator above textarea */}
            {isOtherUserTyping && typingInfo && (
              <div className="px-2 py-1.5 bg-orange-50 border border-orange-200 rounded-md mb-1">
                <div className="text-xs text-orange-700 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="inline-flex gap-0.5 shrink-0">
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                    </span>
                    <span className="font-medium shrink-0">{typingInfo.managerName}</span>
                    <span className="shrink-0">печатает:</span>
                    {typingInfo.draftText && (
                      <span className="text-orange-600 italic truncate max-w-[200px]">
                        "{typingInfo.draftText}"
                      </span>
                    )}
                  </div>
                  {/* Takeover button */}
                  {typingInfo.managerId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-orange-700 hover:text-orange-900 hover:bg-orange-100 shrink-0"
                      onClick={() => requestTakeover(typingInfo.managerId!, typingInfo.managerName || 'Менеджер', clientName)}
                    >
                      <ArrowRightLeft className="h-3 w-3 mr-1" />
                      <span className="text-[10px]">Перехватить</span>
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            {/* Textarea */}
            <Textarea
              ref={textareaRef}
              placeholder={
                isOtherUserTyping 
                  ? `🔒 ${typingInfo?.managerName || 'Менеджер'} печатает...`
                  : commentMode 
                    ? "Введите комментарий..." 
                    : "Введите сообщение..."
              }
              value={message}
              onChange={(e) => handleMessageChange(e.target.value)}
              onKeyPress={handleKeyPress}
              onKeyDown={() => updateTypingStatus(true, message)}
              onFocus={() => updateTypingStatus(true, message)}
              onBlur={() => updateTypingStatus(false)}
              className={`min-h-[48px] max-h-[120px] resize-none text-base ${
                commentMode ? "bg-yellow-50 border-yellow-300" : ""
              } ${isOtherUserTyping ? "bg-orange-50 border-orange-200 cursor-not-allowed" : ""}`}
              disabled={loading || !!pendingMessage || isOtherUserTyping}
            />
            
            {/* Bottom row: All icons fit screen on mobile */}
            <div ref={composerRef} className="flex items-center gap-1 w-full">
              {/* Action icons - flex-shrink to fit available space */}
              <div className="flex items-center gap-0.5 min-w-0 flex-1 overflow-hidden">
                {/* Always visible: File upload */}
                <FileUpload
                  ref={fileUploadRef}
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
                {/* Quick responses - hidden on screens < 640px */}
                <Button size="sm" variant="ghost" className="hidden sm:flex h-6 w-6 lg:h-8 lg:w-8 p-0 flex-shrink-0" disabled={!!pendingMessage} onClick={() => setShowQuickResponsesModal(true)}>
                  <Zap className="h-4 w-4" />
                </Button>
                {/* Comment mode - hidden on screens < 768px */}
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className={`hidden md:flex h-6 w-6 lg:h-8 lg:w-8 p-0 flex-shrink-0 ${commentMode ? "bg-yellow-100 text-yellow-700" : ""}`}
                  disabled={!!pendingMessage}
                  onClick={() => setCommentMode(!commentMode)}
                  title="Режим комментариев"
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
                {/* Bot and Mic only for client chats - hidden on smaller screens */}
                {!simplifiedToolbar && (
                  <>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className={`hidden lg:flex h-6 w-6 lg:h-8 lg:w-8 p-0 flex-shrink-0 ${gptGenerating ? "bg-blue-100 text-blue-700" : ""}`}
                      disabled={!!pendingMessage || gptGenerating}
                      onClick={generateGPTResponse}
                      title="Генерировать ответ с помощью GPT"
                    >
                      <Bot className={`h-4 w-4 ${gptGenerating ? "animate-pulse" : ""}`} />
                    </Button>
                    <Button size="sm" variant="ghost" className="hidden lg:flex h-6 w-6 lg:h-8 lg:w-8 p-0 flex-shrink-0" disabled={!!pendingMessage}>
                      <Mic className="h-4 w-4" />
                    </Button>
                  </>
                )}
                
                {/* Simplified toolbar for teacher chats */}
                {simplifiedToolbar ? (
                  <>
                    {/* Show "No response needed" button if there's an unread incoming message */}
                    {isLastMessageIncoming && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 md:h-8 px-2 text-green-700 hover:text-green-800 hover:bg-green-50"
                        disabled={!!pendingMessage}
                        onClick={handleMarkAsNoResponseNeeded}
                        title="Не требует ответа"
                      >
                        <CheckCheck className="h-4 w-4 mr-1" />
                        <span className="text-xs hidden sm:inline">Не требует ответа</span>
                      </Button>
                    )}
                    {/* Simple dropdown with Schedule and Task only */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 md:h-8 md:w-8 p-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-background z-50">
                        <DropdownMenuItem 
                          onClick={() => message.trim() && setShowScheduleDialog(true)}
                          disabled={loading || !message.trim() || !!pendingMessage}
                          className="flex items-center gap-2"
                        >
                          <Clock className="h-4 w-4" />
                          <span>Запланировать</span>
                        </DropdownMenuItem>
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
                    
                    {/* Schedule dialog for simplified toolbar */}
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
                  </>
                ) : (
                  <>
                    {/* Desktop: show all icons, Mobile: hide in dropdown */}
                    {/* Payment link button - visible on lg+ (hidden for teachers) */}
                    {!isTeacherMessages && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="hidden lg:flex h-8 w-8 p-0 flex-shrink-0"
                        disabled={!!pendingMessage}
                        onClick={() => setShowPaymentLinkModal(true)}
                        title="Выставить счёт"
                      >
                        <CreditCard className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {/* Schedule message button - visible on lg+ */}
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
                          className="hidden lg:flex h-8 w-8 p-0 flex-shrink-0"
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

                    {/* Scheduled messages button - visible on lg+ */}
                    {scheduledMessages.length > 0 && (
                      <Dialog open={showScheduledMessagesDialog} onOpenChange={setShowScheduledMessagesDialog}>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="hidden lg:flex h-8 w-8 p-0 relative flex-shrink-0"
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
                    
                    {/* Кнопка "Оплата проведена" - только если есть ожидающий платёж */}
                    {hasPendingPayment && (
                      <>
                        <div className="h-6 w-px bg-border mx-1 hidden xl:block" />
                        
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="hidden xl:flex h-8 px-3 text-sm gap-2 border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 animate-pulse"
                          onClick={handlePaymentProcessed}
                          disabled={!!pendingMessage}
                          title="Подтвердить получение оплаты"
                        >
                          <Banknote className="h-4 w-4 shrink-0" />
                          <span>Оплата внесена</span>
                        </Button>
                      </>
                    )}
                    
                    {/* Разделитель и кнопка "Не требует ответа" - только на больших экранах (xl+) */}
                    {isLastMessageIncoming && !hasPendingPayment && (
                      <>
                        <div className="h-6 w-px bg-border mx-1 hidden xl:block" />
                        
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="hidden xl:flex h-8 px-3 text-sm gap-2 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                          onClick={handleMarkAsNoResponseNeeded}
                          disabled={!!pendingMessage}
                          title="Пометить как не требующий ответа"
                        >
                          <CheckCheck className="h-4 w-4 shrink-0" />
                          <span>Не требует ответа</span>
                        </Button>
                      </>
                    )}
                    
                    {/* Кнопка "Поставить задачу" - только на больших экранах (xl+) */}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="hidden xl:flex h-8 px-3 text-sm gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                      onClick={handleOpenTaskModalAndMarkRead}
                      disabled={!!pendingMessage}
                      title="Поставить задачу"
                    >
                      <ListTodo className="h-4 w-4 shrink-0" />
                      <span>Поставить задачу</span>
                    </Button>
                    
                    {/* Dropdown для действий - видим на экранах < xl */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 lg:h-8 lg:w-8 p-0 xl:hidden flex-shrink-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 bg-background z-50">
                        {/* Быстрые ответы - видим в dropdown на экранах < sm (640px) */}
                        <DropdownMenuItem
                          onClick={() => setShowQuickResponsesModal(true)}
                          disabled={!!pendingMessage}
                          className="flex items-center gap-2 sm:hidden"
                        >
                          <Zap className="h-4 w-4" />
                          <span>Быстрые ответы</span>
                        </DropdownMenuItem>
                        {/* Комментарий - видим в dropdown на экранах < md (768px) */}
                        <DropdownMenuItem
                          onClick={() => setCommentMode(!commentMode)}
                          disabled={!!pendingMessage}
                          className={`flex items-center gap-2 md:hidden ${commentMode ? "text-yellow-700" : ""}`}
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span>{commentMode ? "Выкл. комментарии" : "Комментарий"}</span>
                        </DropdownMenuItem>
                        {/* GPT ответ - видим в dropdown на экранах < lg (1024px) */}
                        <DropdownMenuItem
                          onClick={generateGPTResponse}
                          disabled={!!pendingMessage || gptGenerating}
                          className={`flex items-center gap-2 lg:hidden ${gptGenerating ? "text-blue-700" : ""}`}
                        >
                          <Bot className={`h-4 w-4 ${gptGenerating ? "animate-pulse" : ""}`} />
                          <span>GPT ответ</span>
                        </DropdownMenuItem>
                        {/* Голосовое - видим в dropdown на экранах < lg (1024px) */}
                        <DropdownMenuItem
                          disabled={!!pendingMessage}
                          className="flex items-center gap-2 lg:hidden"
                        >
                          <Mic className="h-4 w-4" />
                          <span>Голосовое</span>
                        </DropdownMenuItem>
                        {/* Выставить счёт - видим в dropdown на экранах < lg (1024px), скрыто для преподавателей */}
                        {!isTeacherMessages && (
                          <DropdownMenuItem
                            onClick={() => setShowPaymentLinkModal(true)}
                            disabled={!!pendingMessage}
                            className="flex items-center gap-2 lg:hidden"
                          >
                            <CreditCard className="h-4 w-4" />
                            <span>Выставить счёт</span>
                          </DropdownMenuItem>
                        )}
                        {/* Запланировать - видим в dropdown на экранах < lg (1024px) */}
                        <DropdownMenuItem
                          onClick={() => message.trim() && setShowScheduleDialog(true)}
                          disabled={loading || !message.trim() || !!pendingMessage}
                          className="flex items-center gap-2 lg:hidden"
                        >
                          <Clock className="h-4 w-4" />
                          <span>Запланировать</span>
                        </DropdownMenuItem>
                        {/* Запланированные сообщения - видим в dropdown на экранах < lg (1024px) */}
                        {scheduledMessages.length > 0 && (
                          <DropdownMenuItem 
                            onClick={() => setShowScheduledMessagesDialog(true)}
                            className="flex items-center gap-2 lg:hidden"
                          >
                            <Calendar className="h-4 w-4" />
                            <span>Запланированные ({scheduledMessages.length})</span>
                          </DropdownMenuItem>
                        )}
                        {/* Оплата проведена - показывается если есть ожидающий платёж */}
                        {hasPendingPayment && (
                          <DropdownMenuItem 
                            onClick={handlePaymentProcessed}
                            disabled={!!pendingMessage}
                            className="flex items-center gap-2 text-emerald-700 font-medium"
                          >
                            <Banknote className="h-4 w-4" />
                            <span>Оплата внесена</span>
                          </DropdownMenuItem>
                        )}
                        {/* Не требует ответа - показывается если нет ожидающего платежа */}
                        {isLastMessageIncoming && !hasPendingPayment && (
                          <DropdownMenuItem 
                            onClick={handleMarkAsNoResponseNeeded}
                            disabled={!!pendingMessage}
                            className="flex items-center gap-2 text-green-700"
                          >
                            <CheckCheck className="h-4 w-4" />
                            <span>Не требует ответа</span>
                          </DropdownMenuItem>
                        )}
                        {/* Поставить задачу - всегда видим в dropdown на экранах < xl */}
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
                  </>
                )}
              </div>
              
              {/* Send button - wider and taller for better tap target */}
              <Button 
                className={`h-12 min-w-[56px] md:min-w-[88px] px-3 md:px-6 rounded-xl xl:h-[40px] xl:px-6 xl:gap-2 xl:rounded-md flex-shrink-0 ${
                  commentMode ? "bg-yellow-500 hover:bg-yellow-600" : ""
                }`}
                onClick={handleSendMessage}
                disabled={(loading || maxLoading) || (!message.trim() && attachedFiles.length === 0 && !paymentLinkAttachment) || message.length > MAX_MESSAGE_LENGTH || !!pendingMessage}
                aria-label="Отправить"
              >
                <Send className="h-5 w-5 shrink-0" />
                <span className="hidden xl:inline">Отправить</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Модальные окна (только если не используются внешние обработчики) */}
      {!onOpenTaskModal && showAddTaskModal && (
        <AddTaskModal 
          open={showAddTaskModal}
          onOpenChange={setShowAddTaskModal}
          clientName={clientName}
          clientId={clientId}
          currentMessengerType={activeMessengerTab}
        />
      )}

      {!onOpenInvoiceModal && showInvoiceModal && (
        <CreateInvoiceModal 
          open={showInvoiceModal}
          onOpenChange={setShowInvoiceModal}
          clientName={clientName}
        />
      )}
      
      {/* Модальное окно пересылки сообщений */}
      {showForwardModal && (
        <ForwardMessageModal
          open={showForwardModal}
          onOpenChange={setShowForwardModal}
          selectedMessages={getSelectedMessagesForForward()}
          currentClientId={clientId}
          clientName={clientName}
          onForward={handleForwardMessages}
          onSent={onForwardSent}
        />
      )}

      {showQuickResponsesModal && (
        <QuickResponsesModal
          open={showQuickResponsesModal}
          onOpenChange={setShowQuickResponsesModal}
          onSelectResponse={handleQuickResponseSelect}
          isTeacher={simplifiedToolbar}
        />
      )}

      {/* Payment Link Modal */}
      <SendPaymentLinkModal
        open={showPaymentLinkModal}
        onOpenChange={setShowPaymentLinkModal}
        clientId={clientId}
        clientName={displayName || clientName}
        messengerType={activeMessengerTab as 'whatsapp' | 'telegram' | 'max'}
        onPaymentLinkGenerated={(data) => {
          // Добавляем как вложение над полем ввода
          setPaymentLinkAttachment(data);
          // Фокус на поле ввода
          setTimeout(() => textareaRef.current?.focus(), 100);
        }}
      />

      {/* Takeover Request Dialog */}
      <TakeoverRequestDialog
        request={incomingRequest}
        draftText={message}
        onApprove={(draftText) => {
          respondToRequest(true, draftText);
          setMessage(''); // Clear after transfer
        }}
        onDecline={() => respondToRequest(false)}
      />

      </div>
      </ReactionsProvider>
    </ChatGalleryProvider>
  );
};
