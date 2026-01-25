import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  UserPlus, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/typedClient";
import { getErrorMessage } from '@/lib/errorUtils';

interface Invitation {
  id: string;
  first_name: string;
  phone: string;
  branch: string | null;
  position: string;
  status: string;
  organization_id: string;
  last_name: string | null;
  middle_name: string | null;
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

const POSITION_LABELS: Record<string, string> = {
  manager: 'Менеджер',
  methodist: 'Методист',
  branch_manager: 'Управляющий',
  teacher: 'Преподаватель',
  accountant: 'Бухгалтер',
  receptionist: 'Администратор',
  sales_manager: 'Менеджер по продажам',
  head_teacher: 'Старший преподаватель',
};

export const EmployeeOnboarding = () => {
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
        const { data: inviteData, error: inviteError } = await supabase
          .from('employee_invitations')
          .select('*')
          .eq('invite_token', token)
          .single();

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
          middleName: inv.middle_name || '',
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
    
    if (!invitation) return;

    // Валидация
    if (!formData.lastName.trim()) {
      toast.error('Укажите фамилию');
      return;
    }

    if (!formData.email.trim()) {
      toast.error('Укажите email');
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }

    if (!formData.termsAccepted) {
      toast.error('Необходимо принять условия работы');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Создаём пользователя в auth.users
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password || generateRandomPassword(),
        options: {
          emailRedirectTo: `${window.location.origin}/crm`,
          data: {
            first_name: invitation.first_name,
            last_name: formData.lastName.trim(),
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Не удалось создать пользователя');
      }

      // 2. Обновляем профиль
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: invitation.first_name,
          last_name: formData.lastName.trim(),
          phone: invitation.phone,
          branch: invitation.branch,
          organization_id: invitation.organization_id
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      // 3. Назначаем роль
      const roleMap: Record<string, string> = {
        manager: 'manager',
        methodist: 'methodist',
        branch_manager: 'branch_manager',
        teacher: 'teacher',
        accountant: 'accountant',
        receptionist: 'receptionist',
        sales_manager: 'sales_manager',
        head_teacher: 'head_teacher',
      };

      const role = roleMap[invitation.position] || 'manager';

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: role
        });

      if (roleError) {
        console.error('Role assignment error:', roleError);
      }

      // 4. Обновляем приглашение
      await supabase
        .from('employee_invitations')
        .update({
          status: 'accepted',
          terms_accepted_at: new Date().toISOString(),
          profile_id: authData.user.id,
          last_name: formData.lastName.trim(),
          middle_name: formData.middleName.trim() || null,
          email: formData.email.trim()
        })
        .eq('id', invitation.id);

      // 5. Если это преподаватель, создаём запись в teachers
      if (invitation.position === 'teacher') {
        await supabase
          .from('teachers')
          .insert({
            profile_id: authData.user.id,
            first_name: invitation.first_name,
            last_name: formData.lastName.trim(),
            email: formData.email.trim(),
            phone: invitation.phone,
            branch: invitation.branch,
            organization_id: invitation.organization_id,
            is_active: true
          });
      }

      setSuccess(true);
      toast.success('Регистрация завершена!');

      // Редирект через 2 секунды
      setTimeout(() => {
        navigate('/crm');
      }, 2000);

    } catch (err) {
      console.error('Onboarding error:', err);
      toast.error('Ошибка регистрации: ' + getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateRandomPassword = () => {
    return Math.random().toString(36).slice(-12) + 'A1!';
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
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Добро пожаловать!</CardTitle>
            <CardDescription>
              Вы успешно присоединились к команде {organization?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Перенаправление в рабочее пространство...
            </p>
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Форма онбординга
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Добро пожаловать в команду!</CardTitle>
          <CardDescription>
            {organization?.name} приглашает вас на должность <strong>{POSITION_LABELS[invitation?.position || ''] || invitation?.position}</strong>
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
              <div>
                <p className="text-xs text-muted-foreground">Телефон</p>
                <p className="font-medium">{invitation?.phone}</p>
              </div>
              {invitation?.branch && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Филиал</p>
                  <p className="font-medium">{invitation.branch}</p>
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
              <Label htmlFor="password">Пароль (необязательно)</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Придумайте пароль или оставьте пустым"
              />
              <p className="text-xs text-muted-foreground">
                Если оставить пустым, будет создан случайный пароль
              </p>
            </div>

            {formData.password && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Повторите пароль"
                />
              </div>
            )}

            {/* Условия работы */}
            {organization?.settings?.employment_terms && (
              <div className="p-3 bg-muted rounded-lg max-h-40 overflow-y-auto">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Условия работы</span>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {organization.settings.employment_terms}
                </p>
              </div>
            )}

            {/* Чекбокс согласия */}
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Checkbox
                id="terms"
                checked={formData.termsAccepted}
                onCheckedChange={(checked) => handleInputChange('termsAccepted', !!checked)}
              />
              <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                Я ознакомился(-ась) с правилами школы и условиями работы, 
                согласен(-на) с ними и готов(-а) приступить к работе
              </Label>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting || !formData.termsAccepted}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Регистрация...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Присоединиться к команде
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeOnboarding;
