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
  useStaffMembers 
} from '@/hooks/useInternalStaffMessages';
import { useStaffTypingIndicator } from '@/hooks/useStaffTypingIndicator';
import { StaffTypingIndicator } from '@/components/ai-hub/StaffTypingIndicator';
import { CreateStaffGroupModal } from '@/components/ai-hub/CreateStaffGroupModal';
import { LinkTeacherProfileModal } from '@/components/ai-hub/LinkTeacherProfileModal';
import { MassLinkTeacherProfilesModal } from '@/components/ai-hub/MassLinkTeacherProfilesModal';
import VoiceAssistant from '@/components/VoiceAssistant';
import { usePersistedSections } from '@/hooks/usePersistedSections';

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
  data?: InternalChat | TeacherChatItem;
}

export const AIHubInline = ({ 
  context,
  onOpenModal,
  onOpenChat,
  onBack
}: AIHubInlineProps) => {
  const [activeChat, setActiveChat] = useState<ChatItem | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [teacherClientId, setTeacherClientId] = useState<string | null>(null);
  
  const { aiSectionExpanded, toggleAiSection } = usePersistedSections();
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: internalChats, isLoading: chatsLoading } = useInternalChats();
  const { teachers, totalUnread: teachersUnread, isLoading: teachersLoading } = useTeacherChats(null);
  const { data: staffMembers } = useStaffMembers();
  
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

  const teacherChatItems: ChatItem[] = teachers.map(teacher => ({
    id: teacher.id, type: 'teacher' as ChatType, name: teacher.fullName, description: teacher.profileId ? (teacher.branch || teacher.email || 'Преподаватель') : '⚠️ Нет привязки к профилю', icon: GraduationCap, iconBg: teacher.profileId ? 'bg-green-500/10' : 'bg-amber-500/10', iconColor: teacher.profileId ? 'text-green-600' : 'text-amber-600', unreadCount: teacher.unreadMessages, lastMessage: teacher.lastMessageText || undefined, data: teacher,
  }));

  const allChats = [...aiChats, ...groupChatItems, ...teacherChatItems];

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
    if (activeChat.type === 'teacher') {
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

  const filteredChats = allChats.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const aiChatsList = filteredChats.filter(item => item.type === 'assistant' || ['lawyer', 'accountant', 'marketer', 'hr', 'methodist', 'it'].includes(item.type));
  const corporateChatsList = filteredChats.filter(item => item.type === 'group' || item.type === 'teacher');

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

  // Main chat list
  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-background">
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <MessageCircle className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold">ChatOS</h2>
          <p className="text-xs text-muted-foreground">Чаты и AI-помощники</p>
        </div>
      </div>

      <div className="px-4 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск чатов..." className="pl-9 h-9" />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {(chatsLoading || teachersLoading) && (
            <div className="text-center py-4">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
            </div>
          )}

          {aiChatsList.length > 0 && (
            <>
              <button onClick={toggleAiSection} className="w-full px-3 py-2 flex items-center justify-between hover:bg-muted/50 rounded-md transition-colors">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Помощники</p>
                <div className="flex items-center gap-1.5">
                  {assistantUnread > 0 && <Badge variant="destructive" className="text-xs h-5 min-w-[20px] flex items-center justify-center">{assistantUnread}</Badge>}
                  {aiSectionExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>
              {aiSectionExpanded && aiChatsList.map((item) => (
                <button key={item.id} onClick={() => handleSelectChat(item)} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left">
                  <Avatar className="h-11 w-11">
                    <AvatarFallback className={item.iconBg}>
                      <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      {(item.unreadCount || 0) > 0 && <Badge variant="destructive" className="ml-2 text-xs">{item.unreadCount}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{item.lastMessage || item.description}</p>
                  </div>
                </button>
              ))}
            </>
          )}

          {corporateChatsList.length > 0 && (
            <>
              <div className="px-3 py-2 mt-2 flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Сотрудники и группы</p>
                <div className="flex items-center gap-1">
                  <MassLinkTeacherProfilesModal onCompleted={() => queryClient.invalidateQueries({ queryKey: ['teacher-chats'] })} />
                  <CreateStaffGroupModal onGroupCreated={() => queryClient.invalidateQueries({ queryKey: ['internal-chats'] })} />
                </div>
              </div>
              {corporateChatsList.map((item) => {
                const isTeacher = item.type === 'teacher';
                const teacher = isTeacher ? (item.data as TeacherChatItem) : null;
                return (
                  <button key={`${item.type}-${item.id}`} onClick={() => handleSelectChat(item)} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left">
                    <Avatar className="h-11 w-11">
                      <AvatarFallback className={item.iconBg}>
                        {isTeacher && teacher ? <span className="text-sm font-medium text-green-600">{teacher.firstName?.[0]}{teacher.lastName?.[0]}</span> : <item.icon className={`h-5 w-5 ${item.iconColor}`} />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        {(item.unreadCount || 0) > 0 && <Badge variant="destructive" className="ml-2 text-xs">{item.unreadCount}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{item.lastMessage || item.description}</p>
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {filteredChats.length === 0 && !chatsLoading && !teachersLoading && (
            <div className="text-center py-8 text-muted-foreground">{searchQuery ? 'Ничего не найдено' : 'Нет доступных чатов'}</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
