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
  X,
  TrendingUp,
  UserCog,
  GraduationCap,
  Monitor
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

type ConsultantType = 'lawyer' | 'accountant' | 'marketer' | 'hr' | 'methodist' | 'it' | null;

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
    marketer: [],
    hr: [],
    methodist: [],
    it: [],
    community: []
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
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
    },
    {
      id: 'marketer' as ConsultantType,
      name: 'AI Маркетолог',
      icon: TrendingUp,
      description: 'Маркетинг и продвижение школы',
      greeting: 'Привет! Я AI-маркетолог. Помогу с продвижением вашей школы, привлечением учеников, рекламными кампаниями и позиционированием. Что вас интересует?',
      placeholder: 'Вопрос по маркетингу...'
    },
    {
      id: 'hr' as ConsultantType,
      name: 'AI HR-специалист',
      icon: UserCog,
      description: 'Подбор и управление персоналом',
      greeting: 'Здравствуйте! Я AI HR-специалист. Помогу с подбором преподавателей, мотивацией персонала, разрешением конфликтов и выстраиванием HR-процессов. Чем могу помочь?',
      placeholder: 'Вопрос по персоналу...'
    },
    {
      id: 'methodist' as ConsultantType,
      name: 'AI Методист',
      icon: GraduationCap,
      description: 'Методология и учебные программы',
      greeting: 'Добрый день! Я AI-методист. Помогу с разработкой учебных программ, методик преподавания, подбором материалов и повышением качества образования. О чём поговорим?',
      placeholder: 'Вопрос по методологии...'
    },
    {
      id: 'it' as ConsultantType,
      name: 'AI IT-специалист',
      icon: Monitor,
      description: 'Технологии и автоматизация',
      greeting: 'Привет! Я AI IT-специалист. Помогу с выбором и настройкой программ, автоматизацией процессов, онлайн-обучением и техническими вопросами. Что вас интересует?',
      placeholder: 'Вопрос по технологиям...'
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
      marketer: [{
        id: '1',
        type: 'assistant',
        content: consultants[2].greeting,
        timestamp: new Date()
      }],
      hr: [{
        id: '1',
        type: 'assistant',
        content: consultants[3].greeting,
        timestamp: new Date()
      }],
      methodist: [{
        id: '1',
        type: 'assistant',
        content: consultants[4].greeting,
        timestamp: new Date()
      }],
      it: [{
        id: '1',
        type: 'assistant',
        content: consultants[5].greeting,
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start(500);
      setIsRecording(true);
      
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, 15000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Ошибка доступа к микрофону');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const chunkSize = 0x8000;
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64Audio = btoa(binaryString);

      const chatKey = activeTab === 'consultants' && activeConsultant 
        ? activeConsultant 
        : 'community';

      if (activeTab === 'consultants' && activeConsultant) {
        const getSystemPrompt = () => {
          switch (activeConsultant) {
            case 'lawyer':
              return 'Ты опытный юрист, специализирующийся на образовательном праве РФ. Отвечай конкретно и по делу, ссылаясь на актуальные законы (ФЗ "Об образовании", Трудовой кодекс, ГК РФ). Давай практические рекомендации для частных школ и образовательных центров.';
            case 'accountant':
              return 'Ты опытный бухгалтер образовательных учреждений. Помогай с налогообложением (УСН, ОСНО), отчётностью, кассовой дисциплиной, начислением зарплаты преподавателям. Объясняй сложное простым языком с примерами для частных школ.';
            case 'marketer':
              return 'Ты маркетолог с опытом продвижения образовательных услуг. Специализируешься на привлечении учеников, работе с соцсетями, контекстной рекламой, воронками продаж. Давай конкретные стратегии и инструменты для частных школ и курсов.';
            case 'hr':
              return 'Ты HR-специалист образовательной сферы. Помогай с подбором преподавателей, мотивацией персонала, разрешением конфликтов, выстраиванием корпоративной культуры. Учитывай специфику работы с педагогами.';
            case 'methodist':
              return 'Ты методист с опытом разработки образовательных программ. Помогай составлять учебные планы, выбирать методики, улучшать качество преподавания, внедрять современные подходы. Давай практические советы для школ и курсов.';
            case 'it':
              return 'Ты IT-специалист для образовательных учреждений. Помогай выбирать CRM-системы, платформы онлайн-обучения, настраивать автоматизацию, решать технические задачи. Рекомендуй конкретные инструменты и сервисы.';
            default:
              return 'Ты полезный AI-консультант для образовательных учреждений.';
          }
        };
        const systemPrompt = getSystemPrompt();

        const { data, error } = await supabase.functions.invoke('ai-consultant', {
          body: {
            audio: base64Audio,
            consultantType: activeConsultant,
            systemPrompt
          }
        });

        if (error) throw error;

        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'user',
          content: data.transcription || 'Голосовое сообщение',
          timestamp: new Date()
        };

        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: data.response || 'Извините, не удалось получить ответ.',
          timestamp: new Date()
        };

        setMessages(prev => ({
          ...prev,
          [chatKey]: [...(prev[chatKey] || []), userMessage, aiMessage]
        }));
      } else {
        toast.success('Голосовое сообщение отправлено в сообщество');
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      toast.error('Ошибка обработки аудио');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const chatKey = activeTab === 'consultants' && activeConsultant 
      ? activeConsultant 
      : 'community';

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
      if (activeTab === 'consultants' && activeConsultant) {
        const getSystemPrompt = () => {
          switch (activeConsultant) {
            case 'lawyer':
              return 'Ты опытный юрист, специализирующийся на образовательном праве РФ. Отвечай конкретно и по делу, ссылаясь на актуальные законы (ФЗ "Об образовании", Трудовой кодекс, ГК РФ). Давай практические рекомендации для частных школ и образовательных центров.';
            case 'accountant':
              return 'Ты опытный бухгалтер образовательных учреждений. Помогай с налогообложением (УСН, ОСНО), отчётностью, кассовой дисциплиной, начислением зарплаты преподавателям. Объясняй сложное простым языком с примерами для частных школ.';
            case 'marketer':
              return 'Ты маркетолог с опытом продвижения образовательных услуг. Специализируешься на привлечении учеников, работе с соцсетями, контекстной рекламой, воронками продаж. Давай конкретные стратегии и инструменты для частных школ и курсов.';
            case 'hr':
              return 'Ты HR-специалист образовательной сферы. Помогай с подбором преподавателей, мотивацией персонала, разрешением конфликтов, выстраиванием корпоративной культуры. Учитывай специфику работы с педагогами.';
            case 'methodist':
              return 'Ты методист с опытом разработки образовательных программ. Помогай составлять учебные планы, выбирать методики, улучшать качество преподавания, внедрять современные подходы. Давай практические советы для школ и курсов.';
            case 'it':
              return 'Ты IT-специалист для образовательных учреждений. Помогай выбирать CRM-системы, платформы онлайн-обучения, настраивать автоматизацию, решать технические задачи. Рекомендуй конкретные инструменты и сервисы.';
            default:
              return 'Ты полезный AI-консультант для образовательных учреждений.';
          }
        };
        const systemPrompt = getSystemPrompt();

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
        className="w-full sm:w-[500px] h-full p-0 flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold truncate">AI Центр</h2>
              <p className="text-xs text-muted-foreground truncate">
                Помощник, консультанты и сообщество
              </p>
            </div>
          </div>
        </div>

        <Tabs 
          value={activeTab} 
          onValueChange={(v) => setActiveTab(v as 'assistant' | 'consultants' | 'community')}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="w-full h-12 bg-transparent border-b rounded-none p-0 grid grid-cols-3 shrink-0">
            <TabsTrigger 
              value="assistant" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full"
            >
              <Bot className="h-4 w-4 mr-1.5" />
              <span className="text-sm">Помощник</span>
            </TabsTrigger>
            <TabsTrigger 
              value="consultants"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full"
            >
              <Scale className="h-4 w-4 mr-1.5" />
              <span className="text-sm">Консультанты</span>
            </TabsTrigger>
            <TabsTrigger 
              value="community"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full"
            >
              <Users className="h-4 w-4 mr-1.5" />
              <span className="text-sm">Сообщество</span>
            </TabsTrigger>
          </TabsList>

          {/* Вкладка AI Помощник */}
          <TabsContent value="assistant" className="flex-1 m-0 overflow-hidden">
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
          <TabsContent value="consultants" className="flex-1 m-0 overflow-hidden relative">
            {!activeConsultant ? (
              <div className="p-4 space-y-2 overflow-auto">
                <h3 className="font-medium text-sm text-muted-foreground mb-3">
                  Выберите консультанта:
                </h3>
                {consultants.map((consultant) => (
                  <button
                    key={consultant.id}
                    onClick={() => setActiveConsultant(consultant.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <consultant.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{consultant.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {consultant.description}
                      </p>
                      <Badge variant="outline" className="mt-1.5 text-xs">
                        AI-консультант • Всегда онлайн
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <>
                {/* Заголовок консультанта */}
                <div className="px-4 py-3 border-b flex items-center gap-3 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setActiveConsultant(null)}
                    className="h-8 w-8 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-primary/10">
                      {(() => {
                        const Icon = consultants.find(c => c.id === activeConsultant)?.icon || Bot;
                        return <Icon className="h-5 w-5 text-primary" />;
                      })()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {consultants.find(c => c.id === activeConsultant)?.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      AI консультант • Всегда онлайн
                    </p>
                  </div>
                </div>

                {/* Сообщения */}
                <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-auto">
                  <div className="space-y-3 p-4 pb-32">
                    {getCurrentMessages().map((msg) => (
                      <div 
                        key={msg.id}
                        className={`flex gap-2 ${msg.type === 'user' ? 'justify-end' : ''}`}
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
                        <div className={`max-w-[85%] ${msg.type === 'user' ? 'flex justify-end' : ''}`}>
                          <div className={`rounded-lg px-3 py-2 ${
                            msg.type === 'user' 
                              ? 'bg-primary text-primary-foreground ml-auto' 
                              : 'bg-muted'
                          }`}>
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
                    ))}
                    {isProcessing && (
                      <div className="flex gap-2">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-primary/10">
                            <Loader2 className="h-4 w-4 text-primary animate-spin" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-muted rounded-lg px-3 py-2">
                          <p className="text-sm text-muted-foreground">
                            Консультант печатает...
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Поле ввода */}
                <div className="p-3 border-t bg-background absolute inset-x-0 bottom-0">
                  <div className="flex gap-2 items-center">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder={getCurrentPlaceholder()}
                      disabled={isProcessing || isRecording}
                      className="flex-1 h-9"
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!message.trim() || isProcessing || isRecording}
                      size="icon"
                      className="shrink-0 h-9 w-9"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isProcessing}
                      size="icon"
                      variant={isRecording ? "destructive" : "outline"}
                      className="shrink-0 h-9 w-9"
                    >
                      {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  </div>
                  {isRecording && (
                    <div className="mt-2 text-center">
                      <div className="text-xs text-muted-foreground animate-pulse">
                        🎤 Запись... Говорите сейчас
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          {/* Вкладка Сообщество */}
          <TabsContent value="community" className="flex-1 m-0 overflow-hidden relative">
            {/* Заголовок */}
            <div className="px-4 py-3 border-b flex items-center gap-3 shrink-0">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Сообщество школ</p>
                <p className="text-xs text-muted-foreground">
                  42 участника онлайн
                </p>
              </div>
            </div>

            {/* Сообщения */}
            <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-auto">
              <div className="space-y-3 p-4 pb-32">
                {getCurrentMessages().map((msg) => (
                  <div key={msg.id} className="flex gap-2">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs">
                        {msg.sender?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="bg-muted rounded-lg px-3 py-2">
                        {msg.sender && msg.type === 'user' && (
                          <p className="text-sm font-medium mb-1 text-primary">{msg.sender}</p>
                        )}
                        <p className="text-sm break-words">{msg.content}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 px-1">
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
            <div className="p-3 border-t bg-background absolute inset-x-0 bottom-0">
              <div className="flex gap-2 items-center">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Написать в сообщество..."
                  disabled={isProcessing || isRecording}
                  className="flex-1 h-9"
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isProcessing || isRecording}
                  size="icon"
                  className="shrink-0 h-9 w-9"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  size="icon"
                  variant={isRecording ? "destructive" : "outline"}
                  className="shrink-0 h-9 w-9"
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </div>
              {isRecording && (
                <div className="mt-2 text-center">
                  <div className="text-xs text-muted-foreground animate-pulse">
                    🎤 Запись... Говорите сейчас
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Ваше сообщение увидят все участники сообщества
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};