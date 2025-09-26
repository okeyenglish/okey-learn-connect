import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Plus, Search, Users } from 'lucide-react';
import { useInternalChats } from '@/hooks/useInternalChats';
import { CreateChatModal } from './CreateChatModal';
import { InternalChatWindow } from './InternalChatWindow';

const InternalChatsSection = () => {
  const { data: chats, isLoading } = useInternalChats();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const filteredChats = (chats || []).filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chat.description && chat.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (selectedChatId) {
    const selectedChat = chats?.find(chat => chat.id === selectedChatId);
    return (
      <InternalChatWindow
        chat={selectedChat}
        onBack={() => setSelectedChatId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Внутренние чаты</h1>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Создать чат
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Поиск чатов..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Всего чатов</p>
                <p className="text-2xl font-bold">{chats?.length || 0}</p>
              </div>
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Активные</p>
                <p className="text-2xl font-bold text-green-600">
                  {chats?.filter(chat => chat.is_active).length || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">По филиалам</p>
                <p className="text-2xl font-bold">
                  {new Set(chats?.map(chat => chat.branch).filter(Boolean)).size || 0}
                </p>
              </div>
              <Badge variant="secondary" className="h-8 w-8 rounded-full p-0 flex items-center justify-center">
                {new Set(chats?.map(chat => chat.branch).filter(Boolean)).size || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chats List */}
      <Card>
        <CardHeader>
          <CardTitle>Список чатов</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-muted-foreground">Загрузка...</p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium">Нет чатов</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchQuery ? 'Не найдено чатов по запросу' : 'Создайте первый внутренний чат'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => setSelectedChatId(chat.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <MessageCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{chat.name}</h4>
                      {chat.description && (
                        <p className="text-sm text-muted-foreground">{chat.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {chat.branch && (
                          <Badge variant="outline" className="text-xs">
                            {chat.branch}
                          </Badge>
                        )}
                        <Badge 
                          variant={chat.is_active ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {chat.is_active ? 'Активный' : 'Неактивный'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Badge variant="secondary" className="mb-1">
                      {chat.participants.length} участников
                    </Badge>
                    {chat.last_message && (
                      <p className="text-xs text-muted-foreground">
                        Последнее сообщение: {new Date(chat.last_message.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateChatModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  );
};

export default InternalChatsSection;