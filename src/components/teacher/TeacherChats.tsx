import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, MessageCircle, Users, Search, Plus, ChevronLeft, ArrowLeft } from 'lucide-react';
import { Teacher } from '@/hooks/useTeachers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeacherAIChat } from './chat/TeacherAIChat';
import { Badge } from '@/components/ui/badge';
import { ChatArea } from '@/components/crm/ChatArea';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { CreateStaffChatModal } from './chat/CreateStaffChatModal';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TeacherChatsProps {
  teacher: Teacher;
}

interface StaffChat {
  id: string;
  name: string;
  phone: string;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
  branch?: string;
  role?: string;
}

export const TeacherChats = ({ teacher }: TeacherChatsProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ai');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const isMobile = useIsMobile();

  // Получаем список чатов преподавателя с коллегами
  const { data: staffChats, isLoading } = useQuery({
    queryKey: ['teacher-staff-chats', teacher.id],
    queryFn: async () => {
      // Ищем чаты, связанные с этим преподавателем
      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          phone,
          branch,
          notes,
          updated_at
        `)
        .or(`name.ilike.%преп. ${teacher.last_name}%,name.ilike.%${teacher.last_name} ${teacher.first_name}%,notes.ilike.%${teacher.last_name}%`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Для каждого чата получаем последнее сообщение и количество непрочитанных
      const chatsWithMessages = await Promise.all(
        (data || []).map(async (chat) => {
          // Последнее сообщение
          const { data: lastMsg } = await supabase
            .from('chat_messages')
            .select('message_text, created_at')
            .eq('client_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Количество непрочитанных
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', chat.id)
            .eq('is_read', false)
            .eq('is_outgoing', false);

          // Определяем роль по названию чата
          let role = 'Коллега';
          if (chat.name.includes('Менеджер')) role = 'Менеджер';
          else if (chat.name.includes('Методист')) role = 'Методист';
          else if (chat.name.includes('Управляющий')) role = 'Управляющий';
          else if (chat.name.includes('Ученик')) role = 'Ученик';

          return {
            id: chat.id,
            name: chat.name,
            phone: chat.phone,
            last_message: lastMsg?.message_text || null,
            last_message_time: lastMsg?.created_at || null,
            unread_count: count || 0,
            branch: chat.branch,
            role
          } as StaffChat;
        })
      );

      return chatsWithMessages;
    }
  });

  const filteredChats = staffChats?.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const selectedChat = staffChats?.find(c => c.id === selectedChatId);

  // Если выбран чат и мобильная версия, показываем только чат
  if (selectedChatId && isMobile && activeTab === 'staff') {
    return (
      <div className="h-[calc(100vh-200px)]">
        <ChatArea
          clientId={selectedChatId}
          clientName={selectedChat?.name || ''}
          clientPhone={selectedChat?.phone || ''}
          managerName={`${teacher.last_name} ${teacher.first_name}`}
          onBackToList={() => setSelectedChatId(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Чаты</h2>
          <p className="text-text-secondary">Общайтесь с AI-помощником и коллегами</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI-Помощник
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Коллеги
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="mt-6">
          <TeacherAIChat teacher={teacher} />
        </TabsContent>

        <TabsContent value="staff" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Список чатов */}
            <div className={`lg:col-span-4 space-y-4 ${selectedChatId && !isMobile ? 'hidden lg:block' : ''}`}>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <Input
                    placeholder="Поиск по чатам..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={() => setShowCreateModal(true)} size="sm">
                  <Plus className="h-4 w-4" />
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
                <div className="space-y-2">
                  {filteredChats.map((chat) => (
                    <Card
                      key={chat.id}
                      className={`p-4 cursor-pointer transition-all ${
                        selectedChatId === chat.id 
                          ? 'border-brand shadow-md bg-brand/5' 
                          : 'hover:shadow-md hover:border-brand/30'
                      }`}
                      onClick={() => setSelectedChatId(chat.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0">
                          <Users className="h-6 w-6 text-brand" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h3 className="font-medium text-text-primary truncate">{chat.name}</h3>
                            {chat.unread_count > 0 && (
                              <Badge variant="default" className="flex-shrink-0">
                                {chat.unread_count}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {chat.role}
                            </Badge>
                            {chat.branch && (
                              <Badge variant="secondary" className="text-xs">
                                {chat.branch}
                              </Badge>
                            )}
                          </div>

                          {chat.last_message && (
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm text-text-secondary truncate">
                                {chat.last_message}
                              </p>
                              {chat.last_message_time && (
                                <span className="text-xs text-text-muted flex-shrink-0">
                                  {format(new Date(chat.last_message_time), 'HH:mm', { locale: ru })}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Область чата */}
            <div className={`lg:col-span-8 ${!selectedChatId && !isMobile ? 'hidden lg:block' : ''}`}>
              {selectedChatId ? (
                <ChatArea
                  clientId={selectedChatId}
                  clientName={selectedChat?.name || ''}
                  clientPhone={selectedChat?.phone || ''}
                  managerName={`${teacher.last_name} ${teacher.first_name}`}
                  onBackToList={isMobile ? () => setSelectedChatId(null) : undefined}
                />
              ) : (
                <Card className="h-[600px] flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 text-text-muted opacity-50" />
                    <p className="text-lg font-medium mb-2">Выберите чат</p>
                    <p className="text-sm text-text-secondary">
                      Выберите чат из списка слева для начала общения
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <CreateStaffChatModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        teacher={teacher}
      />
    </div>
  );
};