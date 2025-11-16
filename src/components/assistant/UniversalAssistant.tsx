import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface UniversalAssistantProps {
  context?: 'school' | 'teacher' | 'student' | 'parent' | 'onboarding';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UniversalAssistant = ({ context = 'onboarding', open, onOpenChange }: UniversalAssistantProps) => {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: getWelcomeMessage(context)
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
      const { data, error } = await supabase.functions.invoke('ask', {
        body: {
          question,
          history: updatedMessages.slice(-10),
          context: context
        }
      });

      if (error) throw error;

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer || 'Извините, не могу ответить на этот вопрос.'
      }]);
    } catch (error: any) {
      console.error('AI assistant error:', error);
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

  if (!open) return null;

  return (
    <div className={cn(
      "fixed right-6 bottom-6 z-50 bg-background border border-border rounded-2xl shadow-2xl transition-all duration-300",
      minimized ? "w-16 h-16" : "w-[380px] h-[600px]"
    )}>
      {minimized ? (
        <button
          onClick={() => setMinimized(false)}
          className="w-full h-full flex items-center justify-center hover:bg-muted rounded-2xl transition-colors"
        >
          <Bot className="w-8 h-8 text-primary" />
        </button>
      ) : (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">AI Ассистент</h3>
                <p className="text-xs text-muted-foreground">Всегда готов помочь</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMinimized(true)}
                className="h-8 w-8"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  
                  <div className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}>
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-border p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Задайте вопрос..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={loading}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getWelcomeMessage(context: string): string {
  const messages = {
    school: 'Здравствуйте! Я помогу вам настроить школу в Академиус. Спрашивайте о расписании, группах, преподавателях, финансах - обо всём что нужно для работы!',
    teacher: 'Привет! Я ваш помощник. Помогу с планированием уроков, составлением домашних заданий и ведением учеников.',
    student: 'Привет! Я помогу тебе с учёбой. Спрашивай о домашних заданиях, расписании или любых других вопросах.',
    parent: 'Здравствуйте! Я помогу вам следить за успеваемостью ребёнка и отвечу на вопросы об учебном процессе.',
    onboarding: 'Добро пожаловать в Академиус! Я помогу вам быстро начать работу. Задавайте любые вопросы о платформе!',
  };
  
  return messages[context as keyof typeof messages] || messages.onboarding;
}
