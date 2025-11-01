import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gamepad2, BookOpen } from 'lucide-react';
import { AppsHub } from './apps/AppsHub';
import { MaterialsHub } from './materials/MaterialsHub';
import { Teacher } from '@/hooks/useTeachers';

interface TeacherAIHubProps {
  teacher: Teacher;
}

export const TeacherAIHub = ({ teacher }: TeacherAIHubProps) => {
  return (
    <div className="w-full">
      <Tabs defaultValue="apps" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="apps">
            <Gamepad2 className="h-4 w-4 mr-2" />
            Apps
          </TabsTrigger>
          <TabsTrigger value="materials">
            <BookOpen className="h-4 w-4 mr-2" />
            Материалы
          </TabsTrigger>
        </TabsList>

        <TabsContent value="apps">
          <AppsHub teacher={teacher} />
        </TabsContent>

        <TabsContent value="materials">
          <MaterialsHub teacher={teacher} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
