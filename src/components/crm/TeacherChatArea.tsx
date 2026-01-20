import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Search, Phone, MessageCircle, Calendar, Users, Clock, Send, ArrowLeft, GraduationCap, Zap, Pin, Paperclip, Mail, RefreshCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatMessage } from './ChatMessage';
import { QuickResponsesModal } from './QuickResponsesModal';
import { CallHistory } from './CallHistory';
import { FileUpload } from './FileUpload';
import { AttachedFile } from './AttachedFile';
import { DateSeparator, shouldShowDateSeparator } from './DateSeparator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from "sonner";
import { useIsMobile } from '@/hooks/use-mobile';
import { useChatMessages, useSendMessage, useMarkAsRead, useRealtimeMessages, useClientUnreadByMessenger } from '@/hooks/useChatMessages';
import { useMarkChatMessagesAsRead } from '@/hooks/useMessageReadStatus';
import { useTypingStatus } from '@/hooks/useTypingStatus';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { useMaxGreenApi } from '@/hooks/useMaxGreenApi';
import { useMax } from '@/hooks/useMax';
import { useTelegramWappi } from '@/hooks/useTelegramWappi';
import { supabase } from '@/integrations/supabase/client';
import { AddTeacherModal } from '@/components/admin/AddTeacherModal';
import { useTeacherChats, useEnsureTeacherClient, TeacherChatItem, useTeacherChatMessages } from '@/hooks/useTeacherChats';
import { TeacherListItem } from './TeacherListItem';

interface TeacherGroup {
  id: string;
  name: string;
  level: string;
  nextLesson: string;
  studentsCount: number;
  branch: string;
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar?: string;
  phone: string;
  email: string;
  telegram?: string;
  whatsapp?: string;
  branch: string;
  subject: string;
  category: string;
  unreadMessages: number;
  isOnline: boolean;
  lastSeen: string;
  groups: TeacherGroup[];
  zoomLink?: string;
  resume: string;
  languages: string[];
  levels: string[];
  comments: string;
  experience: string;
  education: string;
}

// Тип для преподавателей из БД - теперь импортируется из useTeacherChats
type DbTeacher = TeacherChatItem;




interface TeacherChatAreaProps {
  selectedTeacherId?: string | null;
  onSelectTeacher: (teacherId: string | null) => void;
}

export const TeacherChatArea: React.FC<TeacherChatAreaProps> = ({
  selectedTeacherId = null,
  onSelectTeacher
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('диалог');
  const [activeMessengerTab, setActiveMessengerTab] = useState('whatsapp');
  const [message, setMessage] = useState('');
  const [showQuickResponsesModal, setShowQuickResponsesModal] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [pinCounts, setPinCounts] = useState<Record<string, number>>({});
  const [attachedFiles, setAttachedFiles] = useState<Array<{
    url: string;
    name: string;
    type: string;
    size: number;
  }>>([]);
  const [fileUploadResetKey, setFileUploadResetKey] = useState(0);
  
  // Avatar states
  const [whatsappClientAvatar, setWhatsappClientAvatar] = useState<string | null>(null);
  const [telegramClientAvatar, setTelegramClientAvatar] = useState<string | null>(null);
  const [maxClientAvatar, setMaxClientAvatar] = useState<string | null>(null);
  
  const isMobile = useIsMobile();
  const whatsappEndRef = useRef<HTMLDivElement>(null);
  const telegramEndRef = useRef<HTMLDivElement>(null);
  const maxEndRef = useRef<HTMLDivElement>(null);

  // Resolve real client UUID for the selected teacher or group
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);
  const [userBranch, setUserBranch] = useState<string | null>(null);

  // Load current user's branch once
  useEffect(() => {
    const loadBranch = async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('branch')
        .eq('id', uid)
        .maybeSingle();
      setUserBranch(profile?.branch || null);
    };
    loadBranch();
  }, []);

  // Load teachers from teachers table using new hook
  // Pass null for branch to load ALL teachers (not filtered by user's branch)
  const { teachers: dbTeachers, isLoading: isLoadingTeachers, totalTeachers, refetch: refetchTeachers } = useTeacherChats(null);
  const { findOrCreateClient } = useEnsureTeacherClient();

  const ensureClient = async (name: string, branch: string) => {
    const { data: found } = await supabase
      .from('clients')
      .select('id')
      .eq('name', name)
      .eq('branch', branch)
      .maybeSingle();
    if (found?.id) return found.id as string;
    
    // Use prefixed name for teacher chats to match RLS policy
    const chatName = name.includes('Чат педагогов') ? name : `Преподаватель: ${name}`;
    
    const { data: inserted, error } = await supabase
      .from('clients')
      .insert([{ name: chatName, phone: '-', branch }])
      .select('id')
      .maybeSingle();
    if (error) {
      console.error('ensureClient insert error', error);
      return null;
    }
    return inserted?.id || null;
  };

  useEffect(() => {
    const resolve = async () => {
      if (!selectedTeacherId) { setResolvedClientId(null); return; }
      
      if (selectedTeacherId === 'teachers-group') {
        // Group chat for the user's branch
        const nameToFind = userBranch ? `Чат педагогов - ${userBranch}` : null;
        const branchToUse = userBranch;
        if (!nameToFind || !branchToUse) { setResolvedClientId(null); return; }
        const id = await ensureClient(nameToFind, branchToUse);
        setResolvedClientId(id);
        return;
      }

      // Find teacher by id and get their clientId or create one
      const teacher = dbTeachers.find(t => t.id === selectedTeacherId);
      if (!teacher) { setResolvedClientId(null); return; }

      // If teacher already has a linked client, use it
      if (teacher.clientId) {
        setResolvedClientId(teacher.clientId);
        return;
      }

      // Otherwise, find or create a client for this teacher
      const clientId = await findOrCreateClient(teacher);
      setResolvedClientId(clientId);
    };
    resolve();
  }, [selectedTeacherId, userBranch, dbTeachers, findOrCreateClient]);

  const clientId = resolvedClientId || '';
  // Use special RPC for teacher messages that bypasses RLS org filter
  const { messages, isLoading: messagesLoading, error: messagesError, refetch: refetchMessages, isFetching: messagesFetching } = useTeacherChatMessages(clientId);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const { updateTypingStatus, getTypingMessage, isOtherUserTyping } = useTypingStatus(clientId);
  
  // Messenger hooks
  const { sendTextMessage: sendWhatsAppMessage, sendFileMessage: sendWhatsAppFile, loading: whatsappLoading, getAvatar: getWhatsAppAvatar } = useWhatsApp();
  const { sendMessage: sendMaxMessage, loading: maxLoading } = useMaxGreenApi();
  const { getAvatar: getMaxAvatar } = useMax();
  const { sendMessage: sendTelegramMessage } = useTelegramWappi();
  
  // Get unread counts by messenger
  const { unreadCounts: unreadByMessenger } = useClientUnreadByMessenger(clientId);
  
  useRealtimeMessages(clientId);
  
  // Auto-switch to the messenger tab of the last message when selecting a teacher
  useEffect(() => {
    if (selectedTeacherId && selectedTeacherId !== 'teachers-group') {
      const teacher = dbTeachers.find(t => t.id === selectedTeacherId);
      if (teacher?.lastMessengerType) {
        const messengerMap: Record<string, string> = {
          'whatsapp': 'whatsapp',
          'telegram': 'telegram',
          'max': 'max',
        };
        const newTab = messengerMap[teacher.lastMessengerType] || 'whatsapp';
        if (newTab !== activeMessengerTab) {
          setActiveMessengerTab(newTab);
        }
      }
    }
  }, [selectedTeacherId, dbTeachers]);

  // Reset avatars when client changes
  useEffect(() => {
    setWhatsappClientAvatar(null);
    setTelegramClientAvatar(null);
    setMaxClientAvatar(null);
  }, [clientId]);

  // Fetch WhatsApp avatar
  useEffect(() => {
    const fetchWhatsAppAvatar = async () => {
      if (activeMessengerTab === 'whatsapp' && clientId && !whatsappClientAvatar) {
        try {
          const result = await getWhatsAppAvatar(clientId);
          if (result.success && result.urlAvatar) {
            setWhatsappClientAvatar(result.urlAvatar);
          }
        } catch (error) {
          console.error('Error fetching WhatsApp avatar:', error);
        }
      }
    };
    fetchWhatsAppAvatar();
  }, [activeMessengerTab, clientId, whatsappClientAvatar, getWhatsAppAvatar]);

  // Fetch MAX avatar
  useEffect(() => {
    const fetchMaxAvatar = async () => {
      if (activeMessengerTab === 'max' && clientId && !maxClientAvatar) {
        try {
          const result = await getMaxAvatar(clientId);
          if (result.success && result.urlAvatar) {
            setMaxClientAvatar(result.urlAvatar);
          }
        } catch (error) {
          console.error('Error fetching MAX avatar:', error);
        }
      }
    };
    fetchMaxAvatar();
  }, [activeMessengerTab, clientId, maxClientAvatar, getMaxAvatar]);

  // Fetch Telegram avatar from DB
  useEffect(() => {
    const fetchTelegramAvatar = async () => {
      if (activeMessengerTab === 'telegram' && clientId && !telegramClientAvatar) {
        try {
          const { data } = await supabase
            .from('clients')
            .select('telegram_avatar_url')
            .eq('id', clientId)
            .maybeSingle();
          if (data?.telegram_avatar_url) {
            setTelegramClientAvatar(data.telegram_avatar_url);
          }
        } catch (error) {
          console.error('Error fetching Telegram avatar:', error);
        }
      }
    };
    fetchTelegramAvatar();
  }, [activeMessengerTab, clientId, telegramClientAvatar]);

  // Mark as read when opening/receiving
  useEffect(() => {
    if (clientId && messages.length > 0) {
      markAsRead.mutate(clientId);
    }
  }, [clientId, messages.length]);
  
  // Auto-scroll to bottom when messages load or change
  useEffect(() => {
    if (messages.length > 0 && !messagesLoading) {
      // Small delay to ensure DOM has updated
      const timer = setTimeout(() => scrollToBottom(false), 100);
      return () => clearTimeout(timer);
    }
  }, [messages.length, messagesLoading, activeMessengerTab]);

  // Filter messages by messenger type
  const whatsappMessages = useMemo(() => 
    messages.filter(m => (m as any).messenger_type === 'whatsapp' || !(m as any).messenger_type),
    [messages]
  );

  const telegramMessages = useMemo(() => 
    messages.filter(m => (m as any).messenger_type === 'telegram'),
    [messages]
  );

  const maxMessages = useMemo(() => 
    messages.filter(m => (m as any).messenger_type === 'max'),
    [messages]
  );

  // Format message helper
  const formatMessage = useCallback((msg: any) => ({
    id: msg.id,
    type: msg.message_type || (msg.is_outgoing ? 'manager' : 'client'),
    message: msg.message_text || '',
    time: new Date(msg.created_at).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    createdAt: msg.created_at,
    fileUrl: msg.file_url,
    fileName: msg.file_name,
    fileType: msg.file_type,
    messengerType: msg.messenger_type || 'whatsapp',
    messageStatus: msg.message_status,
    externalMessageId: msg.external_message_id,
  }), []);

  // Scroll to bottom
  const scrollToBottom = (smooth = true, tab?: string) => {
    const t = tab || activeMessengerTab;
    const targetRef = t === 'max' ? maxEndRef : t === 'telegram' ? telegramEndRef : whatsappEndRef;
    targetRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "instant",
    });
  };

  const teachers = dbTeachers || [];
  const filteredTeachers = teachers.filter((teacher) => {
    const q = searchQuery.toLowerCase();
    return (teacher.fullName || '').toLowerCase().includes(q) ||
           ((teacher.branch || '').toLowerCase().includes(q));
  });

  const selectedTeacher = selectedTeacherId ? teachers.find((t: any) => t.id === selectedTeacherId) : null;

  const handleBackToList = () => {
    onSelectTeacher(null as any);
  };

  const handleMessengerTabChange = (newTab: string) => {
    setActiveMessengerTab(newTab);
    setTimeout(() => scrollToBottom(false, newTab), 0);
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !clientId) return;

    const messageText = message.trim();
    const currentTeacher = teachers?.find(t => t.id === selectedTeacherId);
    
    try {
      // Send via active messenger
      if (activeMessengerTab === 'whatsapp') {
        // First save to database
        await sendMessage.mutateAsync({
          clientId,
          messageText: messageText,
          messageType: 'manager'
        });
        
        // Then send via WhatsApp if teacher has phone
        if (currentTeacher?.phone) {
          const cleanPhone = currentTeacher.phone.replace(/[^\d+]/g, '');
          const result = await sendWhatsAppMessage(clientId, messageText, cleanPhone);
          
          if (result.success) {
            toast.success(`Сообщение отправлено в WhatsApp`);
          } else {
            toast.error(`Сообщение сохранено, но не отправлено в WhatsApp`);
          }
        } else {
          toast.success("Сообщение сохранено");
        }
      } else if (activeMessengerTab === 'telegram') {
        const result = await sendTelegramMessage(clientId, messageText);
        if (result) {
          toast.success('Сообщение отправлено в Telegram');
        } else {
          toast.error('Ошибка отправки в Telegram');
        }
      } else if (activeMessengerTab === 'max') {
        const result = await sendMaxMessage(clientId, messageText);
        if (result) {
          toast.success('Сообщение отправлено в MAX');
        } else {
          toast.error('Ошибка отправки в MAX');
        }
      }
      
      setMessage('');
      updateTypingStatus(false);
      setTimeout(() => scrollToBottom(true), 100);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Не удалось отправить сообщение");
    }
  };

  const handleFileSelect = async (files: Array<{ url: string; name: string; type: string; size: number }>) => {
    if (!clientId) return;
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendWithFile = async () => {
    if (attachedFiles.length === 0 || !clientId) return;
    
    const currentTeacher = teachers?.find(t => t.id === selectedTeacherId);
    
    try {
      for (const file of attachedFiles) {
        if (activeMessengerTab === 'whatsapp' && currentTeacher?.phone) {
          const result = await sendWhatsAppFile(clientId, file.url, file.name, file.type);
          if (!result.success) {
            toast.error(`Ошибка отправки файла ${file.name}`);
          }
        }
        // Add support for other messengers here
      }
      
      if (message.trim()) {
        await handleSendMessage();
      }
      
      setAttachedFiles([]);
      setFileUploadResetKey(prev => prev + 1);
      toast.success('Файл отправлен');
    } catch (error) {
      console.error('Error sending file:', error);
      toast.error('Ошибка отправки файла');
    }
  };

  const handleScheduleMessage = async () => {
    if (!message.trim() || !scheduleDate || !scheduleTime || !clientId) {
      toast.error('Заполните дату/время и текст сообщения');
      return;
    }
    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
    const delay = scheduledDateTime.getTime() - Date.now();
    if (delay <= 0) {
      toast.error('Время отправки должно быть в будущем');
      return;
    }
    const text = message.trim();
    setShowScheduleDialog(false);
    setMessage('');
    updateTypingStatus(false);
    setTimeout(async () => {
      await handleSendMessage();
      toast.success(`Запланированное сообщение отправлено`);
    }, delay);
    toast.success('Сообщение запланировано');
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);
    updateTypingStatus(value.length > 0);
  };

  const isGroupChat = selectedTeacherId === 'teachers-group';
  const currentTeacher = isGroupChat ? null : selectedTeacher;

  // Get current avatar based on messenger tab
  const getCurrentAvatar = () => {
    switch (activeMessengerTab) {
      case 'whatsapp': return whatsappClientAvatar;
      case 'telegram': return telegramClientAvatar;
      case 'max': return maxClientAvatar;
      default: return null;
    }
  };

  // Render message list for a specific messenger
  const renderMessageList = (msgList: any[], endRef: React.RefObject<HTMLDivElement>, avatar: string | null) => {
    // Show loading state
    if (messagesLoading && msgList.length === 0) {
      return (
        <div className="space-y-2 p-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <Skeleton className={`h-12 ${i % 2 === 0 ? 'w-48' : 'w-56'} rounded-lg`} />
            </div>
          ))}
        </div>
      );
    }
    
    // Show error state with retry button
    if (messagesError && msgList.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-muted-foreground text-sm mb-2">
            Ошибка загрузки сообщений
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchMessages()}
            disabled={messagesFetching}
            className="gap-2"
          >
            <RefreshCcw className={`h-4 w-4 ${messagesFetching ? 'animate-spin' : ''}`} />
            Повторить
          </Button>
        </div>
      );
    }
    
    const formattedMessages = msgList.map(formatMessage);
    
    return (
      <div className="space-y-1">
        {formattedMessages.length > 0 ? (
          <>
            {formattedMessages.map((msg, index) => {
              const prevMessage = formattedMessages[index - 1];
              const nextMessage = formattedMessages[index + 1];
              
              const showDateSeparator = shouldShowDateSeparator(
                msg.createdAt,
                prevMessage?.createdAt
              );
              
              const showAvatar = !prevMessage || prevMessage.type !== msg.type || showDateSeparator;
              const showName = showAvatar;
              const isLastInGroup = !nextMessage || nextMessage.type !== msg.type;
              
              return (
                <div key={msg.id || index}>
                  {showDateSeparator && msg.createdAt && (
                    <DateSeparator date={msg.createdAt} />
                  )}
                  <ChatMessage
                    messageId={msg.id}
                    type={msg.type}
                    message={msg.message}
                    time={msg.time}
                    messageStatus={msg.messageStatus}
                    clientAvatar={avatar}
                    managerName="Вы"
                    fileUrl={msg.fileUrl}
                    fileName={msg.fileName}
                    fileType={msg.fileType}
                    externalMessageId={msg.externalMessageId}
                    showAvatar={showAvatar}
                    showName={showName}
                    isLastInGroup={isLastInGroup}
                  />
                </div>
              );
            })}
          </>
        ) : (
          <div className="text-center text-muted-foreground text-sm py-8">
            Нет сообщений
          </div>
        )}
        <div ref={endRef} />
      </div>
    );
  };

  // Messenger tabs component
  const MessengerTabs = () => (
    <Tabs value={activeMessengerTab} onValueChange={handleMessengerTabChange} className="flex-1 flex flex-col overflow-hidden">
      <TabsList className="grid w-full grid-cols-5 rounded-none bg-muted/30 border-b h-9 shrink-0">
        <TabsTrigger value="whatsapp" className="text-xs relative data-[state=active]:bg-green-500 data-[state=active]:text-white">
          WhatsApp
          {(unreadByMessenger?.whatsapp || 0) > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
              {unreadByMessenger?.whatsapp}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="telegram" className="text-xs relative data-[state=active]:bg-blue-500 data-[state=active]:text-white">
          Telegram
          {(unreadByMessenger?.telegram || 0) > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
              {unreadByMessenger?.telegram}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="max" className="text-xs relative data-[state=active]:bg-purple-500 data-[state=active]:text-white">
          Max
          {(unreadByMessenger?.max || 0) > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
              {unreadByMessenger?.max}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="email" className="text-xs relative data-[state=active]:bg-orange-500 data-[state=active]:text-white">
          <Mail className="h-3 w-3" />
        </TabsTrigger>
        <TabsTrigger value="calls" className="text-xs relative data-[state=active]:bg-rose-500 data-[state=active]:text-white">
          <Phone className="h-3 w-3" />
        </TabsTrigger>
      </TabsList>

      <TabsContent value="whatsapp" className="flex-1 mt-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col data-[state=inactive]:hidden">
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          {renderMessageList(whatsappMessages, whatsappEndRef, whatsappClientAvatar)}
        </div>
      </TabsContent>

      <TabsContent value="telegram" className="flex-1 mt-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col data-[state=inactive]:hidden">
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          {renderMessageList(telegramMessages, telegramEndRef, telegramClientAvatar)}
        </div>
      </TabsContent>

      <TabsContent value="max" className="flex-1 mt-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col data-[state=inactive]:hidden">
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          {renderMessageList(maxMessages, maxEndRef, maxClientAvatar)}
        </div>
      </TabsContent>

      <TabsContent value="email" className="flex-1 mt-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col data-[state=inactive]:hidden">
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          <div className="text-center text-muted-foreground text-sm py-8">
            Email переписка (в разработке)
          </div>
        </div>
      </TabsContent>

      <TabsContent value="calls" className="flex-1 mt-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col data-[state=inactive]:hidden">
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          <CallHistory clientId={clientId} />
        </div>
      </TabsContent>
    </Tabs>
  );

  // Message input component
  const MessageInput = () => {
    if (activeMessengerTab === 'email' || activeMessengerTab === 'calls') return null;
    
    return (
      <div className="border-t p-3 shrink-0">
        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-muted rounded px-2 py-1 text-xs">
                <span className="truncate max-w-[100px]">{file.name}</span>
                <Button size="sm" variant="ghost" className="h-4 w-4 p-0" onClick={() => handleRemoveFile(index)}>
                  ×
                </Button>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Textarea
              placeholder={isGroupChat ? "Написать в общий чат..." : "Написать сообщение..."}
              value={message}
              onChange={(e) => handleMessageChange(e.target.value)}
              className="min-h-[40px] max-h-[120px] resize-none text-sm"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (attachedFiles.length > 0) {
                    handleSendWithFile();
                  } else {
                    handleSendMessage();
                  }
                }
              }}
            />
            <div className="flex items-center gap-1 mt-2">
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setShowQuickResponsesModal(true)}>
                <Zap className="h-4 w-4" />
              </Button>
              <FileUpload
                onFileUpload={(file) => setAttachedFiles(prev => [...prev, file])}
              />
              <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={!message.trim()}>
                    <Clock className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                     <DialogTitle className="flex items-center gap-2">
                       <Clock className="h-5 w-5" />
                       <span>Запланировать сообщение</span>
                     </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-sm">Дата</label>
                      <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm">Время</label>
                      <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>Отмена</Button>
                      <Button onClick={handleScheduleMessage} disabled={!scheduleDate || !scheduleTime || !message.trim()}>Запланировать</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <Button 
            size="icon" 
            className="rounded-sm h-10 w-10 shrink-0" 
            onClick={attachedFiles.length > 0 ? handleSendWithFile : handleSendMessage} 
            disabled={(!message.trim() && attachedFiles.length === 0) || !clientId || whatsappLoading || maxLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <QuickResponsesModal
          open={showQuickResponsesModal}
          onOpenChange={setShowQuickResponsesModal}
          onSelectResponse={(text) => setMessage((prev) => (prev ? `${prev} ${text}` : text))}
          isTeacher={true}
        />
      </div>
    );
  };

  // На мобильных показываем либо список преподавателей, либо чат
  if (isMobile) {
    // Показываем список преподавателей
    if (!selectedTeacherId) {
      return (
        <div className="flex flex-col h-full min-h-0 bg-background">
        <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Поиск преподавателя..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 text-sm"
              />
            </div>
          </div>

          <ScrollArea className="flex-1 pb-20">
            <div className="p-2 pb-16">
              {isLoadingTeachers ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-3 rounded-lg mb-2 border bg-card">
                      <div className="flex items-start space-x-3">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-5 w-5 rounded" />
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {/* Group Chat for All Teachers */}
                  <div
                    onClick={() => onSelectTeacher('teachers-group')}
                    className="p-3 rounded-lg cursor-pointer transition-colors mb-2 hover:bg-muted/50 border bg-card"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium text-primary">
                        ЧП
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-sm text-foreground">
                            Чат педагогов
                          </h3>
                          <div className="flex items-center gap-1">
                            {pinCounts['teachers-group'] > 0 && (
                              <Pin className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mt-1">
                          Общий чат всех преподавателей
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Individual Teachers */}
                  {filteredTeachers.map((teacher) => (
                    <TeacherListItem
                      key={teacher.id}
                      teacher={teacher}
                      isSelected={false}
                      pinCount={pinCounts[teacher.id] || 0}
                      onClick={() => onSelectTeacher(teacher.id)}
                      compact={false}
                    />
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      );
    }

    // Показываем чат (мобильный)
    return (
      <div className="flex flex-col h-full min-h-0 bg-background">
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
                <GraduationCap className="h-4 w-4 text-slate-600" />
                {isGroupChat ? 'Чат педагогов' : currentTeacher?.fullName}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isGroupChat 
                  ? 'Общий чат всех преподавателей' 
                  : `${currentTeacher?.branch} • ${currentTeacher?.phone}`
                }
              </p>
            </div>
            {!isGroupChat && currentTeacher?.phone && (
              <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                <Phone className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Messenger Tabs */}
        <MessengerTabs />
        
        {/* Message Input */}
        <MessageInput />
      </div>
    );
  }

  // Desktop view: show both teacher list and chat
  return (
    <div className="h-full flex">
      {/* Compact Teachers List */}
      <div className="w-72 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Поиск преподавателя..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {isLoadingTeachers ? (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-2 rounded-lg mb-2 border bg-card">
                    <div className="flex items-start space-x-2">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-4 w-4 rounded" />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                {/* Group Chat for All Teachers */}
                <div
                  onClick={() => onSelectTeacher('teachers-group')}
                  className={`p-2 rounded-lg cursor-pointer transition-colors mb-2 ${
                    selectedTeacherId === 'teachers-group'
                      ? 'bg-muted border border-border'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary">
                      ЧП
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-sm text-foreground truncate">
                          Чат педагогов
                        </h3>
                        <div className="flex items-center gap-1">
                          {pinCounts['teachers-group'] > 0 && (
                            <Pin className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground truncate">
                        Общий чат всех преподавателей
                      </p>
                    </div>
                  </div>
                </div>

                {/* Individual Teachers */}
                {filteredTeachers.map((teacher) => (
                  <TeacherListItem
                    key={teacher.id}
                    teacher={teacher}
                    isSelected={selectedTeacherId === teacher.id}
                    pinCount={pinCounts[teacher.id] || 0}
                    onClick={() => onSelectTeacher(teacher.id)}
                    compact={true}
                  />
                ))}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area with Header */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header - Fixed height */}
        <div className="p-3 border-b border-border bg-background shrink-0 h-16 flex items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="relative shrink-0">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-medium text-xs">
                    {isGroupChat ? 'ЧП' : `${currentTeacher?.firstName?.[0] || ''}${currentTeacher?.lastName?.[0] || ''}`}
                  </span>
                </div>
                {!isGroupChat && currentTeacher?.isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border border-background"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm text-foreground truncate">
                  {isGroupChat ? 'Чат педагогов' : currentTeacher?.fullName}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {isGroupChat 
                    ? 'Общий чат всех преподавателей' 
                    : `${currentTeacher?.branch} • ${currentTeacher?.phone}`
                  }
                </p>
              </div>
            </div>
            
            {!isGroupChat && currentTeacher?.phone && (
              <div className="flex items-center space-x-1 shrink-0">
                <Button size="sm" variant="outline" className="h-7 w-7 p-0">
                  <Phone className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Compact Tabs - Fixed height */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="shrink-0">
            <TabsList className="grid w-full grid-cols-3 mx-3 mt-2 h-8">
              <TabsTrigger value="диалог" className="text-xs">Диалог</TabsTrigger>
              <TabsTrigger value="расписание" className="text-xs">Расписание</TabsTrigger>
              <TabsTrigger value="профиль" className="text-xs">О преподавателе</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {/* Chat tab - Диалог */}
            <TabsContent value="диалог" className="h-full m-0 flex flex-col flex-1">
              {/* Messenger Tabs */}
              <MessengerTabs />
            </TabsContent>

            {/* Schedule tab - only for individual teachers */}
            {!isGroupChat && (
              <TabsContent value="расписание" className="h-full m-0">
                <ScrollArea className="flex-1 p-3">
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Расписание преподавателя будет доступно позже
                  </div>
                </ScrollArea>
              </TabsContent>
            )}

            {/* Teacher Profile tab - only for individual teachers */}
            {!isGroupChat && (
              <TabsContent value="профиль" className="h-full m-0">
                <ScrollArea className="h-full p-3">
                  <div className="space-y-4">
                    {/* Basic Info */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Контактная информация</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 pt-0">
                        <div className="flex items-center space-x-2">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs">{currentTeacher?.phone}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MessageCircle className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs">{currentTeacher?.email}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Professional Info */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Профессиональная информация</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground mb-1">Предметы</h4>
                          <div className="flex flex-wrap gap-1">
                            {currentTeacher?.subjects?.map((subject, index) => (
                              <Badge key={index} variant="secondary" className="text-xs h-5">
                                {subject}
                              </Badge>
                            )) || <span className="text-xs text-muted-foreground">Не указаны</span>}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground mb-1">Категории</h4>
                          <div className="flex flex-wrap gap-1">
                            {currentTeacher?.categories?.map((category, index) => (
                              <Badge key={index} variant="outline" className="text-xs h-5">
                                {category}
                              </Badge>
                            )) || <span className="text-xs text-muted-foreground">Не указаны</span>}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground mb-1">Филиал</h4>
                          <Badge variant="secondary" className="text-xs h-5">
                            {currentTeacher?.branch || 'Не указан'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Contact Info */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Связь</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {currentTeacher?.phone ? `Телефон: ${currentTeacher.phone}` : 'Телефон не указан'}
                        </p>
                        {currentTeacher?.email && (
                          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                            Email: {currentTeacher.email}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>
            )}

            {/* Group chat schedule */}
            {isGroupChat && (
              <>
                <TabsContent value="расписание" className="h-full m-0">
                  <ScrollArea className="h-full p-3">
                    <div className="text-center py-8">
                      <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">Общее расписание всех преподавателей</p>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="профиль" className="h-full m-0">
                  <ScrollArea className="h-full p-3">
                    <div className="text-center py-8">
                      <Users className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">Информация о группе педагогов</p>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
        
        {/* Message input at the bottom - only show when on диалог tab */}
        {activeTab === 'диалог' && <MessageInput />}
      </div>
    </div>
  );
};
