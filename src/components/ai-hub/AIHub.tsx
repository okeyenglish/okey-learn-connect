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
  MessageCircle,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useInternalChats, useChatMessages, useSendInternalMessage, InternalChat } from '@/hooks/useInternalChats';
import { useTeacherChats, TeacherChatItem, useEnsureTeacherClient, useTeacherChatMessages } from '@/hooks/useTeacherChats';
import { useAssistantMessages } from '@/hooks/useAssistantMessages';
import VoiceAssistant from '@/components/VoiceAssistant';

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
  const [showTeachers, setShowTeachers] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [teacherClientId, setTeacherClientId] = useState<string | null>(null);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Data hooks
  const { data: internalChats, isLoading: chatsLoading } = useInternalChats();
  const { teachers, totalUnread: teachersUnread, isLoading: teachersLoading } = useTeacherChats(null);
  const { messages: teacherMessages, isLoading: teacherMessagesLoading } = useTeacherChatMessages(teacherClientId || '', !!teacherClientId);
  const { data: groupMessages, isLoading: groupMessagesLoading } = useChatMessages(activeChat?.type === 'group' ? activeChat.id : '');
  const sendInternalMessage = useSendInternalMessage();
  const { findOrCreateClient } = useEnsureTeacherClient();
  const { unreadCount: assistantUnread } = useAssistantMessages();

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

  // Build chat list items
  const chatItems: ChatItem[] = [
    // AI Assistant
    {
      id: 'assistant',
      type: 'assistant',
      name: 'AI Помощник',
      description: 'Голосовой ассистент и помощь',
      icon: Bot,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      badge: 'Голосовой',
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
      badge: 'AI-консультант',
      lastMessage: messages[c.id]?.slice(-1)[0]?.content,
    })),
  ];

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
  }, [messages, activeChat, teacherMessages, groupMessages]);

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
    // For group chats
    else if (activeChat.type === 'group') {
      try {
        await sendInternalMessage.mutateAsync({
          chat_id: activeChat.id,
          message_text: message.trim(),
          message_type: 'text'
        });
        setMessage('');
      } catch (error) {
        toast.error('Ошибка отправки сообщения');
      }
    }
    // For teacher chats
    else if (activeChat.type === 'teacher' && teacherClientId) {
      try {
        await sendInternalMessage.mutateAsync({
          chat_id: teacherClientId,
          message_text: message.trim(),
          message_type: 'text'
        });
        setMessage('');
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
    setShowTeachers(false);
    setShowGroups(false);
  };

  const handleBack = () => {
    if (activeChat) {
      if (activeChat.type === 'teacher') {
        setActiveChat(null);
        setTeacherClientId(null);
        setShowTeachers(true);
      } else if (activeChat.type === 'group') {
        setActiveChat(null);
        setShowGroups(true);
      } else {
        setActiveChat(null);
      }
    } else if (showTeachers || showGroups) {
      setShowTeachers(false);
      setShowGroups(false);
    }
  };

  const getCurrentMessages = (): ChatMessage[] => {
    if (!activeChat) return [];
    if (activeChat.type === 'teacher') {
      return (teacherMessages || []).map((m: any) => ({
        id: m.id,
        type: m.is_outgoing ? 'user' : 'assistant',
        content: m.message_text || m.content || '',
        timestamp: new Date(m.created_at)
      })) as ChatMessage[];
    }
    if (activeChat.type === 'group') {
      return (groupMessages || []).map((m: any) => ({
        id: m.id,
        type: m.is_outgoing ? 'user' : 'assistant',
        content: m.message_text || '',
        timestamp: new Date(m.created_at),
        sender: m.sender?.first_name
      })) as ChatMessage[];
    }
    return messages[activeChat.id] || [];
  };

  const getCurrentPlaceholder = () => {
    if (!activeChat) return 'Введите сообщение...';
    const consultant = consultants.find(c => c.id === activeChat.type);
    return consultant?.placeholder || 'Введите сообщение...';
  };

  // Filter chats based on search
  const filteredChats = chatItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTeachers = teachers.filter(t =>
    t.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = (internalChats || []).filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group chats count
  const groupChatsUnread = 0; // Could calculate from data

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
    const isLoading = activeChat.type === 'teacher' ? teacherMessagesLoading : 
                      activeChat.type === 'group' ? groupMessagesLoading : false;
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
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
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
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t bg-background absolute inset-x-0 bottom-0">
            <div className="flex gap-2 items-center">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder={getCurrentPlaceholder()}
                disabled={isProcessing || isRecording || sendInternalMessage.isPending}
                className="flex-1 h-9"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!message.trim() || isProcessing || isRecording || sendInternalMessage.isPending}
                size="icon"
                className="shrink-0 h-9 w-9"
              >
                {isProcessing || sendInternalMessage.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
              <Button
                onClick={() => setIsRecording(!isRecording)}
                disabled={isProcessing || sendInternalMessage.isPending}
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

  // Render teachers list
  if (showTeachers) {
    return (
      <Sheet open={isOpen} onOpenChange={onToggle}>
        <SheetContent side="right" className="w-full sm:w-[500px] h-full p-0 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
            <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Чаты педагогов</p>
              <p className="text-xs text-muted-foreground">{teachers.length} преподавателей</p>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск..."
                className="pl-9 h-9"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {teachersLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </div>
              ) : filteredTeachers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'Не найдено' : 'Нет преподавателей'}
                </div>
              ) : (
                filteredTeachers.map((teacher) => (
                  <button
                    key={teacher.id}
                    onClick={() => handleSelectChat({
                      id: teacher.id,
                      type: 'teacher',
                      name: teacher.fullName,
                      description: teacher.branch || 'Преподаватель',
                      icon: GraduationCap,
                      iconBg: 'bg-green-500/10',
                      iconColor: 'text-green-600',
                      unreadCount: teacher.unreadMessages,
                      lastMessage: teacher.lastMessageText || undefined,
                      data: teacher
                    })}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-green-500/10 text-green-600">
                        {teacher.firstName?.[0]}{teacher.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">{teacher.fullName}</p>
                        {teacher.unreadMessages > 0 && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            {teacher.unreadMessages}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {teacher.lastMessageText || teacher.email || 'Нет сообщений'}
                      </p>
                      {teacher.branch && (
                        <Badge variant="outline" className="mt-1 text-xs">{teacher.branch}</Badge>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  // Render groups list
  if (showGroups) {
    return (
      <Sheet open={isOpen} onOpenChange={onToggle}>
        <SheetContent side="right" className="w-full sm:w-[500px] h-full p-0 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
            <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Групповые чаты</p>
              <p className="text-xs text-muted-foreground">{internalChats?.length || 0} чатов</p>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск..."
                className="pl-9 h-9"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {chatsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'Не найдено' : 'Нет групповых чатов'}
                </div>
              ) : (
                filteredGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => handleSelectChat({
                      id: group.id,
                      type: 'group',
                      name: group.name,
                      description: group.branch || 'Групповой чат',
                      icon: Building2,
                      iconBg: 'bg-primary/10',
                      iconColor: 'text-primary',
                      data: group
                    })}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{group.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {group.description || 'Групповой чат'}
                      </p>
                      {group.branch && (
                        <Badge variant="outline" className="mt-1 text-xs">{group.branch}</Badge>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  // Main chat list
  return (
    <Sheet open={isOpen} onOpenChange={onToggle}>
      <SheetContent side="right" className="w-full sm:w-[500px] h-full p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold">AI Центр</h2>
            <p className="text-xs text-muted-foreground">Чаты и помощники</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск чатов..."
              className="pl-9 h-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {/* AI Chats */}
            {filteredChats.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelectChat(item)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
              >
                <Avatar className="h-12 w-12">
                  <AvatarFallback className={item.iconBg}>
                    <item.icon className={`h-6 w-6 ${item.iconColor}`} />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold truncate">{item.name}</p>
                    {(item.unreadCount || 0) > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {item.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.lastMessage || item.description}
                  </p>
                  {item.badge && (
                    <Badge variant="outline" className="mt-1.5 text-xs">
                      {item.badge} • Всегда онлайн
                    </Badge>
                  )}
                </div>
              </button>
            ))}

            {/* Separator */}
            <div className="my-3 px-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Корпоративные чаты
              </p>
            </div>

            {/* Group Chats */}
            <button
              onClick={() => { setShowGroups(true); setSearchQuery(''); }}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
            >
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Групповые чаты</p>
                  {groupChatsUnread > 0 && (
                    <Badge variant="destructive">{groupChatsUnread}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Корпоративные и филиальные чаты
                </p>
                <Badge variant="outline" className="mt-1.5 text-xs">
                  {internalChats?.length || 0} чатов
                </Badge>
              </div>
            </button>

            {/* Teacher Chats */}
            <button
              onClick={() => { setShowTeachers(true); setSearchQuery(''); }}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
            >
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-green-500/10">
                  <GraduationCap className="h-6 w-6 text-green-600" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Чаты педагогов</p>
                  {teachersUnread > 0 && (
                    <Badge variant="destructive">{teachersUnread}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Личные чаты с преподавателями
                </p>
                <Badge variant="outline" className="mt-1.5 text-xs">
                  {teachers.length} преподавателей
                </Badge>
              </div>
            </button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
