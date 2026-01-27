import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  Send, 
  Mic, 
  MicOff, 
  Loader2,
  ArrowLeft,
  MessageCircle,
  Plus,
  Search,
  GraduationCap
} from 'lucide-react';
import { useInternalChats, useChatMessages, useSendInternalMessage, InternalChat } from '@/hooks/useInternalChats';
import { useTeacherChats, TeacherChatItem, useEnsureTeacherClient, useTeacherChatMessages } from '@/hooks/useTeacherChats';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type ViewMode = 'list' | 'groups' | 'teachers' | 'chat' | 'teacher-chat';

interface CommunityTabProps {
  onClose?: () => void;
}

export const CommunityTab = ({ onClose }: CommunityTabProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedChat, setSelectedChat] = useState<InternalChat | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherChatItem | null>(null);
  const [teacherClientId, setTeacherClientId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Data hooks
  const { data: internalChats, isLoading: chatsLoading } = useInternalChats();
  const { teachers, totalUnread: teachersUnread, isLoading: teachersLoading } = useTeacherChats(null);
  const { data: chatMessages, isLoading: messagesLoading } = useChatMessages(selectedChat?.id || '');
  const { messages: teacherMessages, isLoading: teacherMessagesLoading } = useTeacherChatMessages(teacherClientId || '', !!teacherClientId);
  const sendMessage = useSendInternalMessage();
  const { findOrCreateClient } = useEnsureTeacherClient();

  // Calculate unread counts
  const groupChatsUnread = (internalChats || []).reduce((sum, chat) => {
    return sum + (chat.participants?.length > 0 ? 0 : 0); // No unread in this structure
  }, 0);

  // Filter based on search
  const filteredChats = (internalChats || []).filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTeachers = teachers.filter(teacher =>
    teacher.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.phone?.includes(searchQuery)
  );

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
  }, [chatMessages, teacherMessages, viewMode]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    if (viewMode === 'chat' && selectedChat) {
      try {
        await sendMessage.mutateAsync({
          chat_id: selectedChat.id,
          message_text: message.trim(),
          message_type: 'text'
        });
        setMessage('');
      } catch (error) {
        toast.error('Ошибка отправки сообщения');
      }
    } else if (viewMode === 'teacher-chat' && teacherClientId) {
      try {
        await sendMessage.mutateAsync({
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

  const handleSelectChat = (chat: InternalChat) => {
    setSelectedChat(chat);
    setViewMode('chat');
  };

  const handleSelectTeacher = async (teacher: TeacherChatItem) => {
    setSelectedTeacher(teacher);
    
    // Find or create client for teacher
    if (teacher.clientId) {
      setTeacherClientId(teacher.clientId);
    } else {
      const clientId = await findOrCreateClient(teacher);
      setTeacherClientId(clientId);
    }
    
    setViewMode('teacher-chat');
  };

  const handleBack = () => {
    if (viewMode === 'chat') {
      setSelectedChat(null);
      setViewMode('groups');
    } else if (viewMode === 'teacher-chat') {
      setSelectedTeacher(null);
      setTeacherClientId(null);
      setViewMode('teachers');
    } else {
      setViewMode('list');
      setSearchQuery('');
    }
  };

  // Main list view
  if (viewMode === 'list') {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b shrink-0">
          <h3 className="font-medium text-sm text-muted-foreground mb-3">
            Корпоративные чаты
          </h3>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {/* Групповые чаты */}
            <button
              onClick={() => setViewMode('groups')}
              className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold truncate">Групповые чаты</p>
                  {groupChatsUnread > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {groupChatsUnread}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  Корпоративные и филиальные чаты
                </p>
                <Badge variant="outline" className="mt-1.5 text-xs">
                  {internalChats?.length || 0} чатов
                </Badge>
              </div>
            </button>

            {/* Чаты педагогов */}
            <button
              onClick={() => setViewMode('teachers')}
              className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
            >
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                <GraduationCap className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold truncate">Чаты педагогов</p>
                  {teachersUnread > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {teachersUnread}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  Личные чаты с преподавателями
                </p>
                <Badge variant="outline" className="mt-1.5 text-xs">
                  {teachers.length} преподавателей
                </Badge>
              </div>
            </button>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Groups list view
  if (viewMode === 'groups') {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b flex items-center gap-3 shrink-0">
          <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Групповые чаты</p>
            <p className="text-xs text-muted-foreground">
              {filteredChats.length} чатов
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b shrink-0">
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
            {chatsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchQuery ? 'Чаты не найдены' : 'Нет групповых чатов'}
                </p>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => handleSelectChat(chat)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{chat.name}</p>
                    {chat.description && (
                      <p className="text-xs text-muted-foreground truncate">{chat.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {chat.branch && (
                        <Badge variant="outline" className="text-xs">
                          {chat.branch}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Teachers list view
  if (viewMode === 'teachers') {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b flex items-center gap-3 shrink-0">
          <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Чаты педагогов</p>
            <p className="text-xs text-muted-foreground">
              {filteredTeachers.length} преподавателей
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск преподавателей..."
              className="pl-9 h-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {teachersLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="text-center py-8">
                <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchQuery ? 'Преподаватели не найдены' : 'Нет преподавателей'}
                </p>
              </div>
            ) : (
              filteredTeachers.map((teacher) => (
                <button
                  key={teacher.id}
                  onClick={() => handleSelectTeacher(teacher)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <Avatar className="h-10 w-10 shrink-0">
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
                    <div className="flex items-center gap-2 mt-1">
                      {teacher.branch && (
                        <Badge variant="outline" className="text-xs">
                          {teacher.branch}
                        </Badge>
                      )}
                      {teacher.subjects?.slice(0, 2).map((subject, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Chat view (groups or teachers)
  const isTeacherChat = viewMode === 'teacher-chat';
  const currentMessages = isTeacherChat ? teacherMessages : chatMessages;
  const isLoadingMessages = isTeacherChat ? teacherMessagesLoading : messagesLoading;
  const chatTitle = isTeacherChat ? selectedTeacher?.fullName : selectedChat?.name;
  const chatSubtitle = isTeacherChat 
    ? selectedTeacher?.branch || 'Преподаватель'
    : selectedChat?.branch || 'Групповой чат';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className={isTeacherChat ? 'bg-green-500/10 text-green-600' : 'bg-primary/10'}>
            {isTeacherChat ? (
              <>{selectedTeacher?.firstName?.[0]}{selectedTeacher?.lastName?.[0]}</>
            ) : (
              <Building2 className="h-5 w-5 text-primary" />
            )}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{chatTitle}</p>
          <p className="text-xs text-muted-foreground truncate">{chatSubtitle}</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-auto">
        <div className="space-y-3 p-4 pb-24">
          {isLoadingMessages ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Загрузка сообщений...</p>
            </div>
          ) : !currentMessages || currentMessages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="mt-2 text-sm text-muted-foreground">Нет сообщений</p>
              <p className="text-xs text-muted-foreground">Начните общение прямо сейчас</p>
            </div>
          ) : (
            currentMessages.map((msg: any) => {
              const isOutgoing = msg.is_outgoing || msg.sender_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${isOutgoing ? 'justify-end' : ''}`}
                >
                  {!isOutgoing && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs bg-muted">
                        {msg.sender?.first_name?.[0] || 'С'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[85%] ${isOutgoing ? 'flex justify-end' : ''}`}>
                    <div className={`rounded-lg px-3 py-2 ${
                      isOutgoing 
                        ? 'bg-primary text-primary-foreground ml-auto' 
                        : 'bg-muted'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">
                        {msg.message_text || msg.content || ''}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 px-1">
                      {new Date(msg.created_at).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              );
            })
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
            placeholder="Введите сообщение..."
            disabled={sendMessage.isPending || isRecording}
            className="flex-1 h-9"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || sendMessage.isPending || isRecording}
            size="icon"
            className="shrink-0 h-9 w-9"
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
          <Button
            onClick={() => setIsRecording(!isRecording)}
            disabled={sendMessage.isPending}
            size="icon"
            variant={isRecording ? "destructive" : "outline"}
            className="shrink-0 h-9 w-9"
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
