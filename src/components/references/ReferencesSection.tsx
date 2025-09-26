import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings } from 'lucide-react';
import { SubjectsTab } from './SubjectsTab';
import { ProficiencyLevelsTab } from './ProficiencyLevelsTab';
import { LearningFormatsTab } from './LearningFormatsTab';
import { AgeCategoriesTab } from './AgeCategoriesTab';
import { AbsenceReasonsTab } from './AbsenceReasonsTab';
import { ClassroomsTab } from './ClassroomsTab';

const ReferencesSection = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Настройки и справочники</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Управление справочниками</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="subjects" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="subjects">Предметы</TabsTrigger>
              <TabsTrigger value="levels">Уровни</TabsTrigger>
              <TabsTrigger value="formats">Форматы</TabsTrigger>
              <TabsTrigger value="ages">Возраст</TabsTrigger>
              <TabsTrigger value="absences">Пропуски</TabsTrigger>
              <TabsTrigger value="classrooms">Аудитории</TabsTrigger>
            </TabsList>

            <TabsContent value="subjects" className="mt-6">
              <SubjectsTab />
            </TabsContent>

            <TabsContent value="levels" className="mt-6">
              <ProficiencyLevelsTab />
            </TabsContent>

            <TabsContent value="formats" className="mt-6">
              <LearningFormatsTab />
            </TabsContent>

            <TabsContent value="ages" className="mt-6">
              <AgeCategoriesTab />
            </TabsContent>

            <TabsContent value="absences" className="mt-6">
              <AbsenceReasonsTab />
            </TabsContent>

            <TabsContent value="classrooms" className="mt-6">
              <ClassroomsTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferencesSection;