import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/typedClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, GraduationCap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getErrorMessage } from '@/lib/errorUtils';

const TeacherRegistration = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [organizationInfo, setOrganizationInfo] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    branch: '',
  });

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const { data, error } = await supabase.from('organizations')
        .select('*, organization_branches(*)')
        .eq('teacher_registration_token', token)
        .eq('teacher_registration_enabled', true)
        .single();

      if (error || !data) {
        toast({
          title: 'Недействительная ссылка',
          description: 'Ссылка регистрации недействительна или устарела',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      setOrganizationInfo(data);
      setBranches(data.organization_branches || []);
    } catch (error) {
      console.error('Token validation error:', error);
      navigate('/');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Ошибка',
        description: 'Пароли не совпадают',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // 1. Регистрируем пользователя
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            branch: formData.branch,
            organization_id: organizationInfo.id,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Не удалось создать пользователя');

      const userId = authData.user.id;

      // 2. Ждём создания профиля триггером и обновляем с organization_id
      // Используем upsert для надёжности
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { error: profileError } = await supabase.from('profiles')
        .upsert({
          id: userId,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          branch: formData.branch,
          organization_id: organizationInfo.id,
          email: formData.email,
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });

      if (profileError) {
        console.error('Profile upsert error:', profileError);
        // Fallback to update
        await supabase.from('profiles')
          .update({
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            branch: formData.branch,
            organization_id: organizationInfo.id,
          })
          .eq('id', userId);
      }

      // 3. Назначаем роль teacher
      const { error: roleError } = await supabase.from('user_roles')
        .insert({
          user_id: userId,
          role: 'teacher',
        });

      if (roleError) throw roleError;

      // 4. Создаем запись в teachers с organization_id
      const { error: teacherError } = await supabase.from('teachers')
        .insert({
          profile_id: userId,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          branch: formData.branch,
          organization_id: organizationInfo.id,
          is_active: true,
        });

      if (teacherError) throw teacherError;

      toast({
        title: 'Регистрация успешна',
        description: 'Проверьте email для подтверждения аккаунта',
      });

      navigate('/auth');
    } catch (error: unknown) {
      console.error('Registration error:', error);
      toast({
        title: 'Ошибка регистрации',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            Регистрация преподавателя
          </CardTitle>
          <CardDescription className="text-center">
            {organizationInfo?.name || 'Регистрация'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Имя *</Label>
                <Input
                  id="firstName"
                  placeholder="Иван"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Фамилия *</Label>
                <Input
                  id="lastName"
                  placeholder="Иванов"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
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
              <Label htmlFor="confirmPassword">Подтвердите пароль *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Повторите пароль"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Зарегистрироваться
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherRegistration;
