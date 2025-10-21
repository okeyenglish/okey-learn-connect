import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserCircle, Mail, Phone, MapPin, BookOpen, FileText, Bell, Edit, Calendar, Clock, TrendingUp, DollarSign } from 'lucide-react';
import { Teacher } from '@/hooks/useTeachers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTeacherWorkload, useTeacherLessonsHistory } from '@/hooks/useTeacherWorkload';
import { useTeacherRates } from '@/hooks/useTeacherSalary';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface TeacherProfileProps {
  teacher: Teacher;
}

export const TeacherProfile = ({ teacher }: TeacherProfileProps) => {
  const teacherName = `${teacher.last_name} ${teacher.first_name}`;
  
  const { data: workload, isLoading: workloadLoading } = useTeacherWorkload(teacherName);
  const { data: lessonsHistory } = useTeacherLessonsHistory(teacherName, 6);
  const { data: rates } = useTeacherRates(teacher.id);

  const mockDocuments = [
    { id: '1', name: 'Диплом о высшем образовании', type: 'diploma', date: '2020-06-15' },
    { id: '2', name: 'Сертификат CELTA', type: 'certificate', date: '2021-03-20' },
  ];

  // Формируем данные для графика
  const chartData = (lessonsHistory || []).map((stat: any) => ({
    month: format(new Date(stat.month + '-01'), 'LLL yyyy', { locale: ru }),
    Проведено: stat.completed,
    Отменено: stat.cancelled,
    Часов: Math.round(stat.total_hours * 10) / 10,
  }));

  // Получаем текущую ставку
  const currentRate = rates?.find((r: any) => 
    r.lesson_type === 'group' || r.lesson_type === 'individual'
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              Профиль преподавателя
            </CardTitle>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Редактировать
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="info">Информация</TabsTrigger>
              <TabsTrigger value="workload">Нагрузка</TabsTrigger>
              <TabsTrigger value="documents">Документы</TabsTrigger>
              <TabsTrigger value="settings">Настройки</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6">
              {/* Основная информация */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Основная информация</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 border rounded-xl">
                    <UserCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">ФИО</p>
                      <p className="font-medium">{teacher.last_name} {teacher.first_name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 border rounded-xl">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Филиал</p>
                      <p className="font-medium">{teacher.branch}</p>
                    </div>
                  </div>

                  {teacher.email && (
                    <div className="flex items-start gap-3 p-4 border rounded-xl">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{teacher.email}</p>
                      </div>
                    </div>
                  )}

                  {teacher.phone && (
                    <div className="flex items-start gap-3 p-4 border rounded-xl">
                      <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Телефон</p>
                        <p className="font-medium">{teacher.phone}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Специализация */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Специализация
                </h3>
                <div className="space-y-4">
                  <div className="p-4 border rounded-xl">
                    <p className="text-sm text-muted-foreground mb-2">Предметы</p>
                    <div className="flex flex-wrap gap-2">
                      {teacher.subjects?.map((subject: string) => (
                        <Badge key={subject} variant="secondary" className="text-sm">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {teacher.categories && teacher.categories.length > 0 && (
                    <div className="p-4 border rounded-xl">
                      <p className="text-sm text-muted-foreground mb-2">Категории</p>
                      <div className="flex flex-wrap gap-2">
                        {teacher.categories.map((category: string) => (
                          <Badge key={category} variant="outline" className="text-sm">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Статус */}
              <div className="p-4 border rounded-xl bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Статус аккаунта</span>
                  <Badge variant={teacher.is_active ? "default" : "secondary"}>
                    {teacher.is_active ? "Активен" : "Неактивен"}
                  </Badge>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="workload">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold mb-4">Текущая нагрузка</h3>
                
                {workloadLoading ? (
                  <div className="text-center py-8">Загрузка...</div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="p-5 bg-brand/5 border-brand/20">
                        <div className="flex items-center gap-3">
                          <Clock className="h-8 w-8 text-brand" />
                          <div>
                            <p className="text-sm text-muted-foreground">Часов в неделю</p>
                            <p className="text-2xl font-bold text-brand">{workload?.weekly_hours || 0}</p>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-5 bg-brand/5 border-brand/20">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-8 w-8 text-brand" />
                          <div>
                            <p className="text-sm text-muted-foreground">Уроков в неделю</p>
                            <p className="text-2xl font-bold text-brand">{workload?.lessons_per_week || 0}</p>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-5 bg-brand/5 border-brand/20">
                        <div className="flex items-center gap-3">
                          <BookOpen className="h-8 w-8 text-brand" />
                          <div>
                            <p className="text-sm text-muted-foreground">Групп</p>
                            <p className="text-2xl font-bold text-brand">{workload?.groups_count || 0}</p>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-5 bg-brand/5 border-brand/20">
                        <div className="flex items-center gap-3">
                          <UserCircle className="h-8 w-8 text-brand" />
                          <div>
                            <p className="text-sm text-muted-foreground">Индивидуальных</p>
                            <p className="text-2xl font-bold text-brand">{workload?.individual_students || 0}</p>
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* График истории занятий */}
                    {chartData && chartData.length > 0 && (
                      <Card className="p-6">
                        <h4 className="text-lg font-semibold mb-4">История занятий (последние 6 месяцев)</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Проведено" fill="hsl(var(--brand))" />
                            <Bar dataKey="Отменено" fill="hsl(var(--destructive))" />
                          </BarChart>
                        </ResponsiveContainer>
                      </Card>
                    )}

                    {/* График часов */}
                    {chartData && chartData.length > 0 && (
                      <Card className="p-6">
                        <h4 className="text-lg font-semibold mb-4">Отработанные часы</h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="Часов" 
                              stroke="hsl(var(--brand))" 
                              strokeWidth={2}
                              dot={{ fill: 'hsl(var(--brand))' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </Card>
                    )}

                    {/* Информация о ставке */}
                    {currentRate && (
                      <Card className="p-6 bg-success/5 border-success/20">
                        <div className="flex items-start gap-3">
                          <DollarSign className="h-8 w-8 text-success mt-1" />
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold mb-2">Текущая ставка</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">За академический час</p>
                                <p className="text-2xl font-bold text-success">
                                  {currentRate.rate_per_hour} ₽
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Тип занятий</p>
                                <Badge variant="outline" className="mt-1">
                                  {currentRate.lesson_type === 'group' && 'Групповые'}
                                  {currentRate.lesson_type === 'individual' && 'Индивидуальные'}
                                </Badge>
                              </div>
                            </div>
                            {currentRate.notes && (
                              <p className="text-sm text-muted-foreground mt-3">{currentRate.notes}</p>
                            )}
                          </div>
                        </div>
                      </Card>
                    )}
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="documents">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Документы</h3>
                  <Button size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Добавить документ
                  </Button>
                </div>

                {mockDocuments.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-lg font-medium mb-2">Нет документов</p>
                    <p className="text-sm text-muted-foreground">
                      Добавьте дипломы и сертификаты
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mockDocuments.map((doc) => (
                      <Card key={doc.id} className="p-4 hover-scale">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-brand" />
                            <div>
                              <p className="font-medium">{doc.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Добавлено: {new Date(doc.date).toLocaleDateString('ru-RU')}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost">Просмотр</Button>
                            <Button size="sm" variant="ghost">Скачать</Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="settings">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Настройки уведомлений
                  </h3>
                  
                  <div className="space-y-4">
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Email уведомления</p>
                          <p className="text-sm text-muted-foreground">
                            Получать уведомления о расписании на почту
                          </p>
                        </div>
                        <Button variant="outline" size="sm">Включено</Button>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Telegram уведомления</p>
                          <p className="text-sm text-muted-foreground">
                            Получать уведомления в Telegram
                          </p>
                        </div>
                        <Button variant="outline" size="sm">Настроить</Button>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Напоминания о занятиях</p>
                          <p className="text-sm text-muted-foreground">
                            Получать напоминания за 30 минут до урока
                          </p>
                        </div>
                        <Button variant="outline" size="sm">Включено</Button>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
