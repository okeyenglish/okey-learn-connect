import { useState, useRef, useEffect } from 'react';
import { Bot, MessageCircle, Users, Send, Mic, MicOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Teacher } from '@/hooks/useTeachers';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChatArea } from '@/components/crm/ChatArea';
import { CreateStaffChatModal } from './chat/CreateStaffChatModal';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface TeacherAIHubProps {
  teacher: Teacher;
}

interface StaffChat {
  id: string;
  name: string;
  phone: string;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
  branch?: string;
  role?: string;
}

export const TeacherAIHub = ({ teacher }: TeacherAIHubProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('assistant');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Привет! Я ваш AI-ассистент.\n\nНапишите сообщение или нажмите на микрофон`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Получаем список чатов преподавателя
  const { data: staffChats, isLoading: chatsLoading } = useQuery({
    queryKey: ['teacher-staff-chats', teacher.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          phone,
          branch,
          notes,
          updated_at
        `)
        .or(`name.ilike.%преп. ${teacher.last_name}%,name.ilike.%${teacher.last_name} ${teacher.first_name}%,notes.ilike.%${teacher.last_name}%`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const chatsWithMessages = await Promise.all(
        (data || []).map(async (chat) => {
          const { data: lastMsg } = await supabase
            .from('chat_messages')
            .select('message_text, created_at')
            .eq('client_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', chat.id)
            .eq('is_read', false)
            .eq('is_outgoing', false);

          let role = 'Коллега';
          if (chat.name.includes('Менеджер')) role = 'Менеджер';
          else if (chat.name.includes('Методист')) role = 'Методист';
          else if (chat.name.includes('Управляющий')) role = 'Управляющий';
          else if (chat.name.includes('Ученик')) role = 'Ученик';

          return {
            id: chat.id,
            name: chat.name,
            phone: chat.phone,
            last_message: lastMsg?.message_text || null,
            last_message_time: lastMsg?.created_at || null,
            unread_count: count || 0,
            branch: chat.branch,
            role
          } as StaffChat;
        })
      );

      return chatsWithMessages;
    },
    enabled: isOpen && activeTab === 'colleagues'
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || loading) return;

    const userMessage: Message = { role: 'user', content: question };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = updatedMessages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke('ask', {
        body: {
          question: question,
          history: conversationHistory,
          context: 'teacher'
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer || 'Извините, не могу ответить на этот вопрос.'
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('AI chat error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось получить ответ от AI',
        variant: 'destructive'
      });
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Извините, произошла ошибка. Попробуйте позже.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Recording error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось получить доступ к микрофону',
        variant: 'destructive'
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      setLoading(true);
      
      // TODO: Implement audio transcription
      toast({
        title: 'Функция в разработке',
        description: 'Голосовой ввод скоро будет доступен',
      });
    } catch (error) {
      console.error('Audio processing error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось обработать аудио',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredChats = staffChats?.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const selectedChat = staffChats?.find(c => c.id === selectedChatId);

  const totalUnread = staffChats?.reduce((sum, chat) => sum + chat.unread_count, 0) || 0;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl bg-brand hover:bg-brand/90 z-50"
          >
            <Bot className="h-8 w-8 text-white" />
            {totalUnread > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center"
                variant="destructive"
              >
                {totalUnread}
              </Badge>
            )}
          </Button>
        </SheetTrigger>

        <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
          <SheetHeader className="border-b p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center">
                <Bot className="h-6 w-6 text-brand" />
              </div>
              <div className="flex-1">
                <SheetTitle>AI Центр</SheetTitle>
                <p className="text-sm text-text-secondary">Помощник и коллеги</p>
              </div>
            </div>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-[calc(100vh-120px)]">
            <TabsList className="grid w-full grid-cols-2 mx-6 mt-4">
              <TabsTrigger value="assistant" className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Помощник
              </TabsTrigger>
              <TabsTrigger value="colleagues" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Коллеги
                {totalUnread > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {totalUnread}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assistant" className="h-[calc(100%-60px)] flex flex-col mt-0">
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-4">
                  {messages.map((message, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      
                      <div className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                        message.role === 'user'
                          ? 'bg-brand text-white'
                          : 'bg-muted text-text-primary'
                      }`}>
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      </div>

                      {message.role === 'user' && (
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback className="bg-brand text-white text-xs">
                            {teacher.first_name[0]}{teacher.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  
                  {loading && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="bg-muted rounded-2xl px-4 py-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                          <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                          <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Напишите сообщение..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    className="flex-1"
                  />
                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={loading}
                    size="icon"
                    variant={isRecording ? "destructive" : "outline"}
                  >
                    {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  <Button
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="colleagues" className="h-[calc(100%-60px)] mt-0">
              {selectedChatId ? (
                <div className="h-full">
                  <ChatArea
                    clientId={selectedChatId}
                    clientName={selectedChat?.name || ''}
                    clientPhone={selectedChat?.phone || ''}
                    managerName={`${teacher.last_name} ${teacher.first_name}`}
                    onBackToList={() => setSelectedChatId(null)}
                  />
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  <div className="p-4 border-b">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Поиск..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={() => setShowCreateModal(true)} size="icon">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="p-4 space-y-2">
                      {chatsLoading ? (
                        <div className="text-center py-8 text-text-secondary">
                          Загрузка...
                        </div>
                      ) : filteredChats.length === 0 ? (
                        <div className="text-center py-8">
                          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-text-muted opacity-50" />
                          <p className="text-text-secondary mb-4">
                            {searchQuery ? 'Ничего не найдено' : 'Нет чатов'}
                          </p>
                          {!searchQuery && (
                            <Button onClick={() => setShowCreateModal(true)}>
                              Создать чат
                            </Button>
                          )}
                        </div>
                      ) : (
                        filteredChats.map((chat) => (
                          <Card
                            key={chat.id}
                            className="p-4 cursor-pointer hover:shadow-md hover:border-brand/30 transition-all"
                            onClick={() => setSelectedChatId(chat.id)}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0">
                                <Users className="h-5 w-5 text-brand" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <h3 className="font-medium text-sm truncate">{chat.name}</h3>
                                  {chat.unread_count > 0 && (
                                    <Badge variant="default">
                                      {chat.unread_count}
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {chat.role}
                                  </Badge>
                                </div>

                                {chat.last_message && (
                                  <p className="text-xs text-text-secondary truncate">
                                    {chat.last_message}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <CreateStaffChatModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        teacher={teacher}
      />
    </>
  );
};
