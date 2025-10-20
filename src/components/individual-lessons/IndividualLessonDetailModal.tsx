import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PinnableModalHeader } from '@/components/crm/PinnableModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  User, 
  MapPin, 
  BookOpen, 
  Calendar, 
  Clock, 
  DollarSign,
  Phone,
  Edit,
  Plus,
  CheckCircle,
  AlertTriangle,
  MoreVertical,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useIndividualLessonSessions } from '@/hooks/useIndividualLessonSessions';
import { usePayments } from '@/hooks/usePayments';
import { AttendanceModal } from './AttendanceModal';
import { RescheduleLessonModal } from './RescheduleLessonModal';
import { CancelLessonModal } from './CancelLessonModal';
import { TeacherPaymentModal } from './TeacherPaymentModal';
import { CreatePaymentModal } from '@/components/students/CreatePaymentModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { IndividualLesson } from '@/hooks/useIndividualLessons';

interface IndividualLessonDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: IndividualLesson;
  isPinned?: boolean;
  onPin?: () => void;
  onUnpin?: () => void;
}

export function IndividualLessonDetailModal({
  open,
  onOpenChange,
  lesson,
  isPinned,
  onPin,
  onUnpin,
}: IndividualLessonDetailModalProps) {
  const [activeTab, setActiveTab] = useState('schedule');
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [teacherPaymentModalOpen, setTeacherPaymentModalOpen] = useState(false);
  const [studentPaymentModalOpen, setStudentPaymentModalOpen] = useState(false);
  const [paymentStats, setPaymentStats] = useState<any>(null);

  const { data: sessions, isLoading: sessionsLoading } = useIndividualLessonSessions(lesson.id);
  const { payments: studentPayments } = usePayments();

  // Фильтруем платежи для этого урока
  const lessonPayments = studentPayments?.filter(p => p.individual_lesson_id === lesson.id) || [];

  useEffect(() => {
    if (open && lesson.id && sessions) {
      loadPaymentStats();
    }
  }, [open, lesson.id, sessions]);

  const loadPaymentStats = async () => {
    // Подсчитываем статистику оплат
    const totalLessons = sessions?.filter(s => s.status !== 'cancelled').length || 0;
    const pricePerLesson = lesson.price_per_lesson || 0;
    const totalCalculated = totalLessons * pricePerLesson;
    const totalPaid = lessonPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalRemaining = totalCalculated - totalPaid;

    setPaymentStats({
      total_calculated: totalCalculated,
      total_paid: totalPaid,
      total_remaining: totalRemaining,
      lessons_count: totalLessons,
    });
  };

  const handleAttendanceClick = (session: any) => {
    setSelectedSession(session);
    setAttendanceModalOpen(true);
  };

  const handleRescheduleClick = (session: any) => {
    setSelectedSession(session);
    setRescheduleModalOpen(true);
  };

  const handleCancelClick = (session: any) => {
    setSelectedSession(session);
    setCancelModalOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 overflow-hidden">
        <PinnableModalHeader
          title={`${lesson.student_name} - ${lesson.subject}`}
          isPinned={isPinned || false}
          onPin={onPin || (() => {})}
          onUnpin={onUnpin || (() => {})}
          onClose={() => onOpenChange(false)}
        >
          <User className="h-5 w-5 ml-2" />
        </PinnableModalHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Основная информация */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Информация о курсе</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Ученик
                  </div>
                  <div className="font-medium">{lesson.student_name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Филиал
                  </div>
                  <div className="font-medium">{lesson.branch}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Предмет / Уровень
                  </div>
                  <div className="font-medium">{lesson.subject} - {lesson.level}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Преподаватель
                  </div>
                  <div className="font-medium">
                    {lesson.teacher_name || (
                      <Badge variant="destructive">Требуется</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Продолжительность
                  </div>
                  <div className="font-medium">{lesson.duration || 60} мин</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Расписание
                  </div>
                  <div className="font-medium">
                    {lesson.schedule_days?.join(', ')} {lesson.schedule_time}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Цена за урок
                  </div>
                  <div className="font-medium">{lesson.price_per_lesson} ₽</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Статус</div>
                  <Badge variant={lesson.status === 'active' ? 'default' : 'secondary'}>
                    {lesson.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Вкладки */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="schedule">Расписание</TabsTrigger>
              <TabsTrigger value="payments">Оплаты ученика</TabsTrigger>
              <TabsTrigger value="teacher-payments">Оплата преподавателю</TabsTrigger>
              <TabsTrigger value="history">История</TabsTrigger>
            </TabsList>

            {/* Вкладка: Расписание */}
            <TabsContent value="schedule" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Занятия</h3>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить занятие
                </Button>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>Время</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Преподаватель</TableHead>
                      <TableHead>Комментарий</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          Загрузка...
                        </TableCell>
                      </TableRow>
                    ) : sessions && sessions.length > 0 ? (
                      sessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>
                            {new Date(session.lesson_date).toLocaleDateString('ru-RU')}
                          </TableCell>
                          <TableCell>{session.duration} мин</TableCell>
                          <TableCell>
                            <Badge variant={
                              session.status === 'completed' ? 'default' : 
                              session.status === 'cancelled' ? 'destructive' : 
                              'secondary'
                            }>
                              {session.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{lesson.teacher_name}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {session.notes}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleAttendanceClick(session)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Отметить посещаемость
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleRescheduleClick(session)}>
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Перенести
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleCancelClick(session)}
                                  className="text-red-600"
                                >
                                  <AlertTriangle className="h-4 w-4 mr-2" />
                                  Отменить
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Нет занятий
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Вкладка: Оплаты ученика */}
            <TabsContent value="payments" className="space-y-4">
              {/* Статистика оплат */}
              {paymentStats && (
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Итого</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {paymentStats.total_calculated?.toFixed(2)} ₽
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {paymentStats.lessons_count} занятий
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Получено</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {paymentStats.total_paid?.toFixed(2)} ₽
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Осталось</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${
                        paymentStats.total_remaining > 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {paymentStats.total_remaining?.toFixed(2)} ₽
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Платежи</h3>
                <Button size="sm" onClick={() => setStudentPaymentModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить платеж
                </Button>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Способ</TableHead>
                      <TableHead>Комментарий</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lessonPayments.length > 0 ? (
                      lessonPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {new Date(payment.payment_date).toLocaleDateString('ru-RU')}
                          </TableCell>
                          <TableCell className="font-medium">
                            {payment.amount} ₽
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{payment.method}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {payment.notes}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Нет платежей
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Вкладка: Оплата преподавателю */}
            <TabsContent value="teacher-payments" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Расчет оплаты преподавателю</h3>
                <Button 
                  size="sm" 
                  onClick={() => setTeacherPaymentModalOpen(true)}
                  disabled={!lesson.teacher_name}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Выплатить
                </Button>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Преподаватель:</span>
                      <span className="font-medium">{lesson.teacher_name || 'Не назначен'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Ставка:</span>
                      <span className="font-medium">{lesson.teacher_rate || 500} ₽/час</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Проведено занятий:</span>
                      <span className="font-medium">
                        {sessions?.filter(s => s.status === 'completed').length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t">
                      <span className="font-semibold">К выплате:</span>
                      <span className="text-xl font-bold text-green-600">
                        {(
                          (sessions?.filter(s => s.status === 'completed').length || 0) * 
                          (lesson.duration || 60) / 60 * 
                          (lesson.teacher_rate || 500)
                        ).toFixed(2)} ₽
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Вкладка: История */}
            <TabsContent value="history" className="space-y-4">
              <h3 className="text-lg font-semibold">История изменений</h3>
              <div className="border rounded-lg p-4">
                <p className="text-sm text-muted-foreground text-center">
                  История изменений будет доступна в следующих версиях
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Модальные окна */}
        {selectedSession && (
          <>
            <AttendanceModal
              open={attendanceModalOpen}
              onOpenChange={setAttendanceModalOpen}
              session={selectedSession}
              defaultTeacher={lesson.teacher_name}
            />
            <RescheduleLessonModal
              open={rescheduleModalOpen}
              onOpenChange={setRescheduleModalOpen}
              session={selectedSession}
            />
            <CancelLessonModal
              open={cancelModalOpen}
              onOpenChange={setCancelModalOpen}
              session={selectedSession}
            />
          </>
        )}
        
        <TeacherPaymentModal
          open={teacherPaymentModalOpen}
          onOpenChange={setTeacherPaymentModalOpen}
          lesson={lesson}
        />

        <CreatePaymentModal
          open={studentPaymentModalOpen}
          onOpenChange={setStudentPaymentModalOpen}
          studentId={lesson.student_id || ''}
          studentName={lesson.student_name}
          individualLessonId={lesson.id}
        />
      </DialogContent>
    </Dialog>
  );
}
