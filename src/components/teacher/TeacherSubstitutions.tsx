import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCcw } from 'lucide-react';

export const TeacherSubstitutions = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCcw className="h-5 w-5" />
          Замены и отпуска
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-muted-foreground">
          <RefreshCcw className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">Раздел в разработке</p>
          <p className="text-sm">Здесь будут заявки на замены и календарь отсутствий</p>
        </div>
      </CardContent>
    </Card>
  );
};
