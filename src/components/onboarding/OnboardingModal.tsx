import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, GraduationCap, Users, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type RoleType = 'school' | 'teacher' | 'student' | 'parent';

export const OnboardingModal = ({ open, onOpenChange }: OnboardingModalProps) => {
  const [step, setStep] = useState<'role' | 'info'>('role');
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    schoolName: '',
    password: '',
  });

  const roles = [
    {
      id: 'school' as RoleType,
      title: 'Школа',
      description: 'Управление учебным центром',
      icon: Building2,
      color: 'bg-blue-500',
    },
    {
      id: 'teacher' as RoleType,
      title: 'Преподаватель',
      description: 'Ведение занятий и учеников',
      icon: GraduationCap,
      color: 'bg-green-500',
    },
    {
      id: 'student' as RoleType,
      title: 'Ученик',
      description: 'Обучение и домашние задания',
      icon: User,
      color: 'bg-purple-500',
    },
    {
      id: 'parent' as RoleType,
      title: 'Родитель',
      description: 'Контроль успеваемости ребенка',
      icon: Users,
      color: 'bg-orange-500',
    },
  ];

  const handleRoleSelect = (role: RoleType) => {
    setSelectedRole(role);
    setStep('info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Регистрация пользователя
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.name.split(' ')[0],
            last_name: formData.name.split(' ')[1] || '',
            phone: formData.phone,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Создаем роль для пользователя
        const roleMapping: Record<RoleType, string> = {
          school: 'admin',
          teacher: 'teacher',
          student: 'student',
          parent: 'manager', // Родители используют manager роль
        };

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert([{
            user_id: authData.user.id,
            role: roleMapping[selectedRole!] as any,
          }]);

        if (roleError) throw roleError;

        // Если школа - создаем организацию
        if (selectedRole === 'school' && formData.schoolName) {
          // Сначала создаем slug из названия
          const slug = formData.schoolName
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');

          const { error: orgError } = await supabase
            .from('organizations')
            .insert([{
              name: formData.schoolName,
              slug: slug,
            }]);

          if (orgError) throw orgError;
        }

        toast({
          title: 'Добро пожаловать!',
          description: 'Ваш аккаунт успешно создан',
        });

        onOpenChange(false);
        
        // Перенаправляем на соответствующий дашборд
        const routes: Record<RoleType, string> = {
          school: '/admin',
          teacher: '/teacher-portal',
          student: '/student-portal',
          parent: '/crm',
        };
        
        navigate(routes[selectedRole!]);
      }
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось создать аккаунт',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === 'role' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl text-center">
                Выберите свою роль
              </DialogTitle>
              <p className="text-muted-foreground text-center mt-2">
                Начните работу бесплатно - без звонков и ожидания
              </p>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 mt-6">
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <button
                    key={role.id}
                    onClick={() => handleRoleSelect(role.id)}
                    className="group relative p-6 rounded-xl border-2 border-border hover:border-primary transition-all duration-300 text-left"
                  >
                    <div className={`w-12 h-12 rounded-lg ${role.color} bg-opacity-10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-6 h-6 ${role.color.replace('bg-', 'text-')}`} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{role.title}</h3>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 'info' && selectedRole && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {roles.find(r => r.id === selectedRole)?.title}
              </DialogTitle>
              <p className="text-muted-foreground">
                Заполните данные для начала работы
              </p>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">ФИО *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Иван Иванов"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ivan@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Пароль *</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Минимум 6 символов"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+7 (999) 123-45-67"
                />
              </div>

              {selectedRole === 'school' && (
                <div className="space-y-2">
                  <Label htmlFor="schoolName">Название школы *</Label>
                  <Input
                    id="schoolName"
                    required
                    value={formData.schoolName}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    placeholder="Академия английского языка"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('role')}
                  className="flex-1"
                >
                  Назад
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Создание...' : 'Начать работу'}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
