import { useState } from 'react';
import { Building2, GraduationCap, Users } from 'lucide-react';

interface RoleTabsProps {
  onRoleChange?: (role: 'school' | 'teacher' | 'parent') => void;
}

const roleData = {
  school: {
    icon: Building2,
    label: 'Я школа',
    benefits: [
      '+40% конверсии обращений',
      '−20 часов рутины',
      'Прозрачная аналитика'
    ]
  },
  teacher: {
    icon: GraduationCap,
    label: 'Я преподаватель',
    benefits: [
      '−15 минут на занятие на учёт',
      'Прозрачная зарплата',
      'AI-ассистент генерирует задания'
    ]
  },
  parent: {
    icon: Users,
    label: 'Я родитель',
    benefits: [
      'Расписание и ДЗ в приложении',
      'Уведомления и оплата онлайн',
      'Прогресс ребёнка'
    ]
  }
};

export const RoleTabs = ({ onRoleChange }: RoleTabsProps) => {
  const [activeRole, setActiveRole] = useState<'school' | 'teacher' | 'parent'>('school');

  const handleRoleChange = (role: 'school' | 'teacher' | 'parent') => {
    setActiveRole(role);
    onRoleChange?.(role);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 justify-center">
        {Object.entries(roleData).map(([key, data]) => {
          const Icon = data.icon;
          const isActive = activeRole === key;
          
          return (
            <button
              key={key}
              onClick={() => handleRoleChange(key as 'school' | 'teacher' | 'parent')}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
                ${isActive 
                  ? 'bg-accent text-accent-foreground shadow-lg scale-105' 
                  : 'bg-card text-muted-foreground hover:bg-secondary'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              {data.label}
            </button>
          );
        })}
      </div>
      
      <div className="grid gap-3 md:grid-cols-3">
        {roleData[activeRole].benefits.map((benefit, index) => (
          <div
            key={index}
            className="flex items-center gap-2 p-4 bg-card rounded-lg border border-border"
          >
            <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
            <span className="text-sm text-foreground">{benefit}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
