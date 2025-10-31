import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await resetPassword(email);

    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else {
      setSuccess(true);
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Mail className="h-16 w-16 text-primary mx-auto mb-4" />
            <CardTitle>Письмо отправлено!</CardTitle>
            <CardDescription className="text-left space-y-2">
              <p>
                Мы отправили письмо с инструкциями по восстановлению пароля на адрес{' '}
                <strong>{email}</strong>
              </p>
              <p className="text-sm">
                Проверьте почту и перейдите по ссылке в письме для создания нового пароля.
              </p>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/auth')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Вернуться на страницу входа
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">O'KEY ENGLISH</h1>
          </div>
          <CardTitle>Восстановление пароля</CardTitle>
          <CardDescription>
            Введите email для получения ссылки восстановления
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                placeholder="your@email.com"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Отправка...
                </>
              ) : (
                'Отправить ссылку восстановления'
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate('/auth')}
              disabled={isLoading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Вернуться к входу
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
