import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Sparkles, BookOpen, Calendar, Gamepad2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AssistantTabProps {
  teacherId: string;
  context?: {
    page?: string;
    groupId?: string;
    lessonId?: string;
  };
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  created_at: string;
}

const PRESETS = [
  { icon: BookOpen, label: 'Сгенерировать ДЗ', prompt: 'Помоги подобрать домашнее задание для текущего урока' },
  { icon: Calendar, label: 'План урока 45 мин', prompt: 'Составь план урока на 45 минут для этой группы' },
  { icon: Gamepad2, label: 'Игры по теме', prompt: 'Предложи обучающие игры по текущей теме урока' },
];

export const AssistantTab = ({ teacherId, context }: AssistantTabProps) => {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Получаем или создаем поток ассистента
  const { data: thread } = useQuery({
    queryKey: ['assistant-thread', teacherId],
    queryFn: async () => {
      const { data: existing } = await supabase
        .from('assistant_threads')
        .select('*')
        .eq('owner_id', teacherId)
        .maybeSingle();

      if (existing) return existing;

      const { data: newThread } = await supabase
        .from('assistant_threads')
        .insert({ owner_id: teacherId, context: context || {} })
        .select()
        .single();

      return newThread;
    },
  });

  // Получаем сообщения
  const { data: messages = [] } = useQuery({
    queryKey: ['assistant-messages', thread?.id],
    queryFn: async () => {
      if (!thread?.id) return [];

      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', thread.id)
        .eq('thread_type', 'assistant')
        .order('created_at', { ascending: true });

      return (data || []) as Message[];
    },
    enabled: !!thread?.id,
  });

  // Отправка сообщения
  const sendMessage = useMutation({
    mutationFn: async (text: string) => {
      if (!thread?.id) throw new Error('Thread not found');

      // Сохраняем сообщение пользователя
      await supabase.from('messages').insert({
        thread_id: thread.id,
        thread_type: 'assistant',
        author_id: teacherId,
        role: 'user',
        text,
      });

      // Здесь должен быть вызов к AI API (OpenAI, Anthropic и т.д.)
      // Для MVP возвращаем mock-ответ
      const mockResponse = `Я понял ваш запрос: "${text}". Это функционал в разработке. Скоро здесь будет полноценный AI-ассистент с доступом к контексту уроков, групп и материалов.`;

      // Сохраняем ответ ассистента
      await supabase.from('messages').insert({
        thread_id: thread.id,
        thread_type: 'assistant',
        role: 'assistant',
        text: mockResponse,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistant-messages', thread?.id] });
      setInput('');
      setIsGenerating(false);
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось отправить сообщение',
        variant: 'destructive',
      });
      setIsGenerating(false);
    },
  });

  const handleSend = () => {
    if (!input.trim() || isGenerating) return;
    setIsGenerating(true);
    sendMessage.mutate(input);
  };

  const handlePreset = (prompt: string) => {
    setInput(prompt);
    setTimeout(() => handleSend(), 100);
  };

  // Автоскролл к новым сообщениям
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Пресеты */}
      {messages.length === 0 && (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Sparkles className="h-4 w-4" />
            <span>Быстрые действия</span>
          </div>
          {PRESETS.map((preset, idx) => (
            <Button
              key={idx}
              variant="outline"
              className="w-full justify-start"
              onClick={() => handlePreset(preset.prompt)}
              disabled={isGenerating}
            >
              <preset.icon className="h-4 w-4 mr-2" />
              {preset.label}
            </Button>
          ))}
        </div>
      )}

      {/* Сообщения */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}
          {isGenerating && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Инпут */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Напишите сообщение... (Shift+Enter для новой строки)"
            className="min-h-[44px] max-h-[120px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isGenerating}
            size="icon"
            className="h-[44px] w-[44px] flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Enter — отправить, Shift+Enter — новая строка
        </p>
      </div>
    </div>
  );
};