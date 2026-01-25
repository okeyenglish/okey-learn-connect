import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabaseTyped as supabase } from "@/integrations/supabase/typedClient";
import { Loader2, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrganization } from '@/hooks/useOrganization';
import { getErrorMessage } from '@/lib/errorUtils';

interface AddTeacherModalProps {
  onTeacherAdded?: () => void;
  children?: React.ReactNode;
}

export const AddTeacherModal: React.FC<AddTeacherModalProps> = ({ onTeacherAdded, children }) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { branches, organizationId } = useOrganization();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    branch: '',
    subjects: [] as string[],
    categories: [] as string[],
  });

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      branch: '',
      subjects: [],
      categories: [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Создаем пользователя в auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            branch: formData.branch,
            organization_id: organizationId,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Не удалось создать пользователя');

      const userId = authData.user.id;

      // 2. Обновляем профиль
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          branch: formData.branch,
          organization_id: organizationId,
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // 3. Назначаем роль teacher
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'teacher',
        });

      if (roleError) throw roleError;

      // 4. Создаем запись в teachers
      const { error: teacherError } = await supabase
        .from('teachers')
        .insert({
          profile_id: userId,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          branch: formData.branch,
          subjects: formData.subjects,
          categories: formData.categories,
          is_active: true,
        });

      if (teacherError) throw teacherError;

      toast({
        title: 'Преподаватель создан',
        description: `${formData.firstName} ${formData.lastName} успешно добавлен в систему`,
      });

      resetForm();
      setOpen(false);
      onTeacherAdded?.();
    } catch (error: unknown) {
      console.error('Error creating teacher:', error);
      toast({
        title: 'Ошибка',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Plus className="h-5 w-5 text-primary" />
            Добавить преподавателя
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Имя *</Label>
            <Input
              id="firstName"
              placeholder="Введите имя"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Фамилия *</Label>
            <Input
              id="lastName"
              placeholder="Введите фамилию"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="teacher@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Пароль *</Label>
            <Input
              id="password"
              type="password"
              placeholder="Минимум 6 символов"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Телефон *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+7 (999) 123-45-67"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="branch">Филиал *</Label>
            <Select
              value={formData.branch}
              onValueChange={(value) => setFormData({ ...formData, branch: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите филиал" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.name}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
              disabled={isLoading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Добавить
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
