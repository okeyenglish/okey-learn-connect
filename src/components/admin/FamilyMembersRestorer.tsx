import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseTyped as supabase } from '@/integrations/supabase/typedClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Link } from 'lucide-react';
import { toast } from 'sonner';

interface StudentWithoutParents {
  studentId: string;
  studentName: string;
  familyGroupId: string;
  familyGroupName: string;
  suggestedParent?: {
    clientId: string;
    clientName: string;
    phone: string;
  };
}

export const FamilyMembersRestorer = () => {
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState(false);

  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['students-without-parents'],
    queryFn: async () => {
      // Получаем студентов с family_group_id
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, name, family_group_id, family_groups:family_group_id(id, name)')
        .not('family_group_id', 'is', null);

      if (studentsError) throw studentsError;

      const result: StudentWithoutParents[] = [];

      for (const student of students || []) {
        // Проверяем, есть ли записи в family_members
        const { data: members } = await supabase
          .from('family_members')
          .select('id')
          .eq('family_group_id', student.family_group_id)
          .limit(1);

        if (!members || members.length === 0) {
          // У студента нет родителей в family_members
          const familyGroupName = (student.family_groups as any)?.name || '';
          
          // Пытаемся найти подходящего клиента по имени группы
          let suggestedParent = undefined;
          
          if (familyGroupName && familyGroupName.includes('Семья ')) {
            const parentName = familyGroupName.replace('Семья ', '');
            
            const { data: clients } = await supabase
              .from('clients')
              .select(`
                id,
                name,
                phone,
                client_phone_numbers(phone)
              `)
              .ilike('name', `%${parentName}%`)
              .limit(1);

            if (clients && clients.length > 0) {
              const client = clients[0];
              const phones = (client.client_phone_numbers as any) || [];
              const phone = client.phone || (phones[0]?.phone) || '';
              
              suggestedParent = {
                clientId: client.id,
                clientName: client.name,
                phone,
              };
            }
          }

          result.push({
            studentId: student.id,
            studentName: student.name,
            familyGroupId: student.family_group_id,
            familyGroupName,
            suggestedParent,
          });
        }
      }

      return result;
    },
  });

  const linkParent = useMutation({
    mutationFn: async ({ studentData }: { studentData: StudentWithoutParents }) => {
      if (!studentData.suggestedParent) {
        throw new Error('Нет предложенного родителя');
      }

      const { error } = await supabase
        .from('family_members')
        .insert({
          family_group_id: studentData.familyGroupId,
          client_id: studentData.suggestedParent.clientId,
          relationship_type: 'main',
          is_primary_contact: true,
        });

      if (error) throw error;

      return studentData.studentName;
    },
    onSuccess: (studentName) => {
      toast.success(`Родитель добавлен для ${studentName}`);
      queryClient.invalidateQueries({ queryKey: ['students-without-parents'] });
      queryClient.invalidateQueries({ queryKey: ['student-details'] });
    },
    onError: (error) => {
      toast.error('Ошибка: ' + error.message);
    },
  });

  const linkAllParents = async () => {
    if (!studentsData) return;
    
    setProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    for (const student of studentsData.filter(s => s.suggestedParent)) {
      try {
        await supabase
          .from('family_members')
          .insert({
            family_group_id: student.familyGroupId,
            client_id: student.suggestedParent!.clientId,
            relationship_type: 'main',
            is_primary_contact: true,
          });
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`Ошибка для ${student.studentName}:`, error);
      }
    }

    setProcessing(false);
    toast.success(`Добавлено ${successCount} родителей, ошибок: ${errorCount}`);
    queryClient.invalidateQueries({ queryKey: ['students-without-parents'] });
    queryClient.invalidateQueries({ queryKey: ['student-details'] });
  };

  if (isLoading) {
    return <div className="p-4">Загрузка...</div>;
  }

  const studentsWithSuggestions = studentsData?.filter(s => s.suggestedParent) || [];
  const studentsWithoutSuggestions = studentsData?.filter(s => !s.suggestedParent) || [];

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Восстановление связей родителей
            </CardTitle>
            {studentsWithSuggestions.length > 0 && (
              <Button
                onClick={linkAllParents}
                disabled={processing}
              >
                <Link className="h-4 w-4 mr-2" />
                Связать всех ({studentsWithSuggestions.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!studentsData || studentsData.length === 0 ? (
            <p className="text-muted-foreground">
              Все студенты имеют связанных родителей
            </p>
          ) : (
            <div className="space-y-6">
              {studentsWithSuggestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {studentsWithSuggestions.length} с предложениями
                    </Badge>
                  </div>
                  
                  {studentsWithSuggestions.map((student) => (
                    <Card key={student.studentId} className="border-green-200">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div>
                              <p className="font-medium">{student.studentName}</p>
                              <p className="text-sm text-muted-foreground">
                                Группа: {student.familyGroupName}
                              </p>
                            </div>
                            {student.suggestedParent && (
                              <div className="flex items-center gap-2 text-sm">
                                <Users className="h-3 w-3" />
                                <span>{student.suggestedParent.clientName}</span>
                                {student.suggestedParent.phone && (
                                  <Badge variant="outline" className="text-xs">
                                    {student.suggestedParent.phone}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => linkParent.mutate({ studentData: student })}
                            disabled={linkParent.isPending}
                          >
                            <Link className="h-4 w-4 mr-2" />
                            Связать
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {studentsWithoutSuggestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {studentsWithoutSuggestions.length} без предложений
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      Добавьте родителей вручную через профиль студента
                    </p>
                  </div>
                  
                  {studentsWithoutSuggestions.map((student) => (
                    <Card key={student.studentId} className="border-yellow-200">
                      <CardContent className="pt-4">
                        <div>
                          <p className="font-medium">{student.studentName}</p>
                          <p className="text-sm text-muted-foreground">
                            Группа: {student.familyGroupName}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
