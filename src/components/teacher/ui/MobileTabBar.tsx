import { Home, Calendar, MessageCircle, UserCircle } from 'lucide-react';

interface MobileTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const MobileTabBar = ({ activeTab, onTabChange }: MobileTabBarProps) => {
  const tabs = [
    { value: 'home', label: 'Главная', icon: Home },
    { value: 'schedule', label: 'Расписание', icon: Calendar },
    { value: 'ai-hub', label: 'AI Hub', icon: MessageCircle },
    { value: 'profile', label: 'Профиль', icon: UserCircle },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden">
      <div className="grid grid-cols-4 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;
          
          return (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};