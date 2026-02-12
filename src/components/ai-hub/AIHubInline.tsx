import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Send, 
  Mic, 
  MicOff, 
  Scale, 
  Calculator, 
  Users, 
  Loader2,
  TrendingUp,
  UserCog,
  GraduationCap,
  Monitor,
  ArrowLeft,
  MessagesSquare,
  Search,
  Link2,
  ChevronDown,
  X,
  ChevronRight,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Download,
  BookOpen,
  HelpCircle,
  Check,
  CheckCheck,
  Pencil,
  Trash2,
  Forward
} from 'lucide-react';
import { toast } from 'sonner';
import { ClientCardBubble, isClientCardMessage } from '@/components/ai-hub/ClientCardBubble';
import { ForwardedMessageBubble, isForwardedMessage } from '@/components/ai-hub/ForwardedMessageBubble';
import { StaffMessageReactions } from '@/components/ai-hub/StaffMessageReactions';
import { StaffForwardedBubble, isStaffForwardedMessage } from '@/components/ai-hub/StaffForwardedBubble';
import { StaffForwardPicker } from '@/components/ai-hub/StaffForwardPicker';
import { useStaffReactionsBatch } from '@/hooks/useStaffMessageReactions';
import { supabase } from '@/integrations/supabase/typedClient';
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
  useMarkStaffChatRead
} from '@/hooks/useInternalStaffMessages';
import { useStaffTypingIndicator } from '@/hooks/useStaffTypingIndicator';
import { StaffTypingIndicator } from '@/components/ai-hub/StaffTypingIndicator';
import { CreateStaffGroupModal } from '@/components/ai-hub/CreateStaffGroupModal';
import { LinkTeacherProfileModal } from '@/components/ai-hub/LinkTeacherProfileModal';
import { FileUpload, FileUploadRef } from '@/components/crm/FileUpload';
import VoiceAssistant from '@/components/VoiceAssistant';
import { usePersistedSections } from '@/hooks/usePersistedSections';
import { useStaffOnlinePresence, type OnlineUser } from '@/hooks/useStaffOnlinePresence';

interface AIHubInlineProps {
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
  onBack?: () => void;
  /** If set, auto-open a direct chat with this staff user on mount */
  initialStaffUserId?: string | null;
  /** Clear the initialStaffUserId after it's been processed */
  onClearInitialStaffUserId?: () => void;
  /** If set, auto-open a group chat on mount */
  initialGroupChatId?: string | null;
  /** Clear the initialGroupChatId after it's been processed */
  onClearInitialGroupChatId?: () => void;
  /** If set, auto-open AI assistant and show this message */
  initialAssistantMessage?: string | null;
  /** Clear the initialAssistantMessage after it's been processed */
  onClearInitialAssistantMessage?: () => void;
  /** Category for quick reply suggestions in AI assistant */
  quickReplyCategory?: 'activity_warning' | 'tab_feedback' | null;
  /** Callback to open scripts modal from Knowledge Base */
  onOpenScripts?: () => void;
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
  data?: StaffGroupChat | TeacherChatItem | StaffMember;
}

// Knowledge Base Section Component
const KnowledgeBaseSection = ({ 
  expanded, 
  onToggle, 
  onOpenScripts,
  isAdmin 
}: { 
  expanded: boolean; 
  onToggle: () => void;
  onOpenScripts?: () => void;
  isAdmin: boolean;
}) => {
  const navigate = useNavigate();
  
  const knowledgeItems = [
    { 
      id: 'scripts', 
      name: 'Скрипты продаж', 
      icon: FileText,
      onClick: () => onOpenScripts?.()
    },
    { 
      id: 'faq', 
      name: 'FAQ для клиентов', 
      icon: HelpCircle,
      onClick: () => navigate('/faq')
    },
    { 
      id: 'training', 
      name: 'Обучение', 
      icon: GraduationCap,
      disabled: true,
      badge: 'скоро'
    }
  ];

  return (
    <div className="space-y-1">
      <button 
        onClick={isAdmin ? onToggle : undefined} 
        className={`w-full px-3 py-2 flex items-center justify-between transition-colors rounded-lg ${isAdmin ? 'hover:bg-muted/30 cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
      >
        <div className="flex items-center gap-2">
          {expanded && isAdmin ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">База Знаний</span>
        </div>
        <div className="flex items-center gap-1.5">
          {!isAdmin && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">
              скоро
            </Badge>
          )}
          <Badge variant="outline" className="text-xs h-5 min-w-[24px] flex items-center justify-center rounded-full">
            {knowledgeItems.filter(i => !i.disabled).length}
          </Badge>
        </div>
      </button>
      
      {expanded && isAdmin && (
        <div className="space-y-1 pl-2">
          {knowledgeItems.map((item) => (
            <button 
              key={item.id}
              onClick={item.onClick}
              disabled={item.disabled}
              className={`w-full p-2.5 text-left rounded-lg transition-all duration-200 mb-1 border select-none 
                ${item.disabled 
                  ? 'opacity-50 cursor-not-allowed bg-muted/30' 
                  : 'bg-card hover:bg-accent/30 hover:shadow-sm border-border/50'
                } max-w-full overflow-hidden`}
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-border/30">
                  <AvatarFallback className="bg-muted">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                </div>
                {item.badge && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">
                    {item.badge}
                  </Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const AIHubInline = ({
  context,
  onOpenModal,
  onOpenChat,
  onBack,
  initialStaffUserId,
  onClearInitialStaffUserId,
  initialGroupChatId,
  onClearInitialGroupChatId,
  initialAssistantMessage,
  onClearInitialAssistantMessage,
  quickReplyCategory,
  onOpenScripts
}: AIHubInlineProps) => {
  const [activeChat, setActiveChat] = useState<ChatItem | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
  const [teacherClientId, setTeacherClientId] = useState<string | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<{ id: string; content: string; senderName: string; chatName: string } | null>(null);
  
  const [staffFilter, setStaffFilter] = useState<'all' | 'online'>('online'); // По умолчанию показываем онлайн
  const [pendingFile, setPendingFile] = useState<{ url: string; name: string; type: string } | null>(null);
  
  const { 
    aiSectionExpanded, 
    toggleAiSection, 
    knowledgeSectionExpanded, 
    toggleKnowledgeSection,
    communitiesSectionExpanded,
    toggleCommunitiesSection
  } = usePersistedSections();
  
  const { onlineUsers, isUserOnline, getLastSeenFormatted, onlineCount } = useStaffOnlinePresence();
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileUploadRef = useRef<FileUploadRef>(null);
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();
  const userIsAdmin = isAdmin(roles);

  const { data: staffGroupChats, isLoading: groupChatsLoading } = useStaffGroupChats();
  const { teachers, isLoading: teachersLoading } = useTeacherChats(null);
  const { communityChats, totalUnread: communityUnread, isLoading: communityLoading } = useCommunityChats();
  const { data: staffMembers, isLoading: staffMembersLoading } = useStaffMembers();
  
  // Get all profile IDs for staff conversation previews (teachers with profiles + all staff members)
  const teacherProfileIds = teachers
    .filter(t => t.profileId)
    .map(t => t.profileId as string);
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

  const typingChatId = activeChat?.type === 'teacher' 
    ? (activeChat.data as TeacherChatItem)?.profileId || ''
    : activeChat?.type === 'staff'
      ? (activeChat.data as StaffMember)?.id || ''
      : activeChat?.type === 'group' 
        ? activeChat.id 
        : '';
  const typingChatType = activeChat?.type === 'group' ? 'group' : 'direct';
  const { typingUsers, setTyping, stopTyping } = useStaffTypingIndicator({
    chatId: typingChatId,
    chatType: typingChatType as 'direct' | 'group',
  });

  // Staff message reactions (batch for current visible messages)
  const currentStaffMessagesInline = activeChat?.type === 'teacher' || activeChat?.type === 'staff'
    ? (staffDirectMessages || [])
    : activeChat?.type === 'group'
      ? (staffGroupMessages || [])
      : [];
  const staffMessageIdsInline = currentStaffMessagesInline.map(m => m.id);
  const { data: reactionsMapInline } = useStaffReactionsBatch(staffMessageIdsInline);

  // Forward targets for picker
  const forwardTargets = useMemo(() => {
    const targets: Array<{ id: string; name: string; type: 'staff' | 'teacher' | 'group'; icon: 'staff' | 'teacher' | 'group' }> = [];
    (staffGroupChats || []).forEach(g => {
      targets.push({ id: g.id, name: g.name, type: 'group', icon: 'group' });
    });
    teachers.forEach(t => {
      if (t.profileId) {
        targets.push({ id: t.profileId, name: t.fullName, type: 'teacher', icon: 'teacher' });
      }
    });
    const tpIds = new Set(teachers.filter(t => t.profileId).map(t => t.profileId as string));
    (staffMembers || []).filter(s => !tpIds.has(s.id)).forEach(s => {
      const name = [s.first_name, s.last_name].filter(Boolean).join(' ') || s.email || 'Сотрудник';
      targets.push({ id: s.id, name, type: 'staff', icon: 'staff' });
    });
    return targets;
  }, [staffGroupChats, teachers, staffMembers]);

  const handleForwardMessage = async (target: { id: string; name: string; type: 'staff' | 'teacher' | 'group' }, comment: string) => {
    if (!forwardingMessage) return;
    const forwardedContent = `[staff_forwarded:${forwardingMessage.senderName}:${forwardingMessage.chatName}]\n---\n${forwardingMessage.content}${comment ? `\n\n💬 ${comment}` : ''}`;
    try {
      if (target.type === 'group') {
        await sendStaffMessage.mutateAsync({ group_chat_id: target.id, message_text: forwardedContent, message_type: 'staff_forwarded' });
      } else {
        await sendStaffMessage.mutateAsync({ recipient_user_id: target.id, message_text: forwardedContent, message_type: 'staff_forwarded' });
      }
      toast.success(`Сообщение переслано → ${target.name}`);
    } catch (error) {
      toast.error('Не удалось переслать сообщение');
    }
    setForwardingMessage(null);
  };

  const consultants: Array<{
    id: ConsultantType;
    name: string;
    icon: any;
    description: string;
    greeting: string;
    placeholder: string;
  }> = [
    { id: 'lawyer', name: 'AI Юрист', icon: Scale, description: 'Консультации по юридическим вопросам', greeting: 'Здравствуйте! Я AI-юрист...', placeholder: 'Задайте юридический вопрос...' },
    { id: 'accountant', name: 'AI Бухгалтер', icon: Calculator, description: 'Помощь с бухгалтерским учётом', greeting: 'Привет! Я AI-бухгалтер...', placeholder: 'Вопрос по бухгалтерии...' },
    { id: 'marketer', name: 'AI Маркетолог', icon: TrendingUp, description: 'Маркетинг и продвижение', greeting: 'Привет! Я AI-маркетолог...', placeholder: 'Вопрос по маркетингу...' },
    { id: 'hr', name: 'AI HR-специалист', icon: UserCog, description: 'Подбор и управление персоналом', greeting: 'Здравствуйте! Я AI HR-специалист...', placeholder: 'Вопрос по персоналу...' },
    { id: 'methodist', name: 'AI Методист', icon: GraduationCap, description: 'Методология и учебные программы', greeting: 'Добрый день! Я AI-методист...', placeholder: 'Вопрос по методологии...' },
    { id: 'it', name: 'AI IT-специалист', icon: Monitor, description: 'Технологии и автоматизация', greeting: 'Привет! Я AI IT-специалист...', placeholder: 'Вопрос по технологиям...' }
  ];

  const aiChats: ChatItem[] = [
    { id: 'assistant', type: 'assistant', name: 'AI Помощник', description: 'Голосовой ассистент и помощь', icon: Bot, iconBg: 'bg-primary/10', iconColor: 'text-primary', badge: 'AI', unreadCount: assistantUnread },
    ...consultants.map(c => ({ id: c.id, type: c.id as ChatType, name: c.name, description: c.description, icon: c.icon, iconBg: 'bg-primary/10', iconColor: 'text-primary', badge: 'AI', lastMessage: messages[c.id]?.slice(-1)[0]?.content })),
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

  // Teachers with profile links
  const teacherChatItems: ChatItem[] = teachers
    .filter(teacher => teacher.profileId) // Only show teachers with profile links
    .map(teacher => {
      const preview = staffPreviews?.[teacher.profileId!];
      return {
        id: teacher.id, 
        type: 'teacher' as ChatType, 
        name: teacher.fullName, 
        description: 'Преподаватель', 
        icon: GraduationCap, 
        iconBg: 'bg-green-500/10', 
        iconColor: 'text-green-600', 
        unreadCount: preview?.unreadCount || 0, 
        lastMessage: preview?.lastMessage || undefined,
        lastMessageTime: preview?.lastMessageTime || undefined,
        data: teacher,
      };
    });

  // Other staff members (managers, methodists, etc.) - exclude those already shown as teachers
  const teacherProfileIdsSet = new Set(teacherProfileIds);
  const staffChatItems: ChatItem[] = (staffMembers || [])
    .filter(staff => !teacherProfileIdsSet.has(staff.id)) // Exclude users already shown as teachers
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

  const allChats = [...aiChats, ...groupChatItems, ...teacherChatItems, ...staffChatItems];

  // Auto-open chat when initialStaffUserId is provided
  // Wait for staff data to load before trying to find the target chat
  useEffect(() => {
    if (!initialStaffUserId) return;
    
    // Wait for staff members data to be loaded
    if (staffMembersLoading || teachersLoading) return;
    
    // Find the staff chat item by profile ID
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
      onClearInitialStaffUserId?.();
    } else {
      // If target not found among teachers/staff, create a temporary chat entry
      // Fetch profile info and create a temp ChatItem
      (async () => {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, branch')
            .eq('id', initialStaffUserId)
            .single();
          
          if (profile) {
            const tempChatItem: ChatItem = {
              id: `staff-${profile.id}`,
              type: 'staff',
              name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Сотрудник',
              description: profile.branch || '',
              icon: Users,
              iconBg: 'bg-blue-100 dark:bg-blue-900/30',
              iconColor: 'text-blue-600 dark:text-blue-400',
              badge: profile.branch,
              data: {
                id: profile.id,
                first_name: profile.first_name || undefined,
                last_name: profile.last_name || undefined,
                branch: profile.branch || undefined,
              } as StaffMember,
            };
            setActiveChat(tempChatItem);
          } else {
            console.log('[AIHubInline] Profile not found for:', initialStaffUserId);
          }
        } catch (error) {
          console.error('[AIHubInline] Error fetching profile:', error);
        }
        onClearInitialStaffUserId?.();
      })();
    }
  }, [initialStaffUserId, staffChatItems, teacherChatItems, staffMembersLoading, teachersLoading, onClearInitialStaffUserId]);

  // Auto-open group chat when initialGroupChatId is provided
  useEffect(() => {
    if (!initialGroupChatId) return;
    
    const targetGroup = groupChatItems.find(chat => {
      const groupData = chat.data as any;
      return groupData?.id === initialGroupChatId;
    });

    if (targetGroup) {
      setActiveChat(targetGroup);
      onClearInitialGroupChatId?.();
    } else if (!groupChatsLoading) {
      onClearInitialGroupChatId?.();
    }
  }, [initialGroupChatId, groupChatItems, groupChatsLoading, onClearInitialGroupChatId]);

  // Auto-open AI assistant when initialAssistantMessage is provided
  useEffect(() => {
    if (!initialAssistantMessage) return;
    
    // Find the assistant chat item
    const assistantChat = aiChats.find(chat => chat.type === 'assistant');
    if (assistantChat) {
      setActiveChat(assistantChat);
    }
  }, [initialAssistantMessage, aiChats]);

  useEffect(() => {
    const initialMessages: Record<string, ChatMessage[]> = {};
    consultants.forEach(c => {
      initialMessages[c.id] = [{ id: '1', type: 'assistant', content: c.greeting, timestamp: new Date() }];
    });
    setMessages(initialMessages);
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      setTimeout(() => {
        const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) viewport.scrollTop = viewport.scrollHeight;
      }, 100);
    }
  }, [messages, activeChat, staffDirectMessages, staffGroupMessages]);

  const getSystemPrompt = (consultantType: ConsultantType) => {
    const prompts: Record<ConsultantType, string> = {
      lawyer: 'Ты опытный юрист, специализирующийся на образовательном праве РФ.',
      accountant: 'Ты опытный бухгалтер образовательных учреждений.',
      marketer: 'Ты маркетолог с опытом продвижения образовательных услуг.',
      hr: 'Ты HR-специалист образовательной сферы.',
      methodist: 'Ты методист с опытом разработки образовательных программ.',
      it: 'Ты IT-специалист для образовательных учреждений.',
    };
    return prompts[consultantType];
  };

  const handleSendMessage = async () => {
    if ((!message.trim() && !pendingFile) || !activeChat) return;
    const chatId = activeChat.id;
    const fileToSend = pendingFile;
    const textToSend = message.trim();

    if (['lawyer', 'accountant', 'marketer', 'hr', 'methodist', 'it'].includes(activeChat.type)) {
      const userMessage: ChatMessage = { id: Date.now().toString(), type: 'user', content: textToSend, timestamp: new Date(), sender: user?.email || 'Вы' };
      setMessages(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), userMessage] }));
      setMessage('');
      setPendingFile(null);
      setIsProcessing(true);
      try {
        const response = await selfHostedPost<{ response?: string }>('ai-consultant', { message: textToSend, consultantType: activeChat.type, systemPrompt: getSystemPrompt(activeChat.type as ConsultantType) });
        if (!response.success) throw new Error(response.error);
        const aiMessage: ChatMessage = { id: (Date.now() + 1).toString(), type: 'assistant', content: response.data?.response || 'Извините, не удалось получить ответ.', timestamp: new Date() };
        setMessages(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), aiMessage] }));
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Ошибка отправки сообщения');
      } finally {
        setIsProcessing(false);
      }
    } else if (activeChat.type === 'group') {
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
    } else if (activeChat.type === 'teacher' && activeChat.data) {
      const teacher = activeChat.data as TeacherChatItem;
      if (!teacher.profileId) {
        toast.error('У преподавателя не привязан профиль пользователя');
        return;
      }
      try {
        await sendStaffMessage.mutateAsync({ 
          recipient_user_id: teacher.profileId, 
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
    } else if (activeChat.type === 'staff' && activeChat.data) {
      const staff = activeChat.data as StaffMember;
      try {
        await sendStaffMessage.mutateAsync({ 
          recipient_user_id: staff.id, 
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
          toast.error('У преподавателя не привязан профиль пользователя');
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
      console.error('[AIHubInline] handleSelectChat failed:', error);
      toast.error('Не удалось открыть чат. Попробуйте ещё раз.');
    }
  };

  const handleBack = () => {
    if (activeChat) {
      setActiveChat(null);
      setTeacherClientId(null);
    } else {
      onBack?.();
    }
  };

  const getCurrentMessages = (): ChatMessage[] => {
    if (!activeChat) return [];
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
        message_type: m.message_type,
      })) as ChatMessage[];
    }
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
        message_type: m.message_type,
      })) as ChatMessage[];
    }
    return messages[activeChat.id] || [];
  };

  const getCurrentPlaceholder = () => {
    if (!activeChat) return 'Введите сообщение...';
    const consultant = consultants.find(c => c.id === activeChat.type);
    return consultant?.placeholder || 'Введите сообщение...';
  };

  // Highlight search matches in message text
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} className="bg-yellow-300 text-black rounded px-0.5">{part}</mark>
        : part
    );
  };

  // Filter messages based on chat search query
  const getFilteredMessages = (msgs: ChatMessage[]) => {
    if (!chatSearchQuery.trim()) return msgs;
    return msgs.filter(m => 
      m.content.toLowerCase().includes(chatSearchQuery.toLowerCase())
    );
  };

  // Filter by search query
  const searchFiltered = allChats.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter function removed branch filter - only search filtering remains
  const filteredChats = searchFiltered;

  const aiChatsList = filteredChats.filter(item => item.type === 'assistant' || ['lawyer', 'accountant', 'marketer', 'hr', 'methodist', 'it'].includes(item.type));
  
  // Corporate chats base list sorted by: 1) unread, 2) online status, 3) last message time
  const corporateChatsListBase = filteredChats
    .filter(item => item.type === 'group' || item.type === 'teacher' || item.type === 'staff')
    .sort((a, b) => {
      // Items with unread messages come first
      const aUnread = a.unreadCount || 0;
      const bUnread = b.unreadCount || 0;
      if (aUnread > 0 && bUnread === 0) return -1;
      if (bUnread > 0 && aUnread === 0) return 1;
      
      // Then sort by last message time (most recent first) - like messengers
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
  
  // Apply online filter - but always show groups
  const corporateChatsList = staffFilter === 'online' 
    ? corporateChatsListBase.filter(item => {
        // Always show groups (they're always "available")
        if (item.type === 'group') {
          return true;
        }
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

  // Render AI Assistant inline
  if (activeChat?.type === 'assistant') {
    return (
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-background">
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
          <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
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
            onToggle={handleBack}
            embedded={true}
            context={context}
            onOpenModal={onOpenModal}
            onOpenChat={onOpenChat}
            initialAssistantMessage={initialAssistantMessage}
            onClearInitialMessage={onClearInitialAssistantMessage}
            quickReplyCategory={quickReplyCategory}
          />
        </div>
      </div>
    );
  }
  if (activeChat) {
    const isLoading = (activeChat.type === 'teacher' || activeChat.type === 'staff') ? staffDirectLoading : activeChat.type === 'group' ? staffGroupLoading : false;
    const currentMessages = getCurrentMessages();
    const filteredMessages = getFilteredMessages(currentMessages);
    const matchCount = chatSearchQuery.trim() ? filteredMessages.length : 0;
    const IconComponent = activeChat.icon || Users;

    return (
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-background">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
          <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className={activeChat.iconBg || 'bg-muted'}>
              <IconComponent className={`h-5 w-5 ${activeChat.iconColor || 'text-muted-foreground'}`} />
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
                <p className="text-xs text-muted-foreground truncate">
                  {activeChat.type === 'group' && groupMembers.data?.length 
                    ? groupMembers.data.map(m => m.profile?.first_name || 'Участник').join(', ')
                    : (activeChat.badge || activeChat.description)}
                </p>
              </>
            )}
          </div>
          {/* Search toggle button */}
          <Button 
            variant={isChatSearchOpen ? "secondary" : "ghost"} 
            size="icon" 
            onClick={() => {
              setIsChatSearchOpen(!isChatSearchOpen);
              if (isChatSearchOpen) setChatSearchQuery('');
            }} 
            className="h-8 w-8 shrink-0"
          >
            <Search className="h-4 w-4" />
          </Button>
          {activeChat.type === 'teacher' && activeChat.data && !(activeChat.data as TeacherChatItem).profileId && (
            <LinkTeacherProfileModal
              teacherId={(activeChat.data as TeacherChatItem).id}
              teacherName={(activeChat.data as TeacherChatItem).fullName}
              currentProfileId={(activeChat.data as TeacherChatItem).profileId}
              onLinked={() => queryClient.invalidateQueries({ queryKey: ['teacher-chats'] })}
            >
              <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                <Link2 className="h-3.5 w-3.5" />
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

        {/* Search bar */}
        {isChatSearchOpen && (
          <div className="px-3 py-2 border-b bg-muted/30 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={chatSearchQuery}
                onChange={(e) => setChatSearchQuery(e.target.value)}
                placeholder="Поиск по сообщениям..."
                className="h-8 text-sm pl-8 pr-8"
                autoFocus
              />
              {chatSearchQuery && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setChatSearchQuery('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            {chatSearchQuery.trim() && (
              <p className="text-xs text-muted-foreground mt-1.5 px-1">
                {matchCount > 0 
                  ? `Найдено: ${matchCount} ${matchCount === 1 ? 'сообщение' : matchCount < 5 ? 'сообщения' : 'сообщений'}`
                  : 'Ничего не найдено'
                }
              </p>
            )}
          </div>
        )}

        <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-auto">
          <div className="space-y-3 p-4 pb-24">
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-8">
                <MessagesSquare className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {chatSearchQuery.trim() ? 'Сообщения не найдены' : 'Нет сообщений'}
                </p>
              </div>
            ) : (
              filteredMessages.map((msg) => (
                <div key={msg.id} className={`group flex items-end gap-1 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {/* Forward button for own messages */}
                  {msg.type === 'user' && (activeChat.type === 'teacher' || activeChat.type === 'staff' || activeChat.type === 'group') && (
                    <button
                      className="h-6 w-6 rounded-full flex items-center justify-center bg-background/80 border border-border/40 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background shrink-0"
                      onClick={() => setForwardingMessage({ id: msg.id, content: msg.content, senderName: msg.sender || 'Вы', chatName: activeChat.name })}
                      title="Переслать"
                    >
                      <Forward className="h-3 w-3 text-muted-foreground" />
                    </button>
                  )}
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${msg.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {msg.sender && msg.type !== 'user' && <p className="text-xs font-medium mb-1 opacity-70">{msg.sender}</p>}
                    
                    {/* File attachment */}
                    {msg.file_url && (
                      <div className="mb-2">
                        {msg.file_type?.startsWith('image/') ? (
                          <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                            <img 
                              src={msg.file_url} 
                              alt={msg.file_name || 'Image'} 
                              className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            />
                          </a>
                        ) : (
                          <a 
                            href={msg.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 p-2 rounded-lg ${msg.type === 'user' ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20' : 'bg-background/50 hover:bg-background/70'} transition-colors`}
                          >
                            <FileText className="h-5 w-5 shrink-0" />
                            <span className="text-xs truncate flex-1">{msg.file_name || 'Файл'}</span>
                            <Download className="h-4 w-4 shrink-0 opacity-60" />
                          </a>
                        )}
                      </div>
                    )}
                    
                    {isClientCardMessage(msg.content, msg.message_type) ? (
                      <ClientCardBubble content={msg.content} isOwn={msg.type === 'user'} onOpenChat={onOpenChat} />
                    ) : isForwardedMessage(msg.content, msg.message_type) ? (
                      <ForwardedMessageBubble content={msg.content} isOwn={msg.type === 'user'} onOpenChat={onOpenChat} />
                    ) : isStaffForwardedMessage(msg.content, msg.message_type) ? (
                      <StaffForwardedBubble content={msg.content} isOwn={msg.type === 'user'} />
                    ) : msg.content ? (
                      <p className="text-sm whitespace-pre-wrap">{highlightText(msg.content, chatSearchQuery)}</p>
                    ) : null}
                    <div className={`flex items-center gap-1 text-[10px] mt-1 ${msg.type === 'user' ? 'text-primary-foreground/70 justify-end' : 'text-muted-foreground'}`}>
                      <span>{msg.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                      {msg.type === 'user' && (activeChat.type === 'teacher' || activeChat.type === 'staff' || activeChat.type === 'group') && (
                        msg.is_read 
                          ? <CheckCheck className="h-3 w-3 text-blue-400" />
                          : <Check className="h-3 w-3" />
                      )}
                    </div>
                  </div>
                  {/* Forward button for incoming messages */}
                  {msg.type !== 'user' && (activeChat.type === 'teacher' || activeChat.type === 'staff' || activeChat.type === 'group') && (
                    <button
                      className="h-6 w-6 rounded-full flex items-center justify-center bg-background/80 border border-border/40 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background shrink-0"
                      onClick={() => setForwardingMessage({ id: msg.id, content: msg.content, senderName: msg.sender || 'Коллега', chatName: activeChat.name })}
                      title="Переслать"
                    >
                      <Forward className="h-3 w-3 text-muted-foreground" />
                    </button>
                  )}
                  {/* Emoji reactions */}
                  {(activeChat.type === 'teacher' || activeChat.type === 'staff' || activeChat.type === 'group') && reactionsMapInline && (
                    <StaffMessageReactions
                      messageId={msg.id}
                      reactions={reactionsMapInline[msg.id] || []}
                      isOwn={msg.type === 'user'}
                    />
                  )}
                </div>
              ))
            )}
            {(activeChat.type === 'teacher' || activeChat.type === 'staff' || activeChat.type === 'group') && typingUsers.length > 0 && (
              <StaffTypingIndicator typingUsers={typingUsers} />
            )}
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
          {/* Pending file preview */}
          {pendingFile && (
            <div className="mb-2 p-2 bg-muted rounded-lg flex items-center gap-2">
              {pendingFile.type.startsWith('image/') ? (
                <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className="text-xs truncate flex-1">{pendingFile.name}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 shrink-0"
                onClick={() => setPendingFile(null)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            {/* File upload button - only for staff/teacher/group chats */}
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
            <Input
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if ((activeChat.type === 'teacher' || activeChat.type === 'staff' || activeChat.type === 'group') && e.target.value.trim()) setTyping(true);
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              onBlur={() => { if (activeChat.type === 'teacher' || activeChat.type === 'staff' || activeChat.type === 'group') stopTyping(); }}
              placeholder={getCurrentPlaceholder()}
              disabled={isProcessing || isRecording || sendStaffMessage.isPending}
              className="flex-1 h-9"
            />
            <Button onClick={handleSendMessage} disabled={(!message.trim() && !pendingFile) || isProcessing || isRecording || sendStaffMessage.isPending} size="icon" className="shrink-0 h-9 w-9">
              {isProcessing || sendStaffMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
            <Button onClick={() => setIsRecording(!isRecording)} disabled={isProcessing || sendStaffMessage.isPending} size="icon" variant={isRecording ? "destructive" : "outline"} className="shrink-0 h-9 w-9">
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Format time like client list
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };

  // Main chat list - matching client/teacher list design
  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-background max-w-full box-border">
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
          <KnowledgeBaseSection 
            expanded={knowledgeSectionExpanded}
            onToggle={toggleKnowledgeSection}
            onOpenScripts={onOpenScripts}
            isAdmin={userIsAdmin}
          />

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

          {/* AI Helpers Section - collapsible */}
          {aiChatsList.length > 0 && (
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
                    {aiChatsList.length}
                  </Badge>
                </div>
              </button>
              
              {aiSectionExpanded && userIsAdmin && aiChatsList.map((item) => (
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
                          <span className="block truncate">{item.lastMessage || item.description}</span>
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

          {/* Staff & Groups Section */}
          {corporateChatsListBase.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Сотрудники и группы</span>
                <div className="flex items-center gap-1">
                  {/* Filter toggle: All / Online */}
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
                  <CreateStaffGroupModal onGroupCreated={() => queryClient.invalidateQueries({ queryKey: ['internal-chats'] })} />
                </div>
              </div>
              
              {corporateChatsList.length > 0 ? corporateChatsList.map((item) => {
                const isTeacher = item.type === 'teacher';
                const isStaff = item.type === 'staff';
                const isGroup = item.type === 'group';
                const teacher = isTeacher ? (item.data as TeacherChatItem) : null;
                const staff = isStaff ? (item.data as StaffMember) : null;
                // Use lastMessageTime from internal staff messages, not from messenger data
                const lastMsgTime = item.lastMessageTime || undefined;
                const hasUnread = (item.unreadCount || 0) > 0;
                
                // Check if user is online
                const userProfileId = isTeacher ? teacher?.profileId : isStaff ? staff?.id : null;
                const isOnline = userProfileId ? isUserOnline(userProfileId) : false;
                const lastSeenText = userProfileId && !isOnline ? getLastSeenFormatted(userProfileId) : null;
                
                // Calculate initials for teachers and staff
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
                              {isTeacher || isStaff ? initials : <item.icon className="h-4 w-4" />}
                            </AvatarFallback>
                          </Avatar>
                          {isOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-center gap-1.5 mb-0 overflow-hidden">
                            <span className={`text-sm ${hasUnread ? 'font-semibold' : 'font-medium'} truncate`}>
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
                              <span className="block truncate">{item.lastMessage || item.description}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 shrink-0 ml-auto">
                          <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                            {formatTime(lastMsgTime)}
                          </span>
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

          {filteredChats.length === 0 && !groupChatsLoading && !teachersLoading && (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'Ничего не найдено' : 'Нет доступных чатов'}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Staff Forward Picker */}
      <StaffForwardPicker
        open={!!forwardingMessage}
        onClose={() => setForwardingMessage(null)}
        onForward={handleForwardMessage}
        messagePreview={forwardingMessage?.content || ''}
        staffMembers={forwardTargets}
      />
    </div>
  );
};
