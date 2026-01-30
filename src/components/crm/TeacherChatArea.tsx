import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { useTeacherPinnedDB } from '@/hooks/useTeacherPinnedDB';
import { useSharedTeacherChatStates } from '@/hooks/useSharedTeacherChatStates';
import { useToast } from '@/hooks/use-toast';
import { ChatArea } from './ChatArea';
import { TeacherSchedulePanel } from './TeacherSchedulePanel';
import { TeacherChatList } from './TeacherChatList';
import { TeacherChatSkeleton } from './TeacherChatSkeleton';
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
  useEffect(() => {
    const resolve = async () => {
      if (!selectedTeacherId) { 
        setResolvedClientId(null); 
        return; 
      }
      
      // Check cache first for instant resolution
      const cached = clientIdCache.current.get(selectedTeacherId);
      if (cached) {
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
      const teacher = dbTeachers.find(t => t.id === selectedTeacherId);
      if (!teacher) { 
        // Teacher not loaded yet - will resolve when teachers load
        return; 
      }

      // If teacher already has a linked client, use it immediately
      if (teacher.clientId) {
        clientIdCache.current.set(selectedTeacherId, teacher.clientId);
        setResolvedClientId(teacher.clientId);
        return;
      }

      // Otherwise, find or create a client for this teacher (slower path)
      const clientId = await findOrCreateClient(teacher);
      if (clientId) {
        clientIdCache.current.set(selectedTeacherId, clientId);
        setResolvedClientId(clientId);
      }
    };
    
    resolve();
  }, [selectedTeacherId, userBranch, dbTeachers, findOrCreateClient]);

  const teachers = dbTeachers || [];
  
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
    return teachers.filter((teacher) => {
      // Search filter - search by name, branch, phone, email
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesSearch = 
          (teacher.fullName || '').toLowerCase().includes(q) ||
          (teacher.firstName || '').toLowerCase().includes(q) ||
          (teacher.lastName || '').toLowerCase().includes(q) ||
          (teacher.branch || '').toLowerCase().includes(q) ||
          (teacher.phone || '').replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
          (teacher.email || '').toLowerCase().includes(q);
        if (!matchesSearch) return false;
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
    // Find the teacher to get their clientId
    const teacher = teachers.find(t => t.id === teacherId);
    const clientId = teacher?.clientId;
    
    if (!clientId) {
      toast({
        title: "Ошибка",
        description: "Не удалось найти клиента для этого преподавателя",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // First, find the latest incoming message
      const { data: latestMessage, error: findError } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('client_id', clientId)
        // In self-hosted schema incoming messages are marked by is_outgoing = false
        .eq('is_outgoing', false)
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
      
      // Now update that specific message
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
      
      // Invalidate queries to refresh UI
      refetchTeachers();
    } catch (error) {
      console.error('Error in handleMarkUnread:', error);
    }
  }, [teachers, toast, refetchTeachers]);

  const handleMarkRead = useCallback(async (teacherId: string) => {
    // Find the teacher to get their clientId
    const teacher = teachers.find(t => t.id === teacherId);
    const clientId = teacher?.clientId;
    
    if (!clientId) {
      toast({
        title: "Ошибка",
        description: "Не удалось найти клиента для этого преподавателя",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Mark all unread messages as read
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('client_id', clientId)
        // In self-hosted schema incoming messages are marked by is_outgoing = false
        .eq('is_outgoing', false)
        // Some rows may have NULL is_read; treat them as unread too
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
      
      // Invalidate queries to refresh UI
      refetchTeachers();
    } catch (error) {
      console.error('Error in handleMarkRead:', error);
    }
  }, [teachers, toast, refetchTeachers]);

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
    toast({
      title: "Удаление чата",
      description: "Функция удаления в разработке",
      variant: "destructive",
    });
  }, [toast]);

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
    </div>
  );
};
