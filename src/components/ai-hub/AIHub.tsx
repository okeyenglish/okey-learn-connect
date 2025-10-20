import { useState, useRef, useCallback, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
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

type ConsultantType = 'lawyer' | 'accountant' | null;

export const AIHub = ({ 
  isOpen, 
  onToggle, 
  context,
  onOpenModal,
  onOpenChat 
}: AIHubProps) => {
  const [activeTab, setActiveTab] = useState<'assistant' | 'consultants' | 'community'>('assistant');
  const [activeConsultant, setActiveConsultant] = useState<ConsultantType>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({
    lawyer: [],
    accountant: [],
    community: []
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const consultants = [
    {
      id: 'lawyer' as ConsultantType,
      name: 'AI Юрист',
      icon: Scale,
      description: 'Консультации по юридическим вопросам',
      greeting: 'Здравствуйте! Я AI-юрист, готов помочь вам с юридическими вопросами по работе образовательного учреждения. Задайте свой вопрос!',
      placeholder: 'Задайте юридический вопрос...'
    },
    {
      id: 'accountant' as ConsultantType,
      name: 'AI Бухгалтер',
      icon: Calculator,
      description: 'Помощь с бухгалтерским учётом',
      greeting: 'Привет! Я AI-бухгалтер. Помогу разобраться с налогами, отчётностью и финансовым учётом. Чем могу быть полезен?',
      placeholder: 'Вопрос по бухгалтерии...'
    }
  ];

  // Инициализация приветственных сообщений
  useEffect(() => {
    const initialMessages: Record<string, ChatMessage[]> = {
      lawyer: [{
        id: '1',
        type: 'assistant',
        content: consultants[0].greeting,
        timestamp: new Date()
      }],
      accountant: [{
        id: '1',
        type: 'assistant',
        content: consultants[1].greeting,
        timestamp: new Date()
      }],
      community: [{
        id: '1',
        type: 'assistant',
        content: 'Добро пожаловать в сообщество владельцев школ! Здесь вы можете общаться с коллегами, делиться опытом и задавать вопросы.',
        timestamp: new Date(),
        sender: 'Система'
      }, {
        id: '2',
        type: 'user',
        content: 'Добрый день! Подскажите, кто-нибудь использует CRM для автоматизации записей учеников?',
        timestamp: new Date(Date.now() - 900000),
        sender: 'Мария Алексеева'
      }, {
        id: '3',
        type: 'user',
        content: 'Да, мы используем. Очень удобно! Все автоматизировано, включая оплаты.',
        timestamp: new Date(Date.now() - 600000),
        sender: 'Иван Смирнов'
      }]
    };
    
    setMessages(initialMessages);
  }, []);

  // Автопрокрутка при новых сообщениях
  useEffect(() => {
    if (scrollAreaRef.current) {
      setTimeout(() => {
        const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }, 100);
    }
  }, [messages, activeConsultant, activeTab]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const chatKey = activeTab === 'consultants' && activeConsultant 
      ? activeConsultant 
      : 'community';

    // Добавляем сообщение пользователя
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date(),
      sender: user?.email || 'Вы'
    };

    setMessages(prev => ({
      ...prev,
      [chatKey]: [...(prev[chatKey] || []), userMessage]
    }));

    setMessage('');
    setIsProcessing(true);

    try {
      // Для консультантов отправляем запрос к AI
      if (activeTab === 'consultants' && activeConsultant) {
        const systemPrompt = activeConsultant === 'lawyer'
          ? 'Ты опытный юрист, специализирующийся на образовательном праве. Отвечай кратко и по делу, ссылаясь на законы РФ когда это уместно.'
          : 'Ты опытный бухгалтер, специализирующийся на бухгалтерском учёте в образовательных учреждениях. Помогай с налогами, отчётностью и финансовым учётом.';

        const { data, error } = await supabase.functions.invoke('ai-consultant', {
          body: {
            message: message,
            consultantType: activeConsultant,
            systemPrompt
          }
        });

        if (error) throw error;

        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: data.response || 'Извините, не удалось получить ответ.',
          timestamp: new Date()
        };

        setMessages(prev => ({
          ...prev,
          [chatKey]: [...(prev[chatKey] || []), aiMessage]
        }));
      } else {
        // Для сообщества - просто показываем сообщение
        toast.success('Сообщение отправлено в сообщество');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Ошибка отправки сообщения');
    } finally {
      setIsProcessing(false);
    }
  };

  const getCurrentMessages = () => {
    if (activeTab === 'consultants' && activeConsultant) {
      return messages[activeConsultant] || [];
    }
    if (activeTab === 'community') {
      return messages.community || [];
    }
    return [];
  };

  const getCurrentPlaceholder = () => {
    if (activeTab === 'consultants' && activeConsultant) {
      const consultant = consultants.find(c => c.id === activeConsultant);
      return consultant?.placeholder || 'Введите сообщение...';
    }
    if (activeTab === 'community') {
      return 'Написать в сообщество...';
    }
    return 'Введите сообщение...';
  };

  return (
    <Sheet open={isOpen} onOpenChange={onToggle}>
      <SheetContent 
        side="right" 
        className="w-full sm:w-[500px] p-0 flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">AI Центр</h2>
              <p className="text-xs text-muted-foreground">
                Помощник, консультанты и сообщество
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onToggle}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs 
          value={activeTab} 
          onValueChange={(v) => setActiveTab(v as any)}
          className="flex-1 flex flex-col"
        >
          <TabsList className="w-full grid grid-cols-3 mx-4 my-2">
            <TabsTrigger value="assistant">
              <Bot className="h-4 w-4 mr-2" />
              Помощник
            </TabsTrigger>
            <TabsTrigger value="consultants">
              <Scale className="h-4 w-4 mr-2" />
              Консультанты
            </TabsTrigger>
            <TabsTrigger value="community">
              <Users className="h-4 w-4 mr-2" />
              Сообщество
            </TabsTrigger>
          </TabsList>

          {/* Вкладка AI Помощник */}
          <TabsContent value="assistant" className="flex-1 m-0 flex flex-col">
            <VoiceAssistant 
              isOpen={true}
              onToggle={onToggle}
              embedded={true}
              context={context}
              onOpenModal={onOpenModal}
              onOpenChat={onOpenChat}
            />
          </TabsContent>

          {/* Вкладка Консультанты */}
          <TabsContent value="consultants" className="flex-1 flex flex-col m-0">
            {!activeConsultant ? (
              <div className="p-4 space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground mb-4">
                  Выберите консультанта:
                </h3>
                {consultants.map((consultant) => (
                  <button
                    key={consultant.id}
                    onClick={() => setActiveConsultant(consultant.id)}
                    className="w-full flex items-start gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <consultant.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{consultant.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {consultant.description}
                      </p>
                      <Badge variant="outline" className="mt-2">
                        AI-консультант • Всегда онлайн
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <>
                {/* Заголовок консультанта */}
                <div className="p-4 border-b flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setActiveConsultant(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10">
                      {(() => {
                        const Icon = consultants.find(c => c.id === activeConsultant)?.icon || Bot;
                        return <Icon className="h-5 w-5 text-primary" />;
                      })()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">
                      {consultants.find(c => c.id === activeConsultant)?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      AI консультант • Всегда онлайн
                    </p>
                  </div>
                </div>

                {/* Сообщения */}
                <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
                  <div className="space-y-4">
                    {getCurrentMessages().map((msg) => (
                      <div 
                        key={msg.id}
                        className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : ''}`}
                      >
                        {msg.type === 'assistant' && (
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="bg-primary/10">
                              {(() => {
                                const Icon = consultants.find(c => c.id === activeConsultant)?.icon || Bot;
                                return <Icon className="h-4 w-4 text-primary" />;
                              })()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`flex-1 ${msg.type === 'user' ? 'flex justify-end' : ''}`}>
                          <div className={`rounded-lg p-3 max-w-[85%] ${
                            msg.type === 'user' 
                              ? 'bg-primary text-primary-foreground ml-auto' 
                              : 'bg-muted'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {msg.timestamp.toLocaleTimeString('ru-RU', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {isProcessing && (
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10">
                            <Loader2 className="h-4 w-4 text-primary animate-spin" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-muted rounded-lg p-3">
                          <p className="text-sm text-muted-foreground">
                            Консультант печатает...
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Поле ввода */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder={getCurrentPlaceholder()}
                      disabled={isProcessing}
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!message.trim() || isProcessing}
                      size="icon"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Вкладка Сообщество */}
          <TabsContent value="community" className="flex-1 flex flex-col m-0">
            {/* Заголовок */}
            <div className="p-4 border-b flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">Сообщество школ</p>
                <p className="text-xs text-muted-foreground">
                  42 участника онлайн
                </p>
              </div>
            </div>

            {/* Сообщения */}
            <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
              <div className="space-y-4">
                {getCurrentMessages().map((msg) => (
                  <div key={msg.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback>
                        {msg.sender?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-muted rounded-lg p-3">
                        {msg.sender && msg.type === 'user' && (
                          <p className="text-sm font-medium mb-1">{msg.sender}</p>
                        )}
                        <p className="text-sm">{msg.content}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {msg.timestamp.toLocaleTimeString('ru-RU', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Поле ввода */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Написать в сообщество..."
                  disabled={isProcessing}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isProcessing}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Ваше сообщение увидят все участники сообщества
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};