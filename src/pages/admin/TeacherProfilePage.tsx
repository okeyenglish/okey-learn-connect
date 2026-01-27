import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { useTeacherProfile } from '@/hooks/useTeacherProfile';
import { TeacherSchedulePanel } from '@/components/crm/TeacherSchedulePanel';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  ArrowLeft,
  GraduationCap,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  BookOpen,
  TrendingUp,
  Edit,
  Loader2,
  AlertCircle,
  CalendarDays,
} from 'lucide-react';
import { EditTeacherModal } from '@/components/admin/EditTeacherModal';
import type { Teacher } from '@/integrations/supabase/database.types';

const TeacherProfilePage: React.FC = () => {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const { data: profile, isLoading, error, refetch } = useTeacherProfile(teacherId);
  const [editModalOpen, setEditModalOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Преподаватель не найден</h2>
            <p className="text-muted-foreground mb-4">
              {error?.message || 'Не удалось загрузить данные преподавателя'}
            </p>
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fullName = `${profile.last_name || ''} ${profile.first_name}`.trim();

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700">Проведён</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Отменён</Badge>;
      case 'rescheduled':
        return <Badge className="bg-yellow-100 text-yellow-700">Перенесён</Badge>;
      default:
        return <Badge variant="outline">Запланирован</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-6xl space-y-6">
      {/* Навигация */}
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Назад к списку
      </Button>

      {/* Основная информация */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Аватар и имя */}
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {profile.first_name[0]}{profile.last_name?.[0] || ''}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{fullName}</h1>
                <div className="flex items-center gap-2 mt-1">
                  {profile.is_active !== false ? (
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Активен
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500">
                      <XCircle className="h-3 w-3 mr-1" />
                      Неактивен
                    </Badge>
                  )}
                  {profile.profile_id && (
                    <Badge variant="secondary">Есть аккаунт</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Контакты */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profile.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${profile.phone}`} className="hover:underline">
                    {profile.phone}
                  </a>
                </div>
              )}
              {profile.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${profile.email}`} className="hover:underline">
                    {profile.email}
                  </a>
                </div>
              )}
              {profile.branch && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.branch}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Добавлен: {format(new Date(profile.created_at), 'dd MMMM yyyy', { locale: ru })}
                </span>
              </div>
            </div>

            {/* Кнопка редактирования */}
            <Button variant="outline" onClick={() => setEditModalOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Редактировать
            </Button>
          </div>

          {/* Предметы и категории */}
          {((profile.subjects?.length || 0) > 0 || (profile.categories?.length || 0) > 0) && (
            <>
              <Separator className="my-6" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {(profile.subjects?.length || 0) > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Предметы
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.subjects?.map((subject, i) => (
                        <Badge key={i} variant="secondary">{subject}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {(profile.categories?.length || 0) > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Возрастные категории
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.categories?.map((category, i) => (
                        <Badge key={i} variant="outline">{category}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего групп</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.stats.totalGroups}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активных групп</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.stats.activeGroups}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего уроков</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.stats.totalLessons}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Проведено</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.stats.completedLessons}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Отменено</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.stats.cancelledLessons}</div>
          </CardContent>
        </Card>
      </div>

      {/* Табы с группами, уроками и расписанием */}
      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedule" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Расписание
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2">
            <Users className="h-4 w-4" />
            Группы ({profile.groups.length})
          </TabsTrigger>
          <TabsTrigger value="lessons" className="gap-2">
            <Clock className="h-4 w-4" />
            История уроков
          </TabsTrigger>
        </TabsList>

        {/* Расписание */}
        <TabsContent value="schedule">
          <Card>
            <CardContent className="pt-6">
              <TeacherSchedulePanel 
                teacherId={teacherId!} 
                teacherName={fullName}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Группы */}
        <TabsContent value="groups">
          <Card>
            <CardHeader>
              <CardTitle>Группы преподавателя</CardTitle>
              <CardDescription>
                Все группы, закреплённые за преподавателем
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profile.groups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>У преподавателя пока нет групп</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Название</TableHead>
                        <TableHead>Предмет</TableHead>
                        <TableHead>Уровень</TableHead>
                        <TableHead>Расписание</TableHead>
                        <TableHead>Учеников</TableHead>
                        <TableHead>Статус</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profile.groups.map((group) => (
                        <TableRow key={group.id}>
                          <TableCell className="font-medium">{group.name}</TableCell>
                          <TableCell>{group.subject || '—'}</TableCell>
                          <TableCell>{group.level || '—'}</TableCell>
                          <TableCell>
                            {group.schedule_days?.length ? (
                              <span className="text-sm">
                                {group.schedule_days.join(', ')} {group.schedule_time}
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            {group.current_students || 0} / {group.capacity || 12}
                          </TableCell>
                          <TableCell>
                            {group.is_active ? (
                              <Badge className="bg-green-100 text-green-700">Активна</Badge>
                            ) : (
                              <Badge variant="outline">Неактивна</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Уроки */}
        <TabsContent value="lessons">
          <Card>
            <CardHeader>
              <CardTitle>История уроков</CardTitle>
              <CardDescription>
                Уроки за последние 30 дней
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profile.recentLessons.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Нет уроков за последние 30 дней</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Дата</TableHead>
                        <TableHead>Время</TableHead>
                        <TableHead>Филиал</TableHead>
                        <TableHead>Кабинет</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Заметки</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profile.recentLessons.map((lesson) => (
                        <TableRow key={lesson.id}>
                          <TableCell className="font-medium">
                            {format(new Date(lesson.lesson_date), 'dd.MM.yyyy', { locale: ru })}
                          </TableCell>
                          <TableCell>
                            {lesson.start_time?.slice(0, 5)}
                            {lesson.end_time && ` — ${lesson.end_time.slice(0, 5)}`}
                          </TableCell>
                          <TableCell>{lesson.branch || '—'}</TableCell>
                          <TableCell>{lesson.classroom || '—'}</TableCell>
                          <TableCell>{getStatusBadge(lesson.status)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {lesson.notes || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Модальное окно редактирования */}
      <EditTeacherModal
        teacher={profile as Teacher}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onUpdated={() => refetch()}
      />
    </div>
  );
};

export default TeacherProfilePage;
