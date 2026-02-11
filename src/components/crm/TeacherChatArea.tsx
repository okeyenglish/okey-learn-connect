import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Users, Calendar, ArrowLeft, Phone, MessageSquare } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/typedClient';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTeacherChats, useEnsureTeacherClient, TeacherChatItem } from '@/hooks/useTeacherChats';
import { useTeacherConversations } from '@/hooks/useTeacherConversations';
import { useTeacherPinnedDB } from '@/hooks/useTeacherPinnedDB';
import { useSharedTeacherChatStates } from '@/hooks/useSharedTeacherChatStates';
import { useToast } from '@/hooks/use-toast';
import { ChatArea } from './ChatArea';
import { TeacherSchedulePanel } from './TeacherSchedulePanel';
import { TeacherChatList } from './TeacherChatList';
import { TeacherChatSkeleton } from './TeacherChatSkeleton';
import { DeleteChatDialog } from './DeleteChatDialog';
import { useAuth } from '@/hooks/useAuth';

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
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);
  const [userBranch, setUserBranch] = useState<string | null>(null);
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteTeacherDialog, setDeleteTeacherDialog] = useState<{
    open: boolean;
    teacherId: string;
    teacherName: string;
  }>({ open: false, teacherId: '', teacherName: '' });
  const [isDeletingTeacher, setIsDeletingTeacher] = useState(false);
  
  const queryClient = useQueryClient();
  
  // Cache for resolved client IDs to avoid repeated lookups
  const clientIdCache = React.useRef<Map<string, string>>(new Map());
  
  // Pinned teachers - persisted in DB per user
  const { 
    pinnedIds: pinnedTeacherIds, 
    togglePin, 
    getPinCounts,
    loading: pinnedLoading 
  } = useTeacherPinnedDB();
  
  // Convert to pinCounts format for compatibility with TeacherChatList
  const pinCounts = useMemo(() => getPinCounts(), [getPinCounts]);
  
  const isMobile = useIsMobile();
  const { profile } = useAuth();

  // Set user branch from auth context
  useEffect(() => {
    const authProfile = profile as any;
    if (authProfile?.branch) {
      setUserBranch(authProfile.branch);
    }
  }, [profile]);

  // Load teachers from teachers table using new hook
  const { teachers: dbTeachers, isLoading: isLoadingTeachers, totalTeachers, refetch: refetchTeachers } = useTeacherChats(null);
  const { findOrCreateClient } = useEnsureTeacherClient();
  
  // Also load teacher conversations data (uses teacher_id directly in chat_messages)
  // This works on self-hosted where messages are stored with teacher_id
  const { conversations: teacherConversations, refetch: refetchConversations } = useTeacherConversations();
  
  // Merge teacher conversations data into dbTeachers for display
  const teachersWithMessages = useMemo(() => {
    if (!dbTeachers) return [];
    
    // Build a map of teacher_id -> conversation data
    const conversationMap = new Map<string, typeof teacherConversations[0]>();
    (teacherConversations || []).forEach(conv => {
      conversationMap.set(conv.teacherId, conv);
    });
    
    // Merge conversation data into teacher records
    return dbTeachers.map(teacher => {
      const conv = conversationMap.get(teacher.id);
      if (conv) {
        // Use conversation data if available
        return {
          ...teacher,
          unreadMessages: conv.unreadCount,
          lastMessageTime: conv.lastMessageTime,
          lastMessageText: conv.lastMessageText,
          lastMessengerType: conv.lastMessengerType,
          lastSeen: conv.lastMessageTime 
            ? new Date(conv.lastMessageTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
            : teacher.lastSeen,
          // Set a special marker for direct teacher_id messages
          // PRIORITY: If teacher has messages via teacher_id, always use the marker
          clientId: conv.lastMessageTime 
            ? `teacher:${teacher.id}` 
            : (teacher.clientId || null),
        };
      }
      return teacher;
    });
  }, [dbTeachers, teacherConversations]);
  
  // Combined refetch function for both data sources
  const refetchAllTeacherData = useCallback(() => {
    refetchTeachers();
    refetchConversations();
    // Also invalidate system chat messages for the preview in main CRM list
    queryClient.invalidateQueries({ queryKey: ['teacher-conversations'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-chats'] });
  }, [refetchTeachers, refetchConversations, queryClient]);
  
  // Real-time subscription for teacher messages - updates preview and sorting
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null;
    
    const debouncedRefetch = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        refetchAllTeacherData();
        debounceTimer = null;
      }, 500); // 500ms debounce to avoid too many refetches
    };
    
    // Subscribe to all chat_messages changes - filter by teacher_id in callback
    const channel = supabase
      .channel('teacher-chat-area-realtime')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages'
        },
        (payload) => {
          // Check if message is for a teacher (has teacher_id)
          const newRecord = payload.new as Record<string, unknown>;
          if (newRecord && newRecord.teacher_id) {
            console.log('[TeacherChatArea] New teacher message, refreshing list');
            debouncedRefetch();
          }
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'chat_messages'
        },
        (payload) => {
          // Check if message is for a teacher
          const newRecord = payload.new as Record<string, unknown>;
          if (newRecord && newRecord.teacher_id) {
            debouncedRefetch();
          }
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      supabase.removeChannel(channel);
    };
  }, [refetchAllTeacherData]);
  
  // Get all teacher IDs for shared states hook
  const teacherIds = useMemo(() => dbTeachers?.map(t => t.id) || [], [dbTeachers]);
  
  // Get shared states (in work by others)
  const { isInWorkByOthers, getPinnedByUserName } = useSharedTeacherChatStates(teacherIds);

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

  // Resolve clientId for selected teacher - optimized with caching
  // Wrapped in try/catch to prevent unhandled async errors from crashing the UI
  useEffect(() => {
    const resolve = async () => {
      try {
        if (!selectedTeacherId) { 
          setResolvedClientId(null); 
          return; 
        }
        
        console.log('[TeacherChatArea] Resolving clientId for teacher:', selectedTeacherId);
        
        // Check cache first for instant resolution
        const cached = clientIdCache.current.get(selectedTeacherId);
        if (cached) {
          console.log('[TeacherChatArea] Using cached clientId:', cached);
          setResolvedClientId(cached);
          return;
        }
        
        if (selectedTeacherId === 'teachers-group') {
          // Group chat for the user's branch
          if (!userBranch) { 
            // Don't wait for branch - will resolve when branch loads
            return; 
          }
          const nameToFind = `Чат педагогов - ${userBranch}`;
          const id = await ensureClient(nameToFind, userBranch);
          if (id) {
            clientIdCache.current.set(selectedTeacherId, id);
            setResolvedClientId(id);
          }
          return;
        }

        // Find teacher by id and get their clientId
        const teacher = teachersWithMessages.find(t => t.id === selectedTeacherId);
        if (!teacher) { 
          console.log('[TeacherChatArea] Teacher not found yet, waiting for load');
          // Teacher not loaded yet - will resolve when teachers load
          return; 
        }

        console.log('[TeacherChatArea] Found teacher:', { 
          id: teacher.id, 
          clientId: teacher.clientId, 
          lastMessageTime: teacher.lastMessageTime 
        });

        // If teacher already has a linked client, use it immediately
        if (teacher.clientId) {
          // Check if this is a direct teacher message marker (teacher:xxx)
          if (teacher.clientId.startsWith('teacher:')) {
            // Direct teacher messages - use the special marker
            clientIdCache.current.set(selectedTeacherId, teacher.clientId);
            setResolvedClientId(teacher.clientId);
            return;
          }
          
          clientIdCache.current.set(selectedTeacherId, teacher.clientId);
          setResolvedClientId(teacher.clientId);
          return;
        }
        
        // Check if teacher has messages via teacher_id (lastMessageTime set but no clientId)
        if (teacher.lastMessageTime) {
          // Teacher has messages directly via teacher_id - use special marker
          const directMarker = `teacher:${selectedTeacherId}`;
          console.log('[TeacherChatArea] Using direct teacher marker:', directMarker);
          clientIdCache.current.set(selectedTeacherId, directMarker);
          setResolvedClientId(directMarker);
          return;
        }

        // Otherwise, find or create a client for this teacher (slower path)
        const clientId = await findOrCreateClient(teacher);
        if (clientId) {
          clientIdCache.current.set(selectedTeacherId, clientId);
          setResolvedClientId(clientId);
        }
      } catch (error) {
        // Log and gracefully handle errors to prevent white screen
        console.error('[TeacherChatArea] Error resolving clientId:', error);
        setResolvedClientId(null);
        // Don't crash the UI - just leave the chat unresolved
      }
    };
    
    resolve();
  }, [selectedTeacherId, userBranch, teachersWithMessages, findOrCreateClient]);

  const teachers = teachersWithMessages || [];
  
  // Extract unique branches and subjects for filters
  const uniqueBranches = useMemo(() => {
    const branches = new Set<string>();
    teachers.forEach(t => {
      if (t.branch) branches.add(t.branch);
    });
    return Array.from(branches).sort();
  }, [teachers]);

  const uniqueSubjects = useMemo(() => {
    const subjects = new Set<string>();
    teachers.forEach(t => {
      t.subjects?.forEach(s => subjects.add(s));
    });
    return Array.from(subjects).sort();
  }, [teachers]);

  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>();
    teachers.forEach(t => {
      t.categories?.forEach(c => categories.add(c));
    });
    return Array.from(categories).sort();
  }, [teachers]);

  const activeFiltersCount = (filterBranch !== 'all' ? 1 : 0) + (filterSubject !== 'all' ? 1 : 0) + (filterCategory !== 'all' ? 1 : 0);

  const filteredTeachers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return teachers.filter((teacher) => {
      // Search filter - search by ФИО (fullName, firstName, lastName) and phone/email
      if (q) {
        const qDigits = q.replace(/\D/g, '');
        const isPhoneQuery = qDigits.length >= 3 && /^\d+$/.test(q.replace(/[\s\+\-\(\)]/g, ''));
        
        const matchesName = 
          (teacher.fullName || '').toLowerCase().includes(q) ||
          (teacher.firstName || '').toLowerCase().includes(q) ||
          (teacher.lastName || '').toLowerCase().includes(q);
        
        const matchesPhone = isPhoneQuery && 
          (teacher.phone || '').replace(/\D/g, '').includes(qDigits);
        
        const matchesOther = 
          (teacher.branch || '').toLowerCase().includes(q) ||
          (teacher.email || '').toLowerCase().includes(q);
        
        if (!matchesName && !matchesPhone && !matchesOther) return false;
      }

      // Branch filter
      if (filterBranch !== 'all' && teacher.branch !== filterBranch) return false;

      // Subject filter
      if (filterSubject !== 'all' && !teacher.subjects?.includes(filterSubject)) return false;

      // Category filter
      if (filterCategory !== 'all' && !teacher.categories?.includes(filterCategory)) return false;

      return true;
    });
  }, [teachers, searchQuery, filterBranch, filterSubject, filterCategory]);

  const selectedTeacher = selectedTeacherId ? teachers.find((t) => t.id === selectedTeacherId) : null;
  const isGroupChat = selectedTeacherId === 'teachers-group';
  const currentTeacher = isGroupChat ? null : selectedTeacher;

  // Get display data for ChatArea
  const clientName = isGroupChat 
    ? 'Чат педагогов' 
    : currentTeacher?.fullName || 'Преподаватель';
  const clientPhone = currentTeacher?.phone || '';

  const clearFilters = () => {
    setFilterBranch('all');
    setFilterSubject('all');
    setFilterCategory('all');
  };

  const { toast } = useToast();

  // Context menu handlers
  const handleMarkUnread = useCallback(async (teacherId: string) => {
    try {
      // Find the latest incoming message using teacher_id directly
      const { data: latestMessage, error: findError } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('teacher_id', teacherId)
        .eq('direction', 'incoming')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (findError || !latestMessage) {
        console.error('Error finding latest message:', findError);
        toast({
          title: "Ошибка",
          description: "Нет входящих сообщений для отметки",
          variant: "destructive",
        });
        return;
      }
      
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_read: false })
        .eq('id', latestMessage.id);
      
      if (error) {
        console.error('Error marking as unread:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось отметить как непрочитанное",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Отмечено непрочитанным",
        description: "Чат отмечен как непрочитанный",
      });
      
      refetchAllTeacherData();
    } catch (error) {
      console.error('Error in handleMarkUnread:', error);
    }
  }, [toast, refetchAllTeacherData]);

  const handleMarkRead = useCallback(async (teacherId: string) => {
    try {
      // Mark all unread messages as read using teacher_id directly
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('teacher_id', teacherId)
        .eq('direction', 'incoming')
        .or('is_read.is.null,is_read.eq.false');
      
      if (error) {
        console.error('Error marking as read:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось отметить как прочитанное",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Отмечено прочитанным",
        description: "Чат отмечен как прочитанный",
      });
      
      refetchAllTeacherData();
    } catch (error) {
      console.error('Error in handleMarkRead:', error);
    }
  }, [toast, refetchAllTeacherData]);

  const handlePinDialog = useCallback(async (teacherId: string) => {
    const isPinned = pinnedTeacherIds.has(teacherId);
    
    const success = await togglePin(teacherId);
    
    if (success) {
      toast({
        title: isPinned ? "Диалог откреплён" : "Диалог закреплён",
        description: isPinned ? "Чат убран из закреплённых" : "Чат добавлен в закреплённые",
      });
    } else {
      toast({
        title: "Ошибка",
        description: "Не удалось изменить закрепление",
        variant: "destructive",
      });
    }
  }, [pinnedTeacherIds, togglePin, toast]);

  const handleDeleteChat = useCallback((teacherId: string) => {
    const teacher = dbTeachers?.find(t => t.id === teacherId);
    const teacherName = teacher 
      ? `${teacher.lastName || ''} ${teacher.firstName || ''}`.trim() || 'Преподаватель'
      : 'Преподаватель';
    setDeleteTeacherDialog({ open: true, teacherId, teacherName });
  }, [dbTeachers]);

  const confirmDeleteTeacher = useCallback(async () => {
    if (!deleteTeacherDialog.teacherId) return;
    setIsDeletingTeacher(true);
    try {
      const { error } = await supabase
        .from('teachers')
        .update({ is_active: false })
        .eq('id', deleteTeacherDialog.teacherId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['teacher-chats'] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      
      if (selectedTeacherId === deleteTeacherDialog.teacherId) {
        onSelectTeacher(null);
      }
      
      setDeleteTeacherDialog({ open: false, teacherId: '', teacherName: '' });
      toast({
        title: "Преподаватель деактивирован",
        description: `"${deleteTeacherDialog.teacherName}" удалён из списка`,
      });
    } catch (error) {
      console.error('Error deactivating teacher:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось деактивировать преподавателя",
        variant: "destructive",
      });
    } finally {
      setIsDeletingTeacher(false);
    }
  }, [deleteTeacherDialog, selectedTeacherId, onSelectTeacher, queryClient, toast]);

  const teacherListProps = {
    isLoading: isLoadingTeachers,
    filteredTeachers,
    selectedTeacherId,
    pinCounts,
    onSelectTeacher,
    onMarkUnread: handleMarkUnread,
    onMarkRead: handleMarkRead,
    onPinDialog: handlePinDialog,
    onDelete: handleDeleteChat,
    isInWorkByOthers,
    getPinnedByUserName,
    searchQuery,
    setSearchQuery,
    showFilters,
    setShowFilters,
    activeFiltersCount,
    filterBranch,
    setFilterBranch,
    filterSubject,
    setFilterSubject,
    filterCategory,
    setFilterCategory,
    uniqueBranches,
    uniqueSubjects,
    uniqueCategories,
    clearFilters,
  };

  // Teacher Profile Panel
  const TeacherProfile = () => (
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
              <span className="text-xs">{currentTeacher?.phone || 'Не указан'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs">{currentTeacher?.email || 'Не указан'}</span>
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
      </div>
    </ScrollArea>
  );

  // Mobile view: show either teacher list or chat
  if (isMobile) {
    // Show teacher list
    if (!selectedTeacherId) {
      return (
        <div className="flex flex-col h-full w-full min-h-0 bg-background">
          <TeacherChatList {...teacherListProps} className="w-full" />
        </div>
      );
    }

    // Show chat loading skeleton (mobile)
    if (!resolvedClientId) {
      return (
        <TeacherChatSkeleton 
          showBackButton={true} 
          onBack={() => onSelectTeacher(null)} 
        />
      );
    }

    return (
      <ChatArea
        clientId={resolvedClientId}
        clientName={clientName}
        clientPhone={clientPhone}
        messagesSource="teacher"
        onBackToList={() => onSelectTeacher(null)}
        managerName="Вы"
        simplifiedToolbar={true}
      />
    );
  }

  // Desktop view: show both teacher list and chat
  return (
    <div className="h-full flex-1 min-h-0 min-w-0 overflow-hidden flex isolate">
      {/* Compact Teachers List - fixed width */}
      <TeacherChatList
        {...teacherListProps}
        className="w-[345px] max-w-[345px] shrink-0 border-r border-border"
      />

      {/* Chat Area - flexible width */}
      <div className="w-0 flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">
        {!selectedTeacherId ? (
          // No teacher selected placeholder
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground max-w-sm mx-auto">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Выберите преподавателя</h3>
              <p className="text-sm">
                Выберите преподавателя из списка слева, чтобы начать переписку
              </p>
            </div>
          </div>
        ) : !resolvedClientId ? (
          // Full chat skeleton loading state
          <TeacherChatSkeleton />
        ) : (
          // Teacher chat with tabs for Schedule/Profile, direct ChatArea for messages
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            {/* Tabs header */}
            <div className="shrink-0 px-3 border-b bg-background">
              <TabsList className="grid w-full grid-cols-3 mt-2 mb-2 h-8">
                <TabsTrigger value="диалог" className="text-xs">Диалог</TabsTrigger>
                <TabsTrigger value="расписание" className="text-xs">Расписание</TabsTrigger>
                <TabsTrigger value="профиль" className="text-xs">О преподавателе</TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <TabsContent value="диалог" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <ChatArea
                  clientId={resolvedClientId}
                  clientName={clientName}
                  clientPhone={clientPhone}
                  messagesSource="teacher"
                  managerName="Вы"
                  simplifiedToolbar={true}
                />
              </TabsContent>

              <TabsContent value="расписание" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                {isGroupChat ? (
                  <ScrollArea className="h-full p-3">
                    <div className="text-center py-8">
                      <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">Общее расписание всех преподавателей</p>
                    </div>
                  </ScrollArea>
                ) : currentTeacher ? (
                  <TeacherSchedulePanel 
                    teacherId={currentTeacher.id} 
                    teacherName={currentTeacher.fullName}
                  />
                ) : null}
              </TabsContent>

              <TabsContent value="профиль" className="h-full m-0">
                {isGroupChat ? (
                  <ScrollArea className="h-full p-3">
                    <div className="text-center py-8">
                      <Users className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">Информация о группе педагогов</p>
                    </div>
                  </ScrollArea>
                ) : (
                  <TeacherProfile />
                )}
              </TabsContent>
            </div>
          </Tabs>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <DeleteChatDialog
        open={deleteTeacherDialog.open}
        onOpenChange={(open) => setDeleteTeacherDialog(prev => ({ ...prev, open }))}
        chatName={deleteTeacherDialog.teacherName}
        onConfirm={confirmDeleteTeacher}
        isDeleting={isDeletingTeacher}
      />
    </div>
  );
};
