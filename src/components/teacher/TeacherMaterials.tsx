import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, BookOpen, Folder, Download, ExternalLink, Star, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { Teacher } from '@/hooks/useTeachers';

interface TeacherMaterialsProps {
  teacher?: Teacher;
  selectedBranchId?: string | 'all';
}

export const TeacherMaterials = ({ teacher, selectedBranchId = 'all' }: TeacherMaterialsProps) => {
  const teacherName = `${teacher?.last_name || ''} ${teacher?.first_name || ''}`.trim();

  // Получаем группы преподавателя с курсами
  const { data: courseGroups, isLoading } = useQuery({
    queryKey: ['teacher-course-materials', teacherName],
    queryFn: async () => {
      const { data: groups, error } = await supabase
        .from('learning_groups')
        .select(`
          id,
          name,
          level,
          branch,
          course_id,
          courses (
            id,
            title
          )
        `)
        .eq('responsible_teacher', teacherName)
        .eq('is_active', true);

      if (error) throw error;
      return groups || [];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Материалы курсов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-pulse">Загрузка...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Материалы курсов
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="courses" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Мои курсы ({courseGroups?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Библиотека
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courses">
            {!courseGroups || courseGroups.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium mb-2">Курсов не найдено</p>
                <p className="text-sm text-muted-foreground">
                  У вас пока нет назначенных групп с курсами
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {courseGroups.map((group: any) => (
                  <Card key={group.id} className="card-elevated hover-scale">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold mb-1">{group.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <BookOpen className="h-4 w-4" />
                            <span>{group.courses?.title || 'Курс не назначен'}</span>
                            {group.level && <Badge variant="outline">{group.level}</Badge>}
                            {group.branch && <Badge variant="secondary">{group.branch}</Badge>}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Card className="p-4 border-2 hover:border-brand transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-brand/10">
                              <FileText className="h-5 w-5 text-brand" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">План уроков</p>
                              <p className="text-xs text-muted-foreground">Темы и задания</p>
                            </div>
                          </div>
                        </Card>

                        <Card className="p-4 border-2 hover:border-brand transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-brand/10">
                              <Folder className="h-5 w-5 text-brand" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Файлы</p>
                              <p className="text-xs text-muted-foreground">PDF, презентации</p>
                            </div>
                          </div>
                        </Card>

                        <Card className="p-4 border-2 hover:border-brand transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-brand/10">
                              <Video className="h-5 w-5 text-brand" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Видео</p>
                              <p className="text-xs text-muted-foreground">Обучающие ролики</p>
                            </div>
                          </div>
                        </Card>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-1" />
                          Скачать всё
                        </Button>
                        {group.course_id && (
                          <Button size="sm" variant="outline" onClick={() => window.open(`/course-details/${group.course_id}`, '_blank')}>
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Открыть в курсе
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="library">
            <div className="text-center py-12">
              <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium mb-2">Личная библиотека</p>
              <p className="text-sm text-muted-foreground mb-4">
                Сохраняйте избранные материалы для быстрого доступа
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mt-6">
                <Card className="p-6 text-left hover-scale cursor-pointer">
                  <div className="flex items-start gap-3">
                    <FileText className="h-6 w-6 text-brand" />
                    <div>
                      <h4 className="font-semibold mb-1">Документы</h4>
                      <p className="text-sm text-muted-foreground">Методички, планы уроков</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-6 text-left hover-scale cursor-pointer">
                  <div className="flex items-start gap-3">
                    <Video className="h-6 w-6 text-brand" />
                    <div>
                      <h4 className="font-semibold mb-1">Видео</h4>
                      <p className="text-sm text-muted-foreground">Избранные материалы</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
