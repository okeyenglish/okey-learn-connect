import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, User } from 'lucide-react';
import { Teacher } from '@/hooks/useTeachers';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TeacherChatWindowProps {
  chatId: string;
  chatName: string;
  teacher: Teacher;
  onBack: () => void;
}

interface ChatMessage {
  id: string;
  message_text: string;
  created_at: string;
  is_outgoing: boolean;
  message_type: string;
}

export const TeacherChatWindow = ({ chatId, chatName, teacher, onBack }: TeacherChatWindowProps) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ['chat-messages', chatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('client_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ChatMessage[];
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const { error } = await supabase
        .from('chat_messages')
        .insert([{
          client_id: chatId,
          message_text: message,
          message_type: 'text',
          is_outgoing: true,
          messenger_type: 'system'
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', chatId] });
      setInput('');
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось отправить сообщение',
        variant: 'destructive'
      });
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    const message = input.trim();
    if (!message) return;
    sendMessageMutation.mutate(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
              <User className="h-5 w-5 text-brand" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">{chatName}</h3>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col p-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-text-secondary">
              Загрузка сообщений...
            </div>
          ) : messages && messages.length > 0 ? (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.is_outgoing ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[75%] ${message.is_outgoing ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!message.is_outgoing && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <div className={`rounded-2xl px-4 py-2 ${
                      message.is_outgoing
                        ? 'bg-brand text-white'
                        : 'bg-muted text-text-primary'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.message_text}</p>
                    </div>
                    <p className={`text-xs text-text-muted ${message.is_outgoing ? 'text-right' : 'text-left'}`}>
                      {format(new Date(message.created_at), 'HH:mm', { locale: ru })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-text-secondary">
              Нет сообщений. Начните общение!
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
              disabled={sendMessageMutation.isPending}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={sendMessageMutation.isPending || !input.trim()}
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