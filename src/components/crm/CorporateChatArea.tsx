import { useState, useEffect } from "react";
import { Send, Paperclip, Zap, MessageCircle, Mic, Search, Plus, FileText, Phone, Building2, ArrowLeft, Pin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "./ChatMessage";
import { useIsMobile } from "@/hooks/use-mobile";
import { useChatMessages, useSendMessage, useMarkAsRead, useRealtimeMessages } from '@/hooks/useChatMessages';
import { useMarkChatMessagesAsRead } from '@/hooks/useMessageReadStatus';
import { useTypingStatus } from '@/hooks/useTypingStatus';
import { toast } from "sonner";
import { useSystemChatMessages } from '@/hooks/useSystemChatMessages';
import { supabase } from '@/integrations/supabase/client';

interface CorporateChatAreaProps {
  onMessageChange?: (hasUnsaved: boolean) => void;
  selectedBranchId?: string | null; // e.g. 'okskaya'
  embedded?: boolean; // if true, render without internal left sidebar
}

const branches = [
  { id: 'okskaya', name: 'Окская', unread: 0 },
  { id: 'kotelniki', name: 'Котельники', unread: 0 },
  { id: 'stakhanovskaya', name: 'Стахановская', unread: 0 },
  { id: 'novokosino', name: 'Новокосино', unread: 0 },
  { id: 'mytishchi', name: 'Мытищи', unread: 0 },
  { id: 'solntsevo', name: 'Солнцево', unread: 0 },
  { id: 'online', name: 'Онлайн', unread: 0 }
];

export const CorporateChatArea = ({ onMessageChange, selectedBranchId = null, embedded = false }: CorporateChatAreaProps) => {
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [activeBranch, setActiveBranch] = useState<string | null>(selectedBranchId);
  const [allowedBranches, setAllowedBranches] = useState<string[]>([]);
  const isMobile = useIsMobile();
  
  // Получаем реальные данные корпоративных чатов
  const { corporateChats, isLoading: systemChatsLoading } = useSystemChatMessages();

  // Группируем корпоративные чаты по филиалам
  const branchChats = (corporateChats || []).reduce((acc: any, chat: any) => {
    if (!acc[chat.branch]) {
      acc[chat.branch] = [];
    }
    acc[chat.branch].push(chat);
    return acc;
  }, {});

  // Создаем список филиалов с данными о последних сообщениях
  const branchesWithData = branches.map(branch => {
    const chatsForBranch = branchChats[branch.name] || [];
    const latestMessage = chatsForBranch.reduce((latest: any, chat: any) => {
      if (!chat.lastMessageTime) return latest;
      if (!latest) return chat;
      return new Date(chat.lastMessageTime) > new Date(latest.lastMessageTime) ? chat : latest;
    }, null);
    
    const totalUnread = chatsForBranch.reduce((sum: number, chat: any) => sum + (chat.unreadCount || 0), 0);
    
    return {
      ...branch,
      unread: totalUnread,
      lastMessage: latestMessage?.lastMessage || 'Нет сообщений',
      lastMessageTime: latestMessage?.lastMessageTime || null
    };
  });

  // Устанавливаем активный филиал при загрузке, если передан selectedBranchId
  useEffect(() => {
    if (selectedBranchId && !activeBranch) {
      const branch = branches.find(b => b.name === selectedBranchId);
      if (branch) {
        setActiveBranch(branch.id);
      }
    }
  }, [selectedBranchId, activeBranch]);

  // Resolve real client UUID for selected branch
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);
  useEffect(() => {
    const ensureClient = async (name: string, branch: string) => {
      const { data: found } = await supabase
        .from('clients')
        .select('id')
        .eq('name', name)
        .eq('branch', branch)
        .maybeSingle();
      if (found?.id) return found.id as string;

      const { data: inserted, error } = await supabase
        .from('clients')
        .insert({ name, phone: '-', branch })
        .select('id')
        .maybeSingle();
      if (error) {
        console.error('ensureClient insert error', error);
        return null;
      }
      return inserted?.id || null;
    };
    const resolve = async () => {
      if (!activeBranch) { setResolvedClientId(null); return; }
      const branchName = branches.find(b => b.id === activeBranch)?.name;
      if (!branchName) { setResolvedClientId(null); return; }
      const id = await ensureClient(`Корпоративный чат - ${branchName}`, branchName);
      setResolvedClientId(id);
    };
    resolve();
  }, [activeBranch]);

  const clientId = resolvedClientId || '';
  const { messages } = useChatMessages(clientId);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const { updateTypingStatus, getTypingMessage, isOtherUserTyping } = useTypingStatus(clientId);
  
  useRealtimeMessages(clientId);
  useEffect(() => {
    if (clientId && messages.length > 0) {
      markAsRead.mutate(clientId);
    }
  }, [clientId, messages.length]);

  const handleMessageChange = (value: string) => {
    setMessage(value);
    onMessageChange?.(value.trim().length > 0);
    updateTypingStatus(value.length > 0);
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    try {
      await sendMessage.mutateAsync({
        clientId,
        messageText: message.trim(),
        messageType: 'manager'
      });
      setMessage('');
      updateTypingStatus(false);
      onMessageChange?.(false);
    } catch (error) {
      toast.error('Ошибка отправки сообщения');
    }
  };

  const handleMarkAsRead = async () => {
    if (!activeBranch) return;
    try {
      await markAsRead.mutateAsync(clientId);
      toast.success('Отмечено как прочитанное');
    } catch (error) {
      toast.error('Ошибка отметки прочитанным');
    }
  };

  const handleSearchToggle = () => {
    setShowSearchInput(!showSearchInput);
    if (showSearchInput) {
      setSearchQuery(""); // Clear search when hiding
    }
  };

  const handleBranchSelect = (branchId: string) => {
    setActiveBranch(branchId);
  };

  const handleBackToList = () => {
    setActiveBranch(null);
  };

  // Filter messages based on search query
  const filteredMessages = messages.filter(msg => 
    msg.message_text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getActiveBranch = () => {
    return branches.find(b => b.id === activeBranch) || branches[0];
  };

  // На мобильных показываем либо список филиалов, либо чат
  if (isMobile) {
    // Показываем список филиалов
    if (!activeBranch) {
      return (
        <div className="flex flex-col h-full bg-background">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-600" />
              <h2 className="font-semibold text-base">Корпоративный чат</h2>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 space-y-2">
              {branchesWithData.map((branch) => {
                return (
                  <button
                    key={branch.id}
                    onClick={() => handleBranchSelect(branch.id)}
                    className="w-full text-left p-4 rounded-lg transition-colors bg-card border hover:bg-muted/50 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{branch.name}</p>
                            {branch.unread > 0 && (
                              <Badge variant="destructive" className="text-xs h-5">
                                {branch.unread}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                            {branch.lastMessage}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-xs text-muted-foreground">
                          {branch.lastMessageTime ? new Date(branch.lastMessageTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // Показываем чат конкретного филиала
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
              <Building2 className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold text-base">{getActiveBranch().name}</h2>
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
      </div>
    );
  }

  // Desktop версия
  return (
    <div className="flex h-full bg-background">
      {!embedded && (
        <div className="w-80 border-r bg-muted/30 flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-600" />
              <h2 className="font-semibold text-base">Корпоративный чат</h2>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="p-2 space-y-1">
              {branchesWithData.map((branch) => {
                return (
                  <button
                    key={branch.id}
                    onClick={() => setActiveBranch(branch.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      activeBranch === branch.id 
                        ? 'bg-slate-100 border border-slate-200' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{branch.name}</p>
                            {branch.unread > 0 && (
                              <Badge variant="destructive" className="text-xs h-4">
                                {branch.unread}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {branch.lastMessage}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-muted-foreground">
                          {branch.lastMessageTime ? new Date(branch.lastMessageTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {activeBranch ? (
          <>
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <h2 className="font-semibold text-base">{getActiveBranch().name}</h2>
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
              <Building2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Выберите филиал</h3>
              <p className="text-sm">
                Выберите филиал из списка слева, чтобы начать общение с коллегами
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};