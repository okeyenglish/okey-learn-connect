import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gamepad2, Sparkles, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AppGeneratorChat } from './AppGeneratorChat';
import { AppCatalog } from './AppCatalog';
import { MyApps } from './MyApps';
import { Teacher } from '@/hooks/useTeachers';

interface AppsHubProps {
  teacher: Teacher;
}

export const AppsHub = ({ teacher }: AppsHubProps) => {
  const [generatorOpen, setGeneratorOpen] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            Приложения
          </CardTitle>
          <Dialog open={generatorOpen} onOpenChange={setGeneratorOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Sparkles className="h-4 w-4" />
                Создать с AI
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Генератор приложений AI</DialogTitle>
              </DialogHeader>
              <AppGeneratorChat teacher={teacher} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Мои приложения */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-brand" />
            Мои приложения
          </h3>
          <MyApps 
            teacher={teacher} 
            onCreateNew={() => setGeneratorOpen(true)} 
          />
        </div>

        {/* Каталог шаблонов */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" />
            Каталог шаблонов
          </h3>
          <AppCatalog teacher={teacher} />
        </div>
      </CardContent>
    </Card>
  );
};
