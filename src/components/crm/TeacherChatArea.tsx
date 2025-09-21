import React, { useState, useEffect } from 'react';
import { Search, Phone, MessageCircle, Video, Calendar, Users, Clock, ChevronRight, Send, Link, Copy, ArrowLeft, GraduationCap, Zap, Pin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { ChatMessage } from './ChatMessage';
import { QuickResponsesModal } from './QuickResponsesModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from "sonner";
import { useIsMobile } from '@/hooks/use-mobile';
import { useChatMessages, useSendMessage, useMarkAsRead, useRealtimeMessages } from '@/hooks/useChatMessages';
import { useMarkChatMessagesAsRead } from '@/hooks/useMessageReadStatus';
import { useTypingStatus } from '@/hooks/useTypingStatus';
import { usePinCounts } from '@/hooks/usePinCounts';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { supabase } from '@/integrations/supabase/client';
import { AddTeacherModal } from './AddTeacherModal';

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
  // Additional profile fields
  resume: string;
  languages: string[];
  levels: string[];
  comments: string;
  experience: string;
  education: string;
}

// Данные преподавателей теперь подгружаются из БД
interface DbTeacher {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string;
  branch: string;
  unreadMessages: number;
  lastSeen: string;
  isOnline: boolean;
  // Optional fields for future expansion
  email?: string;
  telegram?: string;
  experience?: string;
  education?: string;
  languages?: string[];
  levels?: string[];
  resume?: string;
  comments?: string;
  zoomLink?: string;
  subject?: string;
  groups?: { id: string; name: string; level: string; nextLesson: string; studentsCount: number; branch: string }[];
}

const DEFAULT_SUBJECT = 'Английский';


interface TeacherChatAreaProps {
  selectedTeacherId?: string | null;
  onSelectTeacher: (teacherId: string | null) => void;
}

export const TeacherChatArea: React.FC<TeacherChatAreaProps> = ({
  selectedTeacherId = null,
  onSelectTeacher
}) => {
  const [dbTeachers, setDbTeachers] = useState<DbTeacher[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('диалог');
  const [message, setMessage] = useState('');
  const [showQuickResponsesModal, setShowQuickResponsesModal] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [pinCounts, setPinCounts] = useState<Record<string, number>>({});
  const isMobile = useIsMobile();

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

  // Load teachers from DB by branch
  useEffect(() => {
    const fetchTeachers = async (branch: string) => {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name, phone, branch')
        .eq('branch', branch)
        .ilike('name', 'Преподаватель:%');
      if (error) {
        console.error('Error fetching teachers', error);
        return;
      }
      const enriched = await Promise.all((clients || []).map(async (c) => {
        const full = (c.name || '').replace('Преподаватель:', '').trim();
        const [lastName, firstName, ...rest] = full.split(' ');
        const fullName = `${lastName || ''} ${firstName || ''}${rest.length ? ' ' + rest.join(' ') : ''}`.trim();
        const { data: lastMsg } = await supabase
          .from('chat_messages')
          .select('created_at, is_read')
          .eq('client_id', c.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const { count: unread } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', c.id)
          .eq('is_read', false);
        return {
          id: c.id,
          fullName: fullName || full || c.name,
          firstName: firstName || '',
          lastName: lastName || '',
          phone: c.phone,
          branch: c.branch,
          unreadMessages: unread || 0,
          lastSeen: lastMsg?.created_at ? new Date(lastMsg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : 'нет данных',
          isOnline: false,
        } as DbTeacher;
      }));
      // sort by last message time desc
      enriched.sort((a, b) => {
        const aTs = Date.parse(a.lastSeen.replace(/(\d{2}):(\d{2})/, (m)=>a.lastSeen));
        const bTs = Date.parse(b.lastSeen.replace(/(\d{2}):(\d{2})/, (m)=>b.lastSeen));
        return (bTs || 0) - (aTs || 0);
      });
      setDbTeachers(enriched);
    };
    if (userBranch) fetchTeachers(userBranch);
  }, [userBranch]);

  // Realtime refresh
  useEffect(() => {
    const channel = supabase
      .channel('teachers-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => {
        if (userBranch) {
          // trigger refetch by updating userBranch state
          setUserBranch((b) => b);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, () => {
        if (userBranch) {
          // trigger refetch when messages are marked as read
          setUserBranch((b) => b);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userBranch]);

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
        .insert({ name: chatName, phone: '-', branch })
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
      let nameToFind: string | null = null;
      let branchToUse: string | null = null;
      if (selectedTeacherId === 'teachers-group') {
        // Делать групповой чат по филиалу пользователя
        nameToFind = userBranch ? `Чат педагогов - ${userBranch}` : null;
        branchToUse = userBranch;
      } else {
        const tDb = dbTeachers.find(tt => tt.id === selectedTeacherId);
        nameToFind = tDb ? `Преподаватель: ${tDb.fullName}` : null;
        branchToUse = tDb?.branch || userBranch;
      }
      if (!nameToFind || !branchToUse) { setResolvedClientId(null); return; }
      const id = await ensureClient(nameToFind, branchToUse);
      setResolvedClientId(id);
    };
    resolve();
  }, [selectedTeacherId, userBranch]);

  const clientId = resolvedClientId || '';
  const { messages } = useChatMessages(clientId);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const { updateTypingStatus, getTypingMessage, isOtherUserTyping } = useTypingStatus(clientId);
  const { sendTextMessage, loading: whatsappLoading } = useWhatsApp();
  
  useRealtimeMessages(clientId);

  // Mark as read when opening/receiving
  useEffect(() => {
    if (clientId && messages.length > 0) {
      markAsRead.mutate(clientId);
      // Обновляем список преподавателей после пометки как прочитанное
      setTimeout(() => {
        setUserBranch(prev => prev); // Принудительно перезапустить useEffect
      }, 100);
    }
  }, [clientId, messages.length]);

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

  const handleLessonClick = (groupId: string) => {
    // Navigate to lesson page
    console.log('Navigate to lesson:', groupId);
    // Here you would navigate to the lesson page
    // For example: navigate(`/lesson/${groupId}`);
  };

  const handleCopyZoomLink = async (zoomLink?: string) => {
    if (!zoomLink) return;
    
    try {
      await navigator.clipboard.writeText(zoomLink);
      toast.success("Ссылка скопирована в буфер обмена");
    } catch (err) {
      toast.error("Не удалось скопировать ссылку");
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !clientId || whatsappLoading) return;

    const messageText = message.trim();
    const currentTeacher = teachers?.find(t => t.id === selectedTeacherId);
    
    try {
      // First save to database
      await sendMessage.mutateAsync({
        clientId,
        messageText: messageText,
        messageType: 'manager'
      });
      
      // Обновляем список преподавателей чтобы убрать счетчик непрочитанных
      setTimeout(() => {
        setUserBranch(prev => prev); // Принудительно перезапустить useEffect
      }, 500);
      
      // Then send via WhatsApp if teacher has phone
      if (currentTeacher?.phone) {
        // Format phone number for WhatsApp (remove spaces, dashes, etc.)
        const cleanPhone = currentTeacher.phone.replace(/[^\d+]/g, '');
        console.log('Sending WhatsApp to teacher:', currentTeacher.fullName, 'Phone:', cleanPhone);
        
        const result = await sendTextMessage(clientId, messageText, cleanPhone);
        
        if (result.success) {
          toast.success(`Сообщение отправлено преподавателю ${currentTeacher.fullName} в WhatsApp`);
        } else {
          console.error('WhatsApp send error:', result.error);
          toast.error(`Сообщение сохранено, но не отправлено в WhatsApp: ${result.error}`);
        }
      } else {
        console.log('No phone number for teacher:', currentTeacher?.fullName);
        toast.success("Сообщение сохранено (у преподавателя нет номера телефона для WhatsApp)");
      }
      
      setMessage('');
      updateTypingStatus(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Не удалось отправить сообщение");
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
      const currentTeacher = teachers?.find(t => t.id === selectedTeacherId);
      try {
        await sendMessage.mutateAsync({
          clientId,
          messageText: text,
          messageType: 'manager'
        });
        
        // Send via WhatsApp if teacher has phone
        if (currentTeacher?.phone) {
          const cleanPhone = currentTeacher.phone.replace(/[^\d+]/g, '');
          const result = await sendTextMessage(clientId, text, cleanPhone);
          if (result.success) {
            toast.success(`Запланированное сообщение отправлено преподавателю ${currentTeacher.fullName} в WhatsApp`);
          } else {
            toast.error(`Запланированное сообщение сохранено, но не отправлено в WhatsApp: ${result.error}`);
          }
        } else {
          toast.success("Запланированное сообщение отправлено");
        }
      } catch (e) {
        console.error('Ошибка отправки запланированного сообщения', e);
      }
    }, delay);
    toast.success('Сообщение запланировано');
  };

  const handleMarkAsRead = async () => {
    if (!clientId) return;
    try {
      await markAsRead.mutateAsync(clientId);
      // Обновляем список преподавателей после пометки
      setUserBranch(prev => prev); // Принудительно перезапустить useEffect
      toast.success('Отмечено как прочитанное');
    } catch (error) {
      toast.error('Ошибка отметки прочитанным');
    }
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);
    updateTypingStatus(value.length > 0);
  };
  const isGroupChat = selectedTeacherId === 'teachers-group';
  const currentMessages = messages;
  const currentTeacher = isGroupChat ? null : selectedTeacher;

  // На мобильных показываем либо список преподавателей, либо чат
  if (isMobile) {
    // Показываем список преподавателей
    if (!selectedTeacherId) {
      return (
        <div className="flex flex-col h-full min-h-0 bg-background">
          <div className="p-3 border-b">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-slate-600" />
                <h2 className="font-semibold text-base">Преподаватели</h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {filteredTeachers.length + 1}
                </Badge>
                <AddTeacherModal onTeacherAdded={() => window.location.reload()} />
              </div>
            </div>
            
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Поиск преподавателя..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-8 text-sm"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2">
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
                        <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                          4
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-1">
                      Общий чат всех преподавателей
                    </p>
                    
                    <p className="text-xs text-muted-foreground">
                      15 мин назад
                    </p>
                  </div>
                </div>
              </div>

              {/* Individual Teachers */}
              {filteredTeachers.map((teacher) => (
                <div
                  key={teacher.id}
                  onClick={() => onSelectTeacher(teacher.id)}
                  className="p-3 rounded-lg cursor-pointer transition-colors mb-2 hover:bg-muted/50 border bg-card"
                >
                  <div className="flex items-start space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium text-primary">
                        {(teacher.firstName?.[0] || teacher.fullName?.[0] || '•')}{(teacher.lastName?.[0] || '')}
                      </div>
                      {teacher.isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border border-background"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-sm text-foreground">
                          {teacher.fullName}
                        </h3>
                        <div className="flex items-center gap-1">
                          {pinCounts[teacher.id] > 0 && (
                            <Pin className="h-3 w-3 text-muted-foreground" />
                          )}
                          {teacher.unreadMessages > 0 && (
                            <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                              {teacher.unreadMessages}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        {teacher.branch} • {DEFAULT_SUBJECT}
                      </p>
                      
                      <p className="text-xs text-muted-foreground">
                        {teacher.lastSeen}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      );
    }

    // Показываем чат
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
          </div>
        </div>

        {/* Chat Messages */}
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-3">
            {(currentMessages || []).map((msg) => (
              <ChatMessage
                key={msg.id}
                messageId={msg.id}
                type={msg.message_type}
                message={msg.message_text}
                time={new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                managerName={msg.message_type === 'manager' ? 'Вы' : currentTeacher?.fullName}
              />
            ))}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="border-t p-3 shrink-0">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Textarea
                placeholder={isGroupChat ? "Написать в общий чат..." : "Написать сообщение..."}
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
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setShowQuickResponsesModal(true)}>
                  <Zap className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button 
              size="icon" 
              className="rounded-full h-10 w-10"
              onClick={handleSendMessage} 
              disabled={!message.trim() || !clientId || whatsappLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop view: show both teacher list and chat

  return (
    <div className="h-full flex">
      {/* Compact Teachers List */}
      <div className="w-72 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground">Преподаватели</h2>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {filteredTeachers.length + 1}
              </Badge>
              <AddTeacherModal onTeacherAdded={() => window.location.reload()} />
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Поиск преподавателя..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-8 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
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
                      <Badge variant="destructive" className="h-4 w-4 p-0 flex items-center justify-center text-xs">
                        4
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground truncate">
                    Общий чат всех преподавателей
                  </p>
                  
                  <p className="text-xs text-muted-foreground">
                    15 мин назад
                  </p>
                </div>
              </div>
            </div>

            {/* Individual Teachers */}
            {filteredTeachers.map((teacher) => (
              <div
                key={teacher.id}
                onClick={() => onSelectTeacher(teacher.id)}
                className={`p-2 rounded-lg cursor-pointer transition-colors mb-1 ${
                  selectedTeacherId === teacher.id
                    ? 'bg-muted border border-border'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start space-x-2">
                  <div className="relative">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary">
                      {(teacher.firstName?.[0] || teacher.fullName?.[0] || '•')}{(teacher.lastName?.[0] || '')}
                    </div>
                    {teacher.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border border-background"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm text-foreground truncate">
                        {teacher.fullName}
                      </h3>
                      <div className="flex items-center gap-1">
                        {pinCounts[teacher.id] > 0 && (
                          <Pin className="h-3 w-3 text-muted-foreground" />
                        )}
                        {teacher.unreadMessages > 0 && (
                          <Badge variant="destructive" className="h-4 w-4 p-0 flex items-center justify-center text-xs">
                            {teacher.unreadMessages}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground truncate">
                      {teacher.branch} • {DEFAULT_SUBJECT}
                    </p>
                    
                    <p className="text-xs text-muted-foreground">
                      {teacher.lastSeen}
                    </p>
                  </div>
                </div>
              </div>
            ))}
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
                    {isGroupChat ? 'ЧП' : `${currentTeacher?.firstName[0]}${currentTeacher?.lastName[0]}`}
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
            
            {!isGroupChat && (
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

          <div className="flex-1 min-h-0 overflow-hidden">
            {/* Chat tab - Диалог */}
            <TabsContent value="диалог" className="h-full m-0 flex flex-col">
              {/* Chat Messages Area - Fixed height */}
              <div className="flex-1 min-h-0">
                <ScrollArea className="h-full">
          <div className="p-3 space-y-1">
            {(currentMessages || []).map((msg) => (
              <ChatMessage
                key={msg.id}
                messageId={msg.id}
                type={msg.message_type}
                message={msg.message_text}
                time={new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                managerName={msg.message_type === 'manager' ? 'Вы' : currentTeacher?.fullName}
              />
            ))}
          </div>
                </ScrollArea>
              </div>
              
              {/* Message input moved below Tabs for sticky bottom */}
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
                        {currentTeacher?.telegram && (
                          <div className="flex items-center space-x-2">
                            <MessageCircle className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">{currentTeacher.telegram}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Professional Info */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Профессиональная информация</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground mb-1">Опыт работы</h4>
                          <p className="text-xs">{currentTeacher?.experience}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground mb-1">Образование</h4>
                          <p className="text-xs">{currentTeacher?.education}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground mb-1">Языки</h4>
                          <div className="flex flex-wrap gap-1">
                            {currentTeacher?.languages?.map((language, index) => (
                              <Badge key={index} variant="secondary" className="text-xs h-5">
                                {language}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground mb-1">Уровни</h4>
                          <div className="flex flex-wrap gap-1">
                            {currentTeacher?.levels?.map((level, index) => (
                              <Badge key={index} variant="outline" className="text-xs h-5">
                                {level}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Resume */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">О преподавателе</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {currentTeacher?.resume}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Comments */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Комментарии</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {currentTeacher?.comments}
                        </p>
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
        {activeTab === 'диалог' && (
          <div className="border-t p-3 shrink-0">
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
                      handleSendMessage();
                    }
                  }}
                />
                <div className="flex items-center gap-1 mt-2">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setShowQuickResponsesModal(true)}>
                    <Zap className="h-4 w-4" />
                  </Button>
                  <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={!message.trim()}>
                        <Clock className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Запланировать сообщение</DialogTitle>
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
              <Button size="icon" className="rounded-full h-10 w-10 shrink-0" onClick={handleSendMessage} disabled={!message.trim() || !clientId || whatsappLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <QuickResponsesModal
              open={showQuickResponsesModal}
              onOpenChange={setShowQuickResponsesModal}
              onSelectResponse={(text) => setMessage((prev) => (prev ? `${prev} ${text}` : text))}
            />
          </div>
        )}
      </div>
    </div>
  );
};