import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users, User, Building2, Search, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

interface ChatsTabProps {
  teacherId: string;
}

interface ChatThread {
  id: string;
  type: 'group' | 'student' | 'staff' | 'branch';
  title: string;
  participants: string[];
  updated_at: string;
  unread_count?: number;
  last_message?: string;
}

interface Branch {
  id: string;
  name: string;
  organization_id: string;
}

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  subjects: string[];
}

export const ChatsTab = ({ teacherId }: ChatsTabProps) => {
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);

  // Получаем филиалы преподавателя
  const { data: teacherBranches = [] } = useQuery({
    queryKey: ['teacher-branches', teacherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_branches')
        .select(`
          branch_id,
          organization_branches (
            id,
            name,
            organization_id
          )
        `)
        .eq('teacher_id', teacherId);

      if (error) throw error;
      
      return (data || []).map(tb => ({
        id: tb.organization_branches?.id,
        name: tb.organization_branches?.name,
        organization_id: tb.organization_branches?.organization_id,
      })).filter(b => b.id) as Branch[];
    },
  });

  // Получаем всех преподавателей из филиалов
  const { data: colleagues = [] } = useQuery({
    queryKey: ['branch-teachers', teacherId, teacherBranches],
    queryFn: async () => {
      if (teacherBranches.length === 0) return [];

      const branchIds = teacherBranches.map(b => b.id);
      
      const { data, error } = await supabase
        .from('teacher_branches')
        .select(`
          teacher_id,
          teachers!inner (
            id,
            first_name,
            last_name,
            subjects
          )
        `)
        .in('branch_id', branchIds)
        .neq('teacher_id', teacherId);

      if (error) {
        console.error('Error fetching colleagues:', error);
        return [];
      }

      // Убираем дубликаты
      const uniqueTeachers = new Map();
      (data || []).forEach((tb: any) => {
        if (tb.teachers && !uniqueTeachers.has(tb.teachers.id)) {
          uniqueTeachers.set(tb.teachers.id, tb.teachers);
        }
      });

      return Array.from(uniqueTeachers.values()) as Teacher[];
    },
    enabled: teacherBranches.length > 0,
  });

  // Получаем список чатов
  const { data: threads = [] } = useQuery({
    queryKey: ['chat-threads', teacherId],
    queryFn: async () => {
      const { data } = await supabase
        .from('chat_threads')
        .select('*')
        .contains('participants', [teacherId])
        .order('updated_at', { ascending: false });

      // Для каждого чата получаем последнее сообщение и кол-во непрочитанных
      const threadsWithDetails = await Promise.all(
        (data || []).map(async (thread) => {
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('text')
            .eq('thread_id', thread.id)
            .eq('thread_type', 'chat')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', thread.id)
            .eq('thread_type', 'chat')
            .neq('author_id', teacherId)
            .in('status', ['sent', 'delivered']);

          return {
            ...thread,
            last_message: lastMessage?.text,
            unread_count: unreadCount || 0,
          };
        })
      );

      return threadsWithDetails as ChatThread[];
    },
    refetchInterval: 60000, // 1 минута - realtime обрабатывает срочные обновления
  });

  const getThreadIcon = (type: string) => {
    switch (type) {
      case 'group':
        return <Users className="h-5 w-5" />;
      case 'student':
        return <User className="h-5 w-5" />;
      case 'branch':
        return <Building2 className="h-5 w-5" />;
      default:
        return <MessageSquare className="h-5 w-5" />;
    }
  };

  const startChatWithTeacher = async (teacher: Teacher) => {
    // TODO: Создать или открыть чат с преподавателем
    console.log('Start chat with teacher:', teacher);
  };

  const startChatWithBranch = async (branch: Branch) => {
    // TODO: Создать или открыть чат с филиалом
    console.log('Start chat with branch:', branch);
  };

  // Фильтрация по поисковому запросу
  const filteredThreads = threads.filter(thread => {
    const query = searchQuery.toLowerCase();
    return (
      thread.title?.toLowerCase().includes(query) ||
      thread.last_message?.toLowerCase().includes(query)
    );
  });

  const filteredBranches = teacherBranches.filter(branch => {
    const query = searchQuery.toLowerCase();
    return branch.name?.toLowerCase().includes(query);
  });

  const filteredColleagues = colleagues.filter(teacher => {
    const query = searchQuery.toLowerCase();
    const fullName = `${teacher.first_name} ${teacher.last_name}`.toLowerCase();
    const subjects = teacher.subjects?.join(' ').toLowerCase() || '';
    return fullName.includes(query) || subjects.includes(query);
  });

  return (
    <div className="flex flex-col h-full">
      {/* Поиск и кнопка создания чата */}
      <div className="p-3 bg-muted/30">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Поиск по чатам..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Popover open={newChatOpen} onOpenChange={setNewChatOpen}>
            <PopoverTrigger asChild>
              <Button size="icon" variant="outline" className="h-9 w-9 flex-shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-3 border-b">
                <h4 className="font-semibold text-sm">Начать новый чат</h4>
              </div>
              <ScrollArea className="h-[400px]">
                {/* Филиалы */}
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <h5 className="text-xs font-medium text-muted-foreground uppercase">
                      Филиалы ({filteredBranches.length})
                    </h5>
                  </div>
                  {filteredBranches.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      Нет доступных филиалов
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {filteredBranches.map((branch) => (
                        <button
                          key={branch.id}
                          onClick={() => {
                            startChatWithBranch(branch);
                            setNewChatOpen(false);
                          }}
                          className="w-full p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-brand">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {branch.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Чат с администрацией
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Коллеги */}
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <h5 className="text-xs font-medium text-muted-foreground uppercase">
                      Коллеги ({filteredColleagues.length})
                    </h5>
                  </div>
                  {filteredColleagues.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      Нет коллег в ваших филиалах
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {filteredColleagues.map((teacher) => (
                        <button
                          key={teacher.id}
                          onClick={() => {
                            startChatWithTeacher(teacher);
                            setNewChatOpen(false);
                          }}
                          className="w-full p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-muted-foreground">
                              <User className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {teacher.first_name} {teacher.last_name}
                              </p>
                              {teacher.subjects && teacher.subjects.length > 0 && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {teacher.subjects.join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Список чатов */}
      <div className="flex-1 overflow-hidden">
        {filteredThreads.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
            <MessageSquare className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              {searchQuery ? 'Ничего не найдено' : 'Нет активных чатов'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-[280px] mb-4">
              {searchQuery 
                ? 'Попробуйте изменить поисковый запрос'
                : 'Начните диалог с коллегами или филиалом'}
            </p>
            {!searchQuery && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setNewChatOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Создать чат
              </Button>
            )}
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-2">
              {filteredThreads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThread(thread.id)}
                  className="w-full p-3 rounded-lg hover:bg-muted/50 transition-colors text-left border-b last:border-b-0"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 text-muted-foreground">
                      {getThreadIcon(thread.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {thread.title || 'Без названия'}
                        </h4>
                        {thread.unread_count! > 0 && (
                          <span className="ml-2 min-w-[20px] h-5 px-1.5 bg-destructive text-white text-xs font-medium rounded-full flex items-center justify-center flex-shrink-0">
                            {thread.unread_count}
                          </span>
                        )}
                      </div>
                      {thread.last_message && (
                        <p className="text-xs text-muted-foreground truncate">
                          {thread.last_message}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(new Date(thread.updated_at), 'dd MMM, HH:mm', { locale: ru })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Футер с информацией */}
      <div className="p-4 border-t bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          Полнофункциональные чаты скоро будут доступны
        </p>
      </div>
    </div>
  );
};