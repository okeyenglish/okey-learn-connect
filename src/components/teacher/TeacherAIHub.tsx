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
  const [activeTab, setActiveTab] = React.useState('assistant');

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">AI-Ассистент преподавателя</h1>
        <p className="text-muted-foreground mt-2">
          Ваш персональный помощник для подготовки занятий и материалов
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="assistant">
            <Bot className="h-4 w-4 mr-2" />
            Ассистент
          </TabsTrigger>
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
          <TabsTrigger value="chat">
            <MessageSquare className="h-4 w-4 mr-2" />
            Чат
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assistant">
          <Card className="p-6">
            <TeacherAssistant teacher={teacher} />
          </Card>
        </TabsContent>

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
            onCreateNew={() => setActiveTab('generator')} 
          />
        </TabsContent>

        <TabsContent value="materials">
          <TeacherMaterials teacher={teacher} />
        </TabsContent>

        <TabsContent value="chat">
          <Card className="p-6">
            <TeacherChat teacher={teacher} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
