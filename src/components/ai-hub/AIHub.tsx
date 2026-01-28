import { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
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
  Building2,
  Loader2,
  X,
  TrendingUp,
  UserCog,
  GraduationCap,
  Monitor,
  ArrowLeft,
  Sparkles,
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
  onOpenChat?: (clientId: string) => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sender?: string;
}

type ConsultantType = 'lawyer' | 'accountant' | 'marketer' | 'hr' | 'methodist' | 'it';
type ChatType = 'assistant' | ConsultantType | 'group' | 'teacher';

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
  // For groups/teachers
  data?: InternalChat | TeacherChatItem;
}

export const AIHub = ({ 
  isOpen, 
  onToggle, 
  context,
  onOpenModal,
  onOpenChat 
}: AIHubProps) => {
  const [activeChat, setActiveChat] = useState<ChatItem | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [teacherClientId, setTeacherClientId] = useState<string | null>(null);
  
  // Persisted sections state
  const { aiSectionExpanded, toggleAiSection } = usePersistedSections();
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Data hooks
  const { data: internalChats, isLoading: chatsLoading } = useInternalChats();
  const { teachers, totalUnread: teachersUnread, isLoading: teachersLoading } = useTeacherChats(null);
  const { onlineUsers, isUserOnline, getLastSeenFormatted, onlineCount } = useStaffOnlinePresence();
  const { data: staffMembers } = useStaffMembers();
  
  // Staff messaging hooks - for staff direct messages using new internal_staff_messages table
  // Use profile_id for direct messaging with teachers (links to profiles/auth.users)
  const selectedStaffProfileId = activeChat?.type === 'teacher' 
    ? (activeChat.data as TeacherChatItem)?.profileId || ''
    : '';
  const { data: staffDirectMessages, isLoading: staffDirectLoading } = useStaffDirectMessages(selectedStaffProfileId);
  const { data: staffGroupMessages, isLoading: staffGroupLoading } = useStaffGroupMessages(
    activeChat?.type === 'group' ? activeChat.id : ''
  );
  const sendStaffMessage = useSendStaffMessage();
  const { findOrCreateClient } = useEnsureTeacherClient();
  const { unreadCount: assistantUnread } = useAssistantMessages();

  // Staff typing indicator
  const typingChatId = activeChat?.type === 'teacher' 
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

  // Group chats from internal_chats
  const groupChatItems: ChatItem[] = (internalChats || []).map(group => ({
    id: group.id,
    type: 'group' as ChatType,
    name: group.name,
    description: group.description || group.branch || 'Групповой чат',
    icon: Users,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-600',
    data: group,
  }));

  // Teacher chats - with profile link indicator
  const teacherChatItems: ChatItem[] = teachers.map(teacher => ({
    id: teacher.id,
    type: 'teacher' as ChatType,
    name: teacher.fullName,
    description: teacher.profileId 
      ? (teacher.branch || teacher.email || 'Преподаватель')
      : '⚠️ Нет привязки к профилю',
    icon: GraduationCap,
    iconBg: teacher.profileId ? 'bg-green-500/10' : 'bg-amber-500/10',
    iconColor: teacher.profileId ? 'text-green-600' : 'text-amber-600',
    unreadCount: teacher.unreadMessages,
    lastMessage: teacher.lastMessageText || undefined,
    data: teacher,
  }));

  // Combined flat list
  const allChats = [...aiChats, ...groupChatItems, ...teacherChatItems];

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

  // Auto-scroll
  useEffect(() => {
    if (scrollAreaRef.current) {
      setTimeout(() => {
        const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }, 100);
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
    if (!message.trim() || !activeChat) return;

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
          message_text: message.trim(),
          message_type: 'text'
        });
        setMessage('');
        stopTyping(); // Stop typing indicator after sending
      } catch (error) {
        toast.error('Ошибка отправки сообщения');
      }
    }
    // For teacher/staff direct chats - use new internal_staff_messages table
    else if (activeChat.type === 'teacher' && activeChat.data) {
      const teacher = activeChat.data as TeacherChatItem;
      if (!teacher.profileId) {
        toast.error('У преподавателя не привязан профиль пользователя');
        return;
      }
      try {
        // Use teacher.profileId as recipient - links to profiles/auth.users
        await sendStaffMessage.mutateAsync({
          recipient_user_id: teacher.profileId,
          message_text: message.trim(),
          message_type: 'text'
        });
        setMessage('');
        stopTyping(); // Stop typing indicator after sending
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
    setActiveChat(null);
    setTeacherClientId(null);
  };

  const getCurrentMessages = (): ChatMessage[] => {
    if (!activeChat) return [];
    
    // For teacher direct messages - use staff messages
    if (activeChat.type === 'teacher') {
      return (staffDirectMessages || []).map((m) => ({
        id: m.id,
        type: m.sender_id === user?.id ? 'user' : 'assistant',
        content: m.message_text || '',
        timestamp: new Date(m.created_at),
        sender: m.sender?.first_name
      })) as ChatMessage[];
    }
    
    // For group chats - use staff group messages
    if (activeChat.type === 'group') {
      return (staffGroupMessages || []).map((m) => ({
        id: m.id,
        type: m.sender_id === user?.id ? 'user' : 'assistant',
        content: m.message_text || '',
        timestamp: new Date(m.created_at),
        sender: m.sender?.first_name
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
    item.type === 'group' || item.type === 'teacher'
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
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Render chat content (for consultants, groups, teachers)
  if (activeChat) {
    const isLoading = activeChat.type === 'teacher' ? staffDirectLoading : 
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
              <p className="font-semibold text-sm truncate">{activeChat.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {activeChat.badge || activeChat.description}
              </p>
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
          </div>

          {/* Messages */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-auto">
            <div className="space-y-3 p-4 pb-24">
              {isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Загрузка...</p>
                </div>
              ) : currentMessages.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <p className="mt-2 text-sm text-muted-foreground">Нет сообщений</p>
                </div>
              ) : (
                currentMessages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`flex gap-2 ${msg.type === 'user' ? 'justify-end' : ''}`}
                  >
                    {msg.type === 'assistant' && (
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className={activeChat.iconBg}>
                          <activeChat.icon className={`h-4 w-4 ${activeChat.iconColor}`} />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`max-w-[85%] ${msg.type === 'user' ? 'flex justify-end' : ''}`}>
                      <div className={`rounded-lg px-3 py-2 ${
                        msg.type === 'user' 
                          ? 'bg-primary text-primary-foreground ml-auto' 
                          : 'bg-muted'
                      }`}>
                        {msg.sender && msg.type === 'assistant' && (
                          <p className="text-xs font-medium mb-1 text-primary">{msg.sender}</p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 px-1">
                        {msg.timestamp.toLocaleTimeString('ru-RU', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))
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
              
              {/* Staff typing indicator for teacher/group chats */}
              {(activeChat.type === 'teacher' || activeChat.type === 'group') && typingUsers.length > 0 && (
                <StaffTypingIndicator typingUsers={typingUsers} />
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t bg-background absolute inset-x-0 bottom-0">
            <div className="flex gap-2 items-center">
              <Input
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  // Trigger typing indicator for staff chats
                  if (activeChat.type === 'teacher' || activeChat.type === 'group') {
                    if (e.target.value.trim()) {
                      setTyping(true, e.target.value);
                    } else {
                      stopTyping();
                    }
                  }
                }}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                onBlur={() => {
                  // Stop typing when input loses focus
                  if (activeChat.type === 'teacher' || activeChat.type === 'group') {
                    stopTyping();
                  }
                }}
                placeholder={getCurrentPlaceholder()}
                disabled={isProcessing || isRecording || sendStaffMessage.isPending}
                className="flex-1 h-9"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!message.trim() || isProcessing || isRecording || sendStaffMessage.isPending}
                size="icon"
                className="shrink-0 h-9 w-9"
              >
                {isProcessing || sendStaffMessage.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
              <Button
                onClick={() => setIsRecording(!isRecording)}
                disabled={isProcessing || sendStaffMessage.isPending}
                size="icon"
                variant={isRecording ? "destructive" : "outline"}
                className="shrink-0 h-9 w-9"
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Get unique branches for filter
  const allBranches = Array.from(new Set([
    ...teacherChatItems.map(t => (t.data as TeacherChatItem)?.branch).filter(Boolean),
    ...groupChatItems.map(g => (g.data as InternalChat)?.branch).filter(Boolean),
  ])) as string[];

  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  // Filter by branch
  const branchFilteredChats = selectedBranch === 'all' 
    ? filteredChats 
    : filteredChats.filter(item => {
        if (item.type === 'teacher') {
          return (item.data as TeacherChatItem)?.branch === selectedBranch;
        }
        if (item.type === 'group') {
          return (item.data as InternalChat)?.branch === selectedBranch;
        }
        return true; // AI chats always show
      });

  // Re-filter lists with branch
  const aiChatsListFiltered = branchFilteredChats.filter(c => 
    ['assistant', 'lawyer', 'accountant', 'marketer', 'hr', 'methodist', 'it'].includes(c.type)
  );
  const corporateChatsListFiltered = branchFilteredChats.filter(c => 
    c.type === 'group' || c.type === 'teacher'
  );

  // Main chat list - EXACT copy of mobile AIHubInline layout
  return (
    <Sheet open={isOpen} onOpenChange={onToggle}>
      <SheetContent side="right" className="w-full sm:w-[400px] sm:max-w-[400px] h-full p-0 flex flex-col overflow-hidden">
        {/* Search bar and branch filter - EXACT mobile styles */}
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
          
          {/* Branch filter - same as mobile */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full h-8 px-3 border border-border bg-background text-sm rounded-md"
          >
            <option value="all">Все филиалы</option>
            {allBranches.map(branch => (
              <option key={branch} value={branch}>{branch}</option>
            ))}
          </select>
        </div>

        <ScrollArea className="flex-1 overflow-x-hidden">
          <div className="px-2 py-1 space-y-1 max-w-full overflow-hidden box-border">
            {(chatsLoading || teachersLoading) && (
              <div className="text-center py-4">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
              </div>
            )}

            {/* AI Helpers Section - EXACT mobile layout */}
            {aiChatsListFiltered.length > 0 && (
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
                    {aiChatsListFiltered.length}
                  </Badge>
                </button>
                
                {aiSectionExpanded && aiChatsListFiltered.map((item) => (
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

            {/* Online Staff Section - using real presence data */}
            {onlineCount > 0 && (
              <div className="space-y-1">
                <div className="px-3 py-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-muted-foreground">Сейчас онлайн</span>
                  <Badge variant="outline" className="text-xs h-5 min-w-[24px] flex items-center justify-center rounded-full bg-green-50 text-green-700 border-green-200">
                    {onlineCount}
                  </Badge>
                </div>
                
                <div className="flex flex-wrap gap-1.5 px-3 pb-2">
                  {onlineUsers.map((onlineUser) => {
                    // Find matching chat item for this online user
                    const matchingChat = corporateChatsListFiltered.find(item => {
                      if (item.type === 'teacher') {
                        return (item.data as TeacherChatItem)?.profileId === onlineUser.id;
                      }
                      return false;
                    });
                    
                    const initials = onlineUser.name
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) || '•';
                    
                    return (
                      <button
                        key={onlineUser.id}
                        onClick={() => matchingChat && handleSelectChat(matchingChat)}
                        disabled={!matchingChat}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 border border-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={matchingChat ? `Написать ${onlineUser.name}` : onlineUser.name}
                      >
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[10px] bg-green-100 text-green-700">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-green-700 max-w-[80px] truncate">
                          {onlineUser.name.split(' ')[0]}
                        </span>
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Staff & Groups Section - EXACT mobile layout */}
            {corporateChatsListFiltered.length > 0 && (
              <div className="space-y-1">
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Сотрудники и группы</span>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs h-5 min-w-[24px] flex items-center justify-center rounded-full mr-1">
                      {corporateChatsListFiltered.length}
                    </Badge>
                    <CreateStaffGroupModal onGroupCreated={() => queryClient.invalidateQueries({ queryKey: ['internal-chats'] })} />
                  </div>
                </div>
                
                {corporateChatsListFiltered.map((item) => {
                  const isTeacher = item.type === 'teacher';
                  const teacher = isTeacher ? (item.data as TeacherChatItem) : null;
                  const hasUnread = (item.unreadCount || 0) > 0;
                  
                  // Check if user is online
                  const userProfileId = isTeacher ? teacher?.profileId : null;
                  const isOnline = userProfileId ? isUserOnline(userProfileId) : false;
                  const lastSeenText = userProfileId && !isOnline ? getLastSeenFormatted(userProfileId) : null;
                  
                  // Calculate initials
                  let initials = '';
                  if (isTeacher && teacher) {
                    initials = `${teacher.lastName?.[0] || ''}${teacher.firstName?.[0] || ''}`.toUpperCase() || '•';
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
                              {isTeacher && teacher ? initials : <item.icon className="h-4 w-4" />}
                            </AvatarFallback>
                          </Avatar>
                          {isOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-center gap-1.5 mb-0 overflow-hidden">
                            <span className={`text-sm ${hasUnread ? 'font-semibold' : 'font-medium'} truncate flex-1 min-w-0`}>
                              {item.name}
                            </span>
                            {isTeacher && teacher?.branch && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1.5 shrink-0 font-normal bg-green-50 text-green-700 border-green-200">
                                {teacher.branch}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground leading-relaxed overflow-hidden">
                            {isOnline ? (
                              <span className="text-green-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full shrink-0" />
                                Онлайн
                              </span>
                            ) : lastSeenText ? (
                              <span className="text-muted-foreground/70 block truncate">{lastSeenText}</span>
                            ) : (
                              <span className="block truncate">{item.lastMessage || item.description}</span>
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
                })}
              </div>
            )}

            {/* Empty state */}
            {branchFilteredChats.length === 0 && !chatsLoading && !teachersLoading && (
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
