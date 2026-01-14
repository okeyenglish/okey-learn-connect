import { useState, useEffect, useRef } from "react";
import { Send, Paperclip, Zap, MessageCircle, Mic, Edit2, Search, Plus, FileText, Forward, X, Clock, Calendar, Trash2, Bot, ArrowLeft, Settings, MoreVertical, Pin, Archive, BellOff, Lock, Phone, PanelLeft, PanelRight } from "lucide-react";
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
import { useRealtimeMessages } from "@/hooks/useChatMessages";
import { ChatMessage } from "./ChatMessage";
import { ClientTasks } from "./ClientTasks";
import { AddTaskModal } from "./AddTaskModal";
import { CreateInvoiceModal } from "./CreateInvoiceModal";
import { ForwardMessageModal } from "./ForwardMessageModal";
import { QuickResponsesModal } from "./QuickResponsesModal";
import { FileUpload } from "./FileUpload";
import { AttachedFile } from "./AttachedFile";
import { InlinePendingGPTResponse } from "./InlinePendingGPTResponse";
import { CallHistory } from "./CallHistory";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { useMaxGreenApi } from "@/hooks/useMaxGreenApi";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePendingGPTResponses } from "@/hooks/usePendingGPTResponses";
import { useMarkChatMessagesAsRead } from "@/hooks/useMessageReadStatus";
import { useQueryClient } from "@tanstack/react-query";

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
  rightPanelCollapsed?: boolean; // State of right panel
  onToggleRightPanel?: () => void; // Toggle right panel
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
  onChatAction,
  rightPanelCollapsed = false,
  onToggleRightPanel
}: ChatAreaProps) => {
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [messageLimit, setMessageLimit] = useState(100); // Начинаем с 100 последних сообщений
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
  const [activeMessengerTab, setActiveMessengerTab] = useState("whatsapp");
  const [isEditingName, setIsEditingName] = useState(false);
  
  // Функция для очистки имени от префикса "Клиент" (определяем до использования)
  const cleanClientName = (name: string) => {
    if (name.startsWith('Клиент ')) {
      return name.replace('Клиент ', '');
    }
    return name;
  };
  
  const [editedName, setEditedName] = useState(cleanClientName(clientName));
  const [displayName, setDisplayName] = useState(cleanClientName(clientName));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editNameInputRef = useRef<HTMLInputElement>(null);
  // Composer width detection
  const composerRef = useRef<HTMLDivElement>(null);
  const [isCompactComposer, setIsCompactComposer] = useState(false);

  const MAX_MESSAGE_LENGTH = 4000;

  const { sendTextMessage, sendFileMessage, loading, deleteMessage, editMessage } = useWhatsApp();
  const { sendMessage: sendMaxMessage, loading: maxLoading } = useMaxGreenApi();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { updateTypingStatus, getTypingMessage, isOtherUserTyping } = useTypingStatus(clientId);
  const markChatMessagesAsReadMutation = useMarkChatMessagesAsRead();
  const queryClient = useQueryClient();
  
  // Get pending GPT responses for this client
  const { data: pendingGPTResponses, isLoading: pendingGPTLoading, error: pendingGPTError } = usePendingGPTResponses(clientId);
  
  // Set up real-time message updates
  useRealtimeMessages(clientId);
  
  // Log pending responses for debugging
  useEffect(() => {
    console.log('ChatArea - clientId:', clientId);
    console.log('ChatArea - pendingGPTResponses:', pendingGPTResponses);
    console.log('ChatArea - pendingGPTLoading:', pendingGPTLoading);
    console.log('ChatArea - pendingGPTError:', pendingGPTError);
  }, [clientId, pendingGPTResponses, pendingGPTLoading, pendingGPTError]);
  // Наблюдение за шириной composer для адаптивной кнопки
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        setIsCompactComposer(w < 560);
      }
    });
    ro.observe(el);
    // Инициализация
    setIsCompactComposer(el.clientWidth < 560);
    return () => ro.disconnect();
  }, []);
  
  // Функция для прокрутки к концу чата
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? "smooth" : "instant" 
    });
  };

  // Update editedName and displayName when clientName changes
  useEffect(() => {
    const cleaned = cleanClientName(clientName);
    setEditedName(cleaned);
    setDisplayName(cleaned);
    setIsEditingName(false);
  }, [clientName]);

  // Функция для начала редактирования имени
  const handleStartEditName = () => {
    setEditedName(cleanClientName(clientName));
    setIsEditingName(true);
    setTimeout(() => {
      editNameInputRef.current?.focus();
      editNameInputRef.current?.select();
    }, 0);
  };

  // Функция для сохранения отредактированного имени
  const handleSaveName = async () => {
    if (!editedName.trim()) {
      toast({
        title: "Ошибка",
        description: "Имя не может быть пустым",
        variant: "destructive"
      });
      return;
    }

    const trimmedName = editedName.trim();

    try {
      // Оптимистичное обновление UI
      setDisplayName(trimmedName);
      setIsEditingName(false);

      // Обновляем кэш React Query немедленно
      queryClient.setQueryData(['clients'], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((client: any) => 
          client.id === clientId ? { ...client, name: trimmedName } : client
        );
      });

      queryClient.setQueryData(['client', clientId], (oldData: any) => {
        if (!oldData) return oldData;
        return { ...oldData, name: trimmedName };
      });

      // Обновляем базу данных
      const { error } = await supabase
        .from('clients')
        .update({ name: trimmedName })
        .eq('id', clientId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Имя клиента обновлено",
      });

      // Инвалидируем queries для синхронизации с другими компонентами
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    } catch (error) {
      console.error('Error updating client name:', error);
      
      // Откатываем оптимистичное обновление при ошибке
      setDisplayName(cleanClientName(clientName));
      
      toast({
        title: "Ошибка",
        description: "Не удалось обновить имя клиента",
        variant: "destructive"
      });
    }
  };

  // Функция для отмены редактирования
  const handleCancelEditName = () => {
    setEditedName(cleanClientName(clientName));
    setIsEditingName(false);
  };

  // Format message helper - мемоизированная функция
  const formatMessage = (msg: any) => ({
    id: msg.id,
    type: msg.message_type || (msg.is_outgoing ? 'manager' : 'client'),
    message: msg.message_text || '',
    time: new Date(msg.created_at).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    systemType: msg.system_type,
    callDuration: msg.call_duration,
    messageStatus: msg.message_status,
    clientAvatar: (msg.clients && msg.clients.avatar_url) ? msg.clients.avatar_url : null,
    managerName: managerName,
    fileUrl: msg.file_url,
    fileName: msg.file_name,
    fileType: msg.file_type,
    whatsappChatId: msg.whatsapp_chat_id,
    externalMessageId: msg.external_message_id,
    messengerType: msg.messenger_type || 'whatsapp'
  });

  // Load messages from database with pagination
  const loadMessages = async (limit = messageLimit, append = false) => {
    if (!clientId || clientId === '1') {
      console.log('Invalid clientId:', clientId);
      setLoadingMessages(false);
      return;
    }
    
    if (append) {
      setLoadingOlderMessages(true);
    } else {
      setLoadingMessages(true);
    }
    console.log('Loading messages for client:', clientId, 'limit:', limit, 'append:', append);
    
    try {
      // Get total count first
      const { count: totalCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId);
      
      // Load messages with limit (most recent ones)
      const primary = await supabase
        .from('chat_messages')
        .select(`
          *,
          clients(avatar_url, whatsapp_chat_id)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(limit);

      let data: any[] = primary.data as any[] || [];

      // If join or RLS on clients blocked results, fall back to plain select without join
      if (primary.error || data.length === 0) {
        if (primary.error) console.warn('Primary messages query error, falling back without join:', primary.error);
        const fallback = await supabase
          .from('chat_messages')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(limit);
        data = (fallback.data as any[]) || [];
        if (fallback.error) console.error('Fallback messages query error:', fallback.error);
      }

      console.log('Loaded messages from database (count/total):', data?.length || 0, '/', totalCount);
      
      // Check if there are more messages to load
      setHasMoreMessages((totalCount || 0) > limit);

      // Reverse to show oldest first
      const formattedMessages = (data || []).reverse().map(formatMessage);

      console.log('Formatted messages (count):', formattedMessages.length);
      
      if (append) {
        setMessages(prev => [...formattedMessages, ...prev]);
      } else {
        setMessages(formattedMessages);
        
        // Мгновенная прокрутка к концу при первой загрузке
        if (formattedMessages.length > 0) {
          setTimeout(() => scrollToBottom(false), 50);
          setIsInitialLoad(false);
          
          // Отмечаем все сообщения в чате как прочитанные
          markChatMessagesAsReadMutation.mutate(clientId);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      if (append) {
        setLoadingOlderMessages(false);
      } else {
        setLoadingMessages(false);
      }
    }
  };

  // Load older messages handler
  const loadOlderMessages = () => {
    const newLimit = messageLimit + 100;
    setMessageLimit(newLimit);
    loadMessages(newLimit, false);
  };

  // Load messages on component mount and when clientId changes
  useEffect(() => {
    setIsInitialLoad(true);
    setMessageLimit(100); // Reset limit
    loadMessages(100, false);
  }, [clientId]);

  // Set up real-time message updates when client changes
  useEffect(() => {
    if (!clientId || clientId === '1') return;
    
    // Set up real-time subscription for new messages
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
          const newMsg = payload.new as any;
          
          // Avoid duplicate by checking if message already exists
          setMessages(prev => {
            const exists = prev.some(m => m.id === newMsg.id);
            if (exists) {
              console.log('Message already exists, skipping:', newMsg.id);
              return prev;
            }
            
            const formatted = formatMessage(newMsg);
            console.log('Adding new message to chat:', formatted.id);
            return [...prev, formatted];
          });
          
          // Scroll to bottom with smooth animation for new messages
          setTimeout(() => scrollToBottom(true), 100);
          
          // Mark as read if from client
          if (newMsg.message_type === 'client' || !newMsg.is_outgoing) {
            markChatMessagesAsReadMutation.mutate(clientId);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `client_id=eq.${clientId}`
        },
        (payload) => {
          console.log('Message updated via real-time:', payload);
          const updatedMsg = payload.new as any;
          
          setMessages(prev => 
            prev.map(m => m.id === updatedMsg.id ? formatMessage(updatedMsg) : m)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `client_id=eq.${clientId}`
        },
        (payload) => {
          console.log('Message deleted via real-time:', payload);
          const deletedMsg = payload.old as any;
          
          setMessages(prev => prev.filter(m => m.id !== deletedMsg.id));
        }
      )
      .subscribe();

    return () => {
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
    if ((!message.trim() && attachedFiles.length === 0) || loading || message.length > MAX_MESSAGE_LENGTH) return;

    const messageText = message.trim();
    const filesToSend = [...attachedFiles];
    
    setMessage(""); // Clear input immediately
    setAttachedFiles([]); // Clear attached files immediately
    onMessageChange?.(false);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Immediately dismiss any pending GPT responses when manager starts sending a message
    if (pendingGPTResponses && pendingGPTResponses.length > 0) {
      console.log('Found pending GPT responses to clear:', pendingGPTResponses.length);
      
      // First optimistically remove from UI
      queryClient.setQueryData(['pending-gpt-responses', clientId], []);
      
      // Then delete from database
      try {
        const { data: deletedData, error: deleteError } = await supabase
          .from('pending_gpt_responses')
          .delete()
          .eq('client_id', clientId)
          .select(); // Select to see what was deleted
        
        console.log('Deleted pending GPT responses:', deletedData?.length || 0, 'Error:', deleteError);
        
        if (deleteError) {
          console.error('Database delete error:', deleteError);
        }
        
        // Force refresh the pending responses query
        queryClient.invalidateQueries({ queryKey: ['pending-gpt-responses', clientId] });
      } catch (error) {
        console.error('Failed to clear pending GPT responses:', error);
        // Even if delete fails, keep UI cleared
      }
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
          sendMessageNow(messageText, filesToSend);
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

  const sendMessageNow = async (messageText: string, filesToSend: Array<{url: string, name: string, type: string, size: number}> = []) => {
    try {
      // Check which messenger tab is active and send via appropriate service
      if (activeMessengerTab === 'max') {
        // Send via MAX
        if (filesToSend.length > 0) {
          for (const file of filesToSend) {
            const result = await sendMaxMessage(clientId, messageText || '', file.url, file.name, file.type);
            if (!result) {
              toast({
                title: "Ошибка отправки файла в MAX",
                description: `Не удалось отправить файл "${file.name}"`,
                variant: "destructive",
              });
              return;
            }
          }
        } else if (messageText) {
          const result = await sendMaxMessage(clientId, messageText);
          if (!result) {
            toast({
              title: "Ошибка отправки в MAX",
              description: "Не удалось отправить сообщение",
              variant: "destructive",
            });
            return;
          }
        }
      } else {
        // Send via WhatsApp (default)
        if (filesToSend.length > 0) {
          for (const file of filesToSend) {
            const result = await sendFileMessage(clientId, file.url, file.name, messageText);
            if (!result.success) {
              toast({
                title: "Ошибка отправки файла",
                description: `Не удалось отправить файл "${file.name}": ${result.error}`,
                variant: "destructive",
              });
              return;
            }
          }
          
          // If we have files and text, send text separately only if it's not just a caption
          if (messageText && messageText !== '[Файл]') {
            const textResult = await sendTextMessage(clientId, messageText);
            if (!textResult.success) {
              toast({
                title: "Ошибка отправки текста",
                description: textResult.error || "Не удалось отправить текстовое сообщение",
                variant: "destructive",
              });
              return;
            }
          }
        } else if (messageText) {
          // Send text message only
          const result = await sendTextMessage(clientId, messageText);
          if (!result.success) {
            toast({
              title: "Ошибка отправки",
              description: result.error || "Не удалось отправить сообщение",
              variant: "destructive",
            });
            return;
          }
        }
      }

      // Remove any pending GPT suggestions for this client after a successful send
      try {
        await supabase
          .from('pending_gpt_responses')
          .delete()
          .eq('client_id', clientId)
          .eq('status', 'pending');
        console.log('Cleared pending GPT responses after manual send');
      } catch (e) {
        console.warn('Failed to clear pending GPT responses:', e);
      }
      
      // Smooth scroll to bottom after sending message
      setTimeout(() => scrollToBottom(true), 300);
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
        .insert([{
          client_id: clientId,
          message_text: commentText,
          message_type: 'comment',
          is_outgoing: true,
          messenger_type: 'system'
        }]);

      if (messageError) {
        console.error('Error saving comment message:', messageError);
      }

      // Don't show success toast - just log success
      console.log('Comment saved successfully');

      // Remove any pending GPT suggestions for this client after saving a comment
      try {
        await supabase
          .from('pending_gpt_responses')
          .delete()
          .eq('client_id', clientId)
          .eq('status', 'pending');
        console.log('Cleared pending GPT responses after comment');
      } catch (e) {
        console.warn('Failed to clear pending GPT responses after comment:', e);
      }
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

  const handlePhoneCall = async () => {
    if (!clientPhone?.trim()) {
      toast({
        title: "Ошибка",
        description: "Номер телефона клиента не указан",
        variant: "destructive"
      });
      return;
    }

    try {
      // Показываем уведомление о начале звонка
      toast({
        title: "Звонок...",
        description: `Звоним на номер ${clientPhone}`,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }

      const { data, error } = await supabase.functions.invoke('onlinepbx-call', {
        body: { 
          to_number: clientPhone,
          from_user: user.id
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Звонок совершён",
          description: "Звонок инициирован через OnlinePBX. Поднимите трубку.",
        });
        
        // Refresh call history to show the new call
        queryClient.invalidateQueries({ queryKey: ['call-logs', clientId] });
      } else {
        throw new Error(data?.error || 'Не удалось совершить звонок');
      }
    } catch (error: any) {
      console.error('OnlinePBX call failed:', error);
      toast({
        title: "Ошибка звонка",
        description: error.message || "Не удалось совершить звонок",
        variant: "destructive"
      });
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

  // Функция для пересылки одного сообщения через контекстное меню
  const handleForwardSingleMessage = (messageId: string) => {
    setSelectedMessages(new Set([messageId]));
    setShowForwardModal(true);
  };

  // Функция для включения режима множественного выбора через контекстное меню
  const handleEnterSelectionMode = () => {
    setIsSelectionMode(true);
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
    const result = await editMessage(messageId, newMessage, clientId);
    
    if (result.success) {
      toast({
        title: "Сообщение отредактировано",
        description: "Сообщение обновлено в WhatsApp",
      });
      
      // Обновляем локальное состояние сообщений
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId
            ? { ...msg, message: newMessage, isEdited: true, editedTime: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }
            : msg
        )
      );
    }
  };

  // Функция для удаления сообщения
  const handleDeleteMessage = async (messageId: string) => {
    const result = await deleteMessage(messageId, clientId);
    
    if (result.success) {
      // Обновляем локальное состояние сообщений
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId
            ? { ...msg, message: '[Сообщение удалено]', isDeleted: true }
            : msg
        )
      );
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
  const filteredMessages = messages.filter(msg => {
    const matchesSearch = msg.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Filter messages by messenger type
  const whatsappMessages = filteredMessages.filter(msg => 
    !msg.messengerType || msg.messengerType === 'whatsapp'
  );

  const maxMessages = filteredMessages.filter(msg => 
    msg.messengerType === 'max'
  );

  return (
    <div 
      className="flex-1 bg-background flex flex-col min-w-0 min-h-0 relative"
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
      <div className={`border-b shrink-0 relative ${isMobile ? 'bg-background sticky top-0 z-20' : 'p-3'}`}>
        {/* Mobile: Compact header with contact info and actions on the same line */}
        {isMobile && (
          <div className="flex items-center justify-between p-2 bg-background">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {onBackToList && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0 flex-shrink-0"
                  onClick={onBackToList}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="flex-1 min-w-0">
                {isEditingName ? (
                  <div className="flex items-center gap-1">
                    <Input
                      ref={editNameInputRef}
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveName();
                        } else if (e.key === 'Escape') {
                          handleCancelEditName();
                        }
                      }}
                      className="h-7 text-sm font-semibold"
                    />
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 w-7 p-0 flex-shrink-0"
                      onClick={handleSaveName}
                    >
                      <Clock className="h-3 w-3 text-green-600" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 w-7 p-0 flex-shrink-0"
                      onClick={handleCancelEditName}
                    >
                      <X className="h-3 w-3 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <div 
                    className="flex items-center gap-2 group cursor-pointer" 
                    onClick={handleStartEditName}
                  >
                    <h2 className="font-semibold text-sm text-foreground truncate">{displayName}</h2>
                    <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                )}
                <p className="text-xs text-muted-foreground truncate">{clientPhone}</p>
                {getTypingMessage() && (
                  <p className="text-xs text-orange-600 italic animate-pulse">
                    {getTypingMessage()}
                  </p>
                )}
              </div>
            </div>
            
            {/* Action buttons moved to the right */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button 
                size="sm" 
                variant="outline" 
                className="crm-btn h-8 w-8 p-0 border-muted-foreground/40 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                title="Добавить задачу"
                onClick={() => (onOpenTaskModal ? onOpenTaskModal() : setShowAddTaskModal(true))}
              >
                <Plus className="h-4 w-4 stroke-1" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="crm-btn h-8 w-8 p-0 border-muted-foreground/40 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                title="Выставить счёт"
                onClick={() => (onOpenInvoiceModal ? onOpenInvoiceModal() : setShowInvoiceModal(true))}
              >
                <FileText className="h-4 w-4 stroke-1" />
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="crm-btn h-8 w-8 p-0 border-muted-foreground/40 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                title="Поиск в чате"
                onClick={handleSearchToggle}
              >
                <Search className="h-4 w-4 stroke-1" />
              </Button>
              <Button
                size="sm" 
                variant="outline"
                className="crm-btn h-8 w-8 p-0 border-muted-foreground/40 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                title="Позвонить"
                onClick={handlePhoneCall}
              >
                <Phone className="h-4 w-4 stroke-1" />
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="h-8 w-8 p-0 border-muted-foreground/40 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                title="Выделить сообщения"
                onClick={handleToggleSelectionMode}
              >
                <Forward className="h-4 w-4 stroke-1" />
              </Button>
              
              {/* Settings dropdown with all the removed options */}
              {onChatAction && (
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
            </div>
          </div>
        )}
        
        {/* Desktop: Inline user info with actions */}
        {!isMobile && (
          <div className="flex items-start justify-between gap-4 p-3">
            <div className="flex items-center gap-3">
              <div>
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      ref={editNameInputRef}
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveName();
                        } else if (e.key === 'Escape') {
                          handleCancelEditName();
                        }
                      }}
                      className="h-8 text-base font-semibold"
                    />
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0"
                      onClick={handleSaveName}
                    >
                      <Clock className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0"
                      onClick={handleCancelEditName}
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <div 
                    className="flex items-center gap-2 group cursor-pointer" 
                    onClick={handleStartEditName}
                  >
                    <h2 className="font-semibold text-base">{displayName}</h2>
                    <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
                <p className="text-sm text-muted-foreground">{clientPhone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Добавить задачу"
                onClick={() => (onOpenTaskModal ? onOpenTaskModal() : setShowAddTaskModal(true))}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Выставить счёт"
                onClick={() => (onOpenInvoiceModal ? onOpenInvoiceModal() : setShowInvoiceModal(true))}
              >
                <FileText className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Поиск в чате"
                onClick={handleSearchToggle}
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Позвонить"
                onClick={handlePhoneCall}
              >
                <Phone className="h-4 w-4" />
              </Button>
              
              {/* Toggle right panel button */}
              {onToggleRightPanel && (
                <Button 
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title={rightPanelCollapsed ? "Показать семейную группу" : "Скрыть семейную группу"}
                  onClick={onToggleRightPanel}
                >
                  {rightPanelCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
                </Button>
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
        )}
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
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 mt-2 mx-3">
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

      {/* Client Tasks */}
      <div className="shrink-0">
        <ClientTasks 
          clientName={clientName}
          clientId={clientId}
        />
      </div>

      {/* Chat Messages with Tabs */}
      <div className="flex-1 overflow-hidden min-h-0">
        <Tabs value={activeMessengerTab} onValueChange={setActiveMessengerTab} className="h-full flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-5 rounded-none bg-orange-50/30 border-orange-200 border-t rounded-t-none">
            <TabsTrigger value="whatsapp" className="text-xs">WhatsApp</TabsTrigger>
            <TabsTrigger value="telegram" className="text-xs">Telegram</TabsTrigger>
            <TabsTrigger value="max" className="text-xs">Max</TabsTrigger>
            <TabsTrigger value="email" className="text-xs">Email</TabsTrigger>
            <TabsTrigger value="calls" className="text-xs">Звонки</TabsTrigger>
          </TabsList>
          
          <TabsContent value="whatsapp" className="flex-1 p-3 overflow-y-auto mt-0">
            <div className="space-y-1">
              {loadingMessages ? (
                <div className="text-center text-muted-foreground text-sm py-4">
                  Загрузка сообщений...
                </div>
              ) : whatsappMessages.length > 0 ? (
                <>
                  {/* Load older messages button */}
                  {hasMoreMessages && (
                    <div className="flex justify-center py-2 mb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={loadOlderMessages}
                        disabled={loadingOlderMessages}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        {loadingOlderMessages ? (
                          <>
                            <Clock className="h-3 w-3 mr-1 animate-spin" />
                            Загрузка...
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            Загрузить старые сообщения
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {whatsappMessages.map((msg, index) => {
                    const prevMessage = whatsappMessages[index - 1];
                    const nextMessage = whatsappMessages[index + 1];
                    
                    // Определяем нужно ли показывать аватарку и имя
                    const showAvatar = !prevMessage || 
                      prevMessage.type !== msg.type || 
                      msg.type === 'system' || 
                      msg.type === 'comment';
                      
                    const showName = showAvatar;
                    
                    // Определяем нужно ли добавлять отступ снизу
                    const isLastInGroup = !nextMessage || 
                      nextMessage.type !== msg.type || 
                      nextMessage.type === 'system' || 
                      nextMessage.type === 'comment';
                    
                    return (
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
                        whatsappChatId={msg.whatsappChatId}
                        externalMessageId={msg.externalMessageId}
                        showAvatar={showAvatar}
                        showName={showName}
                        isLastInGroup={isLastInGroup}
                        onForwardMessage={handleForwardSingleMessage}
                        onEnterSelectionMode={handleEnterSelectionMode}
                      />
                    );
                  })}
                  
                  {/* Inline Pending GPT Responses after messages */}
                  {Array.isArray(pendingGPTResponses) && pendingGPTResponses.length > 0 && (
                    <>
                      {pendingGPTResponses.map((response) => (
                    <InlinePendingGPTResponse
                          key={response.id}
                          response={response}
                          onUse={(text) => {
                            setMessage(text);
                            onMessageChange?.(true);
                            // Auto-resize and focus
                            if (textareaRef.current) {
                              textareaRef.current.focus();
                              textareaRef.current.style.height = 'auto';
                              textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
                            }
                            // Scroll to bottom to keep input visible
                            setTimeout(() => scrollToBottom(true), 100);
                          }}
                        />
                      ))}
                    </>
                  )}
                </>
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
              {loadingMessages ? (
                <div className="text-center text-muted-foreground text-sm py-4">
                  Загрузка сообщений...
                </div>
              ) : maxMessages.length > 0 ? (
                <>
                  {maxMessages.map((msg, index) => {
                    const prevMessage = maxMessages[index - 1];
                    const nextMessage = maxMessages[index + 1];
                    
                    const showAvatar = !prevMessage || 
                      prevMessage.type !== msg.type || 
                      msg.type === 'system' || 
                      msg.type === 'comment';
                      
                    const showName = showAvatar;
                    
                    const isLastInGroup = !nextMessage || 
                      nextMessage.type !== msg.type || 
                      nextMessage.type === 'system' || 
                      nextMessage.type === 'comment';
                    
                    return (
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
                        whatsappChatId={msg.whatsappChatId}
                        externalMessageId={msg.externalMessageId}
                        showAvatar={showAvatar}
                        showName={showName}
                        isLastInGroup={isLastInGroup}
                        onForwardMessage={handleForwardSingleMessage}
                        onEnterSelectionMode={handleEnterSelectionMode}
                      />
                    );
                  })}
                </>
              ) : (
                <div className="text-center text-muted-foreground text-sm py-4">
                  {searchQuery ? 'Сообщения не найдены' : 'Нет сообщений Max'}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="email" className="flex-1 p-3 overflow-y-auto mt-0">
            <div className="space-y-1">
              <div className="text-center text-muted-foreground text-sm py-4">
                История переписки Email
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="calls" className="flex-1 p-3 overflow-y-auto mt-0">
            <CallHistory clientId={clientId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Message Input */}
      <div className="border-t p-3 shrink-0">
        {/* Pending message with countdown */}
        {pendingMessage && (
          <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded animate-pulse"></div>
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
          
          <div className="space-y-2">
            {/* Textarea */}
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
              onKeyDown={() => updateTypingStatus(true)}
              onFocus={() => updateTypingStatus(true)}
              onBlur={() => updateTypingStatus(false)}
              className={`min-h-[48px] max-h-[120px] resize-none text-base ${
                commentMode ? "bg-yellow-50 border-yellow-300" : ""
              } ${isOtherUserTyping ? "bg-orange-50 border-orange-200" : ""}`}
              disabled={loading || !!pendingMessage || isOtherUserTyping}
            />
            
            {/* Bottom row: All icons in one line */}
            <div ref={composerRef} className="flex items-center gap-0.5 md:gap-1">
              {/* Action icons */}
              <div className="flex items-center gap-0.5 md:gap-1 flex-1">
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
                       <DialogTitle className="flex items-center gap-2">
                         <Clock className="h-5 w-5" />
                         <span>{editingScheduledMessage ? "Редактировать запланированное сообщение" : "Запланировать сообщение"}</span>
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
                        <DialogTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          <span>Запланированные сообщения ({scheduledMessages.length})</span>
                        </DialogTitle>
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
              
              {/* Send button - icon only on mobile/tablet, icon+text on large desktop */}
              <Button 
                className={`h-8 w-8 p-0 lg:h-[40px] lg:w-auto lg:px-8 lg:gap-2 ml-auto ${
                  commentMode ? "bg-yellow-500 hover:bg-yellow-600" : ""
                }`}
                onClick={handleSendMessage}
                disabled={(loading || maxLoading) || (!message.trim() && attachedFiles.length === 0) || message.length > MAX_MESSAGE_LENGTH || !!pendingMessage}
              >
                <Send className="h-4 w-4" />
                <span className="hidden lg:inline">Отправить</span>
              </Button>
              </div>
            </div>
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
