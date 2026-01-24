import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Teacher {
  first_name: string;
  last_name: string;
  [key: string]: any;
}

interface TeacherAssistantProps {
  teacher: Teacher;
}

export const TeacherAssistant = ({ teacher }: TeacherAssistantProps) => {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: 'Привет! Я ваш AI-ассистент. Напишите сообщение или нажмите на микрофон.'
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
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
          context: 'teacher'
        }
      });

      if (error) throw error;

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer || 'Извините, не могу ответить на этот вопрос.'
      }]);
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

  return (
    <div className="flex flex-col h-[600px]">
      <ScrollArea className="flex-1 pr-4">
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
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}>
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Bot className="w-4 h-4" />
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

      <div className="border-t pt-4 mt-4">
        <div className="flex gap-2">
          <Input
            placeholder="Напишите сообщение..."
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
  );
};
