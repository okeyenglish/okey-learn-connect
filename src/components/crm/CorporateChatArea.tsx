import { useState, useEffect } from "react";
import { Send, Paperclip, Zap, MessageCircle, Mic, Search, Plus, FileText, Phone, Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "./ChatMessage";
import { useIsMobile } from "@/hooks/use-mobile";
import { useChatMessages, useSendMessage, useMarkAsRead, useRealtimeMessages } from '@/hooks/useChatMessages';
import { useTypingStatus } from '@/hooks/useTypingStatus';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

interface CorporateChatAreaProps {
  onMessageChange?: (hasUnsaved: boolean) => void;
}

// Mock corporate chat history for different branches
const mockCorporateChats: Record<string, any[]> = {
  'okskaya': [
    {
      type: 'manager' as const,
      message: 'Добрый день! У нас новое расписание на следующую неделю',
      time: '14:30',
      sender: 'Пышнов Данил'
    },
    {
      type: 'manager' as const,
      message: 'Отлично, когда можно посмотреть?',
      time: '14:32',
      sender: 'Иванова Мария'
    },
    {
      type: 'manager' as const,
      message: 'Уже выложил в общей папке',
      time: '14:33',
      sender: 'Пышнов Данил'
    }
  ],
  'kotelniki': [
    {
      type: 'manager' as const,
      message: 'Нужна помощь с настройкой нового оборудования',
      time: '13:15',
      sender: 'Петров Алексей'
    },
    {
      type: 'manager' as const,
      message: 'Могу подъехать после 16:00',
      time: '13:18',
      sender: 'Сидоров Игорь'
    }
  ],
  'stakhanovskaya': [
    {
      type: 'manager' as const,
      message: 'Кто может подменить завтра во второй смене?',
      time: '12:45',
      sender: 'Козлова Елена'
    }
  ],
  'novokosino': [
    {
      type: 'manager' as const,
      message: 'Поступила новая партия учебников',
      time: '11:20',
      sender: 'Орлов Максим'
    }
  ],
  'mytishchi': [
    {
      type: 'manager' as const,
      message: 'Планируем открытый урок на следующей неделе',
      time: '10:30',
      sender: 'Белова Анна'
    }
  ],
  'solntsevo': [
    {
      type: 'manager' as const,
      message: 'Успешно завершили курс для взрослых',
      time: '16:45',
      sender: 'Морозов Денис'
    }
  ],
  'online': [
    {
      type: 'manager' as const,
      message: 'Обновили платформу для онлайн занятий',
      time: '09:15',
      sender: 'Волков Артем'
    }
  ]
};

const branches = [
  { id: 'okskaya', name: 'Окская', unread: 0 },
  { id: 'kotelniki', name: 'Котельники', unread: 0 },
  { id: 'stakhanovskaya', name: 'Стахановская', unread: 0 },
  { id: 'novokosino', name: 'Новокосино', unread: 0 },
  { id: 'mytishchi', name: 'Мытищи', unread: 0 },
  { id: 'solntsevo', name: 'Солнцево', unread: 0 },
  { id: 'online', name: 'Онлайн', unread: 0 }
];

export const CorporateChatArea = ({ onMessageChange }: CorporateChatAreaProps) => {
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [activeBranch, setActiveBranch] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Resolve real client UUID for selected branch
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);
  useEffect(() => {
    const resolve = async () => {
      if (!activeBranch) { setResolvedClientId(null); return; }
      const branchName = branches.find(b => b.id === activeBranch)?.name;
      if (!branchName) { setResolvedClientId(null); return; }
      const { data } = await supabase
        .from('clients')
        .select('id')
        .eq('name', `Корпоративный чат - ${branchName}`)
        .maybeSingle();
      setResolvedClientId(data?.id || null);
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
          <div className="p-3 border-b">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-600" />
              <h2 className="font-semibold text-base">Корпоративный чат</h2>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 space-y-2">
              {branches.map((branch) => {
                const branchMessages = mockCorporateChats[branch.id] || [];
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
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{branch.name}</p>
                            {branch.unread > 0 && (
                              <Badge variant="destructive" className="text-xs h-5 min-w-5 px-1.5">
                                {branch.unread}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {branchMessages.length > 0 
                              ? branchMessages[branchMessages.length - 1].message 
                              : 'Нет сообщений'
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-muted-foreground">
                          {branchMessages.length > 0 
                            ? branchMessages[branchMessages.length - 1].time 
                            : ''
                          }
                        </span>
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

    // Показываем чат выбранного филиала
    return (
      <div className="flex flex-col h-full bg-background">
        {/* Chat Header with Back Button */}
        <div className="border-b p-3 shrink-0">
          <div className="flex items-center gap-3">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0"
              onClick={handleBackToList}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <h2 className="font-semibold text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-600" />
                Филиал {getActiveBranch().name}
              </h2>
              <p className="text-sm text-muted-foreground">Корпоративный чат</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8 w-8 p-0"
                title="Добавить задачу"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant={showSearchInput ? "default" : "outline"}
                className="h-8 w-8 p-0"
                title="Поиск в чате"
                onClick={handleSearchToggle}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {showSearchInput && (
            <div className="mt-2">
              <Input
                placeholder="Поиск в чате..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="main" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 rounded-none bg-orange-50/30 border-orange-200 border-t rounded-t-none">
              <TabsTrigger value="main" className="text-xs">Основной</TabsTrigger>
              <TabsTrigger value="announcements" className="text-xs">Объявления</TabsTrigger>
              <TabsTrigger value="questions" className="text-xs">Вопросы</TabsTrigger>
              <TabsTrigger value="social" className="text-xs">Общение</TabsTrigger>
            </TabsList>
            
            <TabsContent value="main" className="flex-1 p-3 overflow-y-auto mt-0">
              <div className="space-y-1">
                {filteredMessages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    type={msg.message_type}
                    message={msg.message_text}
                    time={new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    managerName={msg.message_type === 'manager' ? 'Вы' : 'Сотрудник'}
                  />
                ))}
                {isOtherUserTyping && (
                  <div className="text-sm text-muted-foreground italic">
                    {getTypingMessage()}
                  </div>
                )}
                {searchQuery && filteredMessages.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-4">
                    Сообщения не найдены
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="announcements" className="flex-1 p-3 overflow-y-auto mt-0">
              <div className="text-center text-muted-foreground text-sm py-4">
                Объявления для филиала {getActiveBranch().name}
              </div>
            </TabsContent>
            
            <TabsContent value="questions" className="flex-1 p-3 overflow-y-auto mt-0">
              <div className="text-center text-muted-foreground text-sm py-4">
                Вопросы и ответы
              </div>
            </TabsContent>
            
            <TabsContent value="social" className="flex-1 p-3 overflow-y-auto mt-0">
              <div className="text-center text-muted-foreground text-sm py-4">
                Неформальное общение
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Message Input */}
        <div className="border-t p-3 shrink-0">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Textarea
                placeholder="Введите сообщение для команды..."
                value={message}
                onChange={(e) => handleMessageChange(e.target.value)}
                className="min-h-[40px] max-h-[120px] resize-none"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <div className="flex items-center gap-1 mt-2">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                  <Paperclip className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                  <Zap className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                  <MessageCircle className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                  <Mic className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Button 
              size="icon" 
              className="rounded-full h-10 w-10"
              onClick={handleSendMessage}
              disabled={!message.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Десктопная версия - двухпанельный интерфейс
  return (
    <div className="flex h-full">
      {/* Left Sidebar - Branch List */}
      <div className="w-64 border-r bg-background flex flex-col">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-slate-600" />
            <h2 className="font-semibold text-base">Корпоративный чат</h2>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-1">
            {branches.map((branch) => {
              const branchMessages = mockCorporateChats[branch.id] || [];
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
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-500" />
                      <span className="font-medium text-sm">{branch.name}</span>
                    </div>
                    {branch.unread > 0 && (
                      <Badge variant="destructive" className="text-xs h-5 min-w-5 px-1.5">
                        {branch.unread}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {branchMessages.length > 0 
                      ? branchMessages[branchMessages.length - 1].message 
                      : 'Нет сообщений'
                    }
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Chat Area */}
      <div className="flex-1 bg-background flex flex-col min-w-0">
        {activeBranch ? (
          <>
            {/* Chat Header */}
            <div className="border-b p-3 shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-600" />
                    Филиал {getActiveBranch().name}
                  </h2>
                  <p className="text-sm text-muted-foreground">Корпоративный чат</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 w-8 p-0"
                    title="Добавить задачу"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 w-8 p-0"
                    title="Выставить счёт"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 w-8 p-0"
                    title="Позвонить"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant={showSearchInput ? "default" : "outline"}
                    className="h-8 w-8 p-0"
                    title="Поиск в чате"
                    onClick={handleSearchToggle}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                  {showSearchInput && (
                    <Input
                      placeholder="Поиск в чате..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-64 h-8 ml-2"
                      autoFocus
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto">
              <Tabs defaultValue="main" className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-4 rounded-none bg-orange-50/30 border-orange-200 border-t rounded-t-none">
                  <TabsTrigger value="main" className="text-xs">Основной</TabsTrigger>
                  <TabsTrigger value="announcements" className="text-xs">Объявления</TabsTrigger>
                  <TabsTrigger value="questions" className="text-xs">Вопросы</TabsTrigger>
                  <TabsTrigger value="social" className="text-xs">Общение</TabsTrigger>
                </TabsList>
                
                <TabsContent value="main" className="flex-1 p-3 overflow-y-auto mt-0">
                  <div className="space-y-1">
                     {filteredMessages.map((msg, index) => (
                       <div key={msg.id} className="flex flex-col gap-1">
                         <div className="flex items-center gap-2 mb-1">
                           <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center">
                             <span className="text-xs font-medium text-slate-600">
                               {msg.message_type === 'manager' ? 'M' : 'C'}
                             </span>
                           </div>
                           <span className="text-xs font-medium text-slate-700">
                             {msg.message_type === 'manager' ? 'Вы' : 'Сотрудник'}
                           </span>
                           <span className="text-xs text-muted-foreground">
                             {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                           </span>
                         </div>
                         <div className="ml-8">
                           <div className="bg-slate-50 rounded-lg p-2 text-sm">
                             {msg.message_text}
                           </div>
                         </div>
                       </div>
                     ))}
                    {searchQuery && filteredMessages.length === 0 && (
                      <div className="text-center text-muted-foreground text-sm py-4">
                        Сообщения не найдены
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="announcements" className="flex-1 p-3 overflow-y-auto mt-0">
                  <div className="text-center text-muted-foreground text-sm py-4">
                    Объявления для филиала {getActiveBranch().name}
                  </div>
                </TabsContent>
                
                <TabsContent value="questions" className="flex-1 p-3 overflow-y-auto mt-0">
                  <div className="text-center text-muted-foreground text-sm py-4">
                    Вопросы и ответы
                  </div>
                </TabsContent>
                
                <TabsContent value="social" className="flex-1 p-3 overflow-y-auto mt-0">
                  <div className="text-center text-muted-foreground text-sm py-4">
                    Неформальное общение
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Message Input */}
            <div className="border-t p-3 shrink-0">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Textarea
                    placeholder="Введите сообщение для команды..."
                    value={message}
                    onChange={(e) => handleMessageChange(e.target.value)}
                    className="min-h-[40px] max-h-[120px] resize-none"
                    rows={1}
                  />
                  <div className="flex items-center gap-1 mt-2">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                      <Paperclip className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                      <Zap className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                      <MessageCircle className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                      <Mic className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <Button size="icon" className="rounded-full h-10 w-10">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 bg-background flex items-center justify-center p-4">
            <div className="text-center text-muted-foreground max-w-sm mx-auto">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Выберите филиал</h3>
              <p className="text-sm">
                Выберите филиал из списка слева, чтобы начать общение с командой
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};