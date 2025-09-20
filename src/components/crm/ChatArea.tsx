import { useState, useEffect, useRef } from "react";
import { Send, Paperclip, Zap, MessageCircle, Mic, Edit2, Search, Plus, FileText, Phone, Forward, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChatMessage } from "./ChatMessage";
import { ClientTasks } from "./ClientTasks";
import { AddTaskModal } from "./AddTaskModal";
import { CreateInvoiceModal } from "./CreateInvoiceModal";
import { ForwardMessageModal } from "./ForwardMessageModal";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ChatAreaProps {
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientComment?: string;
  onMessageChange?: (hasUnsaved: boolean) => void;
  activePhoneId?: string;
  onOpenTaskModal?: () => void;
  onOpenInvoiceModal?: () => void;
}

// ChatArea component for CRM chat functionality
export const ChatArea = ({ 
  clientId,
  clientName, 
  clientPhone, 
  clientComment = "Базовый комментарий", 
  onMessageChange, 
  activePhoneId = '1', 
  onOpenTaskModal, 
  onOpenInvoiceModal 
}: ChatAreaProps) => {
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [editableComment, setEditableComment] = useState(clientComment);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [pendingMessage, setPendingMessage] = useState<{text: string, countdown: number} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_MESSAGE_LENGTH = 4000;

  const { sendTextMessage, loading } = useWhatsApp();
  const { toast } = useToast();

  // Функция для прокрутки к концу чата
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? "smooth" : "instant" 
    });
  };

  // Load messages from database
  const loadMessages = async () => {
    if (!clientId || clientId === '1') {
      console.log('Invalid clientId:', clientId);
      setLoadingMessages(false);
      return;
    }
    
    setLoadingMessages(true);
    console.log('Loading messages for client:', clientId);
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      console.log('Loaded messages from database:', data);

      const formattedMessages = (data || []).map(msg => ({
        id: msg.id,
        type: msg.is_outgoing ? 'manager' : 'client',
        message: msg.message_text || '',
        time: new Date(msg.created_at).toLocaleTimeString('ru-RU', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        systemType: msg.system_type,
        callDuration: msg.call_duration,
        messageStatus: msg.message_status
      }));

      // 

      console.log('Formatted messages:', formattedMessages);
      setMessages(formattedMessages);
      
      // Мгновенная прокрутка к концу при первой загрузке
      if (formattedMessages.length > 0) {
        setTimeout(() => scrollToBottom(false), 50);
        setIsInitialLoad(false);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Load messages on component mount and when clientId changes
  useEffect(() => {
    setIsInitialLoad(true);
    loadMessages();
  }, [clientId]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!clientId || clientId === '1') return;

    console.log('Setting up real-time subscription for client:', clientId);

    const channel = supabase
      .channel(`chat_messages_${clientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `client_id=eq.${clientId}`
        },
        (payload) => {
          console.log('Received new message via real-time:', payload);
          const newMessage = {
            id: payload.new.id,
            type: payload.new.is_outgoing ? 'manager' : 'client',
            message: payload.new.message_text || '',
            time: new Date(payload.new.created_at).toLocaleTimeString('ru-RU', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            systemType: payload.new.system_type,
            callDuration: payload.new.call_duration,
            messageStatus: payload.new.message_status
          };
          console.log('Adding message to chat:', newMessage);
          setMessages(prev => {
            const updated = [...prev, newMessage];
            // Плавная прокрутка только для новых сообщений (не при первой загрузке)
            if (!isInitialLoad) {
              setTimeout(() => scrollToBottom(true), 100);
            }
            return updated;
          });
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  // Cleanup pending message timeout on unmount
  useEffect(() => {
    return () => {
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
      }
    };
  }, []);

  const handleMessageChange = (value: string) => {
    setMessage(value);
    onMessageChange?.(value.trim().length > 0);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || loading || message.length > MAX_MESSAGE_LENGTH) return;

    // Start 5-second countdown
    const messageText = message.trim();
    setMessage(""); // Clear input immediately
    onMessageChange?.(false);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Start countdown
    setPendingMessage({ text: messageText, countdown: 5 });
    
    const countdown = () => {
      setPendingMessage(prev => {
        if (!prev) return null;
        
        if (prev.countdown <= 1) {
          // Time's up - send the message
          sendMessageNow(messageText);
          return null;
        }
        
        return { ...prev, countdown: prev.countdown - 1 };
      });
    };

    // Update countdown every second
    const intervalId = setInterval(countdown, 1000);
    
    // Store timeout reference for cleanup
    pendingTimeoutRef.current = setTimeout(() => {
      clearInterval(intervalId);
    }, 5000);
  };

  const sendMessageNow = async (messageText: string) => {
    try {
      const result = await sendTextMessage(clientId, messageText);
      
      if (result.success) {
        // Плавная прокрутка к концу после отправки сообщения
        setTimeout(() => scrollToBottom(true), 300);
      } else {
        toast({
          title: "Ошибка отправки",
          description: result.error || "Не удалось отправить сообщение",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Ошибка отправки",
        description: error.message || "Не удалось отправить сообщение",
        variant: "destructive",
      });
    }
  };

  const cancelMessage = () => {
    if (pendingTimeoutRef.current) {
      clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }
    
    if (pendingMessage) {
      // Restore message to input
      setMessage(pendingMessage.text);
      onMessageChange?.(true);
    }
    
    setPendingMessage(null);
  };

  const handleScheduleMessage = async () => {
    if (!message.trim() || !scheduleDate || !scheduleTime) {
      toast({
        title: "Ошибка",
        description: "Заполните все поля для отложенного сообщения",
        variant: "destructive",
      });
      return;
    }

    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
    const now = new Date();
    
    if (scheduledDateTime <= now) {
      toast({
        title: "Ошибка",
        description: "Время отправки должно быть в будущем",
        variant: "destructive",
      });
      return;
    }

    // Here you would typically save the scheduled message to database
    // For now, we'll just show a success message
    toast({
      title: "Сообщение запланировано",
      description: `Сообщение будет отправлено ${scheduledDateTime.toLocaleString('ru-RU')}`,
    });

    setMessage("");
    setScheduleDate("");
    setScheduleTime("");
    setShowScheduleDialog(false);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSearchToggle = () => {
    setShowSearchInput(!showSearchInput);
    if (showSearchInput) {
      setSearchQuery(""); // Clear search when hiding
    }
  };

  const handleSaveComment = () => {
    setIsEditingComment(false);
    // Here you would save the comment to your backend
    console.log('Saving comment:', editableComment);
  };

  // Функции для работы с выделением сообщений
  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedMessages(new Set());
  };

  const handleMessageSelectionChange = (messageId: string, selected: boolean) => {
    const newSelected = new Set(selectedMessages);
    if (selected) {
      newSelected.add(messageId);
    } else {
      newSelected.delete(messageId);
    }
    setSelectedMessages(newSelected);
  };

  const handleForwardMessages = async (recipients: Array<{id: string, type: 'client' | 'teacher' | 'corporate', name: string}>) => {
    const messagesToForward = messages.filter(msg => selectedMessages.has(msg.id));
    
    try {
      // Отправляем каждое сообщение каждому выбранному получателю
      for (const recipient of recipients) {
        for (const msg of messagesToForward) {
          // Отправляем сообщение без префикса "Переслано:"
          switch (recipient.type) {
            case 'client':
              // Отправляем клиенту через WhatsApp с информацией об источнике
              await sendTextMessage(recipient.id, msg.message);
              // Здесь можно добавить логику сохранения информации о пересылке в БД
              break;
            case 'teacher':
              // Отправка преподавателю
              console.log(`Отправка преподавателю ${recipient.name}:`, msg.message);
              break;
            case 'corporate':
              // Отправка в корпоративный чат
              console.log(`Отправка в корпоративный чат ${recipient.name}:`, msg.message);
              break;
          }
        }
      }
      
      const clientCount = recipients.filter(r => r.type === 'client').length;
      const teacherCount = recipients.filter(r => r.type === 'teacher').length;
      const corporateCount = recipients.filter(r => r.type === 'corporate').length;
      
      let description = `${messagesToForward.length} сообщений переслано: `;
      const parts = [];
      if (clientCount > 0) parts.push(`${clientCount} клиентам`);
      if (teacherCount > 0) parts.push(`${teacherCount} преподавателям`);
      if (corporateCount > 0) parts.push(`${corporateCount} корпоративным чатам`);
      description += parts.join(', ');
      
      toast({
        title: "Сообщения переслаты",
        description,
      });
      
      // Сбрасываем режим выделения
      setIsSelectionMode(false);
      setSelectedMessages(new Set());
    } catch (error) {
      toast({
        title: "Ошибка пересылки",
        description: "Не удалось переслать сообщения",
        variant: "destructive",
      });
    }
  };

  const getSelectedMessagesForForward = () => {
    return messages
      .filter(msg => selectedMessages.has(msg.id))
      .map(msg => ({
        id: msg.id,
        message: msg.message,
        time: msg.time,
        type: msg.type
      }));
  };

  // Функция для редактирования сообщения
  const handleEditMessage = async (messageId: string, newMessage: string) => {
    try {
      // Попытка удалить старое сообщение и отправить новое через Green API
      const { data, error } = await supabase.functions.invoke('edit-whatsapp-message', {
        body: { 
          messageId, 
          newMessage, 
          clientId 
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      if (data.success) {
        let description = "Сообщение обновлено в WhatsApp"
        if (data.deleteSuccess) {
          description = "Старое сообщение удалено, новое отправлено"
        } else if (data.deleteError) {
          description = `Не удалось удалить старое сообщение (${data.deleteError}), но новое отправлено`
        }

        toast({
          title: "Сообщение отредактировано",
          description,
        });
        
        // Обновляем локальное состояние сообщений
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId
              ? { ...msg, message: newMessage, isEdited: true, editedTime: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }
              : msg
          )
        );
      } else {
        throw new Error(data.error || "Не удалось отредактировать сообщение")
      }
    } catch (error: any) {
      toast({
        title: "Ошибка редактирования", 
        description: error.message || "Не удалось отредактировать сообщение",
        variant: "destructive",
      });
    }
  };

  // Функция для удаления сообщения
  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('delete-whatsapp-message', {
        body: { 
          messageId, 
          clientId 
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      if (data.success) {
        // Обновляем локальное состояние сообщений
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId
              ? { ...msg, message: '[Сообщение удалено]', isDeleted: true }
              : msg
          )
        );
      } else {
        throw new Error(data.error || "Не удалось удалить сообщение")
      }
    } catch (error: any) {
      console.error('Error deleting message:', error);
    }
  };

  // Mock tasks data - in real app this would come from props or API
  const clientTasks = [
    {
      id: '1',
      title: 'Обсудить расписание на следующую неделю',
      student: 'Павел',
      priority: 'high' as const,
      dueDate: 'Сегодня',
    },
    {
      id: '2', 
      title: 'Отправить счет за обучение',
      priority: 'medium' as const,
      dueDate: '25.09.2025',
    }
  ];

  // Filter messages based on search query
  const filteredMessages = messages.filter(msg => 
    msg.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 bg-background flex flex-col min-w-0">
      {/* Chat Header */}
      <div className="border-b p-3 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-base">{clientName}</h2>
            <p className="text-sm text-muted-foreground">{clientPhone}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 w-8 p-0"
              title="Добавить задачу"
              onClick={() => (onOpenTaskModal ? onOpenTaskModal() : setShowAddTaskModal(true))}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 w-8 p-0"
              title="Выставить счёт"
              onClick={() => (onOpenInvoiceModal ? onOpenInvoiceModal() : setShowInvoiceModal(true))}
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 w-8 p-0"
              title="Позвонить"
              onClick={() => console.log('Calling client...')}
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
            <Button 
              size="sm" 
              variant={isSelectionMode ? "default" : "outline"}
              className="h-8 w-8 p-0"
              title="Выделить сообщения"
              onClick={handleToggleSelectionMode}
            >
              <Forward className="h-4 w-4" />
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
        
        {/* Панель действий для режима выделения */}
        {isSelectionMode && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Выбрано: {selectedMessages.size} сообщений
              </span>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  onClick={() => setShowForwardModal(true)}
                  disabled={selectedMessages.size === 0}
                  className="h-7"
                >
                  <Forward className="h-3 w-3 mr-1" />
                  Переслать
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleToggleSelectionMode}
                  className="h-7"
                >
                  <X className="h-3 w-3 mr-1" />
                  Отмена
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Client Tasks */}
      <div className="shrink-0">
        <ClientTasks 
          clientName={clientName}
          clientId={clientId}
        />
      </div>

      {/* Chat Messages with Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="whatsapp" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 rounded-none bg-orange-50/30 border-orange-200 border-t rounded-t-none">
            <TabsTrigger value="whatsapp" className="text-xs">WhatsApp</TabsTrigger>
            <TabsTrigger value="telegram" className="text-xs">Telegram</TabsTrigger>
            <TabsTrigger value="max" className="text-xs">Max</TabsTrigger>
            <TabsTrigger value="email" className="text-xs">Email</TabsTrigger>
          </TabsList>
          
          <TabsContent value="whatsapp" className="flex-1 p-3 overflow-y-auto mt-0">
            <div className="space-y-1">
              {loadingMessages ? (
                <div className="text-center text-muted-foreground text-sm py-4">
                  Загрузка сообщений...
                </div>
              ) : filteredMessages.length > 0 ? (
                filteredMessages.map((msg, index) => (
                  <ChatMessage
                    key={msg.id || index}
                    messageId={msg.id}
                    type={msg.type}
                    message={msg.message}
                    time={msg.time}
                    systemType={msg.systemType}
                    callDuration={msg.callDuration}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedMessages.has(msg.id)}
                    onSelectionChange={(selected) => handleMessageSelectionChange(msg.id, selected)}
                    isForwarded={msg.isForwarded}
                    forwardedFrom={msg.forwardedFrom}
                    forwardedFromType={msg.forwardedFromType}
                    onMessageEdit={msg.type === 'manager' ? handleEditMessage : undefined}
                    onMessageDelete={msg.type === 'manager' ? handleDeleteMessage : undefined}
                    messageStatus={msg.messageStatus}
                  />
                ))
              ) : (
                  <div className="text-center text-muted-foreground text-sm py-4">
                    {searchQuery ? 'Сообщения не найдены' : 'Нет сообщений'}
                  </div>
                )}
              </div>
              {/* Элемент для прокрутки к концу */}
              <div ref={messagesEndRef} />
            </TabsContent>
          
          <TabsContent value="telegram" className="flex-1 p-3 overflow-y-auto mt-0">
            <div className="space-y-1">
              <div className="text-center text-muted-foreground text-sm py-4">
                История переписки в Telegram
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="max" className="flex-1 p-3 overflow-y-auto mt-0">
            <div className="space-y-1">
              <div className="text-center text-muted-foreground text-sm py-4">
                История переписки Max
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="email" className="flex-1 p-3 overflow-y-auto mt-0">
            <div className="space-y-1">
              <div className="text-center text-muted-foreground text-sm py-4">
                История переписки Email
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Message Input */}
      <div className="border-t p-3 shrink-0">
        {/* Pending message with countdown */}
        {pendingMessage && (
          <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-yellow-800">
                Отправка через {pendingMessage.countdown} сек...
              </span>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={cancelMessage}
              className="text-yellow-800 border-yellow-300 hover:bg-yellow-100"
            >
              Отменить
            </Button>
          </div>
        )}
        
        <div className="space-y-2">
          {/* Character counter and warning */}
          {message.length > 0 && (
            <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
              <span className={message.length > MAX_MESSAGE_LENGTH ? "text-red-500" : ""}>
                {message.length}/{MAX_MESSAGE_LENGTH} символов
              </span>
              {message.length > MAX_MESSAGE_LENGTH && (
                <span className="text-red-500">Превышен лимит символов</span>
              )}
            </div>
          )}
          
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                placeholder="Введите сообщение..."
                value={message}
                onChange={(e) => handleMessageChange(e.target.value)}
                onKeyPress={handleKeyPress}
                className="min-h-[48px] max-h-[120px] resize-none text-base"
                disabled={loading || !!pendingMessage}
              />
              <div className="flex items-center gap-1 mt-2">
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={!!pendingMessage}>
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={!!pendingMessage}>
                  <Zap className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={!!pendingMessage}>
                  <MessageCircle className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={!!pendingMessage}>
                  <Mic className="h-4 w-4" />
                </Button>
                
                {/* Schedule message button */}
                <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0"
                      disabled={loading || !message.trim() || message.length > MAX_MESSAGE_LENGTH || !!pendingMessage}
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Запланировать сообщение</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Дата</label>
                        <Input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Время</label>
                        <Input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Сообщение</label>
                        <div className="p-3 bg-muted rounded-md text-sm">
                          {message || "Сообщение не введено"}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
                          Отмена
                        </Button>
                        <Button onClick={handleScheduleMessage}>
                          Запланировать
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            {/* Send button */}
            <Button 
              size="icon" 
              className="rounded-full h-12 w-12 mb-10" 
              onClick={handleSendMessage}
              disabled={loading || !message.trim() || message.length > MAX_MESSAGE_LENGTH || !!pendingMessage}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Модальные окна (только если не используются внешние обработчики) */}
      {!onOpenTaskModal && (
        <AddTaskModal 
          open={showAddTaskModal}
          onOpenChange={setShowAddTaskModal}
          clientName={clientName}
          clientId={clientId}
        />
      )}

      {!onOpenInvoiceModal && (
        <CreateInvoiceModal 
          open={showInvoiceModal}
          onOpenChange={setShowInvoiceModal}
          clientName={clientName}
        />
      )}
      
      {/* Модальное окно пересылки сообщений */}
      <ForwardMessageModal
        open={showForwardModal}
        onOpenChange={setShowForwardModal}
        selectedMessages={getSelectedMessagesForForward()}
        currentClientId={clientId}
        onForward={handleForwardMessages}
      />
    </div>
  );
};