import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, Phone, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('login');
  
  // Состояние для формы входа
  const [loginData, setLoginData] = useState({
    phone: '',
    password: ''
  });

  // Состояние для формы регистрации
  const [signupData, setSignupData] = useState({
    phone: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });

  const { user, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Получаем redirect URL из state или используем по умолчанию
  const locationState = location.state as { from?: { pathname?: string } } | null;
  const from = locationState?.from?.pathname || '/';

  // Если пользователь уже авторизован, перенаправляем его в зависимости от роли
  useEffect(() => {
    if (user && role) {
      if (role === 'student') {
        navigate('/student-portal', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    }
  }, [user, role, navigate, from]);

  // Форматирование номера телефона
  const formatPhoneNumber = (value: string) => {
    // Удаляем все нечисловые символы
    const numbers = value.replace(/\D/g, '');
    
    // Если номер начинается с 8, заменяем на +7
    if (numbers.startsWith('8')) {
      return '+7' + numbers.slice(1);
    }
    
    // Если номер начинается с 7, добавляем +
    if (numbers.startsWith('7')) {
      return '+' + numbers;
    }
    
    // Если номер не начинается с 7 или 8, добавляем +7
    if (numbers.length > 0 && !numbers.startsWith('7')) {
      return '+7' + numbers;
    }
    
    return numbers.length > 0 ? '+' + numbers : '';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Для Supabase Auth используем номер телефона как email в формате phone@okeyenglish.ru
      const email = loginData.phone.replace(/\D/g, '') + '@okeyenglish.ru';
      
      console.log('Login attempt with email:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: loginData.password,
      });

      console.log('Auth result:', { data: data?.user?.id, error: error?.message });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Неверный номер телефона или пароль');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Подтвердите email для входа в систему');
        } else {
          setError(error.message);
        }
        return;
      }

      if (data.user) {
        // Получаем роль пользователя с приоритетом
        const { data: roleData, error: roleError } = await supabase.rpc(
          'get_user_role', { _user_id: data.user.id });

        console.log('User role:', roleData, 'Error:', roleError);

        toast({
          title: "Успешный вход",
          description: "Добро пожаловать в личный кабинет!",
        });

        // Перенаправляем в зависимости от роли
        if (!roleError && roleData === 'student') {
          navigate('/student-portal');
        } else if (!roleError && roleData === 'teacher') {
          navigate('/teacher-portal');
        } else if (!roleError && roleData === 'admin') {
          console.log('Redirecting admin to /admin');
          navigate('/admin');
        } else if (!roleError && ['manager', 'methodist'].includes(roleData)) {
          navigate('/newcrm');
        } else {
          // Fallback - перенаправляем на CRM для неопределенных ролей
          navigate('/newcrm');
        }
      }
    } catch (error: any) {
      setError('Произошла ошибка при входе в систему');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Валидация
    if (signupData.password !== signupData.confirmPassword) {
      setError('Пароли не совпадают');
      setIsLoading(false);
      return;
    }

    if (signupData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      setIsLoading(false);
      return;
    }

    if (!signupData.phone || !signupData.firstName) {
      setError('Заполните все обязательные поля');
      setIsLoading(false);
      return;
    }

    try {
      // Используем номер телефона как email в формате phone@okeyenglish.ru  
      const email = signupData.phone.replace(/\D/g, '') + '@okeyenglish.ru';
      const redirectUrl = `${window.location.origin}/auth`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password: signupData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: signupData.firstName,
            last_name: signupData.lastName,
            phone: signupData.phone,
          }
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          setError('Пользователь с таким номером телефона уже зарегистрирован');
        } else {
          setError(error.message);
        }
        return;
      }

      if (data.user) {
        toast({
          title: "Регистрация успешна",
          description: "Проверьте email для подтверждения аккаунта",
        });
        setActiveTab('login');
      }
    } catch (error: any) {
      setError('Произошла ошибка при регистрации');
      console.error('Signup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">O'KEY ENGLISH</h1>
          <p className="text-lg text-gray-600">Личный кабинет</p>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl">Вход в систему</CardTitle>
            <CardDescription>Введите номер телефона и пароль для входа</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Вход</TabsTrigger>
                <TabsTrigger value="signup">Регистрация</TabsTrigger>
              </TabsList>

              {/* Форма входа */}
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-phone">Номер телефона</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="login-phone"
                        type="tel"
                        placeholder="+7 (999) 123-45-67"
                        value={loginData.phone}
                        onChange={(e) => {
                          const formatted = formatPhoneNumber(e.target.value);
                          setLoginData({ ...loginData, phone: formatted });
                        }}
                        className="pl-10"
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Пароль</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Введите пароль"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className="pl-10 pr-10"
                        disabled={isLoading}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full bg-red-500 hover:bg-red-600 text-white" 
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Войти
                  </Button>
                </form>
              </TabsContent>

              {/* Форма регистрации */}
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstname">Имя *</Label>
                      <Input
                        id="signup-firstname"
                        placeholder="Имя"
                        value={signupData.firstName}
                        onChange={(e) => setSignupData({ ...signupData, firstName: e.target.value })}
                        disabled={isLoading}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-lastname">Фамилия</Label>
                      <Input
                        id="signup-lastname"
                        placeholder="Фамилия"
                        value={signupData.lastName}
                        onChange={(e) => setSignupData({ ...signupData, lastName: e.target.value })}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Номер телефона *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="signup-phone"
                        type="tel"
                        placeholder="+7 (999) 123-45-67"
                        value={signupData.phone}
                        onChange={(e) => {
                          const formatted = formatPhoneNumber(e.target.value);
                          setSignupData({ ...signupData, phone: formatted });
                        }}
                        className="pl-10"
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Пароль *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Минимум 6 символов"
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        className="pl-10"
                        disabled={isLoading}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Подтвердите пароль *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="signup-confirm-password"
                        type="password"
                        placeholder="Повторите пароль"
                        value={signupData.confirmPassword}
                        onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                        className="pl-10"
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>
                  
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full bg-red-500 hover:bg-red-600 text-white" 
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Зарегистрироваться
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Нужна помощь?{' '}
            <a href="/contacts" className="font-medium text-red-500 hover:text-red-600">
              Свяжитесь с нами
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}