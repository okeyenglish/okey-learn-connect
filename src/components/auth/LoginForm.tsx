import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, AlertCircle } from 'lucide-react';

export const LoginForm = () => {
  const { signIn, signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCorsError, setIsCorsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setIsCorsError(false);

    const { error } = await signIn(email, password);
    
    if (error) {
      // Check for CORS/Network errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setError('Браузер заблокировал запрос к серверу (CORS). Сервер должен отдавать Access-Control-Allow-Origin на всех ответах, не только на preflight.');
        setIsCorsError(true);
      }
      // Check for server errors (500, 502, 503)
      else if (error.message?.includes('500') || error.message?.includes('unexpected_failure') || 
          error.message?.includes('Database error') || error.message?.toLowerCase().includes('server')) {
        setError('Проблема на сервере аутентификации. Пожалуйста, попробуйте позже или обратитесь к администратору.');
      } else {
        setError(error.message);
      }
    }
    
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setIsCorsError(false);

    const { error } = await signUp(email, password, firstName, lastName);
    
    if (error) {
      // Check for CORS/Network errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setError('Браузер заблокировал запрос к серверу (CORS). Сервер должен отдавать Access-Control-Allow-Origin на всех ответах, не только на preflight.');
        setIsCorsError(true);
      } else {
        setError(error.message);
      }
    } else {
      setError('Регистрация успешна! Проверьте email для подтверждения.');
    }
    
    setIsLoading(false);
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setError(null);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    resetForm();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">ACADEMYOS</h1>
          </div>
          <CardTitle>CRM Система</CardTitle>
          <CardDescription>
            Войдите в систему управления клиентами
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Вход</TabsTrigger>
              <TabsTrigger value="signup">Регистрация</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Пароль</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                {error && (
                  <Alert variant={error.includes('успешна') ? 'default' : 'destructive'}>
                    <AlertDescription>
                      <div className="space-y-2">
                        <p>{error}</p>
                        {isCorsError && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/diag')}
                            className="w-full"
                          >
                            <AlertCircle className="mr-2 h-4 w-4" />
                            Запустить диагностику
                          </Button>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Вход...
                    </>
                  ) : (
                    'Войти'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full"
                  onClick={() => navigate('/auth/forgot-password')}
                  disabled={isLoading}
                >
                  Забыли пароль?
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Имя</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Фамилия</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Пароль</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={6}
                  />
                </div>
                {error && (
                  <Alert variant={error.includes('успешна') ? 'default' : 'destructive'}>
                    <AlertDescription>
                      <div className="space-y-2">
                        <p>{error}</p>
                        {isCorsError && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/diag')}
                            className="w-full"
                          >
                            <AlertCircle className="mr-2 h-4 w-4" />
                            Запустить диагностику
                          </Button>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Регистрация...
                    </>
                  ) : (
                    'Зарегистрироваться'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};