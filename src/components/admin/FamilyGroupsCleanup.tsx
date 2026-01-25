import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseTyped as supabase } from '@/integrations/supabase/typedClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface FamilyGroupIssue {
  familyGroupId: string;
  familyGroupName: string;
  studentsCount: number;
  membersCount: number;
  students: Array<{
    id: string;
    name: string;
  }>;
  members: Array<{
    id: string;
    clientId: string;
    clientName: string;
    relationship: string;
  }>;
}

export const FamilyGroupsCleanup = () => {
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 200;

  // Fetch all family groups with potential issues
  const { data: issuesData, isLoading } = useQuery({
    queryKey: ['family-groups-issues', page],
    queryFn: async () => {
      // 1) Загружаем страницу групп
      const groupsRes = await supabase
        .from('family_groups')
        .select('id, name')
        .order('name', { ascending: true })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (groupsRes.error) throw groupsRes.error;
      const groups = groupsRes.data || [];
      const groupIds = groups.map(g => g.id);
      if (groupIds.length === 0) return [] as FamilyGroupIssue[];

      // 2) Загружаем только нужных студентов и членов семей по текущим группам
      const [studentsRes, membersRes] = await Promise.all([
        supabase
          .from('students')
          .select('id, name, family_group_id')
          .in('family_group_id', groupIds),
        supabase
          .from('family_members')
          .select(`
            id,
            family_group_id,
            client_id,
            relationship_type,
            clients:client_id (name)
          `)
          .in('family_group_id', groupIds)
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (membersRes.error) throw membersRes.error;

      // 3) Группируем локально
      const studentsByGroup = new Map<string, Array<{ id: string; name: string }>>();
      (studentsRes.data || []).forEach(s => {
        if (!studentsByGroup.has(s.family_group_id)) studentsByGroup.set(s.family_group_id, []);
        studentsByGroup.get(s.family_group_id)!.push({ id: s.id, name: s.name });
      });

      interface ClientInfo {
        name: string;
      }
      interface FamilyMemberRow {
        id: string;
        family_group_id: string;
        client_id: string;
        relationship_type: string;
        clients: ClientInfo | ClientInfo[] | null;
      }
      const membersByGroup = new Map<string, FamilyMemberRow[]>();
      const rawMembers = (membersRes.data || []) as unknown as FamilyMemberRow[];
      rawMembers.forEach(m => {
        if (!membersByGroup.has(m.family_group_id)) membersByGroup.set(m.family_group_id, []);
        membersByGroup.get(m.family_group_id)!.push(m);
      });

      const issues: FamilyGroupIssue[] = [];

      for (const group of groups) {
        const students = studentsByGroup.get(group.id) || [];
        const members = membersByGroup.get(group.id) || [];

        const studentsCount = students.length;
        const membersCount = members.length;

        const uniqueClientIds = new Set(members.map(m => m.client_id));
        const hasDuplicates = uniqueClientIds.size < membersCount;

        if (hasDuplicates || membersCount > 3) {
          issues.push({
            familyGroupId: group.id,
            familyGroupName: group.name,
            studentsCount,
            membersCount,
            students,
            members: members.map(m => ({
              id: m.id,
              clientId: m.client_id,
              clientName: (Array.isArray(m.clients) ? m.clients[0]?.name : m.clients?.name) || 'Неизвестно',
              relationship: m.relationship_type,
            })),
          });
        }
      }

      return issues;
    },
  });

  // Удаление дублирующихся записей для одной группы
  const removeDuplicates = useMutation({
    mutationFn: async (familyGroupId: string) => {
      const issue = issuesData?.find(i => i.familyGroupId === familyGroupId);
      if (!issue) return;

      // Группируем по client_id
      const clientGroups = new Map<string, typeof issue.members>();
      issue.members.forEach(member => {
        if (!clientGroups.has(member.clientId)) {
          clientGroups.set(member.clientId, []);
        }
        clientGroups.get(member.clientId)!.push(member);
      });

      // Для каждого client_id оставляем только одну запись
      const idsToDelete: string[] = [];
      clientGroups.forEach((membersList) => {
        if (membersList.length > 1) {
          // Оставляем первую запись, остальные удаляем
          idsToDelete.push(...membersList.slice(1).map(m => m.id));
        }
      });

      if (idsToDelete.length > 0) {
        const { error } = await supabase
          .from('family_members')
          .delete()
          .in('id', idsToDelete);

        if (error) throw error;
      }

      return idsToDelete.length;
    },
    onSuccess: (deletedCount) => {
      toast.success(`Удалено ${deletedCount} дубликатов`);
      queryClient.invalidateQueries({ queryKey: ['family-groups-issues'] });
      queryClient.invalidateQueries({ queryKey: ['student-details'] });
    },
    onError: (error) => {
      toast.error('Ошибка при удалении дубликатов: ' + error.message);
    },
  });

  // Удаление всех дубликатов сразу
  const removeAllDuplicates = useMutation({
    mutationFn: async () => {
      // Глобальная очистка по всей таблице family_members
      // 1) Получаем минимальные данные для дедупликации
      const { data, error } = await supabase
        .from('family_members')
        .select('id, family_group_id, client_id');
      if (error) throw error;

      const all = data || [];

      // 2) Группируем по паре (family_group_id, client_id)
      const map = new Map<string, string[]>();
      for (const row of all) {
        const key = `${row.family_group_id}_${row.client_id}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(row.id);
      }

      // 3) Оставляем по одному id, остальные удаляем
      const idsToDelete: string[] = [];
      map.forEach((ids) => {
        if (ids.length > 1) idsToDelete.push(...ids.slice(1));
      });

      if (idsToDelete.length === 0) return 0;

      const { error: delError } = await supabase
        .from('family_members')
        .delete()
        .in('id', idsToDelete);
      if (delError) throw delError;

      return idsToDelete.length;
    },
    onSuccess: (deletedCount) => {
      toast.success(`Удалено ${deletedCount} дубликатов из всех групп`);
      queryClient.invalidateQueries({ queryKey: ['family-groups-issues'] });
      queryClient.invalidateQueries({ queryKey: ['student-details'] });
    },
    onError: (error) => {
      toast.error('Ошибка при удалении дубликатов: ' + error.message);
    },
  });

  if (isLoading) {
    return <div className="p-4">Загрузка...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Проблемы с семейными группами
            </CardTitle>
            {issuesData && issuesData.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Очистить все
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Удалить все дубликаты?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Будут удалены все дублирующиеся записи family_members во всех найденных группах. 
                      Для каждого клиента останется только одна запись в каждой группе.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => removeAllDuplicates.mutate()}
                    >
                      Удалить все
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!issuesData || issuesData.length === 0 ? (
            <p className="text-muted-foreground">Проблем не найдено</p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground flex items-center gap-3">
                Найдено групп с проблемами: {issuesData.length}
                <span className="inline-flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Назад</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(page + 1)}>Далее</Button>
                  <span className="text-xs text-muted-foreground">Страница {page}</span>
                </span>
              </p>

              {issuesData.map((issue) => (
                <Card key={issue.familyGroupId} className="border-yellow-200">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{issue.familyGroupName}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">
                            <Users className="h-3 w-3 mr-1" />
                            {issue.studentsCount} студент(ов)
                          </Badge>
                          <Badge variant="outline">
                            {issue.membersCount} член(ов) семьи
                          </Badge>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => setSelectedGroup(issue.familyGroupId)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Удалить дубликаты
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить дубликаты?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Будут удалены дублирующиеся записи family_members для этой группы. 
                              Для каждого клиента останется только одна запись.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                if (selectedGroup) {
                                  removeDuplicates.mutate(selectedGroup);
                                }
                              }}
                            >
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">Студенты:</p>
                      <div className="space-y-1">
                        {issue.students.map((student) => (
                          <div key={student.id} className="text-sm text-muted-foreground">
                            • {student.name}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Члены семьи:</p>
                      <div className="space-y-1">
                        {issue.members.map((member) => (
                          <div key={member.id} className="text-sm">
                            <span className="text-muted-foreground">• {member.clientName}</span>
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {member.relationship}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};