import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Sparkles } from 'lucide-react';
import { Teacher } from '@/hooks/useTeachers';
import { TeacherMaterials } from '../TeacherMaterials';
import { MaterialsGenerator } from './MaterialsGenerator';

interface MaterialsHubProps {
  teacher: Teacher;
}

export const MaterialsHub = ({ teacher }: MaterialsHubProps) => {
  return (
    <div className="space-y-6">
      {/* Генератор материалов AI */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" />
            Генерация материалов с AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MaterialsGenerator teacher={teacher} />
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
