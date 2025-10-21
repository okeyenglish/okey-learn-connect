import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, User, ChevronRight, Plus } from 'lucide-react';
import { Teacher } from '@/hooks/useTeachers';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TeacherChatWindow } from './TeacherChatWindow';
import { CreateStaffChatModal } from './CreateStaffChatModal';

interface TeacherStaffChatsProps {
  teacher: Teacher;
  searchQuery: string;
}

interface StaffChat {
  id: string;
  name: string;
  role: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  branch?: string;
}

export const TeacherStaffChats = ({ teacher, searchQuery }: TeacherStaffChatsProps) => {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Получаем список доступных чатов (используем существующую таблицу clients с особыми метками)
  const { data: chats, isLoading } = useQuery({
    queryKey: ['teacher-staff-chats', teacher.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .or(`name.ilike.%Чат преподавателя ${teacher.last_name}%,name.ilike.%Менеджер%,name.ilike.%Методист%,name.ilike.%Управляющий%`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Для каждого чата получаем количество непрочитанных сообщений
      const chatsWithUnread = await Promise.all(
        (data || []).map(async (chat) => {
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', chat.id)
            .eq('is_read', false)
            .eq('is_outgoing', false);

          // Получаем последнее сообщение
          const { data: lastMsg } = await supabase
            .from('chat_messages')
            .select('message_text, created_at')
            .eq('client_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            id: chat.id,
            name: chat.name,
            role: chat.name.includes('Менеджер') ? 'Менеджер' 
              : chat.name.includes('Методист') ? 'Методист'
              : chat.name.includes('Управляющий') ? 'Управляющий'
              : 'Коллега',
            lastMessage: lastMsg?.message_text,
            lastMessageTime: lastMsg?.created_at,
            unreadCount: count || 0,
            branch: chat.branch
          } as StaffChat;
        })
      );

      return chatsWithUnread;
    }
  });

  const filteredChats = chats?.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (selectedChatId) {
    const selectedChat = chats?.find(c => c.id === selectedChatId);
    return (
      <TeacherChatWindow
        chatId={selectedChatId}
        chatName={selectedChat?.name || ''}
        teacher={teacher}
        onBack={() => setSelectedChatId(null)}
      />
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex justify-end mb-4">
          <Button onClick={() => setShowCreateModal(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Новый чат
          </Button>
        </div>

        {isLoading ? (
          <Card className="p-8 text-center">
            <p className="text-text-secondary">Загрузка чатов...</p>
          </Card>
        ) : filteredChats.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-text-muted opacity-50" />
            <p className="text-lg font-medium mb-2">Нет чатов</p>
            <p className="text-sm text-text-secondary mb-4">
              {searchQuery ? 'Ничего не найдено' : 'Создайте первый чат с коллегами'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateModal(true)}>
                Создать чат
              </Button>
            )}
          </Card>
        ) : (
          filteredChats.map((chat) => (
            <Card
              key={chat.id}
              className="p-4 cursor-pointer hover:shadow-md transition-all"
              onClick={() => setSelectedChatId(chat.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-6 w-6 text-brand" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-medium text-text-primary truncate">{chat.name}</h3>
                    {chat.unreadCount > 0 && (
                      <Badge variant="default" className="flex-shrink-0">
                        {chat.unreadCount}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Badge variant="outline" className="text-xs">
                      {chat.role}
                    </Badge>
                    {chat.branch && (
                      <Badge variant="secondary" className="text-xs">
                        {chat.branch}
                      </Badge>
                    )}
                  </div>

                  {chat.lastMessage && (
                    <p className="text-sm text-text-secondary truncate mt-1">
                      {chat.lastMessage}
                    </p>
                  )}
                </div>

                <ChevronRight className="h-5 w-5 text-text-muted flex-shrink-0" />
              </div>
            </Card>
          ))
        )}
      </div>

      <CreateStaffChatModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        teacher={teacher}
      />
    </>
  );
};