import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, Users, Settings, Paperclip } from 'lucide-react';
import { InternalChat, useChatMessages, useSendInternalMessage } from '@/hooks/useInternalChats';
import { ChatParticipantsModal } from './ChatParticipantsModal';
import { useAuth } from '@/hooks/useAuth';

interface InternalChatWindowProps {
  chat?: InternalChat;
  onBack: () => void;
}

export const InternalChatWindow: React.FC<InternalChatWindowProps> = ({
  chat,
  onBack
}) => {
  const [message, setMessage] = useState('');
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const { data: messages, isLoading } = useChatMessages(chat?.id || '');
  const sendMessage = useSendInternalMessage();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !chat) return;

    try {
      await sendMessage.mutateAsync({
        chat_id: chat.id,
        message_text: message.trim(),
        message_type: 'text'
      });
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!chat) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Чат не найден</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      {/* Header */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle className="text-lg">{chat.name}</CardTitle>
                {chat.description && (
                  <p className="text-sm text-muted-foreground mt-1">{chat.description}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {chat.branch && (
                <Badge variant="outline">{chat.branch}</Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsParticipantsModalOpen(true)}
              >
                <Users className="h-4 w-4 mr-1" />
                {chat.participants.length}
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 p-4 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-muted-foreground">Загрузка сообщений...</p>
            </div>
          ) : messages?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Нет сообщений в чате</p>
              <p className="text-sm text-muted-foreground mt-1">
                Отправьте первое сообщение, чтобы начать общение
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages?.map((msg) => {
                const isOwnMessage = user?.id === msg.sender_id;
                
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {!isOwnMessage && (
                        <p className="text-xs font-medium mb-1">
                          {msg.sender.first_name} {msg.sender.last_name}
                        </p>
                      )}
                      
                      {msg.reply_to && (
                        <div className="text-xs opacity-70 mb-2 p-2 border-l-2 border-current/30 bg-black/10 rounded">
                          <p className="font-medium">
                            {msg.reply_to.sender.first_name} {msg.reply_to.sender.last_name}
                          </p>
                          <p>{msg.reply_to.message_text}</p>
                        </div>
                      )}
                      
                      <p className="whitespace-pre-wrap">{msg.message_text}</p>
                      
                      {msg.file_url && (
                        <div className="mt-2">
                          <a
                            href={msg.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs underline flex items-center gap-1"
                          >
                            <Paperclip className="h-3 w-3" />
                            {msg.file_name || 'Файл'}
                          </a>
                        </div>
                      )}
                      
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(msg.created_at).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {msg.is_edited && ' (изм.)'}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </CardContent>

        {/* Message Input */}
        <CardContent className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Введите сообщение..."
              className="flex-1"
              disabled={sendMessage.isPending}
            />
            <Button
              type="submit"
              disabled={!message.trim() || sendMessage.isPending}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <ChatParticipantsModal
        chat={chat}
        open={isParticipantsModalOpen}
        onOpenChange={setIsParticipantsModalOpen}
      />
    </div>
  );
};