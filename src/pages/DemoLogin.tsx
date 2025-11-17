import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import {
  LogIn,
  Shield,
  Users,
  GraduationCap,
  UserCircle,
  Building2,
  BookOpen,
  TrendingUp,
  DollarSign,
  Megaphone,
  Briefcase,
  Calculator,
  Phone,
  Headphones,
  AlertTriangle,
  Copy,
  ArrowLeft
} from 'lucide-react';

interface DemoAccount {
  role: string;
  roleName: string;
  firstName: string;
  lastName: string;
  email: string;
  icon: React.ElementType;
  category: string;
  description: string;
  isPrimary?: boolean;
}

const demoAccounts: DemoAccount[] = [
  {
    role: 'admin',
    roleName: 'Администратор',
    firstName: 'Иван',
    lastName: 'Администраторов',
    email: 'demo-admin@academius.ru',
    icon: Shield,
    category: 'Администрация',
    description: 'Полный доступ ко всем функциям системы',
    isPrimary: true
  },
  {
    role: 'branch_manager',
    roleName: 'Менеджер филиала',
    firstName: 'Ольга',
    lastName: 'Филиалова',
    email: 'demo-branch-manager@academius.ru',
    icon: Building2,
    category: 'Администрация',
    description: 'Управление филиалом и персоналом'
  },
  {
    role: 'methodist',
    roleName: 'Методист',
    firstName: 'Елена',
    lastName: 'Методистова',
    email: 'demo-methodist@academius.ru',
    icon: BookOpen,
    category: 'Управление',
    description: 'Управление учебными программами'
  },
  {
    role: 'head_teacher',
    roleName: 'Старший преподаватель',
    firstName: 'Сергей',
    lastName: 'Старшийучитель',
    email: 'demo-head-teacher@academius.ru',
    icon: GraduationCap,
    category: 'Управление',
    description: 'Координация работы преподавателей'
  },
  {
    role: 'manager',
    roleName: 'Менеджер',
    firstName: 'Николай',
    lastName: 'Менеджеров',
    email: 'demo-manager@academius.ru',
    icon: Briefcase,
    category: 'Управление',
    description: 'Общее управление и координация'
  },
  {
    role: 'sales_manager',
    roleName: 'Менеджер по продажам',
    firstName: 'Дмитрий',
    lastName: 'Продавец',
    email: 'demo-sales-manager@academius.ru',
    icon: TrendingUp,
    category: 'Продажи и маркетинг',
    description: 'Работа с клиентами и продажи'
  },
  {
    role: 'marketing_manager',
    roleName: 'Менеджер по маркетингу',
    firstName: 'Алиса',
    lastName: 'Маркетолог',
    email: 'demo-marketing-manager@academius.ru',
    icon: Megaphone,
    category: 'Продажи и маркетинг',
    description: 'Маркетинг и продвижение'
  },
  {
    role: 'accountant',
    roleName: 'Бухгалтер',
    firstName: 'Татьяна',
    lastName: 'Бухгалтерова',
    email: 'demo-accountant@academius.ru',
    icon: Calculator,
    category: 'Операционные',
    description: 'Финансовый учет и отчетность'
  },
  {
    role: 'receptionist',
    roleName: 'Администратор',
    firstName: 'Ксения',
    lastName: 'Ресепшионистова',
    email: 'demo-receptionist@academius.ru',
    icon: Phone,
    category: 'Операционные',
    description: 'Прием клиентов и запись'
  },
  {
    role: 'support',
    roleName: 'Специалист поддержки',
    firstName: 'Максим',
    lastName: 'Поддержкин',
    email: 'demo-support@academius.ru',
    icon: Headphones,
    category: 'Операционные',
    description: 'Техническая поддержка'
  },
  {
    role: 'teacher',
    roleName: 'Преподаватель',
    firstName: 'Мария',
    lastName: 'Учителева',
    email: 'demo-teacher@academius.ru',
    icon: GraduationCap,
    category: 'Преподаватели',
    description: 'Ведение занятий и учебный процесс'
  },
  {
    role: 'student',
    roleName: 'Студент',
    firstName: 'Анна',
    lastName: 'Студентова',
    email: 'demo-student@academius.ru',
    icon: Users,
    category: 'Клиенты',
    description: 'Обучение и доступ к материалам'
  },
  {
    role: 'parent',
    roleName: 'Родитель',
    firstName: 'Петр',
    lastName: 'Родителев',
    email: 'demo-parent@academius.ru',
    icon: UserCircle,
    category: 'Клиенты',
    description: 'Контроль обучения детей'
  }
];

const PASSWORD = 'Demo123456!';

export default function DemoLogin() {
  const [loadingAccount, setLoadingAccount] = useState<string | null>(null);
  const [isCreatingUsers, setIsCreatingUsers] = useState(false);
  const [usersCreated, setUsersCreated] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if demo users exist
  useEffect(() => {
    checkDemoUsersExist();
  }, []);

  const checkDemoUsersExist = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', 'demo-admin@academius.ru')
        .single();
      
      if (data && !error) {
        setUsersCreated(true);
      }
    } catch (err) {
      console.log('Demo users not found');
    }
  };

  const createDemoUsers = async () => {
    setIsCreatingUsers(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-demo-users');
      
      if (error) throw error;
      
      toast({
        title: 'Демо-пользователи созданы!',
        description: `Создано ${data.results.filter((r: any) => r.status === 'created').length} пользователей`
      });
      
      setUsersCreated(true);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка создания пользователей',
        description: err.message || 'Не удалось создать демо-пользователей'
      });
    } finally {
      setIsCreatingUsers(false);
    }
  };

  const handleQuickLogin = async (email: string) => {
    setLoadingAccount(email);
    try {
      const { error } = await signIn(email, PASSWORD);
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Ошибка входа',
          description: error.message || 'Не удалось войти в систему'
        });
      } else {
        toast({
          title: 'Успешный вход!',
          description: 'Перенаправление...'
        });
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Произошла ошибка при входе'
      });
    } finally {
      setLoadingAccount(null);
    }
  };

  const handleCopyCredentials = (email: string) => {
    const credentials = `Email: ${email}\nПароль: ${PASSWORD}`;
    navigator.clipboard.writeText(credentials);
    toast({
      title: 'Скопировано!',
      description: 'Учетные данные скопированы в буфер обмена'
    });
  };

  const groupedAccounts = demoAccounts.reduce((acc, account) => {
    if (!acc[account.category]) {
      acc[account.category] = [];
    }
    acc[account.category].push(account);
    return acc;
  }, {} as Record<string, DemoAccount[]>);

  const categoryOrder = ['Администрация', 'Управление', 'Продажи и маркетинг', 'Операционные', 'Преподаватели', 'Клиенты'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/auth">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад к авторизации
            </Button>
          </Link>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">
              🚀 Быстрый вход для тестирования
            </h1>
            <p className="text-muted-foreground text-lg mb-6">
              Выберите роль для входа в демо-версию системы
            </p>
          </div>

          {/* Warning Alert */}
          <Alert className="max-w-3xl mx-auto mb-8 border-warning/50 bg-warning/5">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <AlertDescription className="text-sm">
              <strong>Только для разработки и демонстрации!</strong><br />
              Все демо-аккаунты используют пароль: <code className="bg-muted px-2 py-1 rounded text-xs font-mono">{PASSWORD}</code>
            </AlertDescription>
          </Alert>

          {/* Create Demo Users Button */}
          {!usersCreated && (
            <div className="max-w-3xl mx-auto mb-8">
              <Card className="border-primary/50 bg-primary/5">
                <div className="p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2">Демо-пользователи не найдены</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Нажмите кнопку ниже, чтобы автоматически создать всех демо-пользователей
                  </p>
                  <Button 
                    onClick={createDemoUsers}
                    disabled={isCreatingUsers}
                    size="lg"
                    className="gap-2"
                  >
                    {isCreatingUsers ? (
                      <>
                        <span className="loading-spinner" />
                        Создание пользователей...
                      </>
                    ) : (
                      <>
                        <Users className="h-5 w-5" />
                        Создать демо-пользователей
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Demo Accounts Grid */}
        {categoryOrder.map((category) => {
          const accounts = groupedAccounts[category];
          if (!accounts) return null;

          return (
            <div key={category} className="mb-12">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <span className="h-1 w-8 bg-primary rounded" />
                {category}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts.map((account) => {
                  const Icon = account.icon;
                  const isLoading = loadingAccount === account.email;
                  const initials = `${account.firstName[0]}${account.lastName[0]}`;

                  return (
                    <Card 
                      key={account.email}
                      className={`hover:shadow-lg transition-all duration-300 ${account.isPrimary ? 'border-primary shadow-md' : ''}`}
                    >
                      <div className="p-6">
                        {/* Header with Avatar */}
                        <div className="flex items-center gap-4 mb-4">
                          <Avatar className="h-14 w-14 border-2 border-border">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className="h-4 w-4 text-primary" />
                              <h3 className="font-semibold text-lg">{account.roleName}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {account.firstName} {account.lastName}
                            </p>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-muted-foreground mb-4 min-h-[2.5rem]">
                          {account.description}
                        </p>

                        {/* Email */}
                        <div className="mb-4 p-2 bg-muted/50 rounded text-xs font-mono flex items-center justify-between">
                          <span className="truncate">{account.email}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopyCredentials(account.email)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Login Button */}
                        <Button
                          onClick={() => handleQuickLogin(account.email)}
                          disabled={isLoading}
                          className="w-full"
                          variant={account.isPrimary ? 'default' : 'outline'}
                        >
                          {isLoading ? (
                            <>
                              <span className="loading-spinner mr-2" />
                              Вход...
                            </>
                          ) : (
                            <>
                              <LogIn className="mr-2 h-4 w-4" />
                              Войти как {account.roleName}
                            </>
                          )}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Footer Info */}
        <div className="max-w-3xl mx-auto mt-12 p-6 bg-muted/30 rounded-lg">
          <h3 className="font-semibold mb-2">ℹ️ Информация о демо-режиме</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Все демо-аккаунты используют одинаковый пароль для упрощения тестирования</li>
            <li>• Данные в демо-режиме могут быть сброшены в любой момент</li>
            <li>• Некоторые функции могут быть ограничены или недоступны</li>
            <li>• Эта страница доступна только в режиме разработки</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
