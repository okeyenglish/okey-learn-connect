import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseTyped as supabase } from '@/integrations/supabase/typedClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, AlertTriangle, RefreshCw } from 'lucide-react';
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

export const FamilyGroupsReorganizer = () => {
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState(false);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['family-reorganization-stats'],
    queryFn: async () => {
      const [studentsRes, groupsRes, membersRes] = await Promise.all([
        supabase.from('students').select('id, name').not('family_group_id', 'is', null),
        supabase.from('family_groups').select('id'),
        supabase.from('family_members').select('id')
      ]);

      return {
        totalStudents: studentsRes.data?.length || 0,
        totalGroups: groupsRes.data?.length || 0,
        totalMembers: membersRes.data?.length || 0,
      };
    },
  });

  const reorganize = useMutation({
    mutationFn: async () => {
      // 1. Получаем всех студентов
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, name');

      if (studentsError) throw studentsError;

      let createdGroups = 0;
      let errors = 0;

      // 2. Удаляем все старые связи family_members
      const { error: deleteError } = await supabase
        .from('family_members')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Удалить все

      if (deleteError) throw deleteError;

      // 3. Удаляем все старые семейные группы
      const { error: groupsDeleteError } = await supabase
        .from('family_groups')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Удалить все

      if (groupsDeleteError) throw groupsDeleteError;

      // 4. Для каждого студента создаем новую группу
      for (const student of students || []) {
        try {
          // Извлекаем имя для группы (берем первое слово из имени)
          const firstName = student.name.split(' ')[0];
          
          // Создаем новую семейную группу
          const { data: newGroup, error: groupError } = await supabase
            .from('family_groups')
            .insert({
              name: `Семья ${firstName}`,
            })
            .select()
            .single();

          if (groupError) {
            errors++;
            console.error(`Ошибка создания группы для ${student.name}:`, groupError);
            continue;
          }

          // Привязываем студента к новой группе
          const { error: updateError } = await supabase
            .from('students')
            .update({ family_group_id: newGroup.id })
            .eq('id', student.id);

          if (updateError) {
            errors++;
            console.error(`Ошибка обновления студента ${student.name}:`, updateError);
            continue;
          }

          createdGroups++;
        } catch (error) {
          errors++;
          console.error(`Ошибка для студента ${student.name}:`, error);
        }
      }

      return { createdGroups, errors, totalStudents: students?.length || 0 };
    },
    onSuccess: async (result) => {
      toast.success(
        `Реорганизация завершена! Создано групп: ${result.createdGroups}/${result.totalStudents}, ошибок: ${result.errors}`
      );
      
      // Автоматическое восстановление связей
      toast.info('Начинаю автоматическое восстановление связей с родителями...');
      
      try {
        // Получаем студентов без родителей
        const { data: students } = await supabase
          .from('students')
          .select('id, name, family_group_id, family_groups:family_group_id(id, name)')
          .not('family_group_id', 'is', null);

        let linkedCount = 0;
        let notFoundCount = 0;

        for (const student of students || []) {
          const { data: existingMembers } = await supabase
            .from('family_members')
            .select('id')
            .eq('family_group_id', student.family_group_id)
            .limit(1);

          if (!existingMembers || existingMembers.length === 0) {
            const familyGroupName = (student.family_groups as any)?.name || '';
            
            if (familyGroupName && familyGroupName.includes('Семья ')) {
              const parentName = familyGroupName.replace('Семья ', '');
              
              const { data: clients } = await supabase
                .from('clients')
                .select('id, name')
                .ilike('name', `%${parentName}%`)
                .limit(1);

              if (clients && clients.length > 0) {
                await supabase
                  .from('family_members')
                  .insert({
                    family_group_id: student.family_group_id,
                    client_id: clients[0].id,
                    relationship_type: 'main',
                    is_primary_contact: true,
                  });
                linkedCount++;
              } else {
                notFoundCount++;
              }
            } else {
              notFoundCount++;
            }
          }
        }

        toast.success(
          `Восстановление связей завершено! Связано: ${linkedCount}, не найдено: ${notFoundCount}`
        );
      } catch (error) {
        console.error('Ошибка восстановления связей:', error);
        toast.error('Ошибка при восстановлении связей. Используйте ручное восстановление.');
      }

      queryClient.invalidateQueries({ queryKey: ['family-reorganization-stats'] });
      queryClient.invalidateQueries({ queryKey: ['student-details'] });
      queryClient.invalidateQueries({ queryKey: ['students-without-parents'] });
    },
    onError: (error) => {
      toast.error('Ошибка реорганизации: ' + error.message);
    },
  });

  const handleReorganize = async () => {
    setProcessing(true);
    try {
      await reorganize.mutateAsync();
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading) {
    return <div className="p-4">Загрузка...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Полная реорганизация семейных групп
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="font-medium text-yellow-900">
                  Внимание! Это критическая операция
                </p>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Будут удалены ВСЕ существующие семейные группы</li>
                  <li>• Будут удалены ВСЕ связи family_members (родители отвязаны от студентов)</li>
                  <li>• Для каждого студента будет создана новая индивидуальная группа</li>
                  <li>• После этого нужно будет заново добавить родителей через "Восстановление связей"</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats?.totalStudents || 0}</p>
                  <p className="text-sm text-muted-foreground">Студентов</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats?.totalGroups || 0}</p>
                  <p className="text-sm text-muted-foreground">Старых групп</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats?.totalMembers || 0}</p>
                  <p className="text-sm text-muted-foreground">Связей с родителями</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Процесс реорганизации:</p>
            <ol className="text-sm text-muted-foreground space-y-2 ml-4">
              <li>1. Удалятся все записи из family_members ({stats?.totalMembers || 0} записей)</li>
              <li>2. Удалятся все семейные группы ({stats?.totalGroups || 0} групп)</li>
              <li>3. Создастся {stats?.totalStudents || 0} новых групп (по одной на студента)</li>
              <li>4. Каждый студент будет привязан к своей группе</li>
              <li className="text-yellow-600 font-medium">
                5. После завершения откройте "Восстановление связей родителей" для автоматического связывания
              </li>
            </ol>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                size="lg" 
                className="w-full"
                disabled={processing || !stats?.totalStudents}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {processing ? 'Выполняется реорганизация...' : 'Начать реорганизацию'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Подтвердите реорганизацию</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>Вы уверены, что хотите выполнить полную реорганизацию?</p>
                  <p className="font-medium text-yellow-600">
                    Это действие нельзя отменить!
                  </p>
                  <p>
                    Будет удалено {stats?.totalMembers} связей с родителями и {stats?.totalGroups} групп.
                    Создано {stats?.totalStudents} новых групп.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReorganize}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Да, выполнить реорганизацию
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};
