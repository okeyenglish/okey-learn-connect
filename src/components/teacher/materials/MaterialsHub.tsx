import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Sparkles, Library } from 'lucide-react';
import { Teacher } from '@/hooks/useTeachers';
import { TeacherMaterials } from '../TeacherMaterials';
import { MaterialsGenerator } from './MaterialsGenerator';

interface MaterialsHubProps {
  teacher: Teacher;
}

export const MaterialsHub = ({ teacher }: MaterialsHubProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Материалы
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="library" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="library">
              <Library className="h-4 w-4 mr-2" />
              Мои материалы
            </TabsTrigger>
            <TabsTrigger value="generator">
              <Sparkles className="h-4 w-4 mr-2" />
              Генерация AI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library">
            <TeacherMaterials teacher={teacher} selectedBranchId="all" />
          </TabsContent>

          <TabsContent value="generator">
            <MaterialsGenerator teacher={teacher} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
