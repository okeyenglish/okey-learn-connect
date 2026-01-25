import { useState, useEffect } from 'react';
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
import {
  useStudentParents,
  useCreateStudentParent,
  useUpdateStudentParent,
  useDeleteStudentParent,
  StudentParent,
} from '@/hooks/useStudentParents';

const parentSchema = z.object({
  first_name: z.string().trim().min(1, 'Имя обязательно'),
  last_name: z.string().trim().min(1, 'Фамилия обязательна'),
  middle_name: z.string().trim().optional().or(z.literal('')),
  relationship: z.enum(['mother', 'father', 'parent', 'guardian', 'other']),
  phone: z.string().trim().optional().or(z.literal('')),
  email: z.string().trim().email('Неверный формат email').optional().or(z.literal('')),
  is_primary_contact: z.boolean(),
  notification_preferences: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    whatsapp: z.boolean(),
  }),
});

type ParentFormData = z.infer<typeof parentSchema>;

interface ManageParentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  onSuccess?: () => void;
}

export function ManageParentsDialog({
  open,
  onOpenChange,
  studentId,
  onSuccess,
}: ManageParentsDialogProps) {
  const [mode, setMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingParent, setEditingParent] = useState<StudentParent | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [parentToDelete, setParentToDelete] = useState<StudentParent | null>(null);

  const { data: parents = [], isLoading } = useStudentParents(studentId);
  const createParent = useCreateStudentParent();
  const updateParent = useUpdateStudentParent();
  const deleteParent = useDeleteStudentParent();

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
      first_name: '',
      last_name: '',
      middle_name: '',
      relationship: 'mother',
      phone: '',
      email: '',
      is_primary_contact: false,
      notification_preferences: {
        email: true,
        sms: false,
        whatsapp: false,
      },
    },
  });

  const isPrimary = watch('is_primary_contact');

  useEffect(() => {
    if (editingParent) {
      reset({
        first_name: editingParent.first_name,
        last_name: editingParent.last_name,
        middle_name: editingParent.middle_name || '',
        relationship: editingParent.relationship,
        phone: editingParent.phone || '',
        email: editingParent.email || '',
        is_primary_contact: editingParent.is_primary_contact,
        notification_preferences: editingParent.notification_preferences,
      });
    }
  }, [editingParent, reset]);

  const handleAddNew = () => {
    reset({
      first_name: '',
      last_name: '',
      middle_name: '',
      relationship: 'mother',
      phone: '',
      email: '',
      is_primary_contact: parents.length === 0,
      notification_preferences: {
        email: true,
        sms: false,
        whatsapp: false,
      },
    });
    setEditingParent(null);
    setMode('add');
  };

  const handleEdit = (parent: StudentParent) => {
    setEditingParent(parent);
    setMode('edit');
  };

  const handleCancelEdit = () => {
    setMode('list');
    setEditingParent(null);
    reset();
  };

  const onSubmit = async (data: ParentFormData) => {
    if (mode === 'add') {
      await createParent.mutateAsync({
        student_id: studentId,
        ...data,
      });
      handleCancelEdit();
      onSuccess?.();
    } else if (mode === 'edit' && editingParent) {
      await updateParent.mutateAsync({
        id: editingParent.id,
        ...data,
      });
      handleCancelEdit();
      onSuccess?.();
    }
  };

  const handleConfirmDelete = async () => {
    if (parentToDelete) {
      await deleteParent.mutateAsync({
        id: parentToDelete.id,
        studentId,
      });
      setDeleteDialogOpen(false);
      setParentToDelete(null);
      onSuccess?.();
    }
  };

  const getRelationshipLabel = (rel: string) => {
    const labels: Record<string, string> = {
      mother: 'Мать',
      father: 'Отец',
      parent: 'Родитель',
      guardian: 'Опекун',
      other: 'Другое',
    };
    return labels[rel] || rel;
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleCancelEdit();
        }
        onOpenChange(isOpen);
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {mode === 'list' && 'Управление контактами'}
              {mode === 'add' && 'Добавить родителя/опекуна'}
              {mode === 'edit' && 'Редактировать контакт'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'list' && 'Добавляйте и управляйте контактами родителей и опекунов'}
              {mode === 'add' && 'Заполните информацию о родителе или опекуне'}
              {mode === 'edit' && 'Изменение контактной информации'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            {mode === 'list' ? (
              <div className="space-y-4">
                <Button
                  onClick={handleAddNew}
                  className="w-full"
                  variant="outline"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Добавить родителя/опекуна
                </Button>

                {parents.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 pb-6 text-center">
                      <p className="text-muted-foreground">Контакты еще не добавлены</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {parents.map((parent) => (
                      <Card key={parent.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base flex items-center gap-2">
                                {parent.last_name} {parent.first_name} {parent.middle_name}
                                {parent.is_primary_contact && (
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
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEdit(parent)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
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
                          {parent.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{parent.phone}</span>
                            </div>
                          )}
                          {parent.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span>{parent.email}</span>
                            </div>
                          )}
                          <Separator className="my-2" />
                          <div className="flex flex-wrap gap-2">
                            {parent.notification_preferences.email && (
                              <Badge variant="outline" className="text-xs">Email</Badge>
                            )}
                            {parent.notification_preferences.sms && (
                              <Badge variant="outline" className="text-xs">SMS</Badge>
                            )}
                            {parent.notification_preferences.whatsapp && (
                              <Badge variant="outline" className="text-xs">WhatsApp</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Фамилия *</Label>
                    <Input
                      id="last_name"
                      {...register('last_name')}
                      placeholder="Иванов"
                    />
                    {errors.last_name && (
                      <p className="text-sm text-destructive">{errors.last_name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="first_name">Имя *</Label>
                    <Input
                      id="first_name"
                      {...register('first_name')}
                      placeholder="Иван"
                    />
                    {errors.first_name && (
                      <p className="text-sm text-destructive">{errors.first_name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="middle_name">Отчество</Label>
                    <Input
                      id="middle_name"
                      {...register('middle_name')}
                      placeholder="Иванович"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relationship">Кем приходится *</Label>
                  <Select
                    value={watch('relationship')}
                    onValueChange={(value) => setValue('relationship', value as ParentFormData['relationship'])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mother">Мать</SelectItem>
                      <SelectItem value="father">Отец</SelectItem>
                      <SelectItem value="parent">Родитель</SelectItem>
                      <SelectItem value="guardian">Опекун</SelectItem>
                      <SelectItem value="other">Другое</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Телефон</Label>
                    <Input
                      id="phone"
                      {...register('phone')}
                      placeholder="+7 (999) 123-45-67"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      placeholder="example@mail.com"
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_primary"
                    checked={isPrimary}
                    onCheckedChange={(checked) => setValue('is_primary_contact', checked)}
                  />
                  <Label htmlFor="is_primary">Основной контакт</Label>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Способы уведомлений</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="notify_email"
                        checked={watch('notification_preferences.email')}
                        onCheckedChange={(checked) => setValue('notification_preferences.email', checked)}
                      />
                      <Label htmlFor="notify_email">Email уведомления</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="notify_sms"
                        checked={watch('notification_preferences.sms')}
                        onCheckedChange={(checked) => setValue('notification_preferences.sms', checked)}
                      />
                      <Label htmlFor="notify_sms">SMS уведомления</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="notify_whatsapp"
                        checked={watch('notification_preferences.whatsapp')}
                        onCheckedChange={(checked) => setValue('notification_preferences.whatsapp', checked)}
                      />
                      <Label htmlFor="notify_whatsapp">WhatsApp уведомления</Label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={createParent.isPending || updateParent.isPending}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="submit"
                    disabled={createParent.isPending || updateParent.isPending}
                  >
                    {(createParent.isPending || updateParent.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {mode === 'add' ? 'Добавить' : 'Сохранить'}
                  </Button>
                </div>
              </form>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить контакт?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить контакт{' '}
              {parentToDelete && `${parentToDelete.first_name} ${parentToDelete.last_name}`}?
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteParent.isPending}
            >
              {deleteParent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
