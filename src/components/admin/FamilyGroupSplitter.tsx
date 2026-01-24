import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseTyped as supabase } from '@/integrations/supabase/typedClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Split } from 'lucide-react';
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

interface FamilyGroupWithStudents {
  id: string;
  name: string;
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

export const FamilyGroupSplitter = () => {
  const queryClient = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Fetch groups with multiple students
  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['family-groups-multi-student'],
    queryFn: async () => {
      const { data: groups, error: groupsError } = await supabase
        .from('family_groups')
        .select('id, name');

      if (groupsError) throw groupsError;

      const result: FamilyGroupWithStudents[] = [];

      for (const group of groups || []) {
        const [studentsRes, membersRes] = await Promise.all([
          supabase
            .from('students')
            .select('id, name')
            .eq('family_group_id', group.id),
          supabase
            .from('family_members')
            .select(`
              id,
              client_id,
              relationship_type,
              clients:client_id (name)
            `)
            .eq('family_group_id', group.id)
        ]);

        const students = studentsRes.data || [];
        const members = membersRes.data || [];

        // Показываем только группы с 2+ студентами
        if (students.length >= 2) {
          result.push({
            id: group.id,
            name: group.name,
            students: students.map(s => ({ id: s.id, name: s.name })),
            members: members.map(m => ({
              id: m.id,
              clientId: m.client_id,
              clientName: (m.clients as any)?.name || 'Неизвестно',
              relationship: m.relationship_type,
            })),
          });
        }
      }

      return result.sort((a, b) => b.students.length - a.students.length);
    },
  });

  // Split students into individual groups
  const splitGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const group = groupsData?.find(g => g.id === groupId);
      if (!group || group.students.length < 2) {
        throw new Error('Группа не найдена или содержит менее 2 студентов');
      }

      // Для каждого студента создаем отдельную семейную группу
      for (const student of group.students) {
        // Создаем новую семейную группу
        const { data: newGroup, error: groupError } = await supabase
          .from('family_groups')
          .insert({
            name: `Семья ${student.name.split(' ')[0]}`,
          })
          .select()
          .single();

        if (groupError) throw groupError;

        // Переносим студента в новую группу
        const { error: studentError } = await supabase
          .from('students')
          .update({ family_group_id: newGroup.id })
          .eq('id', student.id);

        if (studentError) throw studentError;
      }

      // Удаляем старую группу и все связи
      const { error: membersError } = await supabase
        .from('family_members')
        .delete()
        .eq('family_group_id', groupId);

      if (membersError) throw membersError;

      const { error: groupDeleteError } = await supabase
        .from('family_groups')
        .delete()
        .eq('id', groupId);

      if (groupDeleteError) throw groupDeleteError;

      return group.students.length;
    },
    onSuccess: (count) => {
      toast.success(`Разделено ${count} студентов на отдельные группы`);
      queryClient.invalidateQueries({ queryKey: ['family-groups-multi-student'] });
      queryClient.invalidateQueries({ queryKey: ['student-details'] });
    },
    onError: (error) => {
      toast.error('Ошибка при разделении группы: ' + error.message);
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
            <Users className="h-5 w-5" />
            Разделение семейных групп
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!groupsData || groupsData.length === 0 ? (
            <p className="text-muted-foreground">
              Групп с несколькими студентами не найдено
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Найдено групп с несколькими студентами: {groupsData.length}
              </p>

              {groupsData.map((group) => (
                <Card key={group.id} className="border-orange-200">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{group.name}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">
                            <Users className="h-3 w-3 mr-1" />
                            {group.students.length} студент(ов)
                          </Badge>
                          <Badge variant="outline">
                            {group.members.length} член(ов) семьи
                          </Badge>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => setSelectedGroupId(group.id)}
                          >
                            <Split className="h-4 w-4 mr-2" />
                            Разделить
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Разделить группу?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Каждый из {group.students.length} студентов будет перемещен в 
                              отдельную семейную группу. Текущая группа и все связи 
                              family_members будут удалены.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                if (selectedGroupId) {
                                  splitGroup.mutate(selectedGroupId);
                                }
                              }}
                            >
                              Разделить
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
                        {group.students.map((student) => (
                          <div key={student.id} className="text-sm text-muted-foreground">
                            • {student.name}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Члены семьи:</p>
                      <div className="space-y-1">
                        {group.members.map((member) => (
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
