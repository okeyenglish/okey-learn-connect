import { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssistantTab } from './AssistantTab';
import { ChatsTab } from './ChatsTab';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FloatingChatWidgetProps {
  teacherId: string;
  context?: {
    page?: string;
    groupId?: string;
    lessonId?: string;
  };
}

export const FloatingChatWidget = ({ teacherId, context }: FloatingChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'assistant' | 'chats'>('assistant');

  // Получаем непрочитанные сообщения
  const { data: unreadCount } = useQuery({
    queryKey: ['unread-messages', teacherId],
    queryFn: async () => {
      const { data: threads } = await supabase
        .from('chat_threads')
        .select('id')
        .contains('participants', [teacherId]);

      if (!threads || threads.length === 0) return 0;

      const threadIds = threads.map(t => t.id);
      
      const { data: messages } = await supabase
        .from('messages')
        .select('id')
        .eq('thread_type', 'chat')
        .in('thread_id', threadIds)
        .eq('status', 'delivered')
        .neq('author_id', teacherId);

      return messages?.length || 0;
    },
    refetchInterval: 10000, // обновляем каждые 10 секунд
  });

  // Горячая клавиша ⌘/
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* Кнопка запуска */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center justify-center group"
        aria-label="Открыть чат и ассистент"
        title="Чат и AI ассистент (⌘/)"
      >
        <MessageCircle className="w-6 h-6" />
        {(unreadCount ?? 0) > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-destructive text-white text-xs font-medium rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Панель чата */}
      {isOpen && (
        <>
          {/* Overlay для мобильных */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Сама панель */}
          <div className="fixed bottom-0 right-0 md:bottom-24 md:right-6 w-full md:w-[420px] h-full md:h-[600px] bg-background border-l md:border md:rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
            {/* Шапка */}
            <div className="flex items-center justify-between p-4 border-b bg-muted/30">
              <h2 className="font-semibold text-lg">AI Помощник и Чаты</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Табы */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full rounded-none border-b bg-transparent h-auto p-0">
                <TabsTrigger value="assistant" className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                  Ассистент
                </TabsTrigger>
                <TabsTrigger value="chats" className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary relative">
                  Чаты
                  {(unreadCount ?? 0) > 0 && (
                    <span className="ml-2 min-w-[18px] h-[18px] px-1 bg-destructive text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="assistant" className="flex-1 overflow-hidden m-0 p-0">
                <AssistantTab teacherId={teacherId} context={context} />
              </TabsContent>

              <TabsContent value="chats" className="flex-1 overflow-hidden m-0 p-0">
                <ChatsTab teacherId={teacherId} />
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}
    </>
  );
};