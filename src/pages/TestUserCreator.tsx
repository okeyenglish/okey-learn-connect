import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, User, Mail, Phone, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createTestStudent, getTestUserCredentials, type TestUser } from '@/utils/createTestUser';

export default function TestUserCreator() {
  const [isCreating, setIsCreating] = useState(false);
  const [testUser, setTestUser] = useState<TestUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCreateUser = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const user = await createTestStudent();
      setTestUser(user);
      toast({
        title: "Тестовый ученик создан",
        description: "Данные для входа готовы к использованию",
      });
    } catch (error) {
      console.error('Ошибка:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
      // Показываем существующие данные даже если создание не удалось
      setTestUser(getTestUserCredentials());
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Скопировано",
      description: `${label} скопирован в буфер обмена`,
    });
  };

  const getExistingCredentials = () => {
    setTestUser(getTestUserCredentials());
  };

  return (
    <div className="container mx-auto max-w-2xl p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-6 w-6" />
            Создание тестового ученика
          </CardTitle>
          <CardDescription>
            Создайте тестового ученика для демонстрации личного кабинета
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!testUser ? (
            <div className="space-y-4">
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Создайте тестового ученика с готовыми данными: курсами, расписанием и занятиями
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button 
                    onClick={handleCreateUser}
                    disabled={isCreating}
                    className="flex items-center gap-2"
                  >
                    {isCreating ? (
                      <>
                        <div className="loading-spinner w-4 h-4"></div>
                        Создаём...
                      </>
                    ) : (
                      <>
                        <User className="h-4 w-4" />
                        Создать нового ученика
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={getExistingCredentials}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Показать существующие данные
                  </Button>
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Тестовый ученик готов!</span>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-mono">{testUser.email}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(testUser.email, 'Email')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Пароль</p>
                        <p className="font-mono">{testUser.password}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(testUser.password, 'Пароль')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Телефон</p>
                        <p className="font-mono">{testUser.phone}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(testUser.phone, 'Телефон')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Имя</p>
                        <p className="font-medium">{testUser.firstName} {testUser.lastName}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <h4 className="font-medium">Что включено в тестовый аккаунт:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Курс</Badge>
                      <span>Английский язык - Средний уровень (8000 ₽)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Уроки</Badge>
                      <span>Индивидуальные занятия с Анастасией Ивановой</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Расписание</Badge>
                      <span>3 запланированных урока на ближайшие дни</span>
                    </div>
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Теперь можно войти в систему используя указанные выше данные
                  </p>
                  <Button
                    onClick={() => window.location.href = '/auth'}
                    className="w-full"
                  >
                    Перейти на страницу входа
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}