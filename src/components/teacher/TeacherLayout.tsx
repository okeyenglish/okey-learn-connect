import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { GraduationCap, LogOut, Home, Calendar, FileText, UserCircle, RefreshCcw, Bell, Bot, AlertCircle } from 'lucide-react';
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
import { useTeacherBranches } from '@/hooks/useTeacherBranches';
import { BranchFilter } from '@/components/teacher/ui/BranchFilter';

interface TeacherLayoutProps {
  children: (props: {
    teacher: Teacher | null | undefined;
    isLoading: boolean;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    selectedBranchId: string | 'all';
    branches: any[];
  }) => React.ReactNode;
}

export const TeacherLayout = ({ children }: TeacherLayoutProps) => {
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('home');
  const [isChatDocked, setIsChatDocked] = useState(false);

  // ВАЖНО: порядок хуков должен быть постоянным

  // Получаем данные преподавателя
  const { data: teacher, isLoading: teacherLoading, error: teacherError } = useQuery({
    queryKey: ['teacher-by-profile', profile?.id],
    queryFn: async () => {
      if (!profile?.id) {
        console.warn('[TeacherLayout] No profile ID');
        return null;
      }
      
      console.log('[TeacherLayout] Fetching teacher for profile:', profile.id);
      
      const { data, error } = await (supabase as any)
        .from('teachers')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) {
        console.error('[TeacherLayout] Error fetching teacher:', error);
        throw error;
      }
      
      if (!data) {
        console.warn('[TeacherLayout] No teacher found for profile:', profile.id);
      }
      
      return data as Teacher | null;
    },
    enabled: !!profile?.id,
  });

  // Управление филиалами (всегда вызываем)
  const {
    branches,
    selectedBranchId,
    selectBranch,
    hasMultipleBranches,
  } = useTeacherBranches(teacher?.id);

  // Инициализируем аналитику (всегда вызываем хук в одном порядке)
  useEffect(() => {
    if (teacher?.id) {
      analytics.init(teacher.id);
      analytics.track(AnalyticsEvents.DASHBOARD_OPENED);
    }
  }, [teacher?.id]);

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

  if (teacherError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <p className="text-lg font-semibold">Ошибка загрузки данных</p>
          <p className="text-sm text-muted-foreground">{teacherError.message}</p>
          <Button onClick={() => navigate('/')}>На главную</Button>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-lg font-semibold">Преподаватель не найден</p>
          <p className="text-sm text-muted-foreground">У вас нет доступа к этому кабинету или ваш профиль не связан с преподавателем</p>
          <Button onClick={() => navigate('/')}>На главную</Button>
        </div>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <OfflineBanner />
        
        {/* Sticky Header - сдвигается когда чат закреплен */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b transition-all duration-300">
          <div 
            className={`
              container mx-auto px-6 py-3 transition-all duration-300
              ${isChatDocked ? 'md:max-w-none md:mr-[20vw]' : 'max-w-7xl'}
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GraduationCap className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-lg font-bold">{teacher.last_name} {teacher.first_name}</h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">Личный кабинет преподавателя</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {hasMultipleBranches && (
                  <BranchFilter
                    branches={branches}
                    selectedBranchId={selectedBranchId}
                    onSelectBranch={selectBranch}
                  />
                )}
                <div className="flex items-center gap-2">
                <CommandPalette teacherId={teacher.id} />
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
          </div>

          {/* Sticky Navigation Tabs */}
          <div 
            className={`
              container mx-auto px-6 transition-all duration-300
              ${isChatDocked ? 'md:max-w-none md:mr-[20vw]' : 'max-w-7xl'}
            `}
          >
            <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-0">
              <TabsTrigger 
                value="home" 
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Главная</span>
              </TabsTrigger>
              <TabsTrigger 
                value="schedule" 
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Расписание</span>
              </TabsTrigger>
              <TabsTrigger 
                value="materials" 
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Материалы</span>
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
        </div>

        {/* Main Content - сдвигается когда чат закреплен */}
        <div 
          className={`
            container mx-auto p-4 md:p-6 transition-all duration-300
            ${isChatDocked ? 'md:max-w-none md:mr-[20vw]' : 'max-w-7xl'}
          `}
        >
          {children({ 
            teacher, 
            isLoading: teacherLoading, 
            activeTab, 
            setActiveTab,
            selectedBranchId,
            branches,
          })}
        </div>
        <FloatingChatWidget
          teacherId={teacher.id}
          context={{ page: activeTab }}
          onDockedChange={setIsChatDocked}
        />

        <MobileTabBar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </Tabs>
  );
};