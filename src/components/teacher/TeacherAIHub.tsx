import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Bot, BookOpen, FileText, MessageSquare, Gamepad2 } from 'lucide-react';
import { TeacherAssistant } from './TeacherAssistant';
import { TeacherMaterials } from './TeacherMaterials';
import { TeacherChat } from './TeacherChat';
import { AppGeneratorChat } from './apps/AppGeneratorChat';
import { AppCatalog } from './apps/AppCatalog';
import { MyApps } from './apps/MyApps';
import { Teacher } from '@/hooks/useTeachers';

interface TeacherAIHubProps {
  teacher: Teacher;
}

export const TeacherAIHub = ({ teacher }: TeacherAIHubProps) => {
  const [activeAITab, setActiveAITab] = React.useState('generator');

  return (
    <div className="w-full">
      <Tabs value={activeAITab} onValueChange={setActiveAITab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generator">
            <Gamepad2 className="h-4 w-4 mr-2" />
            Генератор игр
          </TabsTrigger>
          <TabsTrigger value="catalog">
            <BookOpen className="h-4 w-4 mr-2" />
            Каталог
          </TabsTrigger>
          <TabsTrigger value="myapps">
            <FileText className="h-4 w-4 mr-2" />
            Мои приложения
          </TabsTrigger>
          <TabsTrigger value="materials">
            <BookOpen className="h-4 w-4 mr-2" />
            Материалы
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generator">
          <Card className="p-6">
            <AppGeneratorChat teacher={teacher} />
          </Card>
        </TabsContent>

        <TabsContent value="catalog">
          <AppCatalog teacher={teacher} />
        </TabsContent>

        <TabsContent value="myapps">
          <MyApps 
            teacher={teacher} 
            onCreateNew={() => setActiveAITab('generator')} 
          />
        </TabsContent>

        <TabsContent value="materials">
          <TeacherMaterials teacher={teacher} selectedBranchId="all" />
        </TabsContent>
      </Tabs>
    </div>
  );
};
