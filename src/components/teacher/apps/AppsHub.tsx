import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gamepad2, BookOpen, FileText } from 'lucide-react';
import { AppGeneratorChat } from './AppGeneratorChat';
import { AppCatalog } from './AppCatalog';
import { MyApps } from './MyApps';
import { Teacher } from '@/hooks/useTeachers';

interface AppsHubProps {
  teacher: Teacher;
}

export const AppsHub = ({ teacher }: AppsHubProps) => {
  const [activeTab, setActiveTab] = React.useState('myapps');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gamepad2 className="h-5 w-5" />
          Приложения
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="myapps">
              <FileText className="h-4 w-4 mr-2" />
              Мои приложения
            </TabsTrigger>
            <TabsTrigger value="generator">
              <Gamepad2 className="h-4 w-4 mr-2" />
              Создать новое
            </TabsTrigger>
            <TabsTrigger value="catalog">
              <BookOpen className="h-4 w-4 mr-2" />
              Каталог
            </TabsTrigger>
          </TabsList>

          <TabsContent value="myapps">
            <MyApps 
              teacher={teacher} 
              onCreateNew={() => setActiveTab('generator')} 
            />
          </TabsContent>

          <TabsContent value="generator">
            <AppGeneratorChat teacher={teacher} />
          </TabsContent>

          <TabsContent value="catalog">
            <AppCatalog teacher={teacher} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
