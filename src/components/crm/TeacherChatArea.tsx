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
import { useToast } from '@/hooks/use-toast';
import { ChatArea } from './ChatArea';
import { TeacherSchedulePanel } from './TeacherSchedulePanel';
import { TeacherChatList } from './TeacherChatList';

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
  const [pinCounts, setPinCounts] = useState<Record<string, number>>({});
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);
  const [userBranch, setUserBranch] = useState<string | null>(null);
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  const isMobile = useIsMobile();

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
  const handleMarkUnread = useCallback((teacherId: string) => {
    toast({
      title: "Отмечено непрочитанным",
      description: "Чат отмечен как непрочитанный",
    });
  }, [toast]);

  const handleMarkRead = useCallback((teacherId: string) => {
    toast({
      title: "Отмечено прочитанным", 
      description: "Чат отмечен как прочитанный",
    });
  }, [toast]);

  const handlePinDialog = useCallback((teacherId: string) => {
    setPinCounts(prev => ({
      ...prev,
      [teacherId]: (prev[teacherId] || 0) > 0 ? 0 : 1
    }));
    const isPinned = (pinCounts[teacherId] || 0) > 0;
    toast({
      title: isPinned ? "Диалог откреплён" : "Диалог закреплён",
      description: isPinned ? "Чат убран из закреплённых" : "Чат добавлен в закреплённые",
    });
  }, [pinCounts, toast]);

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
        <div className="flex flex-col h-full min-h-0 bg-background">
          <TeacherChatList {...teacherListProps} />
        </div>
      );
    }

    // Show chat (mobile) - use standard ChatArea
    if (!resolvedClientId) {
      return (
        <div className="flex flex-col h-full min-h-0 bg-background">
          <div className="border-b shrink-0 bg-background p-2">
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 p-0"
                onClick={() => onSelectTeacher(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">Загрузка...</span>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
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
          // Loading state
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4" />
              <Skeleton className="h-4 w-32 mx-auto mb-2" />
              <Skeleton className="h-3 w-24 mx-auto" />
            </div>
          </div>
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
