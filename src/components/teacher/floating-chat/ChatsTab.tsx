import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ChatsTabProps {
  teacherId: string;
}

interface ChatThread {
  id: string;
  type: 'group' | 'student' | 'staff';
  title: string;
  participants: string[];
  updated_at: string;
  unread_count?: number;
  last_message?: string;
}

export const ChatsTab = ({ teacherId }: ChatsTabProps) => {
  const [selectedThread, setSelectedThread] = useState<string | null>(null);

  // Получаем список чатов
  const { data: threads = [] } = useQuery({
    queryKey: ['chat-threads', teacherId],
    queryFn: async () => {
      const { data } = await supabase
        .from('chat_threads')
        .select('*')
        .contains('participants', [teacherId])
        .order('updated_at', { ascending: false });

      // Для каждого чата получаем последнее сообщение и кол-во непрочитанных
      const threadsWithDetails = await Promise.all(
        (data || []).map(async (thread) => {
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('text')
            .eq('thread_id', thread.id)
            .eq('thread_type', 'chat')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', thread.id)
            .eq('thread_type', 'chat')
            .neq('author_id', teacherId)
            .in('status', ['sent', 'delivered']);

          return {
            ...thread,
            last_message: lastMessage?.text,
            unread_count: unreadCount || 0,
          };
        })
      );

      return threadsWithDetails as ChatThread[];
    },
    refetchInterval: 10000,
  });

  const getThreadIcon = (type: string) => {
    switch (type) {
      case 'group':
        return <Users className="h-5 w-5" />;
      case 'student':
        return <User className="h-5 w-5" />;
      default:
        return <MessageSquare className="h-5 w-5" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {threads.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <MessageSquare className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold text-lg mb-2">Нет активных чатов</h3>
          <p className="text-sm text-muted-foreground max-w-[280px]">
            Чаты с группами, студентами и коллегами появятся здесь
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-2">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => setSelectedThread(thread.id)}
                className="w-full p-3 rounded-lg hover:bg-muted/50 transition-colors text-left border-b last:border-b-0"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 text-muted-foreground">
                    {getThreadIcon(thread.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm truncate">
                        {thread.title || 'Без названия'}
                      </h4>
                      {thread.unread_count! > 0 && (
                        <span className="ml-2 min-w-[20px] h-5 px-1.5 bg-destructive text-white text-xs font-medium rounded-full flex items-center justify-center flex-shrink-0">
                          {thread.unread_count}
                        </span>
                      )}
                    </div>
                    {thread.last_message && (
                      <p className="text-xs text-muted-foreground truncate">
                        {thread.last_message}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(thread.updated_at), 'dd MMM, HH:mm', { locale: ru })}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Футер с информацией */}
      <div className="p-4 border-t bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          Полнофункциональные чаты скоро будут доступны
        </p>
      </div>
    </div>
  );
};