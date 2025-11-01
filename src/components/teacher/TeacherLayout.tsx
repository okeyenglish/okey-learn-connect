import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { GraduationCap, LogOut, Home, BookOpen, Calendar, FileText, UserCircle, RefreshCcw, Bell, Bot } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Teacher } from '@/hooks/useTeachers';
import { CommandPalette } from '@/components/teacher/ui/CommandPalette';
import { FloatingChatWidget } from '@/components/teacher/floating-chat/FloatingChatWidget';
import { MobileTabBar } from '@/components/teacher/ui/MobileTabBar';
import { OfflineBanner } from '@/components/OfflineBanner';
import { analytics, AnalyticsEvents } from '@/lib/analytics';

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
    queryKey: ['teacher-by-profile', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      
      const { data, error } = await (supabase as any)
        .from('teachers')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching teacher:', error);
        return null;
      }
      
      return data as Teacher | null;
    },
    enabled: !!profile?.id,
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

  // Инициализируем аналитику
  useEffect(() => {
    if (teacher?.id) {
      analytics.init(teacher.id);
      analytics.track(AnalyticsEvents.DASHBOARD_OPENED);
    }
  }, [teacher?.id]);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <OfflineBanner />
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto max-w-7xl px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-lg font-bold">{teacher.last_name} {teacher.first_name}</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Личный кабинет преподавателя</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CommandPalette />
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Выйти</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Sticky Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="container mx-auto max-w-7xl px-6">
            <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-0">
              <TabsTrigger 
                value="home" 
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Главная</span>
              </TabsTrigger>
              <TabsTrigger 
                value="journal" 
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Журнал</span>
              </TabsTrigger>
              <TabsTrigger 
                value="materials" 
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Материалы</span>
              </TabsTrigger>
              <TabsTrigger 
                value="schedule" 
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Расписание</span>
              </TabsTrigger>
              <TabsTrigger 
                value="substitutions" 
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <RefreshCcw className="h-4 w-4" />
                <span className="hidden sm:inline">Замены</span>
              </TabsTrigger>
              <TabsTrigger 
                value="ai-hub" 
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <Bot className="h-4 w-4" />
                <span className="hidden sm:inline">AI Hub</span>
              </TabsTrigger>
              <TabsTrigger 
                value="profile" 
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <UserCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Профиль</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-7xl p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Контент вкладок */}
          {children({ teacher, isLoading: teacherLoading, activeTab, setActiveTab })}
        </Tabs>
      </div>

      {/* Плавающий виджет чата и ассистента */}
      <FloatingChatWidget
        teacherId={teacher.id}
        context={{
          page: activeTab,
        }}
      />

      {/* Мобильная навигация */}
      <MobileTabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};
