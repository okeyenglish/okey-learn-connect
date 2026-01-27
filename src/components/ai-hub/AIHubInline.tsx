import { useState, useRef, useEffect } from 'react';
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
  MessageCircle,
  Search,
  Link2,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useInternalChats, InternalChat } from '@/hooks/useInternalChats';
import { useTeacherChats, TeacherChatItem, useEnsureTeacherClient } from '@/hooks/useTeacherChats';
import { useAssistantMessages } from '@/hooks/useAssistantMessages';
import { 
  useStaffDirectMessages, 
  useStaffGroupMessages, 
  useSendStaffMessage, 
  useStaffMembers,
  useStaffConversationPreviews
} from '@/hooks/useInternalStaffMessages';
import { useStaffTypingIndicator } from '@/hooks/useStaffTypingIndicator';
import { StaffTypingIndicator } from '@/components/ai-hub/StaffTypingIndicator';
import { CreateStaffGroupModal } from '@/components/ai-hub/CreateStaffGroupModal';
import { LinkTeacherProfileModal } from '@/components/ai-hub/LinkTeacherProfileModal';
import VoiceAssistant from '@/components/VoiceAssistant';
import { usePersistedSections } from '@/hooks/usePersistedSections';
import { useUserAllowedBranches } from '@/hooks/useUserAllowedBranches';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  onOpenChat?: (clientId: string) => void;
  onBack?: () => void;
  /** If set, auto-open a direct chat with this staff user on mount */
  initialStaffUserId?: string | null;
  /** Clear the initialStaffUserId after it's been processed */
  onClearInitialStaffUserId?: () => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sender?: string;
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
  data?: InternalChat | TeacherChatItem | StaffMember;
}

export const AIHubInline = ({ 
  context,
  onOpenModal,
  onOpenChat,
  onBack,
  initialStaffUserId,
  onClearInitialStaffUserId
}: AIHubInlineProps) => {
  const [activeChat, setActiveChat] = useState<ChatItem | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [teacherClientId, setTeacherClientId] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  
  const { aiSectionExpanded, toggleAiSection } = usePersistedSections();
  const { branchesForDropdown } = useUserAllowedBranches();
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: internalChats, isLoading: chatsLoading } = useInternalChats();
  const { teachers, isLoading: teachersLoading } = useTeacherChats(null);
  const { data: staffMembers, isLoading: staffMembersLoading } = useStaffMembers();
  
  // Get all profile IDs for staff conversation previews (teachers with profiles + all staff members)
  const teacherProfileIds = teachers
    .filter(t => t.profileId)
    .map(t => t.profileId as string);
  const staffMemberIds = (staffMembers || []).map(s => s.id);
  const allProfileIds = [...new Set([...teacherProfileIds, ...staffMemberIds])];
  const { data: staffPreviews } = useStaffConversationPreviews(allProfileIds);
  
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

  const groupChatItems: ChatItem[] = (internalChats || []).map(group => ({
    id: group.id, type: 'group' as ChatType, name: group.name, description: group.description || group.branch || 'Групповой чат', icon: Users, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-600', data: group,
  }));

  // Teachers with profile links
  const teacherChatItems: ChatItem[] = teachers
    .filter(teacher => teacher.profileId) // Only show teachers with profile links
    .map(teacher => {
      const preview = staffPreviews?.[teacher.profileId!];
      return {
        id: teacher.id, 
        type: 'teacher' as ChatType, 
        name: teacher.fullName, 
        description: teacher.branch || teacher.email || 'Преподаватель', 
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
        description: staff.branch || staff.email || 'Сотрудник',
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
      // If target not found among teachers/staff, try to create a temporary chat entry
      // This can happen if the user isn't a teacher but is a profile
      console.log('[AIHubInline] Target staff not found:', initialStaffUserId);
      onClearInitialStaffUserId?.();
    }
  }, [initialStaffUserId, staffChatItems, teacherChatItems, staffMembersLoading, teachersLoading, onClearInitialStaffUserId]);

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
    if (!message.trim() || !activeChat) return;
    const chatId = activeChat.id;

    if (['lawyer', 'accountant', 'marketer', 'hr', 'methodist', 'it'].includes(activeChat.type)) {
      const userMessage: ChatMessage = { id: Date.now().toString(), type: 'user', content: message, timestamp: new Date(), sender: user?.email || 'Вы' };
      setMessages(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), userMessage] }));
      setMessage('');
      setIsProcessing(true);
      try {
        const response = await selfHostedPost<{ response?: string }>('ai-consultant', { message: message, consultantType: activeChat.type, systemPrompt: getSystemPrompt(activeChat.type as ConsultantType) });
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
        await sendStaffMessage.mutateAsync({ group_chat_id: activeChat.id, message_text: message.trim(), message_type: 'text' });
        setMessage('');
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
        await sendStaffMessage.mutateAsync({ recipient_user_id: teacher.profileId, message_text: message.trim(), message_type: 'text' });
        setMessage('');
        stopTyping();
      } catch (error) {
        toast.error('Ошибка отправки сообщения');
      }
    } else if (activeChat.type === 'staff' && activeChat.data) {
      const staff = activeChat.data as StaffMember;
      try {
        await sendStaffMessage.mutateAsync({ recipient_user_id: staff.id, message_text: message.trim(), message_type: 'text' });
        setMessage('');
        stopTyping();
      } catch (error) {
        toast.error('Ошибка отправки сообщения');
      }
    }
  };

  const handleSelectChat = async (item: ChatItem) => {
    if (item.type === 'teacher' && item.data) {
      const teacher = item.data as TeacherChatItem;
      if (teacher.clientId) {
        setTeacherClientId(teacher.clientId);
      } else {
        const clientId = await findOrCreateClient(teacher);
        setTeacherClientId(clientId);
      }
    }
    setActiveChat(item);
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
      return (staffDirectMessages || []).map((m) => ({ id: m.id, type: m.sender_id === user?.id ? 'user' : 'assistant', content: m.message_text || '', timestamp: new Date(m.created_at), sender: m.sender?.first_name })) as ChatMessage[];
    }
    if (activeChat.type === 'group') {
      return (staffGroupMessages || []).map((m) => ({ id: m.id, type: m.sender_id === user?.id ? 'user' : 'assistant', content: m.message_text || '', timestamp: new Date(m.created_at), sender: m.sender?.first_name })) as ChatMessage[];
    }
    return messages[activeChat.id] || [];
  };

  const getCurrentPlaceholder = () => {
    if (!activeChat) return 'Введите сообщение...';
    const consultant = consultants.find(c => c.id === activeChat.type);
    return consultant?.placeholder || 'Введите сообщение...';
  };

  // Filter by search query
  const searchFiltered = allChats.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter by branch (for staff and teachers only)
  const filteredChats = searchFiltered.filter(item => {
    // AI chats and groups are always shown
    if (item.type === 'assistant' || ['lawyer', 'accountant', 'marketer', 'hr', 'methodist', 'it'].includes(item.type) || item.type === 'group') {
      return true;
    }
    
    // Apply branch filter for teachers and staff
    if (selectedBranch === 'all') return true;
    
    if (item.type === 'teacher') {
      const teacher = item.data as TeacherChatItem;
      return teacher?.branch === selectedBranch;
    }
    
    if (item.type === 'staff') {
      const staff = item.data as StaffMember;
      return staff?.branch === selectedBranch;
    }
    
    return true;
  });

  const aiChatsList = filteredChats.filter(item => item.type === 'assistant' || ['lawyer', 'accountant', 'marketer', 'hr', 'methodist', 'it'].includes(item.type));
  
  // Corporate chats sorted by last message time (most recent first)
  const corporateChatsList = filteredChats
    .filter(item => item.type === 'group' || item.type === 'teacher' || item.type === 'staff')
    .sort((a, b) => {
      // Items with unread messages come first
      const aUnread = a.unreadCount || 0;
      const bUnread = b.unreadCount || 0;
      if (aUnread > 0 && bUnread === 0) return -1;
      if (bUnread > 0 && aUnread === 0) return 1;
      
      // Then sort by last message time
      const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return bTime - aTime; // Descending (most recent first)
    });

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
          />
        </div>
      </div>
    );
  }

  // Render active chat (consultants, groups, teachers)
  if (activeChat) {
    const isLoading = activeChat.type === 'teacher' ? staffDirectLoading : activeChat.type === 'group' ? staffGroupLoading : false;
    const currentMessages = getCurrentMessages();

    return (
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-background">
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
            <p className="font-semibold text-sm truncate">{activeChat.name}</p>
            <p className="text-xs text-muted-foreground truncate">{activeChat.badge || activeChat.description}</p>
          </div>
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
        </div>

        <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-auto">
          <div className="space-y-3 p-4 pb-24">
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : currentMessages.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <p className="mt-2 text-sm text-muted-foreground">Нет сообщений</p>
              </div>
            ) : (
              currentMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${msg.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {msg.sender && msg.type !== 'user' && <p className="text-xs font-medium mb-1 opacity-70">{msg.sender}</p>}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${msg.type === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {msg.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            {(activeChat.type === 'teacher' || activeChat.type === 'group') && typingUsers.length > 0 && (
              <StaffTypingIndicator typingUsers={typingUsers} />
            )}
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
          <div className="flex items-center gap-2">
            <Input
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if ((activeChat.type === 'teacher' || activeChat.type === 'group') && e.target.value.trim()) setTyping(true);
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              onBlur={() => { if (activeChat.type === 'teacher' || activeChat.type === 'group') stopTyping(); }}
              placeholder={getCurrentPlaceholder()}
              disabled={isProcessing || isRecording || sendStaffMessage.isPending}
              className="flex-1 h-9"
            />
            <Button onClick={handleSendMessage} disabled={!message.trim() || isProcessing || isRecording || sendStaffMessage.isPending} size="icon" className="shrink-0 h-9 w-9">
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
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-background">
      {/* Search bar and branch filter */}
      <div className="p-2 border-b shrink-0 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            placeholder="Поиск по имени, телефону..." 
            className="h-8 text-sm pl-8"
          />
        </div>
        
        {/* Branch filter */}
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Все филиалы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все филиалы</SelectItem>
            {branchesForDropdown.map((branch) => (
              <SelectItem key={branch} value={branch}>
                {branch}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 py-1 space-y-1">
          {(chatsLoading || teachersLoading) && (
            <div className="text-center py-4">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
            </div>
          )}

          {/* AI Helpers Section - collapsible */}
          {aiChatsList.length > 0 && (
            <div className="space-y-1">
              <button 
                onClick={toggleAiSection} 
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-muted/30 transition-colors rounded-lg"
              >
                <div className="flex items-center gap-2">
                  {aiSectionExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-sm font-medium text-muted-foreground">AI Помощники</span>
                </div>
                <Badge variant="outline" className="text-xs h-5 min-w-[24px] flex items-center justify-center rounded-full">
                  {aiChatsList.length}
                </Badge>
              </button>
              
              {aiSectionExpanded && aiChatsList.map((item) => (
                <button 
                  key={item.id} 
                  onClick={() => handleSelectChat(item)} 
                  className="w-full p-2.5 text-left rounded-lg transition-all duration-200 mb-1 border select-none bg-card hover:bg-accent/30 hover:shadow-sm border-border/50"
                >
                  <div className="flex items-start justify-between gap-2">
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
                        <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                          {item.lastMessage || item.description}
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
          {corporateChatsList.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Сотрудники и группы</span>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs h-5 min-w-[24px] flex items-center justify-center rounded-full mr-1">
                    {corporateChatsList.length}
                  </Badge>
                  <CreateStaffGroupModal onGroupCreated={() => queryClient.invalidateQueries({ queryKey: ['internal-chats'] })} />
                </div>
              </div>
              
              {corporateChatsList.map((item) => {
                const isTeacher = item.type === 'teacher';
                const isStaff = item.type === 'staff';
                const isGroup = item.type === 'group';
                const teacher = isTeacher ? (item.data as TeacherChatItem) : null;
                const staff = isStaff ? (item.data as StaffMember) : null;
                // Use lastMessageTime from internal staff messages, not from messenger data
                const lastMsgTime = item.lastMessageTime || undefined;
                const hasUnread = (item.unreadCount || 0) > 0;
                
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
                    className="w-full p-2.5 text-left rounded-lg transition-all duration-200 mb-1 border select-none bg-card hover:bg-accent/30 hover:shadow-sm border-border/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-border/30">
                          <AvatarFallback className="bg-[hsl(var(--avatar-blue))] text-[hsl(var(--text-primary))] text-sm font-medium">
                            {isTeacher || isStaff ? initials : <item.icon className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-center gap-1.5 mb-0">
                            <p className={`text-sm ${hasUnread ? 'font-semibold' : 'font-medium'} truncate`}>
                              {item.name}
                            </p>
                            {/* Branch badge for teachers and staff */}
                            {(isTeacher && teacher?.branch) && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1.5 shrink-0 font-normal bg-green-50 text-green-700 border-green-200">
                                {teacher.branch}
                              </Badge>
                            )}
                            {(isStaff && staff?.branch) && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1.5 shrink-0 font-normal bg-blue-50 text-blue-700 border-blue-200">
                                {staff.branch}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                            {item.lastMessage || item.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        <span className="text-[10px] text-muted-foreground font-medium">
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
              })}
            </div>
          )}

          {filteredChats.length === 0 && !chatsLoading && !teachersLoading && (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'Ничего не найдено' : 'Нет доступных чатов'}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
