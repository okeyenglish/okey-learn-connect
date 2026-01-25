import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/typedClient';
import { Teacher } from '@/hooks/useTeachers';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errorUtils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface TeacherAIChatProps {
  teacher: Teacher;
}

export const TeacherAIChat = ({ teacher }: TeacherAIChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Здравствуйте, ${teacher.first_name}! Я ваш AI-помощник. Могу помочь с:
      
• Планированием уроков и подготовкой материалов
• Анализом успеваемости учеников
• Советами по методике преподавания
• Идеями для интерактивных заданий
• Организацией учебного процесса

Задайте любой вопрос!`
    }
  ]);
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
      const conversationHistory = updatedMessages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke('ask', {
        body: {
          question: question,
          history: conversationHistory,
          context: 'teacher' // Специальный контекст для преподавателя
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer || 'Извините, не могу ответить на этот вопрос.'
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: unknown) {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-brand" />
          AI-Помощник для преподавателей
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col p-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' ? 'bg-brand text-white' : 'bg-muted'
                }`}>
                  {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                
                <div className={`rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-brand text-white'
                    : 'bg-muted text-text-primary'
                }`}>
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                </div>
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
                  <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

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
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};