import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { Loader2, Save } from 'lucide-react';
import { Teacher } from '@/hooks/useTeachers';

// Расширенный тип Teacher с дополнительными персональными полями
interface TeacherWithPersonalData extends Teacher {
  birthdate?: string | null;
  birth_place?: string | null;
  passport_series?: string | null;
  passport_number?: string | null;
  passport_issued_by?: string | null;
  passport_issued_date?: string | null;
  inn?: string | null;
  snils?: string | null;
  registration_address?: string | null;
  residential_address?: string | null;
}

// Схема валидации для персональных данных
const personalDataSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Неверный формат email" })
    .max(255, "Максимум 255 символов")
    .optional()
    .or(z.literal('')),
  
  phone: z.string()
    .trim()
    .regex(/^[+]?[\d\s\-()]{10,20}$/, "Неверный формат телефона")
    .max(20, "Максимум 20 символов")
    .optional()
    .or(z.literal('')),
  
  birthdate: z.string().optional().refine((val) => {
    if (!val) return true;
    const date = new Date(val);
    const now = new Date();
    const age = now.getFullYear() - date.getFullYear();
    return age >= 18 && age <= 100;
  }, { message: "Возраст должен быть от 18 до 100 лет" }),
  
  birth_place: z.string().trim().max(200, "Максимум 200 символов").optional(),
  
  passport_series: z.string()
    .trim()
    .regex(/^\d{4}$/, "Серия паспорта: 4 цифры")
    .optional()
    .or(z.literal('')),
  
  passport_number: z.string()
    .trim()
    .regex(/^\d{6}$/, "Номер паспорта: 6 цифр")
    .optional()
    .or(z.literal('')),
  
  passport_issued_by: z.string()
    .trim()
    .max(500, "Максимум 500 символов")
    .optional(),
  
  passport_issued_date: z.string().optional().refine((val) => {
    if (!val) return true;
    const date = new Date(val);
    const now = new Date();
    return date <= now;
  }, { message: "Дата выдачи не может быть в будущем" }),
  
  inn: z.string()
    .trim()
    .regex(/^\d{12}$/, "ИНН: 12 цифр")
    .optional()
    .or(z.literal('')),
  
  snils: z.string()
    .trim()
    .regex(/^\d{11}$/, "СНИЛС: 11 цифр (без дефисов)")
    .optional()
    .or(z.literal('')),
  
  registration_address: z.string()
    .trim()
    .max(500, "Максимум 500 символов")
    .optional(),
  
  residential_address: z.string()
    .trim()
    .max(500, "Максимум 500 символов")
    .optional(),
});

type PersonalDataFormData = z.infer<typeof personalDataSchema>;

interface PersonalDataFormProps {
  teacher: Teacher;
}

export const PersonalDataForm = ({ teacher }: PersonalDataFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Типизированный доступ к дополнительным полям
  const teacherData = teacher as TeacherWithPersonalData;

  const { register, handleSubmit, formState: { errors }, reset } = useForm<PersonalDataFormData>({
    resolver: zodResolver(personalDataSchema),
    defaultValues: {
      email: teacher.email || '',
      phone: teacher.phone || '',
      birthdate: teacherData.birthdate || '',
      birth_place: teacherData.birth_place || '',
      passport_series: teacherData.passport_series || '',
      passport_number: teacherData.passport_number || '',
      passport_issued_by: teacherData.passport_issued_by || '',
      passport_issued_date: teacherData.passport_issued_date || '',
      inn: teacherData.inn || '',
      snils: teacherData.snils || '',
      registration_address: teacherData.registration_address || '',
      residential_address: teacherData.residential_address || '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PersonalDataFormData) => {
      // Очищаем пустые строки
      const cleanData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          typeof value === 'string' && value.trim() === '' ? null : value
        ])
      );

      const { error } = await supabase
        .from('teachers')
        .update(cleanData)
        .eq('id', teacher.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-by-profile'] });
      toast({
        title: 'Данные сохранены',
        description: 'Персональные данные успешно обновлены',
      });
      setIsEditing(false);
    },
    onError: (error) => {
      console.error('Error updating personal data:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить данные',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: PersonalDataFormData) => {
    updateMutation.mutate(data);
  };

  const handleCancel = () => {
    reset();
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Персональные данные</h3>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            Редактировать
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Контактная информация */}
        <div className="border rounded-xl p-4 space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Контактная информация</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                disabled={!isEditing}
                placeholder="example@mail.com"
                maxLength={255}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                disabled={!isEditing}
                placeholder="+7 (999) 123-45-67"
                maxLength={20}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Паспортные данные */}
        <div className="border rounded-xl p-4 space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Паспортные данные</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="passport_series">Серия паспорта</Label>
              <Input
                id="passport_series"
                {...register('passport_series')}
                disabled={!isEditing}
                placeholder="1234"
                maxLength={4}
              />
              {errors.passport_series && (
                <p className="text-sm text-destructive">{errors.passport_series.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="passport_number">Номер паспорта</Label>
              <Input
                id="passport_number"
                {...register('passport_number')}
                disabled={!isEditing}
                placeholder="123456"
                maxLength={6}
              />
              {errors.passport_number && (
                <p className="text-sm text-destructive">{errors.passport_number.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passport_issued_by">Кем выдан</Label>
            <Textarea
              id="passport_issued_by"
              {...register('passport_issued_by')}
              disabled={!isEditing}
              placeholder="Отделением УФМС..."
              rows={2}
              maxLength={500}
            />
            {errors.passport_issued_by && (
              <p className="text-sm text-destructive">{errors.passport_issued_by.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="passport_issued_date">Дата выдачи</Label>
            <Input
              id="passport_issued_date"
              type="date"
              {...register('passport_issued_date')}
              disabled={!isEditing}
            />
            {errors.passport_issued_date && (
              <p className="text-sm text-destructive">{errors.passport_issued_date.message}</p>
            )}
          </div>
        </div>

        {/* Личные данные */}
        <div className="border rounded-xl p-4 space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Личные данные</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birthdate">Дата рождения</Label>
              <Input
                id="birthdate"
                type="date"
                {...register('birthdate')}
                disabled={!isEditing}
              />
              {errors.birthdate && (
                <p className="text-sm text-destructive">{errors.birthdate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_place">Место рождения</Label>
              <Input
                id="birth_place"
                {...register('birth_place')}
                disabled={!isEditing}
                placeholder="г. Москва"
                maxLength={200}
              />
              {errors.birth_place && (
                <p className="text-sm text-destructive">{errors.birth_place.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Налоговые данные */}
        <div className="border rounded-xl p-4 space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Налоговые данные</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inn">ИНН</Label>
              <Input
                id="inn"
                {...register('inn')}
                disabled={!isEditing}
                placeholder="123456789012"
                maxLength={12}
              />
              {errors.inn && (
                <p className="text-sm text-destructive">{errors.inn.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="snils">СНИЛС</Label>
              <Input
                id="snils"
                {...register('snils')}
                disabled={!isEditing}
                placeholder="12345678901"
                maxLength={11}
              />
              {errors.snils && (
                <p className="text-sm text-destructive">{errors.snils.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Адреса */}
        <div className="border rounded-xl p-4 space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Адреса</h4>
          
          <div className="space-y-2">
            <Label htmlFor="registration_address">Адрес регистрации</Label>
            <Textarea
              id="registration_address"
              {...register('registration_address')}
              disabled={!isEditing}
              placeholder="г. Москва, ул. ..."
              rows={2}
              maxLength={500}
            />
            {errors.registration_address && (
              <p className="text-sm text-destructive">{errors.registration_address.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="residential_address">Адрес проживания</Label>
            <Textarea
              id="residential_address"
              {...register('residential_address')}
              disabled={!isEditing}
              placeholder="г. Москва, ул. ... (если отличается от регистрации)"
              rows={2}
              maxLength={500}
            />
            {errors.residential_address && (
              <p className="text-sm text-destructive">{errors.residential_address.message}</p>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Сохранить
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={updateMutation.isPending}
            >
              Отмена
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};
