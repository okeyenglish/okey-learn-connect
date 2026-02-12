import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ClientCardBubble, isClientCardMessage, parseClientCard } from '@/components/ai-hub/ClientCardBubble';
import { ForwardedMessageBubble, isForwardedMessage, parseForwardedComment } from '@/components/ai-hub/ForwardedMessageBubble';
import { FileUpload, FileUploadRef } from '@/components/crm/FileUpload';
import { 
  Bot, 
  Send, 
  Mic, 
  MicOff, 
  Scale, 
  Calculator, 
  Users, 
  Loader2,
  X,
  TrendingUp,
  UserCog,
  GraduationCap,
  Monitor,
  ArrowLeft,
  MessagesSquare,
  Search,
  Link2,
  ChevronDown,
  ChevronRight,
  BookOpen,
  FileText,
  Download,
  Paperclip,
  HelpCircle,
  Check,
  CheckCheck,
  Pencil,
  Trash2,
  ImageIcon,
  UserRound
} from 'lucide-react';
import { toast } from 'sonner';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { useAuth } from '@/hooks/useAuth';
import { isAdmin } from '@/lib/permissions';
import { useQueryClient } from '@tanstack/react-query';
import { useStaffGroupChats, StaffGroupChat, useRenameStaffGroupChat, useDeleteStaffGroupChat, useStaffGroupMembers } from '@/hooks/useStaffGroupChats';
import { useTeacherChats, TeacherChatItem, useEnsureTeacherClient } from '@/hooks/useTeacherChats';
import { useAssistantMessages } from '@/hooks/useAssistantMessages';
import { useCommunityChats } from '@/hooks/useCommunityChats';
import { 
  useStaffDirectMessages, 
  useStaffGroupMessages, 
  useSendStaffMessage, 
  useStaffMembers,
  useStaffConversationPreviews,
  useStaffGroupChatPreviews,
  useMarkStaffChatRead,
  useChatReadCursors
} from '@/hooks/useInternalStaffMessages';
import { useStaffTypingIndicator } from '@/hooks/useStaffTypingIndicator';
import { StaffTypingIndicator } from '@/components/ai-hub/StaffTypingIndicator';
import { CreateStaffGroupModal } from '@/components/ai-hub/CreateStaffGroupModal';
import { LinkTeacherProfileModal } from '@/components/ai-hub/LinkTeacherProfileModal';
import { MassLinkTeacherProfilesModal } from '@/components/ai-hub/MassLinkTeacherProfilesModal';
import VoiceAssistant from '@/components/VoiceAssistant';
import { useStaffOnlinePresence } from '@/hooks/useStaffOnlinePresence';
import { usePersistedSections } from '@/hooks/usePersistedSections';

interface AIHubProps {
  isOpen: boolean;
  onToggle: () => void;
  context?: {
    currentPage: string;
    activeClientId: string | null;
    activeClientName: string | null;
    userRole?: string;
    userBranch?: string;
    activeChatType?: string;
  };
  onOpenModal?: any;
  onOpenChat?: (clientId: string, messageId?: string) => void;
  /** Callback to open scripts modal from Knowledge Base */
  onOpenScripts?: () => void;
  /** If set, auto-open AI assistant and show this message */
  initialAssistantMessage?: string | null;
  /** Clear the initialAssistantMessage after it's been processed */
  onClearInitialAssistantMessage?: () => void;
  /** Category for quick reply suggestions in AI assistant */
  quickReplyCategory?: 'activity_warning' | 'tab_feedback' | null;
  /** If set, auto-open a direct chat with this staff user */
  initialStaffUserId?: string | null;
  /** Clear the initialStaffUserId after it's been processed */
  onClearInitialStaffUserId?: () => void;
  /** If set, auto-open a group chat */
  initialGroupChatId?: string | null;
  /** Clear the initialGroupChatId after it's been processed */
  onClearInitialGroupChatId?: () => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sender?: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  is_read?: boolean;
  message_type?: string;
}

type ConsultantType = 'lawyer' | 'accountant' | 'marketer' | 'hr' | 'methodist' | 'it';
type ChatType = 'assistant' | ConsultantType | 'group' | 'teacher' | 'staff';

interface StaffMember {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string;
  branch?: string;
}

interface ChatItem {
  id: string;
  type: ChatType;
  name: string;
  description: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  badge?: string;
  unreadCount?: number;
  lastMessage?: string;
  lastMessageTime?: string;
  // For groups/teachers/staff
  data?: StaffGroupChat | TeacherChatItem | StaffMember;
}

export const AIHub = ({ 
  isOpen, 
  onToggle, 
  context,
  onOpenModal,
  onOpenChat,
  onOpenScripts,
  initialAssistantMessage,
  onClearInitialAssistantMessage,
  quickReplyCategory,
  initialStaffUserId,
  onClearInitialStaffUserId,
  initialGroupChatId,
  onClearInitialGroupChatId
}: AIHubProps) => {
  const navigate = useNavigate();
  const [activeChat, setActiveChat] = useState<ChatItem | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [teacherClientId, setTeacherClientId] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  
  const [staffFilter, setStaffFilter] = useState<'all' | 'online'>('online'); // По умолчанию показываем онлайн
  
  // Persisted sections state
  const { 
    aiSectionExpanded, 
    toggleAiSection, 
    knowledgeSectionExpanded, 
    toggleKnowledgeSection,
    communitiesSectionExpanded,
    toggleCommunitiesSection
  } = usePersistedSections();
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileUploadRef = useRef<FileUploadRef>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();
  const userIsAdmin = isAdmin(roles);

  // Data hooks
  const { data: staffGroupChats, isLoading: groupChatsLoading } = useStaffGroupChats();
  const { teachers, totalUnread: teachersUnread, isLoading: teachersLoading } = useTeacherChats(null);
  const { communityChats, totalUnread: communityUnread, isLoading: communityLoading } = useCommunityChats();
  const { onlineUsers, isUserOnline, getLastSeenFormatted, onlineCount } = useStaffOnlinePresence();
  const { data: staffMembers } = useStaffMembers();
  
  // Staff conversation previews (for teachers and staff) 
  const teacherProfileIds = teachers.filter(t => t.profileId).map(t => t.profileId as string);
  const staffMemberIds = (staffMembers || []).map(s => s.id);
  const allProfileIds = [...new Set([...teacherProfileIds, ...staffMemberIds])];
  const { data: staffPreviews } = useStaffConversationPreviews(allProfileIds);
  
  // Group chat previews
  const groupChatIds = (staffGroupChats || []).map(g => g.id);
  const { data: groupPreviews } = useStaffGroupChatPreviews(groupChatIds);
  
  // Rename & delete hooks
  const renameGroupChat = useRenameStaffGroupChat();
  const deleteGroupChat = useDeleteStaffGroupChat();
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  // Staff messaging hooks - for staff direct messages using new internal_staff_messages table
  // Use profile_id for direct messaging with teachers/staff (links to profiles/auth.users)
  const selectedStaffProfileId = activeChat?.type === 'teacher' 
    ? (activeChat.data as TeacherChatItem)?.profileId || ''
    : activeChat?.type === 'staff'
      ? (activeChat.data as StaffMember)?.id || ''
      : '';
  const { data: staffDirectMessages, isLoading: staffDirectLoading } = useStaffDirectMessages(selectedStaffProfileId);
  const { data: staffGroupMessages, isLoading: staffGroupLoading } = useStaffGroupMessages(
    activeChat?.type === 'group' ? activeChat.id : ''
  );
  const sendStaffMessage = useSendStaffMessage();
  const { findOrCreateClient } = useEnsureTeacherClient();
  const { unreadCount: assistantUnread } = useAssistantMessages();
  
  // Group members for header display
  const groupMembers = useStaffGroupMembers(activeChat?.type === 'group' ? activeChat.id : '');

  // Read cursors for showing read status per message
  const readCursorChatId = activeChat?.type === 'teacher' || activeChat?.type === 'staff'
    ? selectedStaffProfileId
    : activeChat?.type === 'group'
      ? activeChat.id
      : '';
  const readCursorChatType = activeChat?.type === 'group' ? 'group' : 'direct';
  const { data: readCursors } = useChatReadCursors(readCursorChatId, readCursorChatType as 'direct' | 'group');

  // Staff typing indicator
  const typingChatId = activeChat?.type === 'teacher' || activeChat?.type === 'staff'
    ? selectedStaffProfileId 
    : activeChat?.type === 'group' 
      ? activeChat.id 
      : '';
  const typingChatType = activeChat?.type === 'group' ? 'group' : 'direct';
  const { typingUsers, setTyping, stopTyping } = useStaffTypingIndicator({
    chatId: typingChatId,
    chatType: typingChatType as 'direct' | 'group',
  });

  // Consultants config
  const consultants: Array<{
    id: ConsultantType;
    name: string;
    icon: any;
    description: string;
    greeting: string;
    placeholder: string;
  }> = [
    {
      id: 'lawyer',
      name: 'AI Юрист',
      icon: Scale,
      description: 'Консультации по юридическим вопросам',
      greeting: 'Здравствуйте! Я AI-юрист, готов помочь вам с юридическими вопросами по работе образовательного учреждения. Задайте свой вопрос!',
      placeholder: 'Задайте юридический вопрос...'
    },
    {
      id: 'accountant',
      name: 'AI Бухгалтер',
      icon: Calculator,
      description: 'Помощь с бухгалтерским учётом',
      greeting: 'Привет! Я AI-бухгалтер. Помогу разобраться с налогами, отчётностью и финансовым учётом. Чем могу быть полезен?',
      placeholder: 'Вопрос по бухгалтерии...'
    },
    {
      id: 'marketer',
      name: 'AI Маркетолог',
      icon: TrendingUp,
      description: 'Маркетинг и продвижение школы',
      greeting: 'Привет! Я AI-маркетолог. Помогу с продвижением вашей школы, привлечением учеников, рекламными кампаниями и позиционированием. Что вас интересует?',
      placeholder: 'Вопрос по маркетингу...'
    },
    {
      id: 'hr',
      name: 'AI HR-специалист',
      icon: UserCog,
      description: 'Подбор и управление персоналом',
      greeting: 'Здравствуйте! Я AI HR-специалист. Помогу с подбором преподавателей, мотивацией персонала, разрешением конфликтов и выстраиванием HR-процессов. Чем могу помочь?',
      placeholder: 'Вопрос по персоналу...'
    },
    {
      id: 'methodist',
      name: 'AI Методист',
      icon: GraduationCap,
      description: 'Методология и учебные программы',
      greeting: 'Добрый день! Я AI-методист. Помогу с разработкой учебных программ, методик преподавания, подбором материалов и повышением качества образования. О чём поговорим?',
      placeholder: 'Вопрос по методологии...'
    },
    {
      id: 'it',
      name: 'AI IT-специалист',
      icon: Monitor,
      description: 'Технологии и автоматизация',
      greeting: 'Привет! Я AI IT-специалист. Помогу с выбором и настройкой программ, автоматизацией процессов, онлайн-обучением и техническими вопросами. Что вас интересует?',
      placeholder: 'Вопрос по технологиям...'
    }
  ];

  // Build unified chat list - AI chats, groups, and teachers all together
  const aiChats: ChatItem[] = [
    // AI Assistant
    {
      id: 'assistant',
      type: 'assistant',
      name: 'AI Помощник',
      description: 'Голосовой ассистент и помощь',
      icon: Bot,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      badge: 'AI',
      unreadCount: assistantUnread,
    },
    // Consultants
    ...consultants.map(c => ({
      id: c.id,
      type: c.id as ChatType,
      name: c.name,
      description: c.description,
      icon: c.icon,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      badge: 'AI',
      lastMessage: messages[c.id]?.slice(-1)[0]?.content,
    })),
  ];

  // Staff group chats (unified: branch groups + custom groups)
  const groupChatItems: ChatItem[] = (staffGroupChats || []).map(group => {
    const preview = groupPreviews?.[group.id];
    return {
      id: group.id,
      type: 'group' as ChatType,
      name: group.name,
      description: group.description || (group.is_branch_group ? `Команда ${group.branch_name}` : 'Групповой чат'),
      icon: Users,
      iconBg: group.is_branch_group ? 'bg-indigo-500/10' : 'bg-blue-500/10',
      iconColor: group.is_branch_group ? 'text-indigo-600' : 'text-blue-600',
      badge: group.branch_name || undefined,
      unreadCount: preview?.unreadCount || 0,
      lastMessage: preview?.lastMessage ? `${preview.lastMessageSender ? preview.lastMessageSender + ': ' : ''}${preview.lastMessage}` : undefined,
      lastMessageTime: preview?.lastMessageTime || undefined,
      data: group,
    };
  });

  // Teacher chats - with profile link indicator and previews
  const teacherChatItems: ChatItem[] = teachers.map(teacher => {
    const preview = teacher.profileId ? staffPreviews?.[teacher.profileId] : undefined;
    return {
      id: teacher.id,
      type: 'teacher' as ChatType,
      name: teacher.fullName,
      description: teacher.profileId 
        ? 'Преподаватель'
        : '⚠️ Нет привязки к профилю',
      icon: GraduationCap,
      iconBg: teacher.profileId ? 'bg-green-500/10' : 'bg-amber-500/10',
      iconColor: teacher.profileId ? 'text-green-600' : 'text-amber-600',
      unreadCount: preview?.unreadCount || 0,
      lastMessage: preview?.lastMessage || undefined,
      lastMessageTime: preview?.lastMessageTime || undefined,
      data: teacher,
    };
  });

  // Staff members (managers, methodists, etc.) - exclude those already shown as teachers
  const teacherProfileIdsSet = new Set(teacherProfileIds);
  const staffChatItems: ChatItem[] = (staffMembers || [])
    .filter(staff => !teacherProfileIdsSet.has(staff.id))
    .map(staff => {
      const preview = staffPreviews?.[staff.id];
      const fullName = [staff.first_name, staff.last_name].filter(Boolean).join(' ') || staff.email || 'Сотрудник';
      return {
        id: staff.id,
        type: 'staff' as ChatType,
        name: fullName,
        description: 'Сотрудник',
        icon: Users,
        iconBg: 'bg-blue-500/10',
        iconColor: 'text-blue-600',
        unreadCount: preview?.unreadCount || 0,
        lastMessage: preview?.lastMessage || undefined,
        lastMessageTime: preview?.lastMessageTime || undefined,
        data: staff,
      };
    });

  // Combined flat list
  const allChats = [...aiChats, ...groupChatItems, ...teacherChatItems, ...staffChatItems];

  // Format preview text for staff chat list
  const formatPreviewText = (text: string | undefined): React.ReactNode => {
    if (!text) return null;
    const senderMatch = text.match(/^([^:]+): (.+)$/s);
    const senderPrefix = senderMatch ? senderMatch[1] : null;
    const raw = senderMatch ? senderMatch[2] : text;
    const prefix = senderPrefix ? <><span className="font-medium">{senderPrefix}</span>: </> : null;
    if (raw.match(/^\[client_card:[a-f0-9-]+\]$/i)) {
      return <span className="flex items-center gap-1 truncate">{prefix}<UserRound className="h-3 w-3 shrink-0 text-primary" /> Контакт</span>;
    }
    if (raw.startsWith('[forwarded_from:')) {
      return <span className="flex items-center gap-1 truncate">{prefix}<ArrowLeft className="h-3 w-3 shrink-0 rotate-180" /> Пересланное сообщение</span>;
    }
    if (raw.match(/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i)) {
      return <span className="flex items-center gap-1 truncate">{prefix}<ImageIcon className="h-3 w-3 shrink-0 text-primary" /> Фото</span>;
    }
    if (raw.match(/\.(pdf|doc|docx|xls|xlsx|zip|rar|mp3|mp4|mov|avi)$/i)) {
      return <span className="flex items-center gap-1 truncate">{prefix}<FileText className="h-3 w-3 shrink-0 text-primary" /> Файл</span>;
    }
    return <span className="truncate">{text}</span>;
  };

  // Initialize greeting messages for consultants
  useEffect(() => {
    const initialMessages: Record<string, ChatMessage[]> = {};
    consultants.forEach(c => {
      initialMessages[c.id] = [{
        id: '1',
        type: 'assistant',
        content: c.greeting,
        timestamp: new Date()
      }];
    });
    setMessages(initialMessages);
  }, []);

  // Auto-open AI assistant when initialAssistantMessage is provided
  useEffect(() => {
    if (!initialAssistantMessage || !isOpen) return;
    
    const assistantChat = aiChats.find(chat => chat.type === 'assistant');
    if (assistantChat) {
      setActiveChat(assistantChat);
    }
  }, [initialAssistantMessage, isOpen, aiChats]);

  // Auto-open staff chat when initialStaffUserId is provided
  useEffect(() => {
    if (!initialStaffUserId || !isOpen) return;
    
    const targetChat = [...staffChatItems, ...teacherChatItems].find(chat => {
      if (chat.type === 'staff') {
        return (chat.data as StaffMember)?.id === initialStaffUserId;
      }
      if (chat.type === 'teacher') {
        return (chat.data as TeacherChatItem)?.profileId === initialStaffUserId;
      }
      return false;
    });

    if (targetChat) {
      setActiveChat(targetChat);
      // Invalidate messages cache so latest messages are fetched
      queryClient.invalidateQueries({ queryKey: ['staff-direct-messages', initialStaffUserId] });
      onClearInitialStaffUserId?.();
    }
  }, [initialStaffUserId, isOpen, staffChatItems, teacherChatItems, onClearInitialStaffUserId, queryClient]);

  // Auto-open group chat when initialGroupChatId is provided
  useEffect(() => {
    if (!initialGroupChatId || !isOpen) return;
    
    const targetGroup = groupChatItems.find(chat => {
      const groupData = chat.data as any;
      return groupData?.id === initialGroupChatId;
    });

    if (targetGroup) {
      setActiveChat(targetGroup);
      // Invalidate messages cache so latest messages are fetched
      queryClient.invalidateQueries({ queryKey: ['staff-group-messages', initialGroupChatId] });
      onClearInitialGroupChatId?.();
    }
  }, [initialGroupChatId, isOpen, groupChatItems, onClearInitialGroupChatId, queryClient]);

  // Auto-scroll
  useEffect(() => {
    if (scrollAreaRef.current) {
      setTimeout(() => {
        const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }, 200);
    }
  }, [messages, activeChat, staffDirectMessages, staffGroupMessages]);

  const getSystemPrompt = (consultantType: ConsultantType) => {
    const prompts: Record<ConsultantType, string> = {
      lawyer: 'Ты опытный юрист, специализирующийся на образовательном праве РФ. Отвечай конкретно и по делу, ссылаясь на актуальные законы (ФЗ "Об образовании", Трудовой кодекс, ГК РФ). Давай практические рекомендации для частных школ и образовательных центров.',
      accountant: 'Ты опытный бухгалтер образовательных учреждений. Помогай с налогообложением (УСН, ОСНО), отчётностью, кассовой дисциплиной, начислением зарплаты преподавателям. Объясняй сложное простым языком с примерами для частных школ.',
      marketer: 'Ты маркетолог с опытом продвижения образовательных услуг. Специализируешься на привлечении учеников, работе с соцсетями, контекстной рекламой, воронками продаж. Давай конкретные стратегии и инструменты для частных школ и курсов.',
      hr: 'Ты HR-специалист образовательной сферы. Помогай с подбором преподавателей, мотивацией персонала, разрешением конфликтов, выстраиванием корпоративной культуры. Учитывай специфику работы с педагогами.',
      methodist: 'Ты методист с опытом разработки образовательных программ. Помогай составлять учебные планы, выбирать методики, улучшать качество преподавания, внедрять современные подходы. Давай практические советы для школ и курсов.',
      it: 'Ты IT-специалист для образовательных учреждений. Помогай выбирать CRM-системы, платформы онлайн-обучения, настраивать автоматизацию, решать технические задачи. Рекомендуй конкретные инструменты и сервисы.',
    };
    return prompts[consultantType];
  };

  const handleSendMessage = async () => {
    if ((!message.trim() && !pendingFile) || !activeChat) return;

    const textToSend = message.trim();
    const fileToSend = pendingFile;

    const chatId = activeChat.id;

    // For consultants (AI chats)
    if (['lawyer', 'accountant', 'marketer', 'hr', 'methodist', 'it'].includes(activeChat.type)) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: message,
        timestamp: new Date(),
        sender: user?.email || 'Вы'
      };

      setMessages(prev => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), userMessage]
      }));

      setMessage('');
      setIsProcessing(true);

      try {
        const response = await selfHostedPost<{ response?: string }>('ai-consultant', {
          message: message,
          consultantType: activeChat.type,
          systemPrompt: getSystemPrompt(activeChat.type as ConsultantType)
        });

        if (!response.success) throw new Error(response.error);

        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: response.data?.response || 'Извините, не удалось получить ответ.',
          timestamp: new Date()
        };

        setMessages(prev => ({
          ...prev,
          [chatId]: [...(prev[chatId] || []), aiMessage]
        }));
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Ошибка отправки сообщения');
      } finally {
        setIsProcessing(false);
      }
    } 
    // For group chats - use new internal_staff_messages table
    else if (activeChat.type === 'group') {
      try {
        await sendStaffMessage.mutateAsync({
          group_chat_id: activeChat.id,
          message_text: textToSend || (fileToSend ? fileToSend.name : ''),
          message_type: fileToSend ? 'file' : 'text',
          file_url: fileToSend?.url,
          file_name: fileToSend?.name,
          file_type: fileToSend?.type,
        });
        setMessage('');
        setPendingFile(null);
        stopTyping();
      } catch (error) {
        toast.error('Ошибка отправки сообщения');
      }
    }
    // For teacher/staff direct chats - use new internal_staff_messages table
    else if ((activeChat.type === 'teacher' || activeChat.type === 'staff') && activeChat.data) {
      const profileId = activeChat.type === 'teacher' 
        ? (activeChat.data as TeacherChatItem).profileId
        : (activeChat.data as StaffMember).id;
      
      if (!profileId) {
        toast.error(activeChat.type === 'teacher' 
          ? 'У преподавателя не привязан профиль пользователя'
          : 'Не удалось определить профиль сотрудника');
        return;
      }
      try {
        await sendStaffMessage.mutateAsync({
          recipient_user_id: profileId,
          message_text: textToSend || (fileToSend ? fileToSend.name : ''),
          message_type: fileToSend ? 'file' : 'text',
          file_url: fileToSend?.url,
          file_name: fileToSend?.name,
          file_type: fileToSend?.type,
        });
        setMessage('');
        setPendingFile(null);
        stopTyping();
      } catch (error) {
        toast.error('Ошибка отправки сообщения');
      }
    }
  };

  const markChatRead = useMarkStaffChatRead();

  const handleSelectChat = async (item: ChatItem) => {
    try {
      // Check if teacher has profile link before opening chat
      if (item.type === 'teacher' && item.data) {
        const teacher = item.data as TeacherChatItem;
        if (!teacher.profileId) {
          toast.error('У преподавателя не привязан профиль пользователя. Привяжите профиль для обмена сообщениями.');
          return; // Don't open chat without profile link
        }
        if (teacher.clientId) {
          setTeacherClientId(teacher.clientId);
        } else {
          const clientId = await findOrCreateClient(teacher);
          setTeacherClientId(clientId);
        }
      }
      setActiveChat(item);

      // Mark as read using cursor
      if (item.type === 'teacher' || item.type === 'staff') {
        const profileId = item.type === 'teacher' 
          ? (item.data as TeacherChatItem)?.profileId 
          : (item.data as StaffMember)?.id;
        if (profileId) markChatRead.mutate(profileId);
      } else if (item.type === 'group') {
        markChatRead.mutate(item.id);
      }
    } catch (error) {
      console.error('[AIHub] Error selecting chat:', error);
      toast.error('Не удалось открыть чат. Попробуйте ещё раз.');
    }
  };

  const handleBack = () => {
    setActiveChat(null);
    setTeacherClientId(null);
  };

  const getCurrentMessages = (): ChatMessage[] => {
    if (!activeChat) return [];
    
    // For teacher/staff direct messages - use staff messages
    if (activeChat.type === 'teacher' || activeChat.type === 'staff') {
      return (staffDirectMessages || []).map((m) => ({
        id: m.id,
        type: m.sender_id === user?.id ? 'user' : 'assistant',
        content: m.message_text || '',
        timestamp: new Date(m.created_at),
        sender: m.sender?.first_name,
        file_url: m.file_url,
        file_name: m.file_name,
        file_type: m.file_type,
        is_read: m.is_read,
        message_type: m.message_type
      })) as ChatMessage[];
    }
    
    // For group chats - use staff group messages
    if (activeChat.type === 'group') {
      return (staffGroupMessages || []).map((m) => ({
        id: m.id,
        type: m.sender_id === user?.id ? 'user' : 'assistant',
        content: m.message_text || '',
        timestamp: new Date(m.created_at),
        sender: m.sender?.first_name,
        file_url: m.file_url,
        file_name: m.file_name,
        file_type: m.file_type,
        is_read: m.is_read,
        message_type: m.message_type
      })) as ChatMessage[];
    }
    
    // For AI consultants - use local messages state
    return messages[activeChat.id] || [];
  };

  const getCurrentPlaceholder = () => {
    if (!activeChat) return 'Введите сообщение...';
    const consultant = consultants.find(c => c.id === activeChat.type);
    return consultant?.placeholder || 'Введите сообщение...';
  };

  // Filter all chats based on search
  const filteredChats = allChats.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate into AI and corporate
  const aiChatsList = filteredChats.filter(item => 
    item.type === 'assistant' || ['lawyer', 'accountant', 'marketer', 'hr', 'methodist', 'it'].includes(item.type)
  );
  const corporateChatsList = filteredChats.filter(item => 
    item.type === 'group' || item.type === 'teacher' || item.type === 'staff'
  );

  // Render chat content (for AI assistant - show VoiceAssistant)
  if (activeChat?.type === 'assistant') {
    return (
      <Sheet open={isOpen} onOpenChange={onToggle}>
        <SheetContent side="right" className="w-full sm:w-[500px] h-full p-0 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
            <Button variant="ghost" size="icon" onClick={() => setActiveChat(null)} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">AI Помощник</p>
              <p className="text-xs text-muted-foreground">Голосовой ассистент • Онлайн</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <VoiceAssistant 
              isOpen={true}
              onToggle={onToggle}
              embedded={true}
              context={context}
              onOpenModal={onOpenModal}
              onOpenChat={onOpenChat}
              initialAssistantMessage={initialAssistantMessage}
              onClearInitialMessage={onClearInitialAssistantMessage}
              quickReplyCategory={quickReplyCategory}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Render chat content (for consultants, groups, teachers, staff)
  if (activeChat) {
    const isLoading = (activeChat.type === 'teacher' || activeChat.type === 'staff') ? staffDirectLoading : 
                      activeChat.type === 'group' ? staffGroupLoading : false;
    const currentMessages = getCurrentMessages();

    return (
      <Sheet open={isOpen} onOpenChange={onToggle}>
        <SheetContent side="right" className="w-full sm:w-[500px] h-full p-0 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
            <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Avatar className="h-9 w-9">
              <AvatarFallback className={activeChat.iconBg}>
                <activeChat.icon className={`h-5 w-5 ${activeChat.iconColor}`} />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              {activeChat.type === 'group' && renamingGroupId === activeChat.id ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        renameGroupChat.mutate({ groupId: activeChat.id, name: renameValue });
                        setActiveChat({ ...activeChat, name: renameValue });
                        setRenamingGroupId(null);
                      }
                      if (e.key === 'Escape') setRenamingGroupId(null);
                    }}
                    className="h-7 text-sm"
                    autoFocus
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => {
                    renameGroupChat.mutate({ groupId: activeChat.id, name: renameValue });
                    setActiveChat({ ...activeChat, name: renameValue });
                    setRenamingGroupId(null);
                  }}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setRenamingGroupId(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1">
                    <p className="font-semibold text-sm truncate">{activeChat.name}</p>
                    {activeChat.type === 'group' && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => {
                        setRenamingGroupId(activeChat.id);
                        setRenameValue(activeChat.name);
                      }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p 
                    className={`text-xs text-muted-foreground truncate ${activeChat.type === 'group' && groupMembers.data?.length ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
                    onClick={() => {
                      if (activeChat.type === 'group' && groupMembers.data?.length) {
                        setShowMembersDialog(prev => !prev);
                      }
                    }}
                  >
                    {activeChat.type === 'group' && groupMembers.data?.length 
                      ? groupMembers.data.map(m => m.profile?.first_name || 'Участник').join(', ')
                      : (activeChat.badge || activeChat.description)}
                  </p>
                </>
              )}
            </div>
            
            {/* Link profile button for teachers without profile */}
            {activeChat.type === 'teacher' && activeChat.data && !(activeChat.data as TeacherChatItem).profileId && (
              <LinkTeacherProfileModal
                teacherId={(activeChat.data as TeacherChatItem).id}
                teacherName={(activeChat.data as TeacherChatItem).fullName}
                currentProfileId={(activeChat.data as TeacherChatItem).profileId}
                onLinked={() => {
                  queryClient.invalidateQueries({ queryKey: ['teacher-chats'] });
                }}
              >
                <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                  <Link2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Привязать</span>
                </Button>
              </LinkTeacherProfileModal>
            )}
            {/* Delete group button for admins */}
            {activeChat.type === 'group' && userIsAdmin && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                onClick={() => {
                  if (confirm('Удалить групповой чат? Это действие нельзя отменить.')) {
                    deleteGroupChat.mutate(activeChat.id);
                    handleBack();
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Members list (inline) or Messages */}
          {showMembersDialog && activeChat.type === 'group' && groupMembers.data ? (
            <div className="flex-1 overflow-y-auto">
              <div className="px-2 py-1 space-y-0.5">
                {[...groupMembers.data]
                  .sort((a: any, b: any) => {
                    const aOnline = isUserOnline(a.user_id) ? 1 : 0;
                    const bOnline = isUserOnline(b.user_id) ? 1 : 0;
                    return bOnline - aOnline;
                  })
                  .map((member: any) => {
                  const firstName = member.profile?.first_name || '';
                  const lastName = member.profile?.last_name || '';
                  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Участник';
                  const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || '?';
                  const isOnline = isUserOnline(member.user_id);
                  // Determine role label
                  const isTeacher = teachers.some(t => t.profileId === member.user_id);
                  const roleLabel = member.role === 'admin' ? 'Администратор' 
                    : isTeacher ? 'Преподаватель' 
                    : 'Сотрудник';
                  return (
                    <div 
                      key={member.user_id} 
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        // Skip if clicking on self
                        if (member.user_id === user?.id) return;
                        // Find existing chat item for this user
                        const existingChat = [...staffChatItems, ...teacherChatItems].find(c => {
                          if (c.type === 'staff') return (c.data as StaffMember)?.id === member.user_id;
                          if (c.type === 'teacher') return (c.data as TeacherChatItem)?.profileId === member.user_id;
                          return false;
                        });
                        if (existingChat) {
                          setShowMembersDialog(false);
                          setActiveChat(existingChat);
                        } else {
                          // Create a minimal staff chat item
                          setShowMembersDialog(false);
                          setActiveChat({
                            id: member.user_id,
                            type: 'staff',
                            name: fullName,
                            description: roleLabel,
                            icon: Users,
                            iconBg: 'bg-primary/10',
                            iconColor: 'text-primary',
                            data: { id: member.user_id, first_name: firstName, last_name: lastName, email: member.profile?.email, branch: member.profile?.branch } as StaffMember,
                          });
                        }
                      }}
                    >
                      <div className="relative">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                        </Avatar>
                        {isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">{roleLabel}</p>
                      </div>
                      {member.role === 'admin' && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">Админ</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
          <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-auto">
            <div className="space-y-1 px-3 py-4 pb-24">
              {isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Загрузка...</p>
                </div>
              ) : currentMessages.length === 0 ? (
                <div className="text-center py-8">
                  <MessagesSquare className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <p className="mt-2 text-sm text-muted-foreground">Начните диалог</p>
                </div>
              ) : (
                currentMessages.map((msg, idx) => {
                  const isOwn = msg.type === 'user';
                  const prevMsg = idx > 0 ? currentMessages[idx - 1] : null;
                  const nextMsg = idx < currentMessages.length - 1 ? currentMessages[idx + 1] : null;
                  const isFirstInGroup = !prevMsg || prevMsg.type !== msg.type;
                  const isLastInGroup = !nextMsg || nextMsg.type !== msg.type;
                  
                  // Cursor-based read status
                  const isStaffChat = activeChat.type === 'teacher' || activeChat.type === 'staff' || activeChat.type === 'group';
                  const msgTime = msg.timestamp.toISOString();
                  
                  // For DMs: check if recipient read this message
                  // For groups: check how many members read it
                  const readByAll = isOwn && isStaffChat && readCursors
                    ? readCursors.every(c => new Date(c.lastReadAt) >= msg.timestamp)
                    : false;
                  const readBySome = isOwn && isStaffChat && readCursors
                    ? readCursors.some(c => new Date(c.lastReadAt) >= msg.timestamp)
                    : false;
                  const readByNames = isOwn && isStaffChat && activeChat.type === 'group' && readCursors
                    ? readCursors.filter(c => new Date(c.lastReadAt) >= msg.timestamp).map(c => c.firstName || 'Участник')
                    : [];
                  
                  // Read indicator component
                  const ReadIndicator = isOwn && isStaffChat ? (
                    activeChat.type === 'group' ? (
                      readBySome ? (
                        <span title={readByAll ? 'Прочитано всеми' : `Прочитали: ${readByNames.join(', ')}`}>
                          <CheckCheck className={`h-3 w-3 inline ml-0.5 ${readByAll ? 'text-blue-400' : 'text-blue-300/70'}`} />
                        </span>
                      ) : <Check className="h-3 w-3 inline ml-0.5" />
                    ) : (
                      readByAll 
                        ? <CheckCheck className="h-3 w-3 inline ml-0.5 text-blue-400" />
                        : <Check className="h-3 w-3 inline ml-0.5" />
                    )
                  ) : null;
                  return (
                    <div 
                      key={msg.id}
                      className={`flex items-end gap-1.5 ${isOwn ? 'justify-end' : 'justify-start'} ${isLastInGroup ? 'mb-3' : 'mb-0.5'}`}
                    >
                      {/* Avatar for incoming messages - only on last in group */}
                      {!isOwn && (
                        <div className="w-7 shrink-0">
                          {isLastInGroup && (
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className={`${activeChat.iconBg} text-[10px]`}>
                                {msg.sender ? msg.sender.charAt(0).toUpperCase() : <activeChat.icon className={`h-3.5 w-3.5 ${activeChat.iconColor}`} />}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      )}
                      
                      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                        {/* Special messages (cards, forwarded) rendered without colored bubble */}
                        {(isClientCardMessage(msg.content, msg.message_type) || isForwardedMessage(msg.content, msg.message_type)) ? (
                          <div className="w-full">
                            <div className="rounded-2xl bg-primary/5 border border-primary/10 p-2.5">
                              {isClientCardMessage(msg.content, msg.message_type) ? (
                                <ClientCardBubble content={msg.content} isOwn={false} onOpenChat={(clientId) => { onOpenChat?.(clientId); onToggle(); }} hideComment />
                              ) : (
                                <ForwardedMessageBubble content={msg.content} isOwn={false} onOpenChat={(clientId, messageId) => { onOpenChat?.(clientId, messageId); onToggle(); }} hideComment />
                              )}
                            </div>
                            {/* Comment rendered as separate bubble below */}
                            {(() => {
                              const commentText = isClientCardMessage(msg.content, msg.message_type)
                                ? parseClientCard(msg.content)?.comment
                                : parseForwardedComment(msg.content);
                              if (!commentText) return null;
                              return (
                                <div className={`mt-1 px-3 py-1.5 ${
                                  isOwn 
                                    ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md' 
                                    : 'bg-muted rounded-2xl rounded-bl-md'
                                }`}>
                                  <p className="text-[13.5px] leading-[18px] whitespace-pre-wrap">{commentText}</p>
                                </div>
                              );
                            })()}
                            <div className={`flex items-center gap-1 mt-0.5 px-1 text-[10px] text-muted-foreground ${isOwn ? 'justify-end' : ''}`}>
                              <span>{msg.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                              {ReadIndicator}
                            </div>
                          </div>
                        ) : msg.file_url && msg.file_type?.startsWith('image/') ? (
                          /* Image messages - clean, no colored bg, no filename */
                          <div>
                            <div 
                              className="cursor-pointer" 
                              onClick={() => setLightboxUrl(msg.file_url!)}
                            >
                              <img 
                                src={msg.file_url} 
                                alt="" 
                                className="max-w-full rounded-2xl max-h-56 object-cover hover:opacity-90 transition-opacity"
                              />
                            </div>
                            {/* Only show text if it's not just the filename */}
                            {msg.content && msg.content !== msg.file_name && !msg.content.match(/\.(png|jpg|jpeg|gif|webp|heic|svg|bmp)$/i) && (
                              <div className={`mt-1 px-3 py-1.5 ${
                                isOwn 
                                  ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md' 
                                  : 'bg-muted rounded-2xl rounded-bl-md'
                              }`}>
                                <p className="text-[13.5px] leading-[18px] whitespace-pre-wrap">{msg.content}</p>
                              </div>
                            )}
                            <div className={`flex items-center gap-1 mt-0.5 px-1 text-[10px] text-muted-foreground ${isOwn ? 'justify-end' : ''}`}>
                              <span>{msg.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                              {ReadIndicator}
                            </div>
                          </div>
                        ) : (
                          <div className={`relative px-3 py-1.5 ${
                            isOwn 
                              ? `bg-primary text-primary-foreground ${isLastInGroup ? 'rounded-2xl rounded-br-md' : 'rounded-2xl'}` 
                              : `bg-muted ${isLastInGroup ? 'rounded-2xl rounded-bl-md' : 'rounded-2xl'}`
                          }`}>
                            {/* Sender name for group chats - only first in group */}
                            {msg.sender && !isOwn && isFirstInGroup && activeChat.type === 'group' && (
                              <p className="text-[11px] font-semibold mb-0.5 text-primary">{msg.sender}</p>
                            )}
                            
                            {/* Non-image file attachment */}
                            {msg.file_url && !msg.file_type?.startsWith('image/') && (
                              <div className={msg.content ? 'mb-1.5' : ''}>
                                <a 
                                  href={msg.file_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors ${
                                    isOwn ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20' : 'bg-background/60 hover:bg-background/90'
                                  }`}
                                >
                                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                                    isOwn ? 'bg-primary-foreground/20' : 'bg-primary/10'
                                  }`}>
                                    <FileText className={`h-4 w-4 ${isOwn ? 'text-primary-foreground' : 'text-primary'}`} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-xs font-medium truncate block">{msg.file_name || 'Файл'}</span>
                                    <span className={`text-[10px] ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>Скачать</span>
                                  </div>
                                  <Download className={`h-4 w-4 shrink-0 ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`} />
                                </a>
                              </div>
                            )}
                            
                            {/* Text content */}
                            {msg.content ? (
                              <div className="flex items-end gap-2">
                                <p className="text-[13.5px] leading-[18px] whitespace-pre-wrap">{msg.content}</p>
                                <span className={`text-[10px] leading-[14px] shrink-0 self-end translate-y-[1px] ${
                                  isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'
                                }`}>
                                  {msg.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                  {ReadIndicator}
                                </span>
                              </div>
                            ) : (
                              <div className={`flex justify-end mt-1 text-[10px] ${
                                isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'
                              }`}>
                                <span>
                                  {msg.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                  {ReadIndicator}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              {isProcessing && (
                <div className="flex gap-2">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={activeChat.iconBg}>
                      <Loader2 className={`h-4 w-4 ${activeChat.iconColor} animate-spin`} />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <p className="text-sm text-muted-foreground">Печатает...</p>
                  </div>
                </div>
              )}
              
              {/* Staff typing indicator for teacher/staff/group chats */}
              {(activeChat.type === 'teacher' || activeChat.type === 'staff' || activeChat.type === 'group') && typingUsers.length > 0 && (
                <StaffTypingIndicator typingUsers={typingUsers} />
              )}
            </div>
          </ScrollArea>
          )}

          {/* Input */}
          <div className="px-3 py-2 bg-background/95 backdrop-blur-sm absolute inset-x-0 bottom-0 border-t">
            {/* Pending file preview */}
            {pendingFile && (
              <div className="flex items-center gap-2 mb-2 mx-1 px-3 py-2 bg-muted rounded-xl text-xs">
                {pendingFile.type.startsWith('image/') ? (
                  <img src={pendingFile.url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                )}
                <span className="truncate flex-1 text-sm">{pendingFile.name}</span>
                <button onClick={() => setPendingFile(null)} className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-background/50 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex gap-1.5 items-end">
              {/* File upload button */}
              {(activeChat.type === 'teacher' || activeChat.type === 'staff' || activeChat.type === 'group') && (
                <FileUpload
                  ref={fileUploadRef}
                  onFileUpload={(fileInfo) => {
                    setPendingFile({ url: fileInfo.url, name: fileInfo.name, type: fileInfo.type });
                  }}
                  onFileRemove={() => setPendingFile(null)}
                  disabled={isProcessing || sendStaffMessage.isPending}
                  maxFiles={1}
                  maxSize={10}
                />
              )}
              <textarea
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  // Auto-resize
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  if (activeChat.type === 'teacher' || activeChat.type === 'staff' || activeChat.type === 'group') {
                    if (e.target.value.trim()) {
                      setTyping(true, e.target.value);
                    } else {
                      stopTyping();
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                onBlur={() => {
                  if (activeChat.type === 'teacher' || activeChat.type === 'staff' || activeChat.type === 'group') {
                    stopTyping();
                  }
                }}
                placeholder={getCurrentPlaceholder()}
                disabled={isProcessing || isRecording || sendStaffMessage.isPending}
                rows={1}
                className="flex-1 min-h-[40px] max-h-[120px] rounded-xl bg-muted border-0 px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={(!message.trim() && !pendingFile) || isProcessing || isRecording || sendStaffMessage.isPending}
                size="icon"
                className="shrink-0 h-10 w-10 rounded-full"
              >
                {isProcessing || sendStaffMessage.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
        
        {/* Image lightbox modal */}
        {lightboxUrl && (
          <div 
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setLightboxUrl(null)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
              onClick={() => setLightboxUrl(null)}
            >
              <X className="h-6 w-6" />
            </Button>
            <img
              src={lightboxUrl}
              alt=""
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <a
              href={lightboxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-6 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="h-4 w-4" />
              Открыть оригинал
            </a>
          </div>
        )}
      </Sheet>
    );
  }

  // Re-filter lists without branch filter
  const aiChatsListFiltered = filteredChats.filter(c => 
    ['assistant', 'lawyer', 'accountant', 'marketer', 'hr', 'methodist', 'it'].includes(c.type)
  );
  const corporateChatsListBase = filteredChats
    .filter(c => c.type === 'group' || c.type === 'teacher' || c.type === 'staff')
    .sort((a, b) => {
      // Items with unread messages come first
      const aUnread = a.unreadCount || 0;
      const bUnread = b.unreadCount || 0;
      if (aUnread > 0 && bUnread === 0) return -1;
      if (bUnread > 0 && aUnread === 0) return 1;
      
      // Then sort by last message time (most recent first)
      const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      
      // Then sort by online status
      const aProfileId = a.type === 'teacher' 
        ? (a.data as TeacherChatItem)?.profileId 
        : a.type === 'staff' ? (a.data as StaffMember)?.id : null;
      const bProfileId = b.type === 'teacher' 
        ? (b.data as TeacherChatItem)?.profileId 
        : b.type === 'staff' ? (b.data as StaffMember)?.id : null;
      const aOnline = aProfileId ? isUserOnline(aProfileId) : false;
      const bOnline = bProfileId ? isUserOnline(bProfileId) : false;
      if (aOnline && !bOnline) return -1;
      if (bOnline && !aOnline) return 1;
      
      return 0;
    });
  
  // Apply online filter to staff/teacher chats
  const corporateChatsListFiltered = staffFilter === 'online' 
    ? corporateChatsListBase.filter(item => {
        // Always show groups
        if (item.type === 'group') return true;
        if (item.type === 'teacher') {
          const profileId = (item.data as TeacherChatItem)?.profileId;
          return profileId ? isUserOnline(profileId) : false;
        }
        if (item.type === 'staff') {
          const staffId = (item.data as StaffMember)?.id;
          return staffId ? isUserOnline(staffId) : false;
        }
        return false;
      })
    : corporateChatsListBase;

  // Main chat list - EXACT copy of mobile AIHubInline layout
  return (
    <Sheet open={isOpen} onOpenChange={onToggle}>
      <SheetContent side="right" hideCloseButton className="w-full sm:w-[400px] sm:max-w-[400px] h-full p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MessagesSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">ChatOS</h2>
              <p className="text-xs text-muted-foreground">Чаты и AI-помощники</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search bar and branch filter */}
        <div className="p-2 border-b shrink-0 space-y-2 max-w-full overflow-hidden">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="Поиск по имени, телефону..." 
              className="h-8 text-sm pl-8"
            />
          </div>
          
        </div>

        <ScrollArea className="flex-1 overflow-x-hidden">
          <div className="px-2 py-1 space-y-1 max-w-full overflow-hidden box-border">
            {(groupChatsLoading || teachersLoading) && (
              <div className="text-center py-4">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
              </div>
            )}

            {/* Knowledge Base Section - collapsible */}
            <div className="space-y-1">
              <button 
                onClick={userIsAdmin ? toggleKnowledgeSection : undefined} 
                className={`w-full px-3 py-2 flex items-center justify-between transition-colors rounded-lg ${userIsAdmin ? 'hover:bg-muted/30 cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
              >
                <div className="flex items-center gap-2">
                  {knowledgeSectionExpanded && userIsAdmin ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">База Знаний</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {!userIsAdmin && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">
                      скоро
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs h-5 min-w-[24px] flex items-center justify-center rounded-full">
                    2
                  </Badge>
                </div>
              </button>
              
              {knowledgeSectionExpanded && userIsAdmin && (
                <div className="space-y-1 pl-2">
                  {/* Scripts */}
                  <button 
                    onClick={() => onOpenScripts?.()}
                    className="w-full p-2.5 text-left rounded-lg transition-all duration-200 mb-1 border select-none bg-card hover:bg-accent/30 hover:shadow-sm border-border/50 max-w-full overflow-hidden"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-border/30">
                        <AvatarFallback className="bg-muted">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">Скрипты продаж</p>
                      </div>
                    </div>
                  </button>
                  
                  {/* FAQ */}
                  <button 
                    onClick={() => navigate('/faq')}
                    className="w-full p-2.5 text-left rounded-lg transition-all duration-200 mb-1 border select-none bg-card hover:bg-accent/30 hover:shadow-sm border-border/50 max-w-full overflow-hidden"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-border/30">
                        <AvatarFallback className="bg-muted">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">FAQ для клиентов</p>
                      </div>
                    </div>
                  </button>
                  
                  {/* Training - Coming Soon */}
                  <button 
                    disabled
                    className="w-full p-2.5 text-left rounded-lg transition-all duration-200 mb-1 border select-none opacity-50 cursor-not-allowed bg-muted/30 max-w-full overflow-hidden"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-border/30">
                        <AvatarFallback className="bg-muted">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">Обучение</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">
                        скоро
                      </Badge>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Communities Section - after Knowledge Base */}
            {communityChats.length > 0 && (
              <div className="space-y-1">
                <button 
                  onClick={userIsAdmin ? toggleCommunitiesSection : undefined} 
                  className={`w-full px-3 py-2 flex items-center justify-between transition-colors rounded-lg ${userIsAdmin ? 'hover:bg-muted/30 cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                >
                  <div className="flex items-center gap-2">
                    {communitiesSectionExpanded && userIsAdmin ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Сообщества</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!userIsAdmin && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">
                        скоро
                      </Badge>
                    )}
                    {userIsAdmin && communityUnread > 0 && (
                      <Badge className="bg-destructive text-destructive-foreground text-xs h-5 min-w-[24px] flex items-center justify-center rounded-full">
                        {communityUnread}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs h-5 min-w-[24px] flex items-center justify-center rounded-full">
                      {communityChats.length}
                    </Badge>
                  </div>
                </button>
                
                {communitiesSectionExpanded && userIsAdmin && (
                  <div className="space-y-1 pl-2">
                    {communityChats.map((community) => (
                      <button 
                        key={community.id}
                        onClick={() => {
                          // Open community chat in CRM
                          onOpenChat?.(community.id);
                          onToggle();
                        }}
                        className="w-full p-2.5 text-left rounded-lg transition-all duration-200 mb-1 border select-none bg-card hover:bg-accent/30 hover:shadow-sm border-border/50 max-w-full overflow-hidden"
                      >
                        <div className="flex items-start justify-between gap-2 max-w-full overflow-hidden">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-border/30">
                              <AvatarFallback className="bg-primary/10 text-primary">
                                <Users className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <p className="text-sm font-medium truncate">{community.name}</p>
                                {community.unreadCount > 0 && (
                                  <Badge className="bg-destructive text-destructive-foreground text-[10px] h-4 min-w-[18px] px-1 flex items-center justify-center rounded-full shrink-0">
                                    {community.unreadCount}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                  {community.messengerType === 'telegram' ? 'Telegram' : community.messengerType === 'whatsapp' ? 'WhatsApp' : 'MAX'}
                                </Badge>
                                {community.lastMessage && (
                                  <span className="truncate">{community.lastMessage}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AI Helpers Section - EXACT mobile layout */}
            {aiChatsListFiltered.length > 0 && (
              <div className="space-y-1">
                <button 
                  onClick={userIsAdmin ? toggleAiSection : undefined} 
                  className={`w-full px-3 py-2 flex items-center justify-between transition-colors rounded-lg ${userIsAdmin ? 'hover:bg-muted/30 cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                >
                  <div className="flex items-center gap-2">
                    {aiSectionExpanded && userIsAdmin ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-sm font-medium text-muted-foreground">AI Помощники</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!userIsAdmin && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">
                        скоро
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs h-5 min-w-[24px] flex items-center justify-center rounded-full">
                      {aiChatsListFiltered.length}
                    </Badge>
                  </div>
                </button>
                
                {aiSectionExpanded && userIsAdmin && aiChatsListFiltered.map((item) => (
                  <button 
                    key={item.id} 
                    onClick={() => handleSelectChat(item)} 
                    className="w-full p-2.5 text-left rounded-lg transition-all duration-200 mb-1 border select-none bg-card hover:bg-accent/30 hover:shadow-sm border-border/50 max-w-full overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-2 max-w-full overflow-hidden">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-border/30">
                          <AvatarFallback className="bg-[hsl(var(--avatar-blue))] text-[hsl(var(--text-primary))]">
                            <item.icon className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-center gap-1.5 mb-0">
                            <p className={`text-sm ${(item.unreadCount || 0) > 0 ? 'font-semibold' : 'font-medium'} truncate`}>
                              {item.name}
                            </p>
                            <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0">AI</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed overflow-hidden">
                            <span className="block truncate">{formatPreviewText(item.lastMessage) || item.description}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {item.lastMessage ? 'Сейчас' : ''}
                        </span>
                        {(item.unreadCount || 0) > 0 && (
                          <span className="bg-gradient-to-r from-primary to-primary/90 text-white text-xs px-2 py-0.5 rounded-lg shadow-sm">
                            <span className="font-semibold">{item.unreadCount}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Staff & Groups Section - EXACT mobile layout */}
            {corporateChatsListBase.length > 0 && (
              <div className="space-y-1">
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Сотрудники и группы</span>
                  <div className="flex items-center gap-1">
                    {/* Filter toggle: All / Online - hidden when AI/Communities sections expanded */}
                    {!aiSectionExpanded && !communitiesSectionExpanded && (
                      <div className="flex items-center bg-muted rounded-md p-0.5">
                        <button
                          onClick={() => setStaffFilter('all')}
                          className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                            staffFilter === 'all' 
                              ? 'bg-background shadow-sm font-medium' 
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Все {corporateChatsListBase.length}
                        </button>
                        <button
                          onClick={() => setStaffFilter('online')}
                          className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                            staffFilter === 'online' 
                              ? 'bg-background shadow-sm font-medium' 
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          Онлайн
                        </button>
                      </div>
                    )}
                    <CreateStaffGroupModal onGroupCreated={() => queryClient.invalidateQueries({ queryKey: ['internal-chats'] })} />
                  </div>
                </div>
                
                {corporateChatsListFiltered.length > 0 ? corporateChatsListFiltered.map((item) => {
                  const isTeacher = item.type === 'teacher';
                  const isStaff = item.type === 'staff';
                  const isGroup = item.type === 'group';
                  const teacher = isTeacher ? (item.data as TeacherChatItem) : null;
                  const staff = isStaff ? (item.data as StaffMember) : null;
                  const hasUnread = (item.unreadCount || 0) > 0;
                  
                  // Check if user is online
                  const userProfileId = isTeacher ? teacher?.profileId : isStaff ? staff?.id : null;
                  const isOnline = userProfileId ? isUserOnline(userProfileId) : false;
                  const lastSeenText = userProfileId && !isOnline ? getLastSeenFormatted(userProfileId) : null;
                  
                  // Calculate initials
                  let initials = '';
                  if (isTeacher && teacher) {
                    initials = `${teacher.lastName?.[0] || ''}${teacher.firstName?.[0] || ''}`.toUpperCase() || '•';
                  } else if (isStaff && staff) {
                    initials = `${staff.last_name?.[0] || ''}${staff.first_name?.[0] || ''}`.toUpperCase() || '•';
                  }
                  
                  return (
                    <button 
                      key={`${item.type}-${item.id}`} 
                      onClick={() => handleSelectChat(item)} 
                      className="w-full p-2.5 text-left rounded-lg transition-all duration-200 mb-1 border select-none bg-card hover:bg-accent/30 hover:shadow-sm border-border/50 overflow-hidden box-border"
                    >
                      <div className="flex items-start gap-2 w-full overflow-hidden">
                        <div className="relative shrink-0">
                          <Avatar className="h-9 w-9 ring-2 ring-border/30">
                            <AvatarFallback className="bg-[hsl(var(--avatar-blue))] text-[hsl(var(--text-primary))] text-sm font-medium">
                              {(isTeacher || isStaff) ? initials : <item.icon className="h-4 w-4" />}
                            </AvatarFallback>
                          </Avatar>
                          {isOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-center gap-1.5 mb-0 min-w-0">
                            <span className={`text-sm ${hasUnread ? 'font-semibold' : 'font-medium'} truncate min-w-0 shrink`}>
                              {item.name}
                            </span>
                            {(() => {
                              const branchStr = isTeacher ? teacher?.branch : isStaff ? staff?.branch : null;
                              if (!branchStr) return null;
                              const branches = branchStr.split(',').map(b => b.trim()).filter(Boolean);
                              const visible = branches.slice(0, 2);
                              const hiddenCount = branches.length - visible.length;
                              return (
                                <>
                                  {visible.map(b => (
                                    <Badge key={b} variant="secondary" className="text-[9px] h-3.5 px-1 shrink-0">{b}</Badge>
                                  ))}
                                  {hiddenCount > 0 && (
                                    <Badge variant="outline" className="text-[9px] h-3.5 px-1 shrink-0 cursor-help" title={branches.join(', ')}>
                                      +{hiddenCount}
                                    </Badge>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                          <div className="text-xs text-muted-foreground leading-relaxed overflow-hidden">
                            {lastSeenText && !isOnline ? (
                              <span className="text-muted-foreground/70 block truncate">{lastSeenText}</span>
                            ) : (
                              <span className="block truncate">{formatPreviewText(item.lastMessage) || item.description}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 shrink-0 ml-auto">
                          {hasUnread && (
                            <span className="bg-gradient-to-r from-primary to-primary/90 text-white text-xs px-2 py-0.5 rounded-lg shadow-sm">
                              <span className="font-semibold">{item.unreadCount}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                }) : (
                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                    {staffFilter === 'online' ? 'Нет сотрудников онлайн' : 'Нет сотрудников'}
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {filteredChats.length === 0 && !groupChatsLoading && !teachersLoading && (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'Ничего не найдено' : 'Нет доступных чатов'}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
