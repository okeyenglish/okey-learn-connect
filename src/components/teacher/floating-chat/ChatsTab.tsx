import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users, User, Building2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

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
          teachers (
            id,
            first_name,
            last_name,
            subjects
          )
        `)
        .in('branch_id', branchIds)
        .neq('teacher_id', teacherId);

      if (error) throw error;

      // Убираем дубликаты
      const uniqueTeachers = new Map();
      (data || []).forEach(tb => {
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
    refetchInterval: 10000,
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

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="chats" className="flex flex-col h-full">
        <TabsList className="grid w-full grid-cols-3 mx-2 mt-2">
          <TabsTrigger value="chats" className="text-xs">
            Чаты
            {threads.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {threads.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="branches" className="text-xs">
            Филиалы
            {teacherBranches.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {teacherBranches.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="teachers" className="text-xs">
            Коллеги
            {colleagues.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {colleagues.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chats" className="flex-1 mt-0">
          {threads.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
              <MessageSquare className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg mb-2">Нет активных чатов</h3>
              <p className="text-sm text-muted-foreground max-w-[280px]">
                Начните диалог с коллегами или филиалом
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-2">
                {threads.map((thread) => (
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
        </TabsContent>

        <TabsContent value="branches" className="flex-1 mt-0">
          {teacherBranches.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
              <Building2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg mb-2">Нет доступных филиалов</h3>
              <p className="text-sm text-muted-foreground max-w-[280px]">
                Филиалы появятся после назначения
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-2">
                {teacherBranches.map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => startChatWithBranch(branch)}
                    className="w-full p-3 rounded-lg hover:bg-muted/50 transition-colors text-left border-b last:border-b-0"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-brand">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">
                          {branch.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Чат с администрацией филиала
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="teachers" className="flex-1 mt-0">
          {colleagues.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
              <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg mb-2">Нет коллег</h3>
              <p className="text-sm text-muted-foreground max-w-[280px]">
                Список преподавателей из ваших филиалов
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-2">
                {colleagues.map((teacher) => (
                  <button
                    key={teacher.id}
                    onClick={() => startChatWithTeacher(teacher)}
                    className="w-full p-3 rounded-lg hover:bg-muted/50 transition-colors text-left border-b last:border-b-0"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-muted-foreground">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">
                          {teacher.first_name} {teacher.last_name}
                        </h4>
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
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Футер с информацией */}
      <div className="p-4 border-t bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          Полнофункциональные чаты скоро будут доступны
        </p>
      </div>
    </div>
  );
};