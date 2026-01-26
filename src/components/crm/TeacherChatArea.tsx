import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Users, Calendar, Pin, ArrowLeft, Phone, MoreVertical, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/typedClient';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTeacherChats, useEnsureTeacherClient, TeacherChatItem } from '@/hooks/useTeacherChats';
import { TeacherListItem } from './TeacherListItem';
import { ChatArea } from './ChatArea';

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
  const filteredTeachers = teachers.filter((teacher) => {
    const q = searchQuery.toLowerCase();
    return (teacher.fullName || '').toLowerCase().includes(q) ||
           ((teacher.branch || '').toLowerCase().includes(q));
  });

  const selectedTeacher = selectedTeacherId ? teachers.find((t) => t.id === selectedTeacherId) : null;
  const isGroupChat = selectedTeacherId === 'teachers-group';
  const currentTeacher = isGroupChat ? null : selectedTeacher;

  // Get display data for ChatArea
  const clientName = isGroupChat 
    ? 'Чат педагогов' 
    : currentTeacher?.fullName || 'Преподаватель';
  const clientPhone = currentTeacher?.phone || '';

  // Teacher List Component
  const TeacherList = ({ className = '' }: { className?: string }) => (
    <div className={`flex flex-col overflow-hidden ${className}`}>
      <div className="p-2 border-b border-border shrink-0">
        <div className="flex gap-1">
          <div className="flex-1 relative">
            <Input
              placeholder="Поиск по чатам..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-sm pr-8"
            />
            <Search className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 px-0 rounded-lg border border-muted text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 overflow-hidden">
        <div className="overflow-hidden">
          {isLoadingTeachers ? (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-2 rounded-lg mb-0.5 border bg-card">
                  <div className="flex items-start gap-2">
                    <Skeleton className="w-9 h-9 rounded-full" />
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
              <button
                onClick={() => onSelectTeacher('teachers-group')}
                className={`w-full text-left p-2 rounded-lg transition-all duration-200 relative mb-0.5 border ${
                  selectedTeacherId === 'teachers-group'
                    ? 'bg-accent/50 shadow-sm border-accent'
                    : 'bg-card hover:bg-accent/30 hover:shadow-sm border-border/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className="h-9 w-9 flex-shrink-0 ring-2 ring-border/30 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary">
                      ЧП
                    </div>
                    
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-1.5 mb-0">
                        <p className="text-sm font-medium truncate">
                          Чат педагогов
                        </p>
                        {pinCounts['teachers-group'] > 0 && (
                          <Pin className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                        Общий чат всех преподавателей
                      </p>
                    </div>
                  </div>
                </div>
              </button>

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
  );

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
          <TeacherList />
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
        onBackToList={() => onSelectTeacher(null)}
        managerName="Вы"
      />
    );
  }

  // Desktop view: show both teacher list and chat
  return (
    <div className="h-full flex-1 min-h-0 min-w-0 overflow-hidden flex isolate">
      {/* Compact Teachers List - fixed width */}
      <TeacherList className="w-[345px] max-w-[345px] shrink-0 border-r border-border" />

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
          // Teacher chat with tabs
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div className="p-3 border-b border-border bg-background shrink-0">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-medium text-xs">
                        {isGroupChat ? 'ЧП' : `${currentTeacher?.firstName?.[0] || ''}${currentTeacher?.lastName?.[0] || ''}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-foreground truncate">
                      {clientName}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {isGroupChat 
                        ? 'Общий чат всех преподавателей' 
                        : `${currentTeacher?.branch || ''} ${clientPhone ? '• ' + clientPhone : ''}`
                      }
                    </p>
                  </div>
                </div>
                
                {!isGroupChat && clientPhone && (
                  <div className="flex items-center space-x-1 shrink-0">
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0">
                      <Phone className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="shrink-0 px-3 border-b">
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
                  managerName="Вы"
                />
              </TabsContent>

              <TabsContent value="расписание" className="h-full m-0">
                <ScrollArea className="h-full p-3">
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    {isGroupChat 
                      ? 'Общее расписание всех преподавателей'
                      : 'Расписание преподавателя будет доступно позже'
                    }
                  </div>
                </ScrollArea>
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
