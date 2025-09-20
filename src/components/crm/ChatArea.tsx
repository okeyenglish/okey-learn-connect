import { useState, useEffect, useRef } from "react";
import { Send, Paperclip, Zap, MessageCircle, Mic, Edit2, Search, Plus, FileText, Phone, Forward, X, Clock, Calendar, Trash2, Bot, ArrowLeft, Settings, MoreVertical, Pin, Archive, BellOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTypingStatus } from "@/hooks/useTypingStatus";
import { ChatMessage } from "./ChatMessage";
import { ClientTasks } from "./ClientTasks";
import { AddTaskModal } from "./AddTaskModal";
import { CreateInvoiceModal } from "./CreateInvoiceModal";
import { ForwardMessageModal } from "./ForwardMessageModal";
import { QuickResponsesModal } from "./QuickResponsesModal";
import { FileUpload } from "./FileUpload";
import { AttachedFile } from "./AttachedFile";
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
  managerName?: string; // Add manager name for comments
  onBackToList?: () => void; // Function to go back to chat list on mobile
  onChatAction?: (chatId: string, action: 'unread' | 'pin' | 'archive' | 'block') => void; // Chat actions
}

interface ScheduledMessage {
  id: string;
  text: string;
  scheduledDate: Date;
  timeoutId: NodeJS.Timeout;
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
  onOpenInvoiceModal,
  managerName = "Менеджер",
  onBackToList,
  onChatAction
}: ChatAreaProps) => {
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
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
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<Array<{
    url: string;
    name: string;
    type: string;
    size: number;
  }>>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showScheduledMessagesDialog, setShowScheduledMessagesDialog] = useState(false);
  const [editingScheduledMessage, setEditingScheduledMessage] = useState<ScheduledMessage | null>(null);
  const [showQuickResponsesModal, setShowQuickResponsesModal] = useState(false);
  const [commentMode, setCommentMode] = useState(false);
  const [gptGenerating, setGptGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_MESSAGE_LENGTH = 4000;

  const { sendTextMessage, loading } = useWhatsApp();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { updateTypingStatus, getTypingMessage, isOtherUserTyping } = useTypingStatus(clientId);

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
      // Load messages along with client data for avatars
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          clients!inner(avatar_url)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      console.log('Loaded messages from database:', data);

      const formattedMessages = (data || []).map(msg => ({
        id: msg.id,
        type: msg.message_type === 'comment' ? 'comment' : (msg.is_outgoing ? 'manager' : 'client'),
        message: msg.message_text || '',
        time: new Date(msg.created_at).toLocaleTimeString('ru-RU', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        systemType: msg.system_type,
        callDuration: msg.call_duration,
        messageStatus: msg.message_status,
        clientAvatar: msg.clients?.avatar_url || null,
        managerName: managerName // Pass manager name for comments
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
          
          // Получаем аватарку клиента для нового сообщения
          const getClientAvatar = async () => {
            const { data: client } = await supabase
              .from('clients')
              .select('avatar_url')
              .eq('id', payload.new.client_id)
              .single();
            
            return client?.avatar_url || null;
          };
          
          // Создаем новое сообщение
          const createNewMessage = async () => {
            const clientAvatar = await getClientAvatar();
            
            const newMessage = {
              id: payload.new.id,
              type: payload.new.message_type === 'comment' ? 'comment' : (payload.new.is_outgoing ? 'manager' : 'client'),
              message: payload.new.message_text || '',
              time: new Date(payload.new.created_at).toLocaleTimeString('ru-RU', { 
                hour: '2-digit', 
                minute: '2-digit' 
              }),
              systemType: payload.new.system_type,
              callDuration: payload.new.call_duration,
              messageStatus: payload.new.message_status,
              clientAvatar,
              managerName: managerName // Pass manager name for comments
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
          };
          
          createNewMessage();
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

  // Cleanup pending message interval and scheduled messages on unmount
  useEffect(() => {
    return () => {
      if (pendingTimeoutRef.current) {
        clearInterval(pendingTimeoutRef.current);
      }
      // Cancel all scheduled messages on unmount
      scheduledMessages.forEach(msg => clearTimeout(msg.timeoutId));
    };
  }, [scheduledMessages]);

  const handleMessageChange = (value: string) => {
    setMessage(value);
    onMessageChange?.(value.trim().length > 0);
    
    // Update typing status
    if (value.trim().length > 0) {
      updateTypingStatus(true);
    } else {
      updateTypingStatus(false);
    }
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || loading || message.length > MAX_MESSAGE_LENGTH) return;

    const messageText = message.trim();
    setMessage(""); // Clear input immediately
    onMessageChange?.(false);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // If in comment mode, save as comment instead of sending
    if (commentMode) {
      await saveComment(messageText);
      setCommentMode(false); // Exit comment mode after saving
      return;
    }

    // Start 5-second countdown for regular messages
    setPendingMessage({ text: messageText, countdown: 5 });
    
    const countdown = () => {
      setPendingMessage(prev => {
        if (!prev) return null;
        
        if (prev.countdown <= 1) {
          // Time's up - send the message
          sendMessageNow(messageText);
          // Clear the interval when countdown finishes
          if (pendingTimeoutRef.current) {
            clearInterval(pendingTimeoutRef.current);
            pendingTimeoutRef.current = null;
          }
          return null;
        }
        
        return { ...prev, countdown: prev.countdown - 1 };
      });
    };

    // Update countdown every second and store interval ID for cleanup
    const intervalId = setInterval(countdown, 1000);
    pendingTimeoutRef.current = intervalId;
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

  const saveComment = async (commentText: string) => {
    try {
      // Save comment to client's notes field
      const { error: clientError } = await supabase
        .from('clients')
        .update({
          notes: commentText,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId);

      if (clientError) throw clientError;

      // Also add comment as a chat message
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          client_id: clientId,
          message_text: commentText,
          message_type: 'comment',
          is_outgoing: true,
          messenger_type: 'system'
        });

      if (messageError) {
        console.error('Error saving comment message:', messageError);
      }

      // Don't show success toast - just log success
      console.log('Comment saved successfully');
    } catch (error: any) {
      toast({
        title: "Ошибка сохранения",
        description: error.message || "Не удалось сохранить комментарий",
        variant: "destructive",
      });
    }
  };

  const generateGPTResponse = async () => {
    if (gptGenerating) return;

    // Don't generate if there's no message
    if (!message.trim()) {
      toast({
        title: "Введите сообщение",
        description: "Для генерации ответа необходимо ввести текст сообщения",
        variant: "destructive",
      });
      return;
    }

    setGptGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-gpt-response', {
        body: { 
          clientId: clientId,
          currentMessage: message.trim()
        }
      });

      if (error) throw error;

      if (data?.generatedText) {
        setMessage(data.generatedText);
        onMessageChange?.(true);
        
        // Auto-resize textarea
        if (textareaRef.current) {
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.style.height = 'auto';
              textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
            }
          }, 0);
        }

        toast({
          title: "Ответ сгенерирован",
          description: "GPT сгенерировал подходящий ответ на основе контекста диалога",
        });
      }
    } catch (error: any) {
      toast({
        title: "Ошибка генерации",
        description: error.message || "Не удалось сгенерировать ответ",
        variant: "destructive",
      });
    } finally {
      setGptGenerating(false);
    }
  };

  const cancelMessage = () => {
    if (pendingTimeoutRef.current) {
      clearInterval(pendingTimeoutRef.current);
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

    const messageId = Date.now().toString();
    const messageText = message.trim();
    
    // Calculate delay in milliseconds
    const delay = scheduledDateTime.getTime() - now.getTime();
    
    // Set timeout for sending the message
    const timeoutId = setTimeout(async () => {
      try {
        await sendTextMessage(clientId, messageText);
        setScheduledMessages(prev => prev.filter(msg => msg.id !== messageId));
        toast({
          title: "Сообщение отправлено",
          description: "Запланированное сообщение было отправлено",
        });
      } catch (error) {
        toast({
          title: "Ошибка отправки",
          description: "Не удалось отправить запланированное сообщение",
          variant: "destructive",
        });
        setScheduledMessages(prev => prev.filter(msg => msg.id !== messageId));
      }
    }, delay);

    // Add to scheduled messages
    const scheduledMessage: ScheduledMessage = {
      id: messageId,
      text: messageText,
      scheduledDate: scheduledDateTime,
      timeoutId
    };

    setScheduledMessages(prev => [...prev, scheduledMessage]);

    toast({
      title: "Сообщение запланировано",
      description: `Сообщение будет отправлено ${format(scheduledDateTime, "d MMMM yyyy 'в' HH:mm", { locale: ru })}`,
    });

    setMessage("");
    setScheduleDate("");
    setScheduleTime("");
    setShowScheduleDialog(false);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const cancelScheduledMessage = (messageId: string) => {
    setScheduledMessages(prev => {
      const message = prev.find(msg => msg.id === messageId);
      if (message) {
        clearTimeout(message.timeoutId);
        toast({
          title: "Сообщение отменено",
          description: "Запланированное сообщение было отменено",
        });
      }
      return prev.filter(msg => msg.id !== messageId);
    });
  };

  const editScheduledMessage = (scheduledMessage: ScheduledMessage) => {
    setEditingScheduledMessage(scheduledMessage);
    setMessage(scheduledMessage.text);
    setScheduleDate(format(scheduledMessage.scheduledDate, "yyyy-MM-dd"));
    setScheduleTime(format(scheduledMessage.scheduledDate, "HH:mm"));
    setShowScheduledMessagesDialog(false);
    setShowScheduleDialog(true);
  };

  const updateScheduledMessage = () => {
    if (!editingScheduledMessage || !message.trim() || !scheduleDate || !scheduleTime) {
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

    // Cancel old timeout
    clearTimeout(editingScheduledMessage.timeoutId);
    
    const messageText = message.trim();
    const delay = scheduledDateTime.getTime() - now.getTime();
    
    // Set new timeout
    const timeoutId = setTimeout(async () => {
      try {
        await sendTextMessage(clientId, messageText);
        setScheduledMessages(prev => prev.filter(msg => msg.id !== editingScheduledMessage.id));
        toast({
          title: "Сообщение отправлено",
          description: "Запланированное сообщение было отправлено",
        });
      } catch (error) {
        toast({
          title: "Ошибка отправки",
          description: "Не удалось отправить запланированное сообщение",
          variant: "destructive",
        });
        setScheduledMessages(prev => prev.filter(msg => msg.id !== editingScheduledMessage.id));
      }
    }, delay);

    // Update scheduled message
    setScheduledMessages(prev => prev.map(msg => 
      msg.id === editingScheduledMessage.id 
        ? { ...msg, text: messageText, scheduledDate: scheduledDateTime, timeoutId }
        : msg
    ));

    toast({
      title: "Сообщение обновлено",
      description: `Сообщение будет отправлено ${format(scheduledDateTime, "d MMMM yyyy 'в' HH:mm", { locale: ru })}`,
    });

    setMessage("");
    setScheduleDate("");
    setScheduleTime("");
    setEditingScheduledMessage(null);
    setShowScheduleDialog(false);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleQuickResponseSelect = (responseText: string) => {
    setMessage(responseText);
    onMessageChange?.(true);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
      }, 0);
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
    <div 
      className="flex-1 bg-background flex flex-col min-w-0 min-h-0"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        
        const files = Array.from(e.dataTransfer.files);
        files.forEach(file => {
          // Handle dropped files through FileUpload component
          console.log('File dropped:', file);
        });
      }}
    >
      {/* Chat Header */}
      <div className={`border-b p-3 shrink-0 ${isMobile ? 'bg-background' : ''}`}>
        {/* Mobile: User info section - displayed prominently */}
        {isMobile && (
          <div className="mb-4 p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-3">
              {onBackToList && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-10 w-10 p-0 rounded-full"
                  onClick={onBackToList}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg text-foreground truncate">{clientName}</h2>
                <p className="text-base text-muted-foreground font-medium">{clientPhone}</p>
                {getTypingMessage() && (
                  <p className="text-sm text-orange-600 italic animate-pulse mt-1">
                    {getTypingMessage()}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Desktop: Inline user info with actions */}
        <div className={`flex items-start justify-between gap-4 ${isMobile ? 'mt-0' : ''}`}>
          {!isMobile && (
            <div className="flex items-center gap-3">
              <div>
                <h2 className="font-semibold text-base">{clientName}</h2>
                <p className="text-sm text-muted-foreground">{clientPhone}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
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
            
            {/* Mobile Settings Menu */}
            {isMobile && onChatAction && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 w-8 p-0"
                    title="Настройки чата"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-background border shadow-lg z-50">
                  <DropdownMenuItem onClick={() => onChatAction(clientId, 'unread')}>
                    <BellOff className="mr-2 h-4 w-4" />
                    <span>Отметить непрочитанным</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onChatAction(clientId, 'pin')}>
                    <Pin className="mr-2 h-4 w-4 text-purple-600" />
                    <span>Закрепить диалог</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onChatAction(clientId, 'block')}>
                    <Lock className="mr-2 h-4 w-4" />
                    <span>Заблокировать клиента</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onChatAction(clientId, 'archive')}>
                    <Archive className="mr-2 h-4 w-4 text-orange-600" />
                    <span>Архивировать</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
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

      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center z-50">
          <div className="text-center">
            <Paperclip className="h-12 w-12 text-primary mx-auto mb-2" />
            <p className="text-lg font-medium text-primary">Отпустите файлы для загрузки</p>
          </div>
        </div>
      )}
        
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
      <div className="flex-1 overflow-hidden min-h-0">
        <Tabs defaultValue="whatsapp" className="h-full flex flex-col min-h-0">
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
                    clientAvatar={msg.clientAvatar}
                    managerName={msg.managerName}
                    fileUrl={msg.fileUrl}
                    fileName={msg.fileName}
                    fileType={msg.fileType}
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

            {/* Attached files preview */}
            {attachedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Прикрепленные файлы:</p>
                <div className="flex flex-wrap gap-2">
                  {attachedFiles.map((file, index) => (
                    <AttachedFile
                      key={index}
                      url={file.url}
                      name={file.name}
                      type={file.type}
                      size={file.size}
                      className="max-w-xs"
                    />
                  ))}
                </div>
              </div>
            )}
          
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                placeholder={
                  isOtherUserTyping 
                    ? getTypingMessage() || "Менеджер печатает..." 
                    : commentMode 
                      ? "Введите комментарий..." 
                      : "Введите сообщение..."
                }
                value={message}
                onChange={(e) => handleMessageChange(e.target.value)}
                onKeyPress={handleKeyPress}
                className={`min-h-[48px] max-h-[120px] resize-none text-base ${
                  commentMode ? "bg-yellow-50 border-yellow-300" : ""
                } ${isOtherUserTyping ? "bg-orange-50 border-orange-200" : ""}`}
                disabled={loading || !!pendingMessage || isOtherUserTyping}
              />
              <div className="flex items-center gap-1 mt-2">
                <FileUpload
                  onFileUpload={(fileInfo) => {
                    setAttachedFiles(prev => [...prev, fileInfo]);
                  }}
                  disabled={!!pendingMessage}
                  maxFiles={5}
                  maxSize={10}
                />
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={!!pendingMessage} onClick={() => setShowQuickResponsesModal(true)}>
                  <Zap className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className={`h-8 w-8 p-0 ${commentMode ? "bg-yellow-100 text-yellow-700" : ""}`}
                  disabled={!!pendingMessage}
                  onClick={() => setCommentMode(!commentMode)}
                  title="Режим комментариев"
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className={`h-8 w-8 p-0 ${gptGenerating ? "bg-blue-100 text-blue-700" : ""}`}
                  disabled={!!pendingMessage || gptGenerating}
                  onClick={generateGPTResponse}
                  title="Генерировать ответ с помощью GPT"
                >
                  <Bot className={`h-4 w-4 ${gptGenerating ? "animate-pulse" : ""}`} />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={!!pendingMessage}>
                  <Mic className="h-4 w-4" />
                </Button>
                
                {/* Schedule message button */}
                <Dialog open={showScheduleDialog} onOpenChange={(open) => {
                  setShowScheduleDialog(open);
                  if (!open) {
                    setEditingScheduledMessage(null);
                    if (!message.trim()) {
                      setScheduleDate("");
                      setScheduleTime("");
                    }
                  }
                }}>
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
                      <DialogTitle>
                        {editingScheduledMessage ? "Редактировать запланированное сообщение" : "Запланировать сообщение"}
                      </DialogTitle>
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
                        <Button onClick={editingScheduledMessage ? updateScheduledMessage : handleScheduleMessage}>
                          {editingScheduledMessage ? "Обновить" : "Запланировать"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Scheduled messages button */}
                {scheduledMessages.length > 0 && (
                  <Dialog open={showScheduledMessagesDialog} onOpenChange={setShowScheduledMessagesDialog}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0 relative"
                      >
                        <Calendar className="h-4 w-4" />
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center"
                        >
                          {scheduledMessages.length}
                        </Badge>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Запланированные сообщения ({scheduledMessages.length})</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {scheduledMessages.map((scheduledMsg) => (
                          <div key={scheduledMsg.id} className="border rounded-lg p-3 space-y-2">
                            <div className="text-sm font-medium">
                              {format(scheduledMsg.scheduledDate, "d MMMM yyyy 'в' HH:mm", { locale: ru })}
                            </div>
                            <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                              {scheduledMsg.text}
                            </div>
                            <div className="flex justify-end gap-1">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => editScheduledMessage(scheduledMsg)}
                              >
                                <Edit2 className="h-3 w-3 mr-1" />
                                Изменить
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => cancelScheduledMessage(scheduledMsg.id)}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Отменить
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
            
            {/* Send button */}
            <Button 
              size="icon" 
              className={`rounded-full h-12 w-12 mb-10 ${
                commentMode ? "bg-yellow-500 hover:bg-yellow-600" : ""
              }`}
              onClick={handleSendMessage}
              disabled={loading || (!message.trim() && attachedFiles.length === 0) || message.length > MAX_MESSAGE_LENGTH || !!pendingMessage}
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

      <QuickResponsesModal
        open={showQuickResponsesModal}
        onOpenChange={setShowQuickResponsesModal}
        onSelectResponse={handleQuickResponseSelect}
      />
    </div>
  );
};