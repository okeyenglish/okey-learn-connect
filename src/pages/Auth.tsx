import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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

  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Получаем redirect URL из state или используем по умолчанию
  const from = (location.state as any)?.from?.pathname || '/';

  // Если пользователь уже авторизован, перенаправляем его
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

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
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: loginData.password,
      });

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
        toast({
          title: "Успешный вход",
          description: "Добро пожаловать в личный кабинет!",
        });
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">O'KEY ENGLISH</h1>
          <p className="text-muted-foreground mt-2">Личный кабинет ученика</p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {activeTab === 'login' ? 'Вход в систему' : 'Регистрация'}
            </CardTitle>
            <CardDescription className="text-center">
              {activeTab === 'login' 
                ? 'Введите номер телефона и пароль для входа' 
                : 'Создайте новый аккаунт для доступа к личному кабинету'
              }
            </CardDescription>
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
                    <Input
                      id="login-phone"
                      type="tel"
                      placeholder="+7 (999) 123-45-67"
                      value={loginData.phone}
                      onChange={(e) => {
                        const formatted = formatPhoneNumber(e.target.value);
                        setLoginData({ ...loginData, phone: formatted });
                      }}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Пароль</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Введите пароль"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
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
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
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
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="+7 (999) 123-45-67"
                      value={signupData.phone}
                      onChange={(e) => {
                        const formatted = formatPhoneNumber(e.target.value);
                        setSignupData({ ...signupData, phone: formatted });
                      }}
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Пароль *</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Минимум 6 символов"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      disabled={isLoading}
                      required
                      minLength={6}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Подтвердите пароль *</Label>
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="Повторите пароль"
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Зарегистрироваться
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Нужна помощь?{' '}
            <a href="/contacts" className="text-primary hover:underline">
              Свяжитесь с нами
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}