import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Mail, Phone, MapPin, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'branch_manager' | 'methodist' | 'head_teacher' | 'sales_manager' | 'marketing_manager' | 'manager' | 'accountant' | 'receptionist' | 'teacher' | 'student';

interface AddUserModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onUserAdded?: () => void;
  children?: React.ReactNode;
}

export function AddUserModal({ open, onOpenChange, onUserAdded, children }: AddUserModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [userData, setUserData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    branch: ''
  });

  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);

  const availableRoles: AppRole[] = [
    'admin', 'branch_manager', 'methodist', 'head_teacher', 
    'sales_manager', 'marketing_manager', 'manager', 'accountant', 
    'receptionist', 'teacher', 'student'
  ];

  const getRoleDisplayName = (role: AppRole): string => {
    const roleNames = {
      'admin': 'Администратор',
      'branch_manager': 'Управляющий филиалом',
      'methodist': 'Методист',
      'head_teacher': 'Старший преподаватель',
      'sales_manager': 'Менеджер по продажам',
      'marketing_manager': 'Маркетолог',
      'manager': 'Менеджер',
      'accountant': 'Бухгалтер',
      'receptionist': 'Администратор',
      'teacher': 'Преподаватель',
      'student': 'Студент'
    };
    
    return roleNames[role] || role;
  };

  const getRoleDescription = (role: AppRole): string => {
    const descriptions = {
      'admin': 'Полный доступ ко всем функциям системы',
      'branch_manager': 'Управление филиалом, расписанием и сотрудниками',
      'methodist': 'Управление учебным процессом и методическими материалами',
      'head_teacher': 'Координация преподавателей и контроль качества обучения',
      'sales_manager': 'Работа с лидами и продажи курсов',
      'marketing_manager': 'Маркетинговые кампании и аналитика',
      'manager': 'Работа с клиентами и общие управленческие задачи',
      'accountant': 'Финансовый учет и управление платежами',
      'receptionist': 'Работа с клиентами на ресепшн',
      'teacher': 'Проведение занятий и работа со студентами',
      'student': 'Доступ к учебным материалам и расписанию'
    };
    
    return descriptions[role] || '';
  };

  const toggleRole = (role: AppRole) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userData.email || !userData.password || !userData.first_name || !userData.last_name) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive"
      });
      return;
    }

    if (selectedRoles.length === 0) {
      toast({
        title: "Ошибка",
        description: "Выберите хотя бы одну роль для пользователя",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Сохраняем текущую сессию администратора
      const { data: currentSessionRes } = await supabase.auth.getSession();
      const originalAccessToken = currentSessionRes.session?.access_token || null;
      const originalRefreshToken = currentSessionRes.session?.refresh_token || null;

      // Создаем пользователя в auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.first_name,
            last_name: userData.last_name,
            phone: userData.phone,
            branch: userData.branch
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) {
        throw new Error('Не удалось создать пользователя');
      }

      // Восстанавливаем сессию администратора (чтобы не потерять права)
      if (originalAccessToken && originalRefreshToken) {
        try {
          await supabase.auth.setSession({
            access_token: originalAccessToken,
            refresh_token: originalRefreshToken,
          });
        } catch (e) {
          console.warn('Не удалось восстановить сессию администратора:', e);
        }
      }

      // Профиль обычно создается триггером handle_new_user. На всякий случай делаем upsert
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{
          id: authData.user.id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          email: userData.email,
          phone: userData.phone,
          branch: userData.branch
        }], { onConflict: 'id' });

      if (profileError) {
        console.warn('Profile upsert warning:', profileError);
      }

      // Назначаем роли
      const roleInserts = selectedRoles.map(role => ({
        user_id: authData.user.id,
        role: role
      }));

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert(roleInserts);

      if (roleError) {
        console.warn('Role assignment error:', roleError);
        // Не прерываем процесс, роли можно назначить потом
      }

      toast({
        title: "Успешно",
        description: `Пользователь ${userData.first_name} ${userData.last_name} создан`
      });

      // Сброс формы
      setUserData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        branch: ''
      });
      setSelectedRoles([]);
      
      onUserAdded?.();
      onOpenChange?.(false);
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать пользователя",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Добавить пользователя
          </DialogTitle>
          <DialogDescription>
            Создайте нового пользователя и назначьте ему роли в системе
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Основная информация */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Основная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Имя *</Label>
                  <Input
                    id="first_name"
                    placeholder="Введите имя"
                    value={userData.first_name}
                    onChange={(e) => setUserData({...userData, first_name: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">Фамилия *</Label>
                  <Input
                    id="last_name"
                    placeholder="Введите фамилию"
                    value={userData.last_name}
                    onChange={(e) => setUserData({...userData, last_name: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@okeyenglish.ru"
                    value={userData.email}
                    onChange={(e) => setUserData({...userData, email: e.target.value})}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Пароль *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Создайте надежный пароль"
                    value={userData.password}
                    onChange={(e) => setUserData({...userData, password: e.target.value})}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="+7 (999) 123-45-67"
                      value={userData.phone}
                      onChange={(e) => setUserData({...userData, phone: e.target.value})}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch">Филиал</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                    <Select
                      value={userData.branch}
                      onValueChange={(value) => setUserData({...userData, branch: value})}
                    >
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder="Выберите филиал" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Окская">Окская</SelectItem>
                        <SelectItem value="Мытищи">Мытищи</SelectItem>
                        <SelectItem value="Люберцы">Люберцы</SelectItem>
                        <SelectItem value="Котельники">Котельники</SelectItem>
                        <SelectItem value="Солнцево">Солнцево</SelectItem>
                        <SelectItem value="Новокосино">Новокосино</SelectItem>
                        <SelectItem value="Стахановская">Стахановская</SelectItem>
                        <SelectItem value="Онлайн школа">Онлайн школа</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Выбор ролей */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Роли пользователя</CardTitle>
              <CardDescription>
                Выберите роли, которые будут назначены пользователю
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Выбранные роли */}
                {selectedRoles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Выбранные роли:</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedRoles.map(role => (
                        <Badge key={role} variant="default" className="cursor-pointer" onClick={() => toggleRole(role)}>
                          {getRoleDisplayName(role)} ✕
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Доступные роли */}
                <div className="space-y-3">
                  <Label>Доступные роли:</Label>
                  <div className="grid gap-3">
                    {availableRoles.map(role => (
                      <div key={role} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                        <Checkbox
                          id={role}
                          checked={selectedRoles.includes(role)}
                          onCheckedChange={() => toggleRole(role)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <Label htmlFor={role} className="cursor-pointer font-medium">
                            {getRoleDisplayName(role)}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {getRoleDescription(role)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Кнопки действий */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Создание..." : "Создать пользователя"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}