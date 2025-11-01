import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gamepad2, Sparkles } from 'lucide-react';
import { AppGeneratorChat } from './AppGeneratorChat';
import { AppCatalog } from './AppCatalog';
import { MyApps } from './MyApps';
import { Teacher } from '@/hooks/useTeachers';

interface AppsHubProps {
  teacher: Teacher;
}

export const AppsHub = ({ teacher }: AppsHubProps) => {
  return (
    <div className="space-y-6">
      {/* Генератор AI */}
      <Card>
        <CardContent className="pt-6">
          <AppGeneratorChat teacher={teacher} />
        </CardContent>
      </Card>

      {/* Мои приложения */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            Мои приложения
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MyApps 
            teacher={teacher} 
            onCreateNew={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
          />
        </CardContent>
      </Card>

      {/* Каталог шаблонов */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" />
            Каталог шаблонов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AppCatalog teacher={teacher} />
        </CardContent>
      </Card>
    </div>
  );
};
