import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  GraduationCap, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/typedClient";
import { getErrorMessage } from '@/lib/errorUtils';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { PWAInstallInstructions } from '@/components/pwa/PWAInstallInstructions';

interface Invitation {
  id: string;
  teacher_id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  branch: string | null;
  subjects: string[] | null;
  categories: string[] | null;
  status: string;
  organization_id: string;
  email: string | null;
}

interface Organization {
  id: string;
  name: string;
  settings: {
    employment_terms?: string;
    [key: string]: unknown;
  } | null;
}

export const TeacherOnboarding = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    lastName: '',
    middleName: '',
    email: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false
  });

  // Загрузка приглашения
  useEffect(() => {
    const loadInvitation = async () => {
      if (!token) {
        setError('Неверная ссылка приглашения');
        setIsLoading(false);
        return;
      }

      try {
        // Получаем приглашение
        const { data: inviteData, error: inviteError } = await (supabase
          .from('teacher_invitations' as any)
          .select('*')
          .eq('invite_token', token)
          .single() as any);

        if (inviteError || !inviteData) {
          setError('Приглашение не найдено или устарело');
          setIsLoading(false);
          return;
        }

        const inv = inviteData as Invitation;

        // Проверяем статус
        if (inv.status !== 'pending') {
          setError(inv.status === 'accepted' 
            ? 'Это приглашение уже использовано' 
            : 'Приглашение недействительно');
          setIsLoading(false);
          return;
        }

        setInvitation(inv);
        
        // Предзаполняем данные, если есть
        setFormData(prev => ({
          ...prev,
          lastName: inv.last_name || '',
          email: inv.email || ''
        }));

        // Получаем организацию
        const { data: orgData } = await supabase
          .from('organizations')
          .select('id, name, settings')
          .eq('id', inv.organization_id)
          .single();

        if (orgData) {
          setOrganization(orgData as Organization);
        }

      } catch (err) {
        console.error('Error loading invitation:', err);
        setError('Ошибка загрузки приглашения');
      } finally {
        setIsLoading(false);
      }
    };

    loadInvitation();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invitation || !token) return;

    // Валидация
    if (!formData.lastName.trim()) {
      toast.error('Укажите фамилию');
      return;
    }

    if (!formData.email.trim()) {
      toast.error('Укажите email');
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }

    if (!formData.termsAccepted) {
      toast.error('Необходимо принять условия работы');
      return;
    }

    setIsSubmitting(true);

    try {
      // Вызываем Edge Function для завершения онбординга
      const response = await selfHostedPost<{ success?: boolean; error?: string; existing_user?: boolean }>('complete-teacher-onboarding', {
        invite_token: token,
        last_name: formData.lastName.trim(),
        middle_name: formData.middleName.trim() || undefined,
        email: formData.email.trim(),
        password: formData.password,
        terms_accepted: true,
      });

      if (!response.success || !response.data?.success) {
        throw new Error(response.error || response.data?.error || 'Ошибка регистрации');
      }

      // Автоматический вход
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (signInError) {
        console.warn('Auto sign-in failed:', signInError);
      }

      setSuccess(true);
      toast.success(response.data?.existing_user 
        ? 'Вы добавлены как преподаватель!' 
        : 'Регистрация завершена!');

    } catch (err) {
      console.error('Onboarding error:', err);
      toast.error('Ошибка регистрации: ' + getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Загрузка
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Ошибка
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Ошибка</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')}>
              На главную
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Успех
  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Добро пожаловать!</CardTitle>
              <CardDescription>
                Вы успешно присоединились к команде {organization?.name} как преподаватель
              </CardDescription>
            </CardHeader>
          </Card>

          <PWAInstallInstructions 
            title="Установите приложение"
            description="Для удобной работы добавьте приложение на главный экран телефона"
            showSkip={true}
            onSkip={() => navigate('/')}
          />

          <div className="text-center">
            <Button onClick={() => navigate('/')} className="gap-2">
              Продолжить в браузере
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Форма онбординга
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Добро пожаловать в команду!</CardTitle>
          <CardDescription>
            {organization?.name} приглашает вас как <strong>преподавателя</strong>
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Предзаполненные данные */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Имя</p>
                <p className="font-medium">{invitation?.first_name}</p>
              </div>
              {invitation?.phone && (
                <div>
                  <p className="text-xs text-muted-foreground">Телефон</p>
                  <p className="font-medium">{invitation.phone}</p>
                </div>
              )}
              {invitation?.branch && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Филиал</p>
                  <p className="font-medium">{invitation.branch}</p>
                </div>
              )}
              {invitation?.subjects && invitation.subjects.length > 0 && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Предметы</p>
                  <p className="font-medium">{invitation.subjects.join(', ')}</p>
                </div>
              )}
            </div>

            {/* Фамилия */}
            <div className="space-y-2">
              <Label htmlFor="lastName">Фамилия *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Введите фамилию"
                required
              />
            </div>

            {/* Отчество */}
            <div className="space-y-2">
              <Label htmlFor="middleName">Отчество</Label>
              <Input
                id="middleName"
                value={formData.middleName}
                onChange={(e) => handleInputChange('middleName', e.target.value)}
                placeholder="Введите отчество (если есть)"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>

            {/* Пароль */}
            <div className="space-y-2">
              <Label htmlFor="password">Пароль *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Минимум 6 символов"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Подтвердите пароль *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Повторите пароль"
                required
              />
            </div>

            {/* Чекбокс условий */}
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <Checkbox
                id="terms"
                checked={formData.termsAccepted}
                onCheckedChange={(checked) => handleInputChange('termsAccepted', !!checked)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="terms"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Принимаю условия работы
                </label>
                <p className="text-xs text-muted-foreground">
                  Подтверждаю согласие на обработку персональных данных
                </p>
              </div>
            </div>

            {/* Кнопка отправки */}
            <Button 
              type="submit" 
              className="w-full gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Регистрация...
                </>
              ) : (
                <>
                  <GraduationCap className="h-4 w-4" />
                  Завершить регистрацию
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherOnboarding;
