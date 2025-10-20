import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { StudentsModal } from './StudentsModal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import crmLogo from '@/assets/crm-logo.png';
import { 
  MessageSquare,
  GraduationCap,
  User,
  Settings,
  LogOut,
  Users,
  Calendar,
  BookOpen,
  Building,
  BarChart3,
  Menu,
  MessageCircle,
  Home,
  Target,
  DollarSign,
  UserCheck,
  Briefcase
} from 'lucide-react';

export const UnifiedCRMHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, role, signOut } = useAuth();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [studentsModalOpen, setStudentsModalOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
      toast({
        title: "Выход выполнен",
        description: "Вы успешно вышли из системы",
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при выходе",
        variant: "destructive",
      });
    }
  };

  const getNavigationItems = () => {
    const items = [];

    // Доступно всем аутентифицированным пользователям
    items.push({
      label: 'CRM',
      href: '/crm',
      icon: MessageSquare,
      roles: ['admin', 'manager', 'teacher', 'student', 'methodist']
    });

    // Для преподавателей
    if (role === 'teacher' || role === 'admin' || role === 'methodist') {
      items.push({
        label: 'Портал преподавателя',
        href: '/teacher-portal',
        icon: GraduationCap,
        roles: ['admin', 'teacher', 'methodist']
      });
    }

    // Для учеников
    if (role === 'student' || role === 'admin') {
      items.push({
        label: 'Портал ученика',
        href: '/student-portal',
        icon: User,
        roles: ['admin', 'student']
      });
    }

    // Для администраторов и методистов
    if (role === 'admin' || role === 'methodist') {
      items.push({
        label: 'Администрирование',
        href: '/admin',
        icon: Settings,
        roles: ['admin', 'methodist']
      });
    }

    // Дополнительные разделы для менеджеров и администраторов
    if (role === 'admin' || role === 'manager' || role === 'methodist') {
      items.push(
        {
          label: 'Расписание',
          href: '/crm/schedule',
          icon: Calendar,
          roles: ['admin', 'manager', 'methodist']
        },
        {
          label: 'Группы',
          href: '/crm/groups',
          icon: Users,
          roles: ['admin', 'manager', 'methodist']
        },
        {
          label: 'Отчеты',
          href: '/crm/reports',
          icon: BarChart3,
          roles: ['admin', 'manager', 'methodist']
        },
        // StudentsModal will be handled separately
        {
          label: 'Сотрудники',
          href: '/crm/employees',
          icon: Briefcase,
          roles: ['admin', 'branch_manager', 'manager']
        },
        {
          label: 'Абонементы',
          href: '/crm/subscriptions',
          icon: BookOpen,
          roles: ['admin', 'manager', 'accountant']
        },
        {
          label: 'Лиды и продажи',
          href: '/crm/leads',
          icon: Target,
          roles: ['admin', 'sales_manager', 'marketing_manager', 'manager']
        },
        {
          label: 'Финансы',
          href: '/crm/finances',
          icon: DollarSign,
          roles: ['admin', 'manager', 'accountant']
        },
        {
          label: 'Внутренние чаты',
          href: '/crm/internal-chats',
          icon: MessageCircle,
          roles: ['admin', 'manager', 'methodist', 'teacher']
        },
        {
          label: 'Справочники',
          href: '/crm/references',
          icon: Settings,
          roles: ['admin', 'methodist']
        }
      );
    }

    return items.filter(item => item.roles.includes(role as string));
  };

  const navigationItems = getNavigationItems();
  const currentPath = location.pathname;

  const getUserDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return user?.email || 'Пользователь';
  };

  const getRoleDisplayName = (role: string | null) => {
    const roleNames = {
      admin: 'Администратор',
      manager: 'Менеджер',
      teacher: 'Преподаватель',
      student: 'Ученик',
      methodist: 'Методист'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="flex items-center space-x-2"
          >
            <img src={crmLogo} alt="CRM Logo" className="h-8 w-8" />
            <span className="hidden font-bold sm:inline-block">
              O'KEY ENGLISH
            </span>
          </Button>
        </div>

        {/* Мобильное меню */}
        <Button
          variant="ghost"
          className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Переключить меню</span>
        </Button>

        {/* Основная навигация */}
        <nav className="flex items-center space-x-6 text-sm font-medium">
          <div className="hidden md:flex md:items-center md:space-x-6">
            {navigationItems.map((item) => (
              <Button
                key={item.href}
                variant={currentPath === item.href ? "default" : "ghost"}
                size="sm"
                onClick={() => navigate(item.href)}
                className="flex items-center space-x-2"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Button>
            ))}
            {/* Students Modal Button */}
            {(role === 'admin' || role === 'manager' || role === 'methodist' || role === 'teacher') && (
              <StudentsModal open={studentsModalOpen} onOpenChange={setStudentsModalOpen}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>Ученики и клиенты</span>
                </Button>
              </StudentsModal>
            )}
          </div>
        </nav>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Здесь может быть поиск в будущем */}
          </div>
          
          {/* Профиль пользователя */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url} alt={getUserDisplayName()} />
                  <AvatarFallback>
                    {getUserDisplayName().split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {getUserDisplayName()}
                  </p>
                  <div className="flex items-center space-x-2">
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                    {role && (
                      <Badge variant="secondary" className="text-xs">
                        {getRoleDisplayName(role)}
                      </Badge>
                    )}
                  </div>
                  {profile?.branch && (
                    <p className="text-xs leading-none text-muted-foreground">
                      {profile.branch}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/')}>
                <Home className="mr-2 h-4 w-4" />
                <span>Главная</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Выйти</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Мобильная навигация */}
      {mobileMenuOpen && (
        <div className="container border-t pb-4 md:hidden">
          <nav className="grid gap-2 pt-4">
            {navigationItems.map((item) => (
              <Button
                key={item.href}
                variant={currentPath === item.href ? "default" : "ghost"}
                className="justify-start"
                onClick={() => {
                  navigate(item.href);
                  setMobileMenuOpen(false);
                }}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            ))}
            {/* Mobile Students Modal Button */}
            {(role === 'admin' || role === 'manager' || role === 'methodist' || role === 'teacher') && (
              <StudentsModal open={studentsModalOpen} onOpenChange={setStudentsModalOpen}>
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  Ученики и клиенты
                </Button>
              </StudentsModal>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};