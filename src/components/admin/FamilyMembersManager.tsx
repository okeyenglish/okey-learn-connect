import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseTyped as supabase } from '@/integrations/supabase/typedClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, Trash2, Search } from 'lucide-react';
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

interface FamilyMemberRecord {
  id: string;
  familyGroupId: string;
  familyGroupName: string;
  clientId: string;
  clientName: string;
  relationship: string;
  students: Array<{ id: string; name: string }>;
}

export const FamilyMembersManager = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 200;

  const { data: familyMembers, isLoading } = useQuery({
    queryKey: ['family-members-all', page],
    queryFn: async () => {
      const offset = (page - 1) * pageSize;

      // 1) Получаем страницу связей family_members
      const membersRes = await supabase
        .from('family_members')
        .select(`
          id,
          family_group_id,
          client_id,
          relationship_type,
          family_groups:family_group_id (
            id,
            name
          ),
          clients:client_id (
            id,
            name
          )
        `)
        .order('family_group_id')
        .range(offset, offset + pageSize - 1);

      if (membersRes.error) throw membersRes.error;
      const members = membersRes.data || [];

      // 2) Загружаем студентов только по нужным группам
      const groupIds = Array.from(new Set(members.map(m => m.family_group_id)));
      let studentsByGroup = new Map<string, Array<{ id: string; name: string }>>();

      if (groupIds.length > 0) {
        const studentsRes = await supabase
          .from('students')
          .select('id, name, family_group_id')
          .in('family_group_id', groupIds);
        if (studentsRes.error) throw studentsRes.error;

        studentsByGroup = new Map();
        (studentsRes.data || []).forEach((s) => {
          if (!studentsByGroup.has(s.family_group_id)) {
            studentsByGroup.set(s.family_group_id, []);
          }
          studentsByGroup.get(s.family_group_id)!.push({ id: s.id, name: s.name });
        });
      }

      // 3) Преобразуем данные
      const groupedData: FamilyMemberRecord[] = members.map(member => ({
        id: member.id,
        familyGroupId: member.family_group_id,
        familyGroupName: (member.family_groups as any)?.name || 'Без названия',
        clientId: member.client_id,
        clientName: (member.clients as any)?.name || 'Неизвестно',
        relationship: member.relationship_type,
        students: studentsByGroup.get(member.family_group_id) || [],
      }));

      return groupedData;
    },
  });

  // Удаление одного члена семьи
  const deleteMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Связь удалена');
      queryClient.invalidateQueries({ queryKey: ['family-members-all'] });
      queryClient.invalidateQueries({ queryKey: ['family-groups-issues'] });
      queryClient.invalidateQueries({ queryKey: ['student-details'] });
    },
    onError: (error) => {
      toast.error('Ошибка при удалении: ' + error.message);
    },
  });

  // Удаление всех дубликатов
  const deleteAllDuplicates = useMutation({
    mutationFn: async () => {
      // Глобальная дедупликация по всей таблице
      const { data, error } = await supabase
        .from('family_members')
        .select('id, family_group_id, client_id');
      if (error) throw error;

      const rows = data || [];

      // Собираем дубликаты по ключу (group, client)
      const map = new Map<string, string[]>();
      for (const r of rows) {
        const key = `${r.family_group_id}_${r.client_id}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(r.id);
      }

      const idsToDelete: string[] = [];
      map.forEach((ids) => {
        if (ids.length > 1) idsToDelete.push(...ids.slice(1));
      });

      if (idsToDelete.length === 0) return 0;

      // Удаляем чанками, чтобы не упереться в лимиты URL/SQL
      const chunkSize = 1000;
      for (let i = 0; i < idsToDelete.length; i += chunkSize) {
        const chunk = idsToDelete.slice(i, i + chunkSize);
        const { error: delErr } = await supabase
          .from('family_members')
          .delete()
          .in('id', chunk);
        if (delErr) throw delErr;
      }

      return idsToDelete.length;
    },
    onSuccess: (deletedCount) => {
      toast.success(`Удалено ${deletedCount} дубликатов`);
      queryClient.invalidateQueries({ queryKey: ['family-members-all'] });
      queryClient.invalidateQueries({ queryKey: ['family-groups-issues'] });
      queryClient.invalidateQueries({ queryKey: ['student-details'] });
    },
    onError: (error) => {
      toast.error('Ошибка при удалении дубликатов: ' + error.message);
    },
  });

  const filteredMembers = familyMembers?.filter(member =>
    member.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.familyGroupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.students.some(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Группируем по family_group_id
  const groupedByFamily = filteredMembers?.reduce((acc, member) => {
    if (!acc[member.familyGroupId]) {
      acc[member.familyGroupId] = [];
    }
    acc[member.familyGroupId].push(member);
    return acc;
  }, {} as Record<string, FamilyMemberRecord[]>);

  if (isLoading) {
    return <div className="p-4">Загрузка...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Управление членами семьи
            </CardTitle>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить все дубликаты
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить все дубликаты?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Будут удалены все дублирующиеся записи family_members (когда один клиент связан с одной группой несколько раз).
                    Для каждой пары "клиент-группа" останется только одна запись.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteAllDuplicates.mutate()}
                  >
                    Удалить все
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени клиента, группы или студента..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          {!groupedByFamily || Object.keys(groupedByFamily).length === 0 ? (
            <p className="text-muted-foreground">Записей не найдено</p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Найдено групп: {Object.keys(groupedByFamily).length}
              </p>

              {Object.entries(groupedByFamily).map(([familyGroupId, members]) => {
                const firstMember = members[0];
                return (
                  <Card key={familyGroupId} className="border-border">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <CardTitle className="text-base">
                            {firstMember.familyGroupName}
                          </CardTitle>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                              Студенты:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {firstMember.students.map(student => (
                                <Badge key={student.id} variant="outline">
                                  {student.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm font-medium mb-2">
                          Члены семьи ({members.length}):
                        </p>
                        {members.map(member => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-2 rounded-lg border border-border"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{member.clientName}</span>
                              <Badge variant="secondary" className="text-xs">
                                {member.relationship}
                              </Badge>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedMemberId(member.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Удалить связь?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Будет удалена связь "{member.clientName}" ({member.relationship}) 
                                    с семейной группой "{firstMember.familyGroupName}".
                                    Это действие нельзя отменить.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => {
                                      if (selectedMemberId) {
                                        deleteMember.mutate(selectedMemberId);
                                      }
                                    }}
                                  >
                                    Удалить
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
              Назад
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(page + 1)}>
              Далее
            </Button>
            <span className="text-xs text-muted-foreground">Страница {page}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
