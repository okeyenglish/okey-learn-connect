import { useState, useEffect } from 'react';
import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PinnableDialogContent, PinnableModalHeader } from '@/components/crm/PinnableModal';
import { usePinnedModalsDB } from '@/hooks/usePinnedModalsDB';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  Phone, 
  Mail, 
  Calendar, 
  User,
  GraduationCap,
  CreditCard,
  Clock,
  MessageSquare,
  Edit,
  Users,
  BookOpen,
  MapPin,
  Building,
  TrendingUp,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Smartphone,
  MessageCircleIcon,
  Plus,
  FileText,
  Wallet,
  Trash2,
  Check,
  X,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  AlertTriangle,
  Video
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useStudentDetails, StudentFullDetails } from '@/hooks/useStudentDetails';
import { Student } from '@/hooks/useStudents';
import { usePayments } from '@/hooks/usePayments';
import { useStudentHistory } from '@/hooks/useStudentHistory';
import { AddAdditionalLessonModal } from './AddAdditionalLessonModal';
import { AddToGroupModal } from './AddToGroupModal';
import { AddIndividualLessonModal } from './AddIndividualLessonModal';
import { GroupDetailModal } from '@/components/learning-groups/GroupDetailModal';
import { LearningGroup } from '@/hooks/useLearningGroups';

import { GroupLessonSchedule } from './GroupLessonSchedule';
import { CreatePaymentModal } from './CreatePaymentModal';
import { EditIndividualLessonModal } from './EditIndividualLessonModal';
import { ScheduleSummary } from './ScheduleSummary';
import { IndividualLessonSchedule } from './IndividualLessonSchedule';
import { IndividualLessonPaymentInfo } from './IndividualLessonPaymentInfo';
import { StudentBalanceModal } from './StudentBalanceModal';
import { StudentPaymentInfo } from '@/components/learning-groups/StudentPaymentInfo';
import { LessonColorLegend } from '@/components/learning-groups/LessonColorLegend';
import { useStudentBalance } from '@/hooks/useStudentBalance';
import { calculateLessonPrice } from '@/utils/lessonPricing';
import { getCoursePriceInfo } from '@/utils/coursePricing';
import { useUpdateIndividualLesson } from '@/hooks/useIndividualLessons';
import { OnlineLessonModal } from '@/components/OnlineLessonModal';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EnhancedStudentCardProps {
  student: {
    id: string;
    name: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPinned?: boolean;
  onPin?: () => void;
  onUnpin?: () => void;
  onUpdate?: () => void;
}

export function EnhancedStudentCard({ 
  student, 
  open, 
  onOpenChange,
  isPinned: propIsPinned = false,
  onPin = () => {},
  onUnpin = () => {},
  onUpdate = () => {}
}: EnhancedStudentCardProps) {
  const queryClient = useQueryClient();
  const { isPinned: checkIsPinned, pinModal, unpinModal } = usePinnedModalsDB();
  const isPinned = checkIsPinned(student.id, 'student');
  const [activeTab, setActiveTab] = useState('overview');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [firstNameValue, setFirstNameValue] = useState('');
  const [lastNameValue, setLastNameValue] = useState('');
  const [middleNameValue, setMiddleNameValue] = useState('');
  const [isEditingAge, setIsEditingAge] = useState(false);
  const [ageValue, setAgeValue] = useState<number | undefined>(undefined);
  const [dateOfBirthValue, setDateOfBirthValue] = useState<Date | undefined>(undefined);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [groupPaymentModalOpen, setGroupPaymentModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<any>(null);
  const [addLessonModalOpen, setAddLessonModalOpen] = useState(false);
  const [addLessonForId, setAddLessonForId] = useState<string | null>(null);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState('');
  const [showAddToGroup, setShowAddToGroup] = useState(false);
  const [showAddIndividualLesson, setShowAddIndividualLesson] = useState(false);
  const [selectedGroupForModal, setSelectedGroupForModal] = useState<LearningGroup | null>(null);
  const [onlineLessonOpen, setOnlineLessonOpen] = useState(false);
  const [onlineLessonData, setOnlineLessonData] = useState<{
    lessonType: 'group' | 'individual';
    teacherName?: string;
    groupId?: string;
    studentId?: string;
    studentName?: string;
    groupName?: string;
  } | null>(null);
  
  const { data: studentDetails, isLoading, refetch } = useStudentDetails(student.id);
  const { data: balance } = useStudentBalance(student.id);
  const { deletePayment } = usePayments();
  const { data: history, isLoading: historyLoading } = useStudentHistory(student.id);
  const updateIndividualLesson = useUpdateIndividualLesson();

  // Обновляем данные при открытии модального окна
  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  // Realtime: обновляем карточку студента при изменении его платежей
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments', filter: `student_id=eq.${student.id}` },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [student.id, refetch]);

  // Проверка наличия будущих запланированных занятий
  const hasFutureSessions = (lesson: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Проверяем период обучения - если period_end в будущем, курс нельзя архивировать
    if (lesson.periodEnd) {
      const endDate = new Date(lesson.periodEnd);
      endDate.setHours(0, 0, 0, 0);
      if (endDate >= today) {
        return true; // Период еще не закончился
      }
    }
    
    // Дополнительно проверяем записи сессий в БД (если они есть)
    return lesson.sessions?.some((session: any) => {
      const lessonDate = new Date(session.lessonDate);
      lessonDate.setHours(0, 0, 0, 0);
      return lessonDate >= today && session.status === 'scheduled';
    }) || false;
  };

  const handleArchiveLesson = async (lessonId: string) => {
    try {
      await updateIndividualLesson.mutateAsync({
        id: lessonId,
        status: 'finished'
      });
      toast.success('Занятие архивировано');
    } catch (error) {
      console.error('Error archiving lesson:', error);
      toast.error('Ошибка при архивации занятия');
    }
  };

  const handleUnarchiveLesson = async (lessonId: string) => {
    try {
      await updateIndividualLesson.mutateAsync({
        id: lessonId,
        status: 'active'
      });
      toast.success('Занятие разархивировано');
    } catch (error) {
      console.error('Error unarchiving lesson:', error);
      toast.error('Ошибка при разархивации занятия');
    }
  };

  const handleRemoveFromGroup = async (groupId: string, studentId: string) => {
    try {
      // Find the group_students record
      const { data: groupStudent } = await supabase
        .from('group_students')
        .select('id')
        .eq('group_id', groupId)
        .eq('student_id', studentId)
        .eq('status', 'active')
        .maybeSingle();

      if (!groupStudent) {
        toast.error('Студент не найден в этой группе');
        return;
      }

      // Update status to dropped
      const { error } = await supabase
        .from('group_students')
        .update({ 
          status: 'dropped',
          updated_at: new Date().toISOString()
        })
        .eq('id', groupStudent.id);

      if (error) throw error;

      toast.success('Студент исключен из группы');
      
      // Refetch student details
      queryClient.invalidateQueries({ queryKey: ['student-details', studentId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['learning-groups'] });
      
      // Call parent update callback
      onUpdate();
      refetch();
    } catch (error) {
      console.error('Error removing student from group:', error);
      toast.error('Не удалось исключить студента из группы');
    }
  };

  const handleRestoreToGroup = async (studentId: string, groupId: string) => {
    try {
      // Find the group_student record and update status to active
      const { data: groupStudent } = await supabase
        .from('group_students')
        .select('id')
        .eq('student_id', studentId)
        .eq('group_id', groupId)
        .single();

      if (!groupStudent) {
        toast.error('Запись о студенте в группе не найдена');
        return;
      }

      const { error } = await supabase
        .from('group_students')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', groupStudent.id);

      if (error) throw error;

      toast.success('Студент восстановлен в группу');
      
      queryClient.invalidateQueries({ queryKey: ['student-details', studentId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['learning-groups'] });
      
      onUpdate();
      refetch();
    } catch (error) {
      console.error('Error restoring student to group:', error);
      toast.error('Не удалось восстановить студента в группу');
    }
  };

  const handleCopyStudentLink = () => {
    const url = `${window.location.origin}/newcrm/main?studentId=${student.id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Ссылка скопирована в буфер обмена');
    }).catch(() => {
      toast.error('Не удалось скопировать ссылку');
    });
  };

  // Update notes value when student details load
  React.useEffect(() => {
    if (studentDetails?.notes) {
      setNotesValue(studentDetails.notes);
    }
  }, [studentDetails?.notes]);

  // Update name values when student details load
  React.useEffect(() => {
    if (studentDetails) {
      setFirstNameValue(studentDetails.firstName || '');
      setLastNameValue(studentDetails.lastName || '');
      setMiddleNameValue(studentDetails.middleName || '');
      setAgeValue(studentDetails.age);
      setPhoneValue(studentDetails.phone || '');
      if (studentDetails.dateOfBirth) {
        setDateOfBirthValue(new Date(studentDetails.dateOfBirth));
      }
    }
  }, [studentDetails]);

  const handleSaveName = async () => {
    if (!firstNameValue.trim() || !lastNameValue.trim()) {
      toast.error('Имя и фамилия обязательны');
      return;
    }

    try {
      const { error } = await supabase
        .from('students')
        .update({ 
          first_name: firstNameValue.trim(),
          last_name: lastNameValue.trim(),
          middle_name: middleNameValue.trim()
        })
        .eq('id', student.id);

      if (error) throw error;
      
      setIsEditingName(false);
      refetch();
      toast.success('ФИО обновлено');
    } catch (error) {
      console.error('Error saving name:', error);
      toast.error('Не удалось сохранить ФИО');
    }
  };

  const handleSaveAge = async () => {
    try {
      const updateData: any = {};
      
      if (dateOfBirthValue) {
        const dateStr = format(dateOfBirthValue, 'yyyy-MM-dd');
        updateData.date_of_birth = dateStr;
        
        // Автоматически вычисляем возраст из даты рождения
        const today = new Date();
        const birthDate = new Date(dateOfBirthValue);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        updateData.age = age;
      } else if (ageValue !== undefined) {
        // Если только возраст указан без даты рождения
        updateData.age = ageValue;
      }

      const { error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', student.id);

      if (error) throw error;
      
      setIsEditingAge(false);
      refetch();
      toast.success('Данные обновлены');
    } catch (error) {
      console.error('Error saving age:', error);
      toast.error('Не удалось сохранить данные');
    }
  };

  const handleSavePhone = async () => {
    if (!phoneValue.trim()) {
      toast.error('Введите номер телефона');
      return;
    }

    try {
      const { error } = await supabase
        .from('students')
        .update({ phone: phoneValue.trim() })
        .eq('id', student.id);

      if (error) throw error;
      
      setIsEditingPhone(false);
      refetch();
      toast.success('Номер телефона обновлен');
    } catch (error) {
      console.error('Error saving phone:', error);
      toast.error('Не удалось сохранить номер');
    }
  };

  const handleDeletePhone = async () => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ phone: null })
        .eq('id', student.id);

      if (error) throw error;
      
      setIsEditingPhone(false);
      setPhoneValue('');
      refetch();
      toast.success('Номер телефона удален');
    } catch (error) {
      console.error('Error deleting phone:', error);
      toast.error('Не удалось удалить номер');
    }
  };

  const handleSaveNotes = async () => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ notes: notesValue })
        .eq('id', student.id);

      if (error) throw error;
      
      setIsEditingNotes(false);
      refetch();
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  const handleNotesKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveNotes();
    }
  };

  const handleDeletePaymentClick = (payment: any) => {
    console.log('Payment to delete:', payment);
    setPaymentToDelete(payment);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!paymentToDelete) return;
    
    console.log('Confirming delete for payment:', {
      id: paymentToDelete.id,
      individualLessonId: paymentToDelete.individualLessonId,
      lessonsCount: paymentToDelete.lessonsCount
    });
    
    try {
      await deletePayment(
        paymentToDelete.id,
        paymentToDelete.individualLessonId,
        paymentToDelete.lessonsCount
      );
      
      // Обновляем данные студента
      refetch();
      setRefreshTrigger(prev => prev + 1);
      
      setDeleteDialogOpen(false);
      setPaymentToDelete(null);
    } catch (error) {
      console.error('Error deleting payment:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; label: string }> = {
      active: { color: 'bg-success-100 text-success-800 border-success-200', label: 'Активный' },
      inactive: { color: 'bg-surface text-text-secondary border-border', label: 'Неактивный' },
      trial: { color: 'bg-info-100 text-info-800 border-info-200', label: 'Пробный' },
      graduated: { color: 'bg-brand-100 text-brand-800 border-brand-200', label: 'Выпускник' },
    };
    const variant = variants[status] || variants.active;
    return <Badge className={`${variant.color} border`}>{variant.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.map(p => p.charAt(0).toUpperCase()).join('').slice(0, 2);
  };

  const getRelationshipLabel = (relationship: string) => {
    const labels: Record<string, string> = {
      main: 'Основной',
      parent: 'Родитель',
      mother: 'Мать',
      father: 'Отец',
      guardian: 'Опекун',
      spouse: 'Супруг(а)',
      other: 'Другое',
    };
    return labels[relationship] || relationship;
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-3rem)] h-[calc(100vh-3rem)] max-w-full overflow-hidden">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Загрузка данных студента...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!studentDetails) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <PinnableDialogContent 
        className="w-[calc(100vw-3rem)] h-[calc(100vh-3rem)] max-w-full overflow-hidden p-0 bg-surface flex flex-col"
        preventOutsideClose={isPinned}
      >
        {/* Header */}
        <div className="bg-bg-soft border-b border-border/50 px-6 py-4">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16 border-2 border-border">
                  <AvatarFallback className="bg-bg-soft text-text-primary text-xl font-semibold">
                    {getInitials(studentDetails.name)}
                  </AvatarFallback>
                </Avatar>
                {studentDetails.status === 'active' && (
                  <div className="absolute -bottom-1 -right-1 bg-success-600 rounded-full p-1 border-2 border-surface">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={lastNameValue}
                        onChange={(e) => setLastNameValue(e.target.value)}
                        placeholder="Фамилия"
                        className="h-8 w-32 bg-surface border-border/50"
                      />
                      <Input
                        value={firstNameValue}
                        onChange={(e) => setFirstNameValue(e.target.value)}
                        placeholder="Имя"
                        className="h-8 w-32 bg-surface border-border/50"
                      />
                      <Input
                        value={middleNameValue}
                        onChange={(e) => setMiddleNameValue(e.target.value)}
                        placeholder="Отчество"
                        className="h-8 w-32 bg-surface border-border/50"
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSaveName} title="Сохранить">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditingName(false)} title="Отменить">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <h2 
                      className="text-2xl font-bold text-text-primary cursor-pointer hover:text-brand transition-colors"
                      onClick={() => setIsEditingName(true)}
                      title="Нажмите, чтобы редактировать ФИО"
                    >
                      {studentDetails.lastName} {studentDetails.firstName} {studentDetails.middleName}
                      {studentDetails.studentNumber && (
                        <span 
                          className="ml-3 text-sm font-mono text-text-secondary cursor-pointer hover:text-brand transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyStudentLink();
                          }}
                          title="Нажмите, чтобы скопировать ссылку"
                        >
                          #{studentDetails.studentNumber}
                        </span>
                      )}
                    </h2>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-text-secondary">
                  {isEditingAge ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={ageValue || ''}
                        onChange={(e) => setAgeValue(e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="Возраст"
                        className="h-8 w-20"
                        min={0}
                        max={120}
                      />
                      <span className="text-xs text-muted-foreground">или</span>
                      <Input
                        type="date"
                        value={dateOfBirthValue ? format(dateOfBirthValue, 'yyyy-MM-dd') : ''}
                        onChange={(e) => setDateOfBirthValue(e.target.value ? new Date(e.target.value) : undefined)}
                        placeholder="Дата рождения"
                        className="h-8 w-36"
                        max={format(new Date(), 'yyyy-MM-dd')}
                      />
                      <Button size="sm" variant="ghost" onClick={handleSaveAge} title="Сохранить">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setIsEditingAge(false)} title="Отменить">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span 
                        className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => setIsEditingAge(true)}
                        title="Нажмите, чтобы редактировать возраст/дату рождения"
                      >
                        <Calendar className="h-4 w-4" />
                        {studentDetails.age && `${studentDetails.age} лет`}
                        {studentDetails.dateOfBirth && (
                          <span className="text-muted-foreground/80">
                            ({formatDate(studentDetails.dateOfBirth)})
                          </span>
                        )}
                        {!studentDetails.age && !studentDetails.dateOfBirth && 'Добавить возраст/дату'}
                      </span>
                    </>
                  )}
                </div>
                {isEditingPhone ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      value={phoneValue}
                      onChange={(e) => setPhoneValue(e.target.value)}
                      placeholder="+7 (XXX) XXX-XX-XX"
                      className="h-8 w-48"
                    />
                    <Button size="sm" variant="ghost" onClick={handleSavePhone} title="Сохранить">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditingPhone(false)} title="Отменить">
                      <X className="h-4 w-4" />
                    </Button>
                    {studentDetails.phone && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={handleDeletePhone}
                        title="Удалить номер"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                 ) : studentDetails.phone ? (
                  <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span 
                      className="cursor-pointer hover:text-primary transition-colors"
                      onClick={() => {
                        setPhoneValue(studentDetails.phone || '');
                        setIsEditingPhone(true);
                      }}
                      title="Нажмите для редактирования"
                    >
                      {studentDetails.phone}
                    </span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 px-1.5"
                      title="Написать"
                    >
                      <MessageSquare className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 px-1.5"
                      title="Позвонить"
                    >
                      <Phone className="h-3 w-3" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Notes Section */}
            <div className="flex-1 max-w-lg mr-2">
              <div className="border border-border rounded-lg p-3 bg-background h-[64px] overflow-y-auto">
                {isEditingNotes ? (
                  <Textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    onKeyDown={handleNotesKeyDown}
                    onBlur={handleSaveNotes}
                    placeholder="Заметки о студенте..."
                    className="h-full text-sm resize-none border-0 p-0 bg-transparent focus-visible:ring-0"
                    autoFocus
                  />
                ) : (
                  <div
                    onClick={() => setIsEditingNotes(true)}
                    className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors whitespace-pre-wrap"
                  >
                    {notesValue || 'Заметки о студенте...'}
                  </div>
                )}
              </div>
            </div>

            {/* Pin and Close buttons */}
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => {
                  if (isPinned) {
                    unpinModal(student.id, 'student');
                  } else {
                    pinModal({
                      id: student.id,
                      type: 'student',
                      title: studentDetails.name,
                      props: { student }
                    });
                  }
                }}
                title={isPinned ? "Открепить" : "Закрепить"}
              >
                {isPinned ? (
                  <PinOff className="h-4 w-4 text-orange-600" />
                ) : (
                  <Pin className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => onOpenChange(false)}
                title="Закрыть"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 flex">
          {/* Sidebar */}
          <div className="w-80 border-r border-border/50 bg-bg-soft p-4 overflow-y-auto">
            <ScrollArea className="h-full">
              <div className="space-y-4">
                {/* Quick Actions */}
                <Card className="card-base">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-text-primary">Быстрые действия</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {!studentDetails.phone && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start h-9 border-border/50"
                        onClick={() => setIsEditingPhone(true)}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Добавить номер
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start h-9 border-border/50"
                      onClick={() => setShowAddToGroup(true)}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Добавить в группу
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start h-9 border-border/50"
                      onClick={() => setShowAddIndividualLesson(true)}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Добавить индивидуально
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start h-9 border-border/50"
                      onClick={() => {
                        setSelectedLesson(null);
                        setPaymentModalOpen(true);
                      }}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Внести оплату
                    </Button>
                  </CardContent>
                </Card>

                {/* Parents/Guardians */}
                <Card className="card-base">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-text-primary flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Родители и опекуны
                      </CardTitle>
                      <Badge variant="secondary" className="badge-secondary">{studentDetails.parents.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {studentDetails.parents.length === 0 ? (
                      <p className="text-sm text-text-secondary">Контакты не добавлены</p>
                    ) : (
                      studentDetails.parents.map((parent) => (
                        <div key={parent.id} className="space-y-2 p-3 bg-surface rounded-lg border border-border/50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm text-text-primary">{parent.name}</p>
                                {parent.isPrimary && (
                                  <Badge variant="outline" className="text-xs">Основной</Badge>
                                )}
                              </div>
                              <p className="text-xs text-text-secondary">
                                {getRelationshipLabel(parent.relationship)}
                              </p>
                            </div>
                          </div>
                          
                          <Separator className="bg-border/50" />
                          
                          <div className="space-y-1">
                            {parent.phoneNumbers.map((phone) => (
                              <div key={phone.id} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1 text-text-primary">
                                  <Phone className="h-3 w-3 text-text-secondary" />
                                  <span>{phone.phone}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {phone.isWhatsappEnabled && (
                                    <MessageCircleIcon className="h-3 w-3 text-success-600" />
                                  )}
                                  {phone.isTelegramEnabled && (
                                    <Smartphone className="h-3 w-3 text-info-600" />
                                  )}
                                </div>
                              </div>
                            ))}
                            {parent.email && (
                              <div className="flex items-center gap-1 text-xs text-text-primary">
                                <Mail className="h-3 w-3 text-text-secondary" />
                                <span>{parent.email}</span>
                              </div>
                            )}
                          </div>

                          <Button variant="ghost" size="sm" className="w-full h-7 text-xs">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Открыть чат
                          </Button>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-h-0 flex flex-col bg-surface">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="border-b border-border/50 px-6 pt-4 bg-surface">
                <TabsList className="h-auto p-0 bg-transparent border-b-0">
                  <TabsTrigger 
                    value="overview" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:text-brand rounded-none border-b-2 border-transparent text-text-secondary"
                  >
                    Обзор
                  </TabsTrigger>
                  <TabsTrigger 
                    value="groups" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:text-brand rounded-none border-b-2 border-transparent text-text-secondary"
                  >
                    Группы
                  </TabsTrigger>
                  <TabsTrigger 
                    value="individual" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:text-brand rounded-none border-b-2 border-transparent text-text-secondary"
                  >
                    Индивидуальные
                  </TabsTrigger>
                  <TabsTrigger 
                    value="payments" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:text-brand rounded-none border-b-2 border-transparent text-text-secondary"
                  >
                    Финансы
                  </TabsTrigger>
                  <TabsTrigger 
                    value="attendance" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:text-brand rounded-none border-b-2 border-transparent text-text-secondary"
                  >
                    Посещаемость
                  </TabsTrigger>
                  <TabsTrigger value="history" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none border-b-2 border-transparent">
                    История
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1 px-6 py-4">
                <TabsContent value="overview" className="mt-0 space-y-4">
                  {/* Легенда цветов */}
                  <LessonColorLegend />
                  
                  {/* Current Groups */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <GraduationCap className="h-5 w-5" />
                        Текущие занятия в группах
                      </CardTitle>
                      <CardDescription>
                        Активные группы студента
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {studentDetails.groups.filter(g => g.status === 'active').length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                          <p className="text-muted-foreground">Студент пока не добавлен ни в одну группу</p>
                          <Button variant="outline" size="sm" className="mt-4">
                            <Users className="h-4 w-4 mr-2" />
                            Добавить в группу
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Groups */}
                          {studentDetails.groups.filter((g) => g.status === 'active').map((group) => (
                            <div 
                              key={group.id} 
                              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-default relative min-w-0 overflow-hidden"
                            >
                              {/* Заголовок с названием группы */}
                              <div className="flex items-start justify-between mb-2">
                                <h4 
                                  className="font-medium text-base text-primary cursor-pointer hover:underline"
                                  onClick={() => setSelectedGroupForModal(group as any)}
                                >
                                  {group.name}
                                  {group.groupNumber && (
                                    <span className="ml-2 text-xs font-mono text-muted-foreground">
                                      #{group.groupNumber}
                                    </span>
                                  )}
                                </h4>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {group.format}
                                  </Badge>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedGroup(group);
                                      setGroupPaymentModalOpen(true);
                                    }}
                                    title="Оплатить занятия"
                                  >
                                    <Wallet className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveFromGroup(group.id, student.id);
                                    }}
                                    title="Удалить из группы"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              {/* Предмет и уровень */}
                              <div className="flex items-center gap-2 text-sm mb-2">
                                <span className="font-medium">{group.subject}</span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground">{group.level}</span>
                              </div>

                              {/* Преподаватель и филиал */}
                              <div className="flex items-center gap-3 text-sm mb-2">
                                <Badge variant="secondary" className="text-xs">
                                  <User className="h-3 w-3 mr-1" />
                                  {group.teacher}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  <Building className="h-3 w-3 mr-1" />
                                  {group.branch}
                                </Badge>
                              </div>

                              {/* Расписание группы (если есть) */}
                              {group.schedule && (
                                <div className="text-sm mb-2">
                                  <span className="text-muted-foreground">Расписание: </span>
                                  <span className="font-medium">{group.schedule}</span>
                                </div>
                              )}

                              {/* Дата зачисления */}
                              <div className="text-sm mb-3">
                                <span className="text-muted-foreground">Зачислен: </span>
                                <span className="font-medium">{formatDate(group.enrollmentDate)}</span>
                              </div>

                              {/* Платежная информация */}
                              <div className="mb-3 p-3 bg-muted/30 rounded-lg">
                                <StudentPaymentInfo 
                                  studentId={student.id} 
                                  groupId={group.id} 
                                />
                              </div>

                              {/* Расписание занятий */}
                              <div className="mt-3 pt-3 border-t">
                                <GroupLessonSchedule 
                                  studentId={student.id}
                                  groupId={group.id} 
                                  onRefresh={() => refetch()}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Payments */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Последние платежи
                      </CardTitle>
                      <CardDescription>
                        История оплат за последнее время
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {studentDetails.payments.length === 0 ? (
                        <div className="text-center py-8">
                          <CreditCard className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                          <p className="text-muted-foreground">Платежи отсутствуют</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {studentDetails.payments.slice(0, 5).map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-success-100 flex items-center justify-center">
                                  <DollarSign className="h-5 w-5 text-success-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{payment.description}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDate(payment.date)} • {payment.paymentMethod || 'Не указан'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-lg">
                                  {payment.amount.toLocaleString('ru-RU')} ₽
                                </p>
                                <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                                  {payment.status === 'completed' ? 'Оплачено' : payment.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="groups" className="mt-0">
                  {studentDetails.groups.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-12">
                        <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-lg text-muted-foreground mb-2">Студент не добавлен в группы</p>
                        <p className="text-sm text-muted-foreground mb-4">
                          Добавьте студента в группу для начала обучения
                        </p>
                        <Button onClick={() => setShowAddToGroup(true)}>
                          <Users className="h-4 w-4 mr-2" />
                          Добавить в группу
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-6">
                      {/* Active Groups */}
                      {studentDetails.groups.filter(g => g.status === 'active').length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-text-primary">
                              <CheckCircle className="h-5 w-5 text-success-600" />
                              Активные группы
                            </CardTitle>
                            <CardDescription>
                              Текущие группы студента
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Active Groups */}
                            {studentDetails.groups.filter(g => g.status === 'active').map((group) => (
                              <div 
                                key={group.id} 
                                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-default relative"
                              >
                                {/* Заголовок с названием группы */}
                                <div className="flex items-start justify-between mb-2">
                                  <h4 
                                    className="font-medium text-base text-primary cursor-pointer hover:underline"
                                    onClick={() => setSelectedGroupForModal(group as any)}
                                  >
                                    {group.name}
                                    {group.groupNumber && (
                                      <span className="ml-2 text-xs font-mono text-muted-foreground">
                                        #{group.groupNumber}
                                      </span>
                                    )}
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {group.format}
                                    </Badge>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedGroup(group);
                                        setGroupPaymentModalOpen(true);
                                      }}
                                      title="Оплатить занятия"
                                    >
                                      <Wallet className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveFromGroup(group.id, student.id);
                                      }}
                                      title="Удалить из группы"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Предмет и уровень */}
                                <div className="flex items-center gap-2 text-sm mb-2">
                                  <span className="font-medium">{group.subject}</span>
                                  <span className="text-muted-foreground">•</span>
                                  <span className="text-muted-foreground">{group.level}</span>
                                </div>

                                {/* Преподаватель и филиал */}
                                <div className="flex items-center gap-3 text-sm mb-2">
                                  <Badge variant="secondary" className="text-xs">
                                    <User className="h-3 w-3 mr-1" />
                                    {group.teacher}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    <Building className="h-3 w-3 mr-1" />
                                    {group.branch}
                                  </Badge>
                                </div>

                                {/* Расписание группы (если есть) */}
                                {group.schedule && (
                                  <div className="text-sm mb-2">
                                    <span className="text-muted-foreground">Расписание: </span>
                                    <span className="font-medium">{group.schedule}</span>
                                  </div>
                                )}

                                {/* Дата зачисления */}
                                <div className="text-sm mb-3">
                                  <span className="text-muted-foreground">Зачислен: </span>
                                  <span className="font-medium">{formatDate(group.enrollmentDate)}</span>
                                </div>

                                 {/* Расписание занятий */}
                                <div className="mt-3 pt-3 border-t">
                                  <GroupLessonSchedule 
                                    studentId={student.id}
                                    groupId={group.id} 
                                    onRefresh={() => refetch()}
                                  />
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      {/* Inactive Groups */}
                      {studentDetails.groups.filter(g => g.status !== 'active').length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <XCircle className="h-5 w-5 text-muted-foreground" />
                              Завершенные группы
                            </CardTitle>
                            <CardDescription>
                              История предыдущих групп
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {studentDetails.groups.filter(g => g.status !== 'active').map((group) => (
                              <div 
                                key={group.id} 
                                className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors cursor-default relative"
                              >
                                {/* Заголовок с названием группы */}
                                <div className="flex items-start justify-between mb-2">
                                  <h4 
                                    className="font-medium text-base text-muted-foreground cursor-pointer hover:underline"
                                    onClick={() => setSelectedGroupForModal(group as any)}
                                  >
                                    {group.name}
                                    {group.groupNumber && (
                                      <span className="ml-2 text-xs font-mono text-muted-foreground">
                                        #{group.groupNumber}
                                      </span>
                                    )}
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs bg-muted">
                                      Завершено
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRestoreToGroup(student.id, group.id)}
                                      className="h-7 px-2"
                                    >
                                      <ArchiveRestore className="h-3 w-3 mr-1" />
                                      Вернуть
                                    </Button>
                                  </div>
                                </div>

                                {/* Предмет и уровень */}
                                <div className="flex items-center gap-2 text-sm mb-2">
                                  <span className="font-medium text-muted-foreground">{group.subject}</span>
                                  <span className="text-muted-foreground">•</span>
                                  <span className="text-muted-foreground">{group.level}</span>
                                </div>

                                {/* Преподаватель и филиал */}
                                <div className="flex items-center gap-3 text-sm mb-3">
                                  <Badge variant="secondary" className="text-xs">
                                    <User className="h-3 w-3 mr-1" />
                                    {group.teacher}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    <Building className="h-3 w-3 mr-1" />
                                    {group.branch}
                                  </Badge>
                                </div>

                                {/* Период обучения */}
                                <div className="text-sm mb-3">
                                  <span className="text-muted-foreground">Период: </span>
                                  <span className="font-medium">{formatDate(group.enrollmentDate)}</span>
                                </div>

                                {/* История посещений */}
                                <div className="mt-3 pt-3 border-t">
                                  <GroupLessonSchedule 
                                    studentId={student.id}
                                    groupId={group.id} 
                                    onRefresh={() => refetch()}
                                  />
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="individual" className="mt-0">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Индивидуальные занятия
                          </CardTitle>
                          <CardDescription>
                            Полное управление индивидуальным обучением студента
                          </CardDescription>
                        </div>
                        <Button 
                          onClick={() => setShowAddIndividualLesson(true)}
                          className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Новое занятие
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {studentDetails.individualLessons.length === 0 ? (
                        <div className="text-center py-12">
                          <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                          <p className="text-lg text-muted-foreground mb-2">Нет индивидуальных занятий</p>
                          <p className="text-sm text-muted-foreground mb-4">
                            Создайте первое индивидуальное занятие для студента
                          </p>
                          <Button onClick={() => setShowAddIndividualLesson(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Добавить занятие
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Active Lessons */}
                          {studentDetails.individualLessons.filter(l => l.status === 'active').length > 0 && (
                            <div>
                              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-text-primary">
                                <CheckCircle className="h-5 w-5 text-success-600" />
                                Активные курсы
                                <Badge variant="secondary" className="badge-secondary">{studentDetails.individualLessons.filter(l => l.status === 'active').length}</Badge>
                              </h3>
                              <div className="space-y-4">
                                {studentDetails.individualLessons.filter(l => l.status === 'active').map((lesson) => (
                                  <Card key={lesson.id} className="card-base border-l-4 border-l-success-600 hover:shadow-elev-1 transition-shadow">
                                    <CardContent className="p-6">
                                      <div className="flex items-start justify-between mb-4">
                                        <div>
                                          <h4 className="font-semibold text-lg mb-1 text-text-primary">
                                            {lesson.subject} • {lesson.level}
                                          </h4>
                                          <div className="flex items-center gap-2 text-sm text-text-secondary">
                                            <User className="h-4 w-4" />
                                            <span>{lesson.teacherName || 'Преподаватель не назначен'}</span>
                                            {!lesson.teacherName && (
                                              <Badge variant="destructive" className="badge-error text-xs">
                                                <AlertTriangle className="h-3 w-3 mr-1" />
                                                Требуется преподаватель
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            size="sm"
                                            variant="default"
                                            onClick={() => {
                                              setOnlineLessonData({
                                                lessonType: 'individual',
                                                teacherName: lesson.teacherName,
                                                studentId: student.id,
                                                studentName: studentDetails?.name || student.name,
                                              });
                                              setOnlineLessonOpen(true);
                                            }}
                                            className="gap-2"
                                            title="Начать онлайн урок"
                                          >
                                            <Video className="h-4 w-4" />
                                            Начать урок
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => {
                                              setSelectedLessonId(lesson.id);
                                            }}
                                            title="Редактировать"
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            disabled={hasFutureSessions(lesson)}
                                            onClick={() => handleArchiveLesson(lesson.id)}
                                            title={hasFutureSessions(lesson) ? "Нельзя архивировать курс с запланированными занятиями" : "Архивировать"}
                                          >
                                            <Archive className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => {
                                              setSelectedLesson(lesson);
                                              setPaymentModalOpen(true);
                                            }}
                                            title="Внести оплату"
                                          >
                                            <Wallet className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => {
                                              setAddLessonForId(lesson.id);
                                              setAddLessonModalOpen(true);
                                            }}
                                            title="Добавить занятие"
                                          >
                                            <Plus className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>

                                      {/* Расписание */}
                                      {lesson.scheduleDays && lesson.scheduleDays.length > 0 && (
                                        <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                                          <div className="flex items-center gap-2 mb-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium text-sm">Расписание:</span>
                                          </div>
                                          <div className="flex items-center gap-3 text-sm">
                                            <span className="font-medium">
                                              {lesson.scheduleDays.map(day => {
                                                const dayLabels: Record<string, string> = {
                                                  monday: 'Пн', tuesday: 'Вт', wednesday: 'Ср',
                                                  thursday: 'Чт', friday: 'Пт', saturday: 'Сб', sunday: 'Вс'
                                                };
                                                return dayLabels[day.toLowerCase()] || day;
                                              }).join('/')}
                                            </span>
                                            {lesson.scheduleTime && (
                                              <>
                                                <span className="text-muted-foreground">•</span>
                                                <span>{lesson.scheduleTime}</span>
                                              </>
                                            )}
                                            <span className="text-muted-foreground">•</span>
                                            <Badge variant="secondary" className="text-xs">
                                              <Clock className="h-3 w-3 mr-1" />
                                              {lesson.duration || 60} мин
                                            </Badge>
                                            <span className="text-muted-foreground">•</span>
                                            <Badge variant="outline" className="text-xs">
                                              <DollarSign className="h-3 w-3 mr-1" />
                                              {calculateLessonPrice(lesson.duration || 60)} ₽
                                            </Badge>
                                          </div>
                                        </div>
                                      )}

                                      {lesson.isFlexibleSchedule && (
                                        <div className="mb-4 p-3 bg-info-100 border border-info-200 rounded-lg">
                                          <div className="flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-info-600" />
                                            <span className="text-sm font-medium text-text-primary">Плавающее расписание</span>
                                          </div>
                                          <p className="text-xs text-text-secondary mt-1">
                                            Занятия добавляются вручную по мере договоренности
                                          </p>
                                        </div>
                                      )}

                                      {/* Период */}
                                      {lesson.periodStart && lesson.periodEnd && (
                                        <div className="mb-4 text-sm">
                                          <span className="text-muted-foreground">Период: </span>
                                          <span className="font-medium">
                                            {formatDate(lesson.periodStart)} - {formatDate(lesson.periodEnd)}
                                          </span>
                                        </div>
                                      )}

                                      {/* Филиал и аудитория */}
                                      <div className="flex items-center gap-4 mb-4 text-sm">
                                        <div className="flex items-center gap-2">
                                          <MapPin className="h-4 w-4 text-muted-foreground" />
                                          <span className="font-medium">{lesson.branch}</span>
                                        </div>
                                        {lesson.auditLocation && (
                                          <>
                                            <span className="text-muted-foreground">•</span>
                                            <span className="text-muted-foreground">Ауд. {lesson.auditLocation}</span>
                                          </>
                                        )}
                                      </div>

                                      {/* Способ оплаты и ставка преподавателя */}
                                      {(lesson.paymentMethod || lesson.teacherRate) && (
                                        <div className="mb-4 p-3 bg-muted/20 rounded-lg">
                                          <div className="grid grid-cols-2 gap-4 text-sm">
                                            {lesson.paymentMethod && (
                                              <div>
                                                <span className="text-muted-foreground">Оплата: </span>
                                                <span className="font-medium">
                                                  {lesson.paymentMethod === 'per_lesson' ? 'По занятиям' : 'Абонемент'}
                                                </span>
                                              </div>
                                            )}
                                            {lesson.teacherRate && (
                                              <div>
                                                <span className="text-muted-foreground">Ставка: </span>
                                                <span className="font-medium">{lesson.teacherRate} ₽/час</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      <Separator className="my-4" />

                                      {/* Статистика оплаты */}
                                      <div className="mb-4">
                                        <IndividualLessonPaymentInfo lessonId={lesson.id} />
                                      </div>

                                      <Separator className="my-4" />

                                      {/* График занятий */}
                                      <div>
                                        <h5 className="font-medium mb-3 flex items-center gap-2">
                                          <Calendar className="h-4 w-4" />
                                          График занятий
                                        </h5>
                                        <IndividualLessonSchedule
                                          lessonId={lesson.id}
                                          scheduleDays={lesson.scheduleDays}
                                          scheduleTime={lesson.scheduleTime}
                                          periodStart={lesson.periodStart}
                                          periodEnd={lesson.periodEnd}
                                          refreshTrigger={refreshTrigger}
                                        />
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Archived Lessons */}
                          {studentDetails.individualLessons.filter(l => l.status !== 'active').length > 0 && (
                            <div>
                              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <XCircle className="h-5 w-5 text-muted-foreground" />
                                Завершенные курсы
                                <Badge variant="secondary">{studentDetails.individualLessons.filter(l => l.status !== 'active').length}</Badge>
                              </h3>
                              <div className="space-y-4">
                                {studentDetails.individualLessons.filter(l => l.status !== 'active').map((lesson) => (
                                  <Card key={lesson.id} className="border-l-4 border-l-gray-300 bg-muted/30">
                                    <CardContent className="p-6">
                                      <div className="flex items-start justify-between mb-4">
                                        <div>
                                          <h4 className="font-semibold text-lg mb-1 text-muted-foreground">
                                            {lesson.subject} • {lesson.level}
                                          </h4>
                                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <User className="h-4 w-4" />
                                            <span>{lesson.teacherName || 'Преподаватель не назначен'}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline">Завершено</Badge>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleUnarchiveLesson(lesson.id)}
                                            title="Разархивировать"
                                          >
                                            <ArchiveRestore className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>

                                      {/* Период */}
                                      {lesson.periodStart && lesson.periodEnd && (
                                        <div className="mb-4 text-sm text-muted-foreground">
                                          <span>Период: </span>
                                          <span>{formatDate(lesson.periodStart)} - {formatDate(lesson.periodEnd)}</span>
                                        </div>
                                      )}

                                      <Separator className="my-4" />

                                      {/* Статистика */}
                                      <IndividualLessonPaymentInfo lessonId={lesson.id} />

                                      <Separator className="my-4" />

                                      {/* История занятий */}
                                      <IndividualLessonSchedule
                                        lessonId={lesson.id}
                                        scheduleDays={lesson.scheduleDays}
                                        scheduleTime={lesson.scheduleTime}
                                        periodStart={lesson.periodStart}
                                        periodEnd={lesson.periodEnd}
                                        refreshTrigger={refreshTrigger}
                                      />
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="payments" className="mt-0">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Финансы студента</CardTitle>
                          <CardDescription>
                            Полная информация о платежах, балансе и финансовых операциях
                          </CardDescription>
                        </div>
                          <Button 
                            className="btn-primary"
                            onClick={() => setPaymentModalOpen(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Внести оплату
                          </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Balance Section */}
                      <div className="p-4 bg-gradient-primary/10 border border-brand/20 rounded-lg mb-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-text-secondary mb-1">Личный баланс</p>
                            <p className="text-3xl font-bold text-text-primary">
                              {balance?.balance ? balance.balance.toFixed(2) : '0.00'} ₽
                            </p>
                          </div>
                          <Button 
                            size="sm"
                            className="btn-secondary"
                            onClick={() => setBalanceModalOpen(true)}
                          >
                            <Wallet className="h-4 w-4 mr-2" />
                            Управление
                          </Button>
                        </div>
                      </div>

                      {/* Финансовая сводка */}
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="p-4 bg-success-100 border border-success-200 rounded-lg">
                          <p className="text-sm text-text-secondary mb-1">Всего оплачено</p>
                          <p className="text-2xl font-bold text-success-600">
                            {(studentDetails.payments
                              .filter(p => p.status === 'completed')
                              .reduce((sum, p) => sum + p.amount, 0) + (balance?.balance || 0))
                              .toLocaleString('ru-RU')} ₽
                          </p>
                        </div>
                        <div className="p-4 bg-warning-100 border border-warning-200 rounded-lg">
                          <p className="text-sm text-text-secondary mb-1">Реализовано</p>
                          <p className="text-2xl font-bold text-warning-600">
                            {studentDetails.payments
                              .filter(p => p.status === 'completed' && (p.individualLessonId || p.description?.toLowerCase().includes('пособи') || p.description?.toLowerCase().includes('учебник')))
                              .reduce((sum, p) => sum + p.amount, 0)
                              .toLocaleString('ru-RU')} ₽
                          </p>
                        </div>
                        <div className="p-4 bg-info-100 border border-info-200 rounded-lg">
                          <p className="text-sm text-text-secondary mb-1">Всего платежей</p>
                          <p className="text-2xl font-bold text-info-600">
                            {studentDetails.payments.length}
                          </p>
                        </div>
                      </div>

                      <Separator className="my-6 bg-border/50" />

                      <div>
                        <h3 className="text-lg font-semibold mb-4 text-text-primary">История платежей</h3>
                        
                        {studentDetails.payments.length === 0 ? (
                          <div className="text-center py-12">
                            <CreditCard className="h-16 w-16 mx-auto mb-4 text-text-secondary/50" />
                            <p className="text-lg text-text-secondary mb-2">Платежи отсутствуют</p>
                            <p className="text-sm text-text-secondary mb-4">
                              Создайте первый платеж для студента
                            </p>
                            <Button 
                              className="btn-primary"
                              onClick={() => setPaymentModalOpen(true)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Внести оплату
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {studentDetails.payments.map((payment) => (
                              <div key={payment.id} className="flex items-center justify-between p-4 border border-border/50 rounded-lg hover:bg-bg-soft/50 transition-colors">
                                <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                    payment.status === 'completed' ? 'bg-success-100' : 
                                    payment.status === 'pending' ? 'bg-warning-100' : 'bg-error-100'
                                  }`}>
                                    {payment.status === 'completed' ? (
                                      <CheckCircle className="h-6 w-6 text-success-600" />
                                    ) : payment.status === 'pending' ? (
                                      <AlertCircle className="h-6 w-6 text-warning-600" />
                                    ) : (
                                      <XCircle className="h-6 w-6 text-error-600" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium text-text-primary">{payment.description}</p>
                                    <p className="text-sm text-text-secondary">
                                      {formatDate(payment.date)}
                                      {payment.paymentMethod && ` • ${payment.paymentMethod}`}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className="font-semibold text-xl">
                                      {payment.amount.toLocaleString('ru-RU')} ₽
                                    </p>
                                    <Badge 
                                      variant={payment.status === 'completed' ? 'default' : 'secondary'}
                                      className="text-xs mt-1"
                                    >
                                      {payment.status === 'completed' ? 'Оплачено' : 
                                       payment.status === 'pending' ? 'Ожидание' : 'Отменено'}
                                    </Badge>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeletePaymentClick(payment)}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="attendance" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Посещаемость</CardTitle>
                      <CardDescription>
                        История посещений занятий
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-12">
                        <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-lg text-muted-foreground mb-2">Данные о посещаемости</p>
                        <p className="text-sm text-muted-foreground">
                          Информация о посещаемости будет доступна после начала занятий
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>История взаимодействий</CardTitle>
                      <CardDescription>
                        Хронология всех действий и событий связанных со студентом
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Дата создания студента */}
                      <div className="mb-6 p-4 bg-muted/50 border border-border rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Студент добавлен в систему:</span>
                          <span className="text-muted-foreground">{formatDate(studentDetails.createdAt)}</span>
                        </div>
                      </div>

                      {historyLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : !history || history.length === 0 ? (
                        <div className="text-center py-12">
                          <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                          <p className="text-lg text-muted-foreground mb-2">История пуста</p>
                          <p className="text-sm text-muted-foreground">
                            События будут отображаться здесь по мере их возникновения
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {history.map((event, index) => (
                            <div key={event.id} className="flex gap-4">
                              <div className="flex flex-col items-center">
                                <div className={`w-3 h-3 rounded-full ${
                                  event.event_category === 'financial' ? 'bg-success-600' :
                                  event.event_category === 'personal_info' ? 'bg-info-600' :
                                  event.event_category === 'contact_info' ? 'bg-brand' :
                                  event.event_category === 'status' ? 'bg-warning-600' :
                                  event.event_category === 'lessons' ? 'bg-info-500' :
                                  event.event_category === 'groups' ? 'bg-brand-light' :
                                  'bg-surface'
                                }`}></div>
                                {index < history.length - 1 && (
                                  <div className="w-0.5 h-full min-h-[40px] bg-border"></div>
                                )}
                              </div>
                              <div className="flex-1 pb-6">
                                <div className="flex items-start justify-between gap-4 mb-2">
                                  <div className="flex-1">
                                    <p className="font-medium text-text-primary">{event.title}</p>
                                    {event.description && (
                                      <p className="text-sm text-text-secondary mt-1">
                                        {event.description}
                                      </p>
                                    )}
                                     {event.old_value && (
                                      <div className="mt-2 p-3 bg-error-50 border border-error-200 rounded text-xs">
                                        <p className="text-error-700 font-medium mb-2">Было:</p>
                                        <div className="space-y-1">
                                          {Object.entries(event.old_value).map(([key, value]) => (
                                            <div key={key} className="flex gap-2">
                                              <span className="text-error-600 font-medium">{key}:</span>
                                              <span className="text-error-700">{String(value)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {event.new_value && (
                                      <div className="mt-2 p-3 bg-success-50 border border-success-200 rounded text-xs">
                                        <p className="text-success-700 font-medium mb-2">Стало:</p>
                                        <div className="space-y-1">
                                          {Object.entries(event.new_value).map(([key, value]) => (
                                            <div key={key} className="flex gap-2">
                                              <span className="text-success-600 font-medium">{key}:</span>
                                              <span className="text-success-700">{String(value)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="shrink-0">
                                    {event.event_category === 'financial' ? 'Финансы' :
                                     event.event_category === 'personal_info' ? 'Личные данные' :
                                     event.event_category === 'contact_info' ? 'Контакты' :
                                     event.event_category === 'status' ? 'Статус' :
                                     event.event_category === 'lessons' ? 'Занятия' :
                                     event.event_category === 'groups' ? 'Группы' :
                                     event.event_category === 'notes' ? 'Заметки' :
                                     event.event_category === 'student' ? 'Студент' :
                                     event.event_category}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>{format(new Date(event.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}</span>
                                  {event.user_name && (
                                    <>
                                      <span>•</span>
                                      <User className="h-3 w-3" />
                                      <span>{event.user_name}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </div>
      </PinnableDialogContent>

      {/* Модал добавления дополнительного занятия */}
      {addLessonForId && (
        <AddAdditionalLessonModal
          open={addLessonModalOpen}
          onOpenChange={(open) => {
            setAddLessonModalOpen(open);
            if (!open) setAddLessonForId(null);
          }}
          lessonId={addLessonForId}
          onAdded={() => {
            refetch();
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}

      {/* Модал создания платежа */}
      <CreatePaymentModal
        open={paymentModalOpen}
        onOpenChange={(open) => {
          setPaymentModalOpen(open);
          if (!open) {
            setSelectedLesson(null);
            setTimeout(() => {
              refetch();
              setRefreshTrigger(prev => prev + 1);
            }, 300);
          }
        }}
        studentId={student.id}
        studentName={studentDetails?.name || student.name}
        individualLessonId={selectedLesson?.id}
        totalUnpaidCount={selectedLesson?.sessions?.filter((s: any) => 
          ['scheduled', 'rescheduled_out', 'rescheduled'].includes(s.status) || !s.status
        ).length || 0}
        pricePerLesson={selectedLesson?.pricePerLesson || 0}
        onPaymentSuccess={() => {
          refetch();
          setSelectedLesson(null);
          setRefreshTrigger(prev => prev + 1);
        }}
      />

      {/* Модал оплаты групповых занятий */}
      <CreatePaymentModal
        open={groupPaymentModalOpen}
        onOpenChange={setGroupPaymentModalOpen}
        studentId={student.id}
        studentName={studentDetails?.name || student.name}
        groupId={selectedGroup?.id}
        onPaymentSuccess={() => {
          refetch();
          setSelectedGroup(null);
          setRefreshTrigger(prev => prev + 1);
        }}
      />

      {/* Модал редактирования индивидуального урока */}
      <EditIndividualLessonModal
        lessonId={selectedLessonId}
        open={!!selectedLessonId}
        onOpenChange={(open) => !open && setSelectedLessonId(null)}
        onLessonUpdated={() => {
          // Инвалидируем кэш для принудительного обновления данных
          queryClient.invalidateQueries({ queryKey: ['student-details', student.id] });
          setTimeout(() => {
            refetch();
            setRefreshTrigger(prev => prev + 1);
          }, 100);
        }}
      />

      {/* Модал личного баланса */}
      <StudentBalanceModal
        studentId={student.id}
        studentName={studentDetails?.name || student.name}
        open={balanceModalOpen}
        onOpenChange={setBalanceModalOpen}
      />

      {/* Диалог подтверждения удаления платежа */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить платеж?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Платеж будет удален, а оплаченные занятия вернутся в неоплаченное состояние.
              {paymentToDelete && paymentToDelete.lessonsCount > 0 && (
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <p className="font-medium">Будут возвращены в неоплаченное состояние:</p>
                  <p className="text-sm mt-1">{paymentToDelete.lessonsCount} занятий</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить платеж
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Модальное окно добавления в группу */}
      <AddToGroupModal
        open={showAddToGroup}
        onOpenChange={setShowAddToGroup}
        studentId={student.id}
        studentName={studentDetails?.name || student.name}
        onSuccess={refetch}
      />

      {/* Модальное окно добавления индивидуальных занятий */}
      <AddIndividualLessonModal
        open={showAddIndividualLesson}
        onOpenChange={setShowAddIndividualLesson}
        studentId={student.id}
        studentName={studentDetails?.name || student.name}
      />

      {/* Модальное окно детальной информации о группе */}
      <GroupDetailModal
        group={selectedGroupForModal}
        open={!!selectedGroupForModal}
        onOpenChange={(open) => !open && setSelectedGroupForModal(null)}
      />

      {/* Модальное окно онлайн урока */}
      {onlineLessonData && (
        <OnlineLessonModal
          isOpen={onlineLessonOpen}
          onClose={() => {
            setOnlineLessonOpen(false);
            setOnlineLessonData(null);
          }}
          lessonType={onlineLessonData.lessonType}
          teacherName={onlineLessonData.teacherName}
          groupId={onlineLessonData.groupId}
          studentId={onlineLessonData.studentId}
          studentName={onlineLessonData.studentName}
          groupName={onlineLessonData.groupName}
        />
      )}
    </Dialog>
  );
}
