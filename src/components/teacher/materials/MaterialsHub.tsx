import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Sparkles, Image } from 'lucide-react';
import { Teacher } from '@/hooks/useTeachers';
import { TeacherMaterials } from '../TeacherMaterials';
import { MaterialsGenerator } from './MaterialsGenerator';
import { ImageGenerator } from './ImageGenerator';

interface MaterialsHubProps {
  teacher: Teacher;
}

export const MaterialsHub = ({ teacher }: MaterialsHubProps) => {
  return (
    <div className="space-y-6">
      {/* Генераторы AI */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" />
            Генерация с AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="text" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text">
                <Sparkles className="h-4 w-4 mr-2" />
                Текст
              </TabsTrigger>
              <TabsTrigger value="image">
                <Image className="h-4 w-4 mr-2" />
                Изображения
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text">
              <MaterialsGenerator teacher={teacher} />
            </TabsContent>

            <TabsContent value="image">
              <ImageGenerator teacher={teacher} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Библиотека материалов */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Моя библиотека
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TeacherMaterials teacher={teacher} selectedBranchId="all" />
        </CardContent>
      </Card>
    </div>
  );
};
