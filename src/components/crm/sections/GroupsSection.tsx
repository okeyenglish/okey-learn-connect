import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, BookOpen, Plus, Filter, GraduationCap, MapPin, Clock } from 'lucide-react';
import { GroupsTable } from '@/components/learning-groups/GroupsTable';
import { GroupsFilters } from '@/components/learning-groups/GroupsFilters';
import { AddGroupModal } from '@/components/learning-groups/AddGroupModal';
import { useLearningGroups, GroupFilters } from '@/hooks/useLearningGroups';
import { useIndividualLessons, IndividualLessonFilters } from '@/hooks/useIndividualLessons';

export default function GroupsSection() {
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<GroupFilters>({
    search: '',
    branch: 'all',
    subject: 'all',
    level: 'all',
    status: []
  });

  const { groups, isLoading: groupsLoading } = useLearningGroups(filters);
  const { lessons: individualLessons, isLoading: individualLoading } = useIndividualLessons({});

  const activeGroups = groups?.filter(g => g.status === 'active') || [];
  const formingGroups = groups?.filter(g => g.status === 'forming') || [];
  const completedGroups = groups?.filter(g => g.status === 'finished') || [];

  const totalStudents = groups?.reduce((sum, group) => sum + (group.current_students || 0), 0) || 0;
  const totalCapacity = groups?.reduce((sum, group) => sum + (group.capacity || 0), 0) || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'forming':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Активная';
      case 'forming':
        return 'Формируется';
      case 'completed':
        return 'Завершена';
      case 'cancelled':
        return 'Отменена';
      default:
        return status;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Группы и занятия</h1>
          <p className="text-muted-foreground">
            Управление учебными группами и индивидуальными занятиями
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Фильтры
          </Button>
          <Button onClick={() => setShowAddGroupModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить группу
          </Button>
        </div>
      </div>

      {/* Фильтры */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <GroupsFilters 
              filters={filters}
              onFiltersChange={(newFilters) => setFilters(newFilters)}
              onReset={() => setFilters({
                search: '',
                branch: 'all',
                subject: 'all',
                level: 'all',
                status: []
              })}
            />
          </CardContent>
        </Card>
      )}

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Всего групп
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groups?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {activeGroups.length} активных
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Студентов в группах
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              из {totalCapacity} мест
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Формируется групп
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formingGroups.length}</div>
            <p className="text-xs text-muted-foreground">
              Требуют внимания
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Индивидуальных занятий
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{individualLessons?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Активных курсов
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Табы с группами */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Все группы</TabsTrigger>
          <TabsTrigger value="active">Активные ({activeGroups.length})</TabsTrigger>
          <TabsTrigger value="forming">Формируются ({formingGroups.length})</TabsTrigger>
          <TabsTrigger value="individual">Индивидуальные</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Все группы</CardTitle>
              <CardDescription>
                Полный список учебных групп
              </CardDescription>
            </CardHeader>
            <CardContent>
              {groupsLoading ? (
                <div className="text-center py-4">Загрузка групп...</div>
              ) : (
                <GroupsTable groups={groups || []} isLoading={groupsLoading} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Активные группы</CardTitle>
              <CardDescription>
                Группы, в которых проводятся занятия
              </CardDescription>
            </CardHeader>
            <CardContent>
              {groupsLoading ? (
                <div className="text-center py-4">Загрузка...</div>
              ) : activeGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Активных групп не найдено
                </div>
              ) : (
                <GroupsTable groups={activeGroups} isLoading={groupsLoading} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="forming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Формирующиеся группы</CardTitle>
              <CardDescription>
                Группы, которые набирают учеников
              </CardDescription>
            </CardHeader>
            <CardContent>
              {groupsLoading ? (
                <div className="text-center py-4">Загрузка...</div>
              ) : formingGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Формирующихся групп не найдено
                </div>
              ) : (
                <div className="space-y-4">
                  {formingGroups.map((group) => (
                    <div key={group.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="font-medium">{group.name}</div>
                        <Badge variant="outline">{group.level}</Badge>
                        <div className="text-sm text-muted-foreground">
                          {group.subject}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {group.current_students}/{group.capacity}
                        </div>
                        {group.responsible_teacher && (
                          <div className="text-sm text-muted-foreground">
                            {group.responsible_teacher}
                          </div>
                        )}
                        {group.schedule_time && (
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {group.schedule_time}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(group.status)}>
                          {getStatusLabel(group.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="individual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Индивидуальные занятия</CardTitle>
              <CardDescription>
                Список индивидуальных курсов
              </CardDescription>
            </CardHeader>
            <CardContent>
              {individualLoading ? (
                <div className="text-center py-4">Загрузка...</div>
              ) : !individualLessons || individualLessons.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Индивидуальных занятий не найдено
                </div>
              ) : (
                <div className="space-y-4">
                  {individualLessons.map((lesson) => (
                    <div key={lesson.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="font-medium">{lesson.student_name}</div>
                        <Badge variant="outline">{lesson.level}</Badge>
                        <div className="text-sm text-muted-foreground">
                          {lesson.subject}
                        </div>
                        {lesson.teacher_name && (
                          <div className="text-sm text-muted-foreground">
                            {lesson.teacher_name}
                          </div>
                        )}
                        {lesson.schedule_time && (
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {lesson.schedule_time}
                          </div>
                        )}
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {lesson.branch}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(lesson.status)}>
                          {getStatusLabel(lesson.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Модальное окно для добавления группы */}
      <AddGroupModal 
        children={
          <Button onClick={() => setShowAddGroupModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить группу
          </Button>
        }
      />
    </div>
  );
}