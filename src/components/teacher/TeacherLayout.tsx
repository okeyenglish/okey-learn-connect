import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { GraduationCap, LogOut, Home, BookOpen, Calendar, FileText, UserCircle, RefreshCcw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Teacher } from '@/hooks/useTeachers';

interface TeacherLayoutProps {
  children: (props: {
    teacher: Teacher | null | undefined;
    isLoading: boolean;
    activeTab: string;
    setActiveTab: (tab: string) => void;
  }) => React.ReactNode;
}

export const TeacherLayout = ({ children }: TeacherLayoutProps) => {
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('home');

  // Получаем данные преподавателя
  const { data: teacher, isLoading: teacherLoading } = useQuery({
    queryKey: ['teacher-by-profile', profile?.first_name, profile?.last_name],
    queryFn: async () => {
      if (!profile?.first_name || !profile?.last_name) return null;
      
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('first_name', profile.first_name)
        .eq('last_name', profile.last_name)
        .eq('is_active', true)
        .limit(1);
      
      if (error) {
        console.error('Error fetching teacher:', error);
        return null;
      }
      
      return data?.[0] || null;
    },
    enabled: !!profile?.first_name && !!profile?.last_name,
  });

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
    }
  };

  if (teacherLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Загружаем данные...</div>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg">Преподаватель не найден или у вас нет доступа к этому кабинету</p>
          <Button onClick={() => navigate('/')}>На главную</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl p-6 space-y-6">
        {/* Шапка */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{teacher.last_name} {teacher.first_name}</h1>
              <p className="text-sm text-muted-foreground">Личный кабинет преподавателя</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/newcrm')}>
              CRM
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Выйти
            </Button>
          </div>
        </div>

        {/* Вкладки навигации */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="home" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Главная</span>
            </TabsTrigger>
            <TabsTrigger value="journal" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Журнал</span>
            </TabsTrigger>
            <TabsTrigger value="materials" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Материалы</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Расписание</span>
            </TabsTrigger>
            <TabsTrigger value="substitutions" className="flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Замены</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Профиль</span>
            </TabsTrigger>
          </TabsList>

          {/* Контент вкладок */}
          {children({ teacher, isLoading: teacherLoading, activeTab, setActiveTab })}
        </Tabs>
      </div>
    </div>
  );
};
