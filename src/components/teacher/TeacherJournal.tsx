import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, User, Calendar, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

export const TeacherJournal = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Журнал
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="groups" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Группы
            </TabsTrigger>
            <TabsTrigger value="individuals" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Индивидуальные
            </TabsTrigger>
          </TabsList>

          <TabsContent value="groups">
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium mb-2">Журнал групповых занятий</p>
              <p className="text-sm text-muted-foreground mb-4">
                Посещаемость, оценки и домашние задания для ваших групп
              </p>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Просмотреть группы
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="individuals">
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium mb-2">Журнал индивидуальных занятий</p>
              <p className="text-sm text-muted-foreground mb-4">
                История уроков с индивидуальными учениками
              </p>
              <Button variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Просмотреть занятия
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
