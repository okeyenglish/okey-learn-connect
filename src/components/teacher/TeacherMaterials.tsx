import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const TeacherMaterials = () => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Материалы курсов
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-lg font-medium mb-2">Материалы курсов</p>
          <p className="text-sm text-muted-foreground mb-6">
            Планы уроков, файлы, ссылки и шаблоны домашних заданий
          </p>
          <Button onClick={() => navigate('/course-details/kids-box-1')}>
            Перейти к материалам
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
