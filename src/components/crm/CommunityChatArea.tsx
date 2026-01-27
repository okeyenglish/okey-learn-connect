import { useState, useEffect } from "react";
import { Send, Search, ArrowLeft, ChevronRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "./ChatMessage";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSendMessage, useMarkAsRead, useRealtimeMessages } from '@/hooks/useChatMessages';
import { useChatMessagesOptimized } from '@/hooks/useChatMessagesOptimized';
import { useTypingStatus } from '@/hooks/useTypingStatus';
import { toast } from "sonner";
import { useCommunityChats, CommunityChat } from '@/hooks/useCommunityChats';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useMessageDrafts } from '@/hooks/useMessageDrafts';

// Messenger icons
const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const MaxIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <circle cx="12" cy="12" r="10"/>
    <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">M</text>
  </svg>
);

interface CommunityChatAreaProps {
  onMessageChange?: (hasUnsaved: boolean) => void;
  selectedCommunityId?: string | null;
  embedded?: boolean;
}

export const CommunityChatArea = ({ onMessageChange, selectedCommunityId = null, embedded = false }: CommunityChatAreaProps) => {
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(selectedCommunityId);
  
  // Use persistent draft hook
  const draftChatId = activeCommunityId ? `community_${activeCommunityId}` : null;
  const { draft: message, setDraft: setMessage, clearDraft } = useMessageDrafts(draftChatId);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const isMobile = useIsMobile();
  
  const { communityChats, isLoading } = useCommunityChats();

  // Get active community details
  const activeCommunity = communityChats.find(c => c.id === activeCommunityId);

  // Setup chat hooks - load only 30 messages initially for fast opening
  const clientId = activeCommunityId || '';
  const { data: messagesData, isLoading: messagesLoading } = useChatMessagesOptimized(clientId, 30);
  const messages = messagesData?.messages || [];
  const hasMoreMessages = messagesData?.hasMore || false;
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const { updateTypingStatus, getTypingMessage, getTypingInfo, isOtherUserTyping } = useTypingStatus(clientId);
  const typingInfo = getTypingInfo();
  
  useRealtimeMessages(clientId);
  
  useEffect(() => {
    if (clientId && messages.length > 0) {
      markAsRead.mutate(clientId);
    }
  }, [clientId, messages.length]);

  const handleMessageChange = (value: string) => {
    setMessage(value);
    onMessageChange?.(value.trim().length > 0);
    updateTypingStatus(value.length > 0, value.slice(0, 100));
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !activeCommunityId) return;

    try {
      await sendMessage.mutateAsync({
        clientId: activeCommunityId,
        messageText: message.trim(),
        messageType: 'manager'
      });
      clearDraft();
      updateTypingStatus(false);
      onMessageChange?.(false);
    } catch (error) {
      toast.error('Ошибка отправки сообщения');
    }
  };

  const handleSearchToggle = () => {
    setShowSearchInput(!showSearchInput);
    if (showSearchInput) {
      setSearchQuery("");
    }
  };

  const handleCommunitySelect = (communityId: string) => {
    setActiveCommunityId(communityId);
  };

  const handleBackToList = () => {
    setActiveCommunityId(null);
  };

  // Filter messages based on search query
  const filteredMessages = messages.filter((msg: any) => 
    (msg.message_text || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get messenger-specific styling
  const getMessengerColor = (messengerType: string) => {
    switch (messengerType) {
      case 'telegram': return 'bg-blue-100 text-blue-600';
      case 'whatsapp': return 'bg-green-100 text-green-600';
      case 'max': return 'bg-purple-100 text-purple-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getMessengerIcon = (messengerType: string) => {
    switch (messengerType) {
      case 'telegram': return <TelegramIcon />;
      case 'whatsapp': return <WhatsAppIcon />;
      case 'max': return <MaxIcon />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getMessengerName = (messengerType: string) => {
    switch (messengerType) {
      case 'telegram': return 'Telegram';
      case 'whatsapp': return 'WhatsApp';
      case 'max': return 'MAX';
      default: return 'Группа';
    }
  };

  // Mobile layout
  if (isMobile) {
    if (!activeCommunityId) {
      return (
        <div className="flex flex-col h-full bg-background">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-600" />
              <h2 className="font-semibold text-base">Сообщества</h2>
            </div>
          </div>
          
            <div className="flex-1 overflow-y-auto pb-20">
            <div className="p-3 space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : communityChats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Нет доступных сообществ</p>
                </div>
              ) : (
                communityChats.map((community) => (
                  <button
                    key={community.id}
                    onClick={() => handleCommunitySelect(community.id)}
                    className="w-full text-left p-4 rounded-lg transition-colors bg-card border hover:bg-muted/50 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {community.avatarUrl ? (
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={community.avatarUrl} alt={community.name} />
                              <AvatarFallback>{community.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getMessengerColor(community.messengerType)}`}>
                              <Users className="h-6 w-6" />
                            </div>
                          )}
                          {/* Messenger indicator */}
                          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${getMessengerColor(community.messengerType)} border-2 border-background`}>
                            {getMessengerIcon(community.messengerType)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate max-w-[180px]" title={community.name}>
                              {community.name.length > 30 ? community.name.substring(0, 30) + '...' : community.name}
                            </p>
                            {community.unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs h-5 rounded-sm">
                                {community.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${getMessengerColor(community.messengerType)}`}>
                              {getMessengerName(community.messengerType)}
                            </span>
                            {community.branch && (
                              <span className="text-xs text-muted-foreground truncate">{community.branch}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 leading-snug mt-0.5">
                            {community.lastMessage || (community.lastMessageTime ? '📎 Медиа' : 'Нет сообщений')}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-xs text-muted-foreground">
                          {community.lastMessageTime ? new Date(community.lastMessageTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      );
    }

    // Mobile chat view
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleBackToList}
              className="p-1"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getMessengerColor(activeCommunity?.messengerType || 'telegram')}`}>
                {getMessengerIcon(activeCommunity?.messengerType || 'telegram')}
              </div>
              <div>
                <h2 className="font-semibold text-sm">{activeCommunity?.name}</h2>
                <span className={`text-xs px-1.5 py-0.5 rounded ${getMessengerColor(activeCommunity?.messengerType || 'telegram')}`}>
                  {getMessengerName(activeCommunity?.messengerType || 'telegram')}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleSearchToggle}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showSearchInput && (
          <div className="p-3 border-b">
            <Input
              type="text"
              placeholder="Поиск сообщений..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messagesLoading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          )}
          {hasMoreMessages && !messagesLoading && (
            <div className="text-center py-2">
              <span className="text-xs text-muted-foreground">
                Загружены последние 30 сообщений
              </span>
            </div>
          )}
          {filteredMessages.map((msg: any, index: number) => (
            <ChatMessage 
              key={msg.id || index}
              messageId={msg.id}
              message={msg.message_text || ''}
              time={new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              type={msg.message_type === 'system' ? 'manager' : msg.message_type}
            />
          ))}
          {isOtherUserTyping && typingInfo && (
            <div className="text-sm text-orange-600 italic flex items-center gap-1.5">
              <span className="font-medium">{typingInfo.managerName}</span>
              <span>печатает</span>
              {typingInfo.draftText && (
                <span className="text-orange-500 truncate max-w-[150px]">: "{typingInfo.draftText}"</span>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              value={message}
              onChange={(e) => handleMessageChange(e.target.value)}
              placeholder="Напишите сообщение..."
              className="flex-1 min-h-[40px] max-h-[120px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!message.trim()}
              size="sm"
              className="px-3"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="flex h-full bg-background">
      {!embedded && (
        <div className="w-80 border-r bg-muted/30 flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-600" />
              <h2 className="font-semibold text-base">Сообщества</h2>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="p-2 space-y-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : communityChats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Нет доступных сообществ</p>
                </div>
              ) : (
                communityChats.map((community) => (
                  <button
                    key={community.id}
                    onClick={() => handleCommunitySelect(community.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      activeCommunityId === community.id 
                        ? 'bg-slate-100 border border-slate-200' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {community.avatarUrl ? (
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={community.avatarUrl} alt={community.name} />
                              <AvatarFallback>{community.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getMessengerColor(community.messengerType)}`}>
                              <Users className="h-5 w-5" />
                            </div>
                          )}
                          {/* Messenger indicator */}
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${getMessengerColor(community.messengerType)} border-2 border-background`}>
                            {getMessengerIcon(community.messengerType)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate max-w-[140px]" title={community.name}>
                              {community.name.length > 25 ? community.name.substring(0, 25) + '...' : community.name}
                            </p>
                            {community.unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs h-4 rounded-sm flex-shrink-0">
                                {community.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`text-[10px] px-1 py-0.5 rounded ${getMessengerColor(community.messengerType)}`}>
                              {getMessengerName(community.messengerType)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {community.lastMessage || (community.lastMessageTime ? '📎 Медиа' : 'Нет сообщений')}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-muted-foreground">
                          {community.lastMessageTime ? new Date(community.lastMessageTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {activeCommunityId && activeCommunity ? (
          <>
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getMessengerColor(activeCommunity.messengerType)}`}>
                  {getMessengerIcon(activeCommunity.messengerType)}
                </div>
                <div>
                  <h2 className="font-semibold text-base">{activeCommunity.name}</h2>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${getMessengerColor(activeCommunity.messengerType)}`}>
                    {getMessengerName(activeCommunity.messengerType)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={handleSearchToggle}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {showSearchInput && (
              <div className="p-3 border-b">
                <Input
                  type="text"
                  placeholder="Поиск сообщений..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="w-full"
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {filteredMessages.map((msg, index) => (
                <ChatMessage 
                  key={msg.id || index}
                  messageId={msg.id}
                  message={msg.message_text}
                  time={new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  type={msg.message_type === 'system' ? 'manager' : msg.message_type}
                />
              ))}
              {isOtherUserTyping && (
                <div className="text-sm text-muted-foreground italic">
                  {getTypingMessage()}
                </div>
              )}
            </div>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Textarea
                  value={message}
                  onChange={(e) => handleMessageChange(e.target.value)}
                  placeholder="Напишите сообщение..."
                  className="flex-1 min-h-[40px] max-h-[120px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  size="sm"
                  className="px-3"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center text-muted-foreground max-w-sm mx-auto">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Выберите сообщество</h3>
              <p className="text-sm">
                Выберите группу из списка слева, чтобы просмотреть сообщения
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
