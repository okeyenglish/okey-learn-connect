import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function TeacherPortalTest() {
  const { data: testResults, isLoading } = useQuery({
    queryKey: ['teacher-portal-test'],
    queryFn: async () => {
      // Check teachers with names
      const { data: teachers } = await supabase
        .from('teachers')
        .select('*')
        .not('first_name', 'is', null)
        .neq('first_name', '');
      
      // Check groups with teachers
      const { data: groups } = await supabase
        .from('learning_groups')
        .select('*')
        .not('responsible_teacher', 'is', null)
        .neq('responsible_teacher', '');
      
      // Check lesson sessions with teachers
      const { data: sessions } = await supabase
        .from('lesson_sessions')
        .select('*')
        .not('teacher_name', 'is', null)
        .neq('teacher_name', '')
        .neq('teacher_name', 'Преподаватель не назначен');
      
      // Check profile-teacher links
      const { data: linkedProfiles } = await supabase
        .from('teachers')
        .select('id, profile_id, first_name, last_name')
        .not('profile_id', 'is', null);
      
      // Check if there are profiles with teacher role
      const { data: teacherProfiles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'teacher');
      
      return {
        teachersCount: teachers?.length || 0,
        groupsWithTeachers: groups?.length || 0,
        sessionsWithTeachers: sessions?.length || 0,
        linkedProfilesCount: linkedProfiles?.length || 0,
        teacherProfilesCount: teacherProfiles?.length || 0,
        allTestsPass: (teachers?.length || 0) > 0 && 
                      (groups?.length || 0) > 0 && 
                      (sessions?.length || 0) > 0 &&
                      (linkedProfiles?.length || 0) > 0,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {testResults?.allTestsPass ? (
              <CheckCircle className="text-green-600" />
            ) : (
              <XCircle className="text-red-600" />
            )}
            Тестирование Teacher Portal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TestCard
            title="Профили с ролью teacher"
            count={testResults?.teacherProfilesCount || 0}
            passed={(testResults?.teacherProfilesCount || 0) > 0}
            description="Пользователи с ролью преподавателя в системе"
          />
          <TestCard
            title="Преподаватели с данными"
            count={testResults?.teachersCount || 0}
            passed={(testResults?.teachersCount || 0) > 0}
            description="Записи в таблице teachers с именами"
          />
          <TestCard
            title="Связь Profile → Teacher"
            count={testResults?.linkedProfilesCount || 0}
            passed={(testResults?.linkedProfilesCount || 0) > 0}
            description="Преподаватели с заполненным profile_id"
          />
          <TestCard
            title="Группы с преподавателями"
            count={testResults?.groupsWithTeachers || 0}
            passed={(testResults?.groupsWithTeachers || 0) > 0}
            description="Учебные группы с назначенным преподавателем"
          />
          <TestCard
            title="Занятия с преподавателями"
            count={testResults?.sessionsWithTeachers || 0}
            passed={(testResults?.sessionsWithTeachers || 0) > 0}
            description="Сессии занятий с указанным преподавателем"
          />

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-2">Статус системы:</h3>
            {testResults?.allTestsPass ? (
              <p className="text-green-600">
                ✓ Все проверки пройдены. Teacher Portal готов к использованию.
              </p>
            ) : (
              <p className="text-red-600">
                ✗ Обнаружены проблемы. Проверьте миграции и тестовые данные.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface TestCardProps {
  title: string;
  count: number;
  passed: boolean;
  description: string;
}

const TestCard = ({ title, count, passed, description }: TestCardProps) => (
  <div className="flex items-center justify-between p-4 border rounded-lg">
    <div className="flex-1">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      <p className="text-sm mt-1">
        <span className="font-semibold">{count}</span> записей
      </p>
    </div>
    <Badge variant={passed ? 'default' : 'destructive'} className="ml-4">
      {passed ? 'OK' : 'Ошибка'}
    </Badge>
  </div>
);
