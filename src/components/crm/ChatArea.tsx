import { useState, useEffect, useRef } from "react";
import { Send, Paperclip, Zap, MessageCircle, Mic, Edit2, Search, Plus, FileText, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ChatMessage } from "./ChatMessage";
import { ClientTasks } from "./ClientTasks";
import { AddTaskModal } from "./AddTaskModal";
import { CreateInvoiceModal } from "./CreateInvoiceModal";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        type: msg.is_outgoing ? 'manager' : 'client',
        message: msg.message_text || '',
        time: new Date(msg.created_at).toLocaleTimeString('ru-RU', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        systemType: msg.system_type,
        callDuration: msg.call_duration
      }));

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
            type: payload.new.is_outgoing ? 'manager' : 'client',
            message: payload.new.message_text || '',
            time: new Date(payload.new.created_at).toLocaleTimeString('ru-RU', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            systemType: payload.new.system_type,
            callDuration: payload.new.call_duration
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

  const handleMessageChange = (value: string) => {
    setMessage(value);
    onMessageChange?.(value.trim().length > 0);
  };

  const handleSendMessage = async () => {
    if (!message.trim() || loading) return;

    try {
      const result = await sendTextMessage(clientId, message.trim());
      
      if (result.success) {
        setMessage(""); // Clear input after successful send
        onMessageChange?.(false);
        toast({
          title: "Сообщение отправлено",
          description: "Сообщение успешно отправлено в WhatsApp",
        });
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
              onClick={() => setShowAddTaskModal(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 w-8 p-0"
              title="Выставить счёт"
              onClick={() => setShowInvoiceModal(true)}
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
                    key={index}
                    type={msg.type}
                    message={msg.message}
                    time={msg.time}
                    systemType={msg.systemType}
                    callDuration={msg.callDuration}
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
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Textarea
              placeholder="Введите сообщение..."
              value={message}
              onChange={(e) => handleMessageChange(e.target.value)}
              onKeyPress={handleKeyPress}
              className="min-h-[40px] max-h-[120px] resize-none"
              rows={1}
              disabled={loading}
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
            disabled={loading || !message.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
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
    </div>
  );
};