import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, TrendingUp, TrendingDown, Eye, Bookmark } from 'lucide-react';
import { useStudentSegments } from '@/hooks/useStudentSegments';
import { useStudentsWithFilters } from '@/hooks/useStudentsWithFilters';
import { useState } from 'react';
import { StudentSegmentsDialog } from './StudentSegmentsDialog';

export function SegmentStatistics() {
  const { data: segments, isLoading } = useStudentSegments();
  const [segmentsDialogOpen, setSegmentsDialogOpen] = useState(false);

  // Получаем статистику для каждого сегмента
  const segmentsWithStats = segments?.map(segment => {
    const { data: students } = useStudentsWithFilters(segment.filters);
    return {
      ...segment,
      studentCount: students?.length || 0,
    };
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Статистика сегментов</CardTitle>
          <CardDescription>Загрузка данных...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!segments || segments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Статистика сегментов</CardTitle>
          <CardDescription>
            Создайте сегменты для отслеживания статистики по группам учеников
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Bookmark className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">
              Нет сохраненных сегментов для анализа
            </p>
            <Button onClick={() => setSegmentsDialogOpen(true)}>
              <Bookmark className="h-4 w-4 mr-2" />
              Создать сегмент
            </Button>
          </div>
        </CardContent>
        <StudentSegmentsDialog
          open={segmentsDialogOpen}
          onOpenChange={setSegmentsDialogOpen}
          currentFilters={{}}
        />
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Статистика сегментов
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSegmentsDialogOpen(true)}
            >
              <Bookmark className="h-4 w-4 mr-2" />
              Управление
            </Button>
          </CardTitle>
          <CardDescription>
            Количество учеников в каждом сохраненном сегменте
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {segmentsWithStats?.map((segment) => (
                <div
                  key={segment.id}
                  className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-base truncate">
                          {segment.name}
                        </h4>
                        {segment.is_global && (
                          <Badge variant="secondary" className="text-xs">
                            Общий
                          </Badge>
                        )}
                      </div>
                      {segment.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {segment.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-primary">
                            {segment.studentCount}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {segment.studentCount === 1
                              ? 'ученик'
                              : segment.studentCount < 5
                              ? 'ученика'
                              : 'учеников'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <StudentSegmentsDialog
        open={segmentsDialogOpen}
        onOpenChange={setSegmentsDialogOpen}
        currentFilters={{}}
      />
    </>
  );
}
