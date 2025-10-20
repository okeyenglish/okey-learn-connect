import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
import { UserPlus, Trash2, Phone, Mail, Edit, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const parentSchema = z.object({
  firstName: z.string()
    .trim()
    .min(1, 'Имя обязательно')
    .max(50, 'Имя должно быть короче 50 символов')
    .regex(/^[а-яА-ЯёЁa-zA-Z\s-]+$/, 'Имя может содержать только буквы'),
  lastName: z.string()
    .trim()
    .min(1, 'Фамилия обязательна')
    .max(50, 'Фамилия должна быть короче 50 символов')
    .regex(/^[а-яА-ЯёЁa-zA-Z\s-]+$/, 'Фамилия может содержать только буквы'),
  middleName: z.string()
    .trim()
    .max(50, 'Отчество должно быть короче 50 символов')
    .regex(/^[а-яА-ЯёЁa-zA-Z\s-]*$/, 'Отчество может содержать только буквы')
    .optional()
    .or(z.literal('')),
  relationship: z.enum(['mother', 'father', 'guardian', 'other']),
  phone: z.string()
    .trim()
    .regex(/^(\+7|8)?[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}$/, 'Неверный формат телефона'),
  email: z.string()
    .trim()
    .email('Неверный формат email')
    .max(255, 'Email должен быть короче 255 символов')
    .optional()
    .or(z.literal('')),
  isPrimary: z.boolean(),
  canReceiveEmail: z.boolean(),
  canReceiveSms: z.boolean(),
  canReceiveWhatsapp: z.boolean(),
});

type ParentFormData = z.infer<typeof parentSchema>;

interface Parent {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary: boolean;
  canReceiveEmail: boolean;
  canReceiveSms: boolean;
  canReceiveWhatsapp: boolean;
}

interface ManageParentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
}

export function ManageParentsDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
}: ManageParentsDialogProps) {
  const [parents, setParents] = useState<Parent[]>([]);
  const [mode, setMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [parentToDelete, setParentToDelete] = useState<Parent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ParentFormData>({
    resolver: zodResolver(parentSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      middleName: '',
      relationship: 'mother',
      phone: '',
      email: '',
      isPrimary: false,
      canReceiveEmail: true,
      canReceiveSms: false,
      canReceiveWhatsapp: false,
    },
  });

  const isPrimary = watch('isPrimary');

  const handleAddNew = () => {
    reset({
      firstName: '',
      lastName: '',
      middleName: '',
      relationship: 'mother',
      phone: '',
      email: '',
      isPrimary: parents.length === 0, // Первый родитель автоматически основной
      canReceiveEmail: true,
      canReceiveSms: false,
      canReceiveWhatsapp: false,
    });
    setMode('add');
  };

  const handleEdit = (parent: Parent) => {
    setEditingParent(parent);
    reset({
      firstName: parent.firstName,
      lastName: parent.lastName,
      middleName: parent.middleName || '',
      relationship: parent.relationship as any,
      phone: parent.phone,
      email: parent.email || '',
      isPrimary: parent.isPrimary,
      canReceiveEmail: parent.canReceiveEmail,
      canReceiveSms: parent.canReceiveSms,
      canReceiveWhatsapp: parent.canReceiveWhatsapp,
    });
    setMode('edit');
  };

  const handleCancelEdit = () => {
    setMode('list');
    setEditingParent(null);
    reset();
  };

  const onSubmit = async (data: ParentFormData) => {
    setIsSubmitting(true);

    try {
      // TODO: Сохранение родителя в базу данных
      // Здесь должна быть логика сохранения в таблицу clients/family_members
      
      const newParent: Parent = {
        id: editingParent?.id || Math.random().toString(36).substr(2, 9),
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName || undefined,
        relationship: data.relationship,
        phone: data.phone,
        email: data.email || undefined,
        isPrimary: data.isPrimary,
        canReceiveEmail: data.canReceiveEmail,
        canReceiveSms: data.canReceiveSms,
        canReceiveWhatsapp: data.canReceiveWhatsapp,
      };

      if (mode === 'add') {
        setParents([...parents, newParent]);
        toast({
          title: 'Успешно',
          description: 'Родитель добавлен',
        });
      } else if (mode === 'edit' && editingParent) {
        setParents(parents.map(p => p.id === editingParent.id ? newParent : p));
        toast({
          title: 'Успешно',
          description: 'Данные родителя обновлены',
        });
      }

      setMode('list');
      setEditingParent(null);
      reset();
    } catch (error: any) {
      console.error('Error saving parent:', error);
      toast({
        title: 'Ошибка',
        description: error?.message || 'Не удалось сохранить данные',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!parentToDelete) return;

    try {
      // TODO: Удаление родителя из базы данных
      setParents(parents.filter(p => p.id !== parentToDelete.id));
      
      toast({
        title: 'Успешно',
        description: 'Родитель удален',
      });
      
      setDeleteDialogOpen(false);
      setParentToDelete(null);
    } catch (error: any) {
      console.error('Error deleting parent:', error);
      toast({
        title: 'Ошибка',
        description: error?.message || 'Не удалось удалить родителя',
        variant: 'destructive',
      });
    }
  };

  const getRelationshipLabel = (relationship: string) => {
    const labels: Record<string, string> = {
      mother: 'Мать',
      father: 'Отец',
      guardian: 'Опекун',
      other: 'Другое',
    };
    return labels[relationship] || relationship;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>
              {mode === 'list' && `Родители и опекуны - ${studentName}`}
              {mode === 'add' && 'Добавить родителя / опекуна'}
              {mode === 'edit' && 'Редактировать контакт'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'list' && 'Управление контактами родителей и опекунов ученика'}
              {mode === 'add' && 'Добавьте контактные данные родителя или опекуна'}
              {mode === 'edit' && 'Изменение контактных данных'}
            </DialogDescription>
          </DialogHeader>

          {mode === 'list' ? (
            <>
              <div className="flex justify-end mb-4">
                <Button onClick={handleAddNew} size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Добавить контакт
                </Button>
              </div>

              <ScrollArea className="h-[450px] pr-4">
                {parents.length > 0 ? (
                  <div className="space-y-3">
                    {parents.map((parent) => (
                      <Card key={parent.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base flex items-center gap-2">
                                {parent.lastName} {parent.firstName} {parent.middleName}
                                {parent.isPrimary && (
                                  <Badge variant="default" className="text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Основной
                                  </Badge>
                                )}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground mt-1">
                                {getRelationshipLabel(parent.relationship)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(parent)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setParentToDelete(parent);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{parent.phone}</span>
                          </div>
                          {parent.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span>{parent.email}</span>
                            </div>
                          )}
                          <Separator />
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            {parent.canReceiveEmail && <Badge variant="outline">Email</Badge>}
                            {parent.canReceiveSms && <Badge variant="outline">SMS</Badge>}
                            {parent.canReceiveWhatsapp && <Badge variant="outline">WhatsApp</Badge>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <UserPlus className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground mb-2">Нет добавленных контактов</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Добавьте контакты родителей или опекунов для связи
                    </p>
                    <Button onClick={handleAddNew} size="sm">
                      Добавить первый контакт
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <ScrollArea className="h-[450px] pr-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="lastName">Фамилия *</Label>
                      <Input
                        id="lastName"
                        {...register('lastName')}
                        placeholder="Иванов"
                      />
                      {errors.lastName && (
                        <p className="text-xs text-destructive mt-1">{errors.lastName.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="firstName">Имя *</Label>
                      <Input
                        id="firstName"
                        {...register('firstName')}
                        placeholder="Иван"
                      />
                      {errors.firstName && (
                        <p className="text-xs text-destructive mt-1">{errors.firstName.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="middleName">Отчество</Label>
                    <Input
                      id="middleName"
                      {...register('middleName')}
                      placeholder="Иванович"
                    />
                    {errors.middleName && (
                      <p className="text-xs text-destructive mt-1">{errors.middleName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="relationship">Родство *</Label>
                    <Select
                      value={watch('relationship')}
                      onValueChange={(value) => setValue('relationship', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mother">Мать</SelectItem>
                        <SelectItem value="father">Отец</SelectItem>
                        <SelectItem value="guardian">Опекун</SelectItem>
                        <SelectItem value="other">Другое</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Телефон *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        {...register('phone')}
                        placeholder="+7 (999) 123-45-67"
                      />
                      {errors.phone && (
                        <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        {...register('email')}
                        placeholder="parent@example.com"
                      />
                      {errors.email && (
                        <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Настройки уведомлений</Label>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal">Основной контакт</Label>
                      <Switch
                        checked={isPrimary}
                        onCheckedChange={(checked) => setValue('isPrimary', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal">Получать Email</Label>
                      <Switch
                        checked={watch('canReceiveEmail')}
                        onCheckedChange={(checked) => setValue('canReceiveEmail', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal">Получать SMS</Label>
                      <Switch
                        checked={watch('canReceiveSms')}
                        onCheckedChange={(checked) => setValue('canReceiveSms', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal">Получать WhatsApp</Label>
                      <Switch
                        checked={watch('canReceiveWhatsapp')}
                        onCheckedChange={(checked) => setValue('canReceiveWhatsapp', checked)}
                      />
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                >
                  Отмена
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === 'add' ? 'Добавить' : 'Сохранить'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить контакт?</AlertDialogTitle>
            <AlertDialogDescription>
              Контакт "{parentToDelete?.firstName} {parentToDelete?.lastName}" будет удален. 
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
