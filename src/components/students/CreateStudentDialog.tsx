import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarIcon, Upload, Loader2, User } from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { getCurrentOrganizationId } from '@/lib/organizationHelpers';

// Валидационная схема с использованием zod
const studentSchema = z.object({
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
  gender: z.enum(['male', 'female', '']).optional(),
  phone: z.string()
    .trim()
    .regex(/^(\+7|8)?[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}$/, 'Неверный формат телефона')
    .optional()
    .or(z.literal('')),
  email: z.string()
    .trim()
    .email('Неверный формат email')
    .max(255, 'Email должен быть короче 255 символов')
    .optional()
    .or(z.literal('')),
  branch: z.string().min(1, 'Филиал обязателен'),
  status: z.enum(['active', 'trial', 'not_started', 'inactive', 'on_pause']),
  notes: z.string()
    .max(1000, 'Комментарий должен быть короче 1000 символов')
    .optional()
    .or(z.literal('')),
  lkEnabled: z.boolean(),
  lkEmail: z.string()
    .trim()
    .email('Неверный формат email')
    .max(255, 'Email должен быть короче 255 символов')
    .optional()
    .or(z.literal('')),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface CreateStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateStudentDialog({ open, onOpenChange }: CreateStudentDialogProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [birthDate, setBirthDate] = useState<Date>();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
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
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      middleName: '',
      gender: '',
      phone: '',
      email: '',
      branch: '',
      status: 'trial',
      notes: '',
      lkEnabled: false,
      lkEmail: '',
    },
  });

  const lkEnabled = watch('lkEnabled');

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Валидация файла
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Ошибка',
          description: 'Файл должен быть изображением',
          variant: 'destructive',
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Ошибка',
          description: 'Размер файла не должен превышать 5 МБ',
          variant: 'destructive',
        });
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (studentId: string): Promise<string | null> => {
    if (!avatarFile) return null;

    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${studentId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('student-avatars')
        .upload(filePath, avatarFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('student-avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Avatar upload error:', error);
      return null;
    }
  };

  const onSubmit = async (data: StudentFormData) => {
    // Валидация даты рождения
    if (!birthDate) {
      toast({
        title: 'Ошибка',
        description: 'Укажите дату рождения',
        variant: 'destructive',
      });
      return;
    }

    const age = differenceInYears(new Date(), birthDate);
    if (age <= 0 || age > 100) {
      toast({
        title: 'Ошибка',
        description: 'Укажите корректную дату рождения',
        variant: 'destructive',
      });
      return;
    }

    // Валидация ЛК email
    if (data.lkEnabled && !data.lkEmail) {
      toast({
        title: 'Ошибка',
        description: 'Для активации ЛК необходимо указать email',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const orgId = await getCurrentOrganizationId();
      
      // Создаем семейную группу
      const { data: family, error: familyErr } = await supabase
        .from('family_groups')
        .insert([{ name: `${data.lastName} ${data.firstName}`, organization_id: orgId }])
        .select('id')
        .single();

      if (familyErr) throw familyErr;

      // Создаем ученика
      const fullName = `${data.lastName} ${data.firstName} ${data.middleName || ''}`.trim();
      const { data: student, error: studentErr } = await supabase
        .from('students')
        .insert([{
          name: fullName,
          first_name: data.firstName,
          last_name: data.lastName,
          middle_name: data.middleName || null,
          phone: data.phone || null,
          status: data.status,
          family_group_id: family?.id || null,
          notes: data.notes || null,
          age: age,
          date_of_birth: format(birthDate, 'yyyy-MM-dd'),
          gender: data.gender || null,
          lk_enabled: data.lkEnabled,
          lk_email: data.lkEmail || null,
        }])
        .select('id')
        .single();

      if (studentErr) throw studentErr;

      // Загружаем аватар, если есть
      if (avatarFile && student?.id) {
        const avatarUrl = await uploadAvatar(student.id);
        if (avatarUrl) {
          await supabase
            .from('students')
            .update({ avatar_url: avatarUrl })
            .eq('id', student.id);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['students'] });

      toast({
        title: 'Успешно',
        description: 'Ученик добавлен в систему',
      });

      // Сброс формы
      reset();
      setBirthDate(undefined);
      setAvatarFile(null);
      setAvatarPreview('');
      setActiveTab('basic');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Create student error:', error);
      toast({
        title: 'Ошибка',
        description: error?.message || 'Не удалось добавить ученика',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Добавить нового ученика</DialogTitle>
          <DialogDescription>
            Заполните информацию о новом ученике
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Основное</TabsTrigger>
              <TabsTrigger value="education">Обучение</TabsTrigger>
              <TabsTrigger value="lk">Личный кабинет</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[450px] mt-4">
              <div className="px-1">
                <TabsContent value="basic" className="space-y-4 mt-0">
                  {/* Аватар */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      {avatarPreview ? (
                        <AvatarImage src={avatarPreview} />
                      ) : (
                        <AvatarFallback>
                          <User className="h-10 w-10" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <Label htmlFor="avatar" className="cursor-pointer">
                        <div className="flex items-center gap-2 text-sm text-primary hover:text-primary/80">
                          <Upload className="h-4 w-4" />
                          Загрузить фото
                        </div>
                      </Label>
                      <Input
                        id="avatar"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        JPG, PNG до 5 МБ
                      </p>
                    </div>
                  </div>

                  {/* ФИО */}
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

                  {/* Дата рождения и пол */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Дата рождения *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !birthDate && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {birthDate ? format(birthDate, 'd MMMM yyyy', { locale: ru }) : 'Выберите дату'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={birthDate}
                            onSelect={setBirthDate}
                            initialFocus
                            locale={ru}
                            disabled={(date) => date > new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label htmlFor="gender">Пол</Label>
                      <Select
                        value={watch('gender')}
                        onValueChange={(value) => setValue('gender', value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите пол" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Мужской</SelectItem>
                          <SelectItem value="female">Женский</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Контакты */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Телефон</Label>
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
                        placeholder="student@example.com"
                      />
                      {errors.email && (
                        <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Комментарии */}
                  <div>
                    <Label htmlFor="notes">Комментарии</Label>
                    <Textarea
                      id="notes"
                      {...register('notes')}
                      placeholder="Дополнительная информация об ученике"
                      rows={3}
                    />
                    {errors.notes && (
                      <p className="text-xs text-destructive mt-1">{errors.notes.message}</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="education" className="space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="branch">Филиал *</Label>
                      <Select
                        value={watch('branch')}
                        onValueChange={(value) => setValue('branch', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите филиал" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="okskaya">Окская</SelectItem>
                          <SelectItem value="mytishchi">Мытищи</SelectItem>
                          <SelectItem value="lyubertsy">Люберцы</SelectItem>
                          <SelectItem value="kotelniki">Котельники</SelectItem>
                          <SelectItem value="stakhanovskaya">Стахановская</SelectItem>
                          <SelectItem value="krasnaya_gorka">Красная Горка</SelectItem>
                          <SelectItem value="solntsevo">Солнцево</SelectItem>
                          <SelectItem value="online">Онлайн</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.branch && (
                        <p className="text-xs text-destructive mt-1">{errors.branch.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="status">Статус *</Label>
                      <Select
                        value={watch('status')}
                        onValueChange={(value) => setValue('status', value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trial">Пробный урок</SelectItem>
                          <SelectItem value="active">Активный</SelectItem>
                          <SelectItem value="not_started">Не начал</SelectItem>
                          <SelectItem value="on_pause">На паузе</SelectItem>
                          <SelectItem value="inactive">Неактивный</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="lk" className="space-y-4 mt-0">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="text-base">Активировать личный кабинет</Label>
                      <p className="text-sm text-muted-foreground">
                        Ученик сможет входить в систему и отслеживать свой прогресс
                      </p>
                    </div>
                    <Switch
                      checked={lkEnabled}
                      onCheckedChange={(checked) => setValue('lkEnabled', checked)}
                    />
                  </div>

                  {lkEnabled && (
                    <div>
                      <Label htmlFor="lkEmail">Email для входа *</Label>
                      <Input
                        id="lkEmail"
                        type="email"
                        {...register('lkEmail')}
                        placeholder="student@example.com"
                      />
                      {errors.lkEmail && (
                        <p className="text-xs text-destructive mt-1">{errors.lkEmail.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Пароль будет отправлен на указанный email после создания
                      </p>
                    </div>
                  )}
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать ученика
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
