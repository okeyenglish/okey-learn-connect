import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

  // Fetch all family groups with potential issues
  const { data: issuesData, isLoading } = useQuery({
    queryKey: ['family-groups-issues'],
    queryFn: async () => {
      // Получаем все семейные группы
      const { data: groups, error: groupsError } = await supabase
        .from('family_groups')
        .select('id, name');

      if (groupsError) throw groupsError;

      const issues: FamilyGroupIssue[] = [];

      for (const group of groups || []) {
        // Получаем студентов в группе
        const { data: students } = await supabase
          .from('students')
          .select('id, name')
          .eq('family_group_id', group.id);

        // Получаем членов семьи
        const { data: members } = await supabase
          .from('family_members')
          .select(`
            id,
            client_id,
            relationship_type,
            clients:client_id (
              name
            )
          `)
          .eq('family_group_id', group.id);

        const studentsCount = students?.length || 0;
        const membersCount = members?.length || 0;

        // Проблема: есть дубликаты клиентов в family_members
        const uniqueClientIds = new Set(members?.map(m => m.client_id) || []);
        const hasDuplicates = uniqueClientIds.size < membersCount;

        if (hasDuplicates || membersCount > 3) {
          issues.push({
            familyGroupId: group.id,
            familyGroupName: group.name,
            studentsCount,
            membersCount,
            students: (students || []).map(s => ({
              id: s.id,
              name: s.name,
            })),
            members: (members || []).map(m => ({
              id: m.id,
              clientId: m.client_id,
              clientName: (m.clients as any)?.name || 'Неизвестно',
              relationship: m.relationship_type,
            })),
          });
        }
      }

      return issues;
    },
  });

  // Удаление дублирующихся записей
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

  if (isLoading) {
    return <div className="p-4">Загрузка...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Проблемы с семейными группами
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!issuesData || issuesData.length === 0 ? (
            <p className="text-muted-foreground">Проблем не найдено</p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Найдено групп с проблемами: {issuesData.length}
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