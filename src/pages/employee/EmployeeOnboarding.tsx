import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  UserPlus, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  FileText,
  Download,
  Maximize2,
  X
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/typedClient";
import { getErrorMessage } from '@/lib/errorUtils';
import { PWAInstallInstructions } from '@/components/pwa/PWAInstallInstructions';

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
    employment_terms_pdf_url?: string;
    employment_terms_pdf_name?: string;
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
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  
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
      const { data, error } = await supabase.functions.invoke('complete-employee-onboarding', {
        body: {
          invite_token: token,
          last_name: formData.lastName.trim(),
          middle_name: formData.middleName.trim() || undefined,
          email: formData.email.trim(),
          password: formData.password,
          terms_accepted: true,
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Ошибка регистрации');
      }

      setSuccess(true);
      toast.success('Регистрация завершена!');

      // Автоматический вход
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (signInError) {
        console.warn('Auto sign-in failed:', signInError);
        // Даже если автологин не удался, редирект на страницу входа
        setTimeout(() => {
          navigate('/auth');
        }, 2000);
      } else {
        // Редирект в CRM после успешного входа
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }

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
          {/* Success message */}
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Добро пожаловать!</CardTitle>
              <CardDescription>
                Вы успешно присоединились к команде {organization?.name}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* PWA Install Instructions */}
          <PWAInstallInstructions 
            title="Установите приложение"
            description="Для удобной работы добавьте приложение на главный экран телефона"
            showSkip={true}
            onSkip={() => navigate('/')}
          />

          {/* Continue button */}
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

            {/* Условия работы */}
            {(organization?.settings?.employment_terms || organization?.settings?.employment_terms_pdf_url) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Условия работы</span>
                  </div>
                  
                  {/* PDF Actions */}
                  {organization?.settings?.employment_terms_pdf_url && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPdfModalOpen(true)}
                        className="gap-1.5 hidden sm:inline-flex"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                        На весь экран
                      </Button>
                      <a 
                        href={organization.settings.employment_terms_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Скачать PDF
                      </a>
                    </div>
                  )}
                </div>

                {/* PDF Preview - with mobile fallback */}
                {organization?.settings?.employment_terms_pdf_url && (
                  <>
                    {/* Desktop: iframe preview */}
                    <div className="hidden sm:block border rounded-lg overflow-hidden bg-muted">
                      <iframe
                        src={`${organization.settings.employment_terms_pdf_url}#toolbar=0&navpanes=0`}
                        className="w-full h-80"
                        title="Условия работы PDF"
                      />
                    </div>
                    
                    {/* Mobile: fallback card */}
                    <div className="sm:hidden p-4 bg-muted rounded-lg border border-dashed">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-red-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Документ с условиями работы</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Нажмите кнопку ниже, чтобы открыть PDF
                          </p>
                        </div>
                        <a 
                          href={organization.settings.employment_terms_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          Открыть PDF
                        </a>
                      </div>
                    </div>
                  </>
                )}
                
                {/* Text Terms */}
                {organization?.settings?.employment_terms && (
                  <div className="p-3 bg-muted rounded-lg max-h-40 overflow-y-auto">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {organization.settings.employment_terms}
                    </p>
                  </div>
                )}
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

      {/* Fullscreen PDF Modal */}
      <Dialog open={isPdfModalOpen} onOpenChange={setIsPdfModalOpen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full p-0">
          <DialogHeader className="px-4 py-3 border-b flex flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-red-500" />
              Условия работы
            </DialogTitle>
            <div className="flex items-center gap-2">
              {organization?.settings?.employment_terms_pdf_url && (
                <a 
                  href={organization.settings.employment_terms_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Скачать
                </a>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 h-[calc(95vh-60px)]">
            {organization?.settings?.employment_terms_pdf_url && (
              <iframe
                src={`${organization.settings.employment_terms_pdf_url}#toolbar=1&navpanes=1`}
                className="w-full h-full border-0"
                title="Условия работы PDF - Полноэкранный режим"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeOnboarding;
