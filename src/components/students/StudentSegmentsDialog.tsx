import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Bookmark, Trash2, Eye, Edit, Loader2 } from 'lucide-react';
import {
  useStudentSegments,
  useCreateStudentSegment,
  useUpdateStudentSegment,
  useDeleteStudentSegment,
  StudentSegment,
} from '@/hooks/useStudentSegments';

const segmentSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Название обязательно')
    .max(100, 'Название должно быть короче 100 символов'),
  description: z.string()
    .max(500, 'Описание должно быть короче 500 символов')
    .optional()
    .or(z.literal('')),
});

type SegmentFormData = z.infer<typeof segmentSchema>;

interface StudentSegmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFilters?: Record<string, any>;
  onApplySegment?: (filters: Record<string, any>) => void;
}

export function StudentSegmentsDialog({
  open,
  onOpenChange,
  currentFilters = {},
  onApplySegment,
}: StudentSegmentsDialogProps) {
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingSegment, setEditingSegment] = useState<StudentSegment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [segmentToDelete, setSegmentToDelete] = useState<StudentSegment | null>(null);

  const { data: segments, isLoading } = useStudentSegments();
  const createSegment = useCreateStudentSegment();
  const updateSegment = useUpdateStudentSegment();
  const deleteSegment = useDeleteStudentSegment();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SegmentFormData>({
    resolver: zodResolver(segmentSchema),
    defaultValues: {
      name: editingSegment?.name || '',
      description: editingSegment?.description || '',
    },
  });

  const handleCreateNew = () => {
    reset({ name: '', description: '' });
    setMode('create');
  };

  const handleEdit = (segment: StudentSegment) => {
    setEditingSegment(segment);
    reset({
      name: segment.name,
      description: segment.description || '',
    });
    setMode('edit');
  };

  const handleCancelEdit = () => {
    setMode('list');
    setEditingSegment(null);
    reset();
  };

  const onSubmit = async (data: SegmentFormData) => {
    if (mode === 'create') {
      await createSegment.mutateAsync({
        name: data.name,
        description: data.description,
        filters: currentFilters,
        is_global: false,
      });
      setMode('list');
      reset();
    } else if (mode === 'edit' && editingSegment) {
      await updateSegment.mutateAsync({
        id: editingSegment.id,
        name: data.name,
        description: data.description,
      });
      setMode('list');
      setEditingSegment(null);
      reset();
    }
  };

  const handleDelete = async () => {
    if (segmentToDelete) {
      await deleteSegment.mutateAsync(segmentToDelete.id);
      setDeleteDialogOpen(false);
      setSegmentToDelete(null);
    }
  };

  const handleApply = (segment: StudentSegment) => {
    if (onApplySegment) {
      onApplySegment(segment.filters);
      onOpenChange(false);
    }
  };

  const getFiltersSummary = (filters: Record<string, any>) => {
    const parts: string[] = [];
    if (filters.status) parts.push(`Статус: ${filters.status}`);
    if (filters.branch) parts.push(`Филиал: ${filters.branch}`);
    if (filters.age_min || filters.age_max) {
      parts.push(`Возраст: ${filters.age_min || '?'}-${filters.age_max || '?'}`);
    }
    if (filters.tags?.length > 0) {
      parts.push(`Теги: ${filters.tags.length}`);
    }
    return parts.length > 0 ? parts.join(' • ') : 'Без фильтров';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {mode === 'list' && 'Сохраненные сегменты'}
              {mode === 'create' && 'Создать новый сегмент'}
              {mode === 'edit' && 'Редактировать сегмент'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'list' && 'Управление сохраненными фильтрами учеников'}
              {mode === 'create' && 'Сохраните текущие фильтры для быстрого доступа'}
              {mode === 'edit' && 'Изменение названия и описания сегмента'}
            </DialogDescription>
          </DialogHeader>

          {mode === 'list' ? (
            <>
              <div className="flex justify-end mb-4">
                <Button onClick={handleCreateNew} size="sm">
                  <Bookmark className="h-4 w-4 mr-2" />
                  Сохранить текущие фильтры
                </Button>
              </div>

              <ScrollArea className="h-[400px] pr-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : segments && segments.length > 0 ? (
                  <div className="space-y-3">
                    {segments.map((segment) => (
                      <div
                        key={segment.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
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
                            <p className="text-xs text-muted-foreground">
                              {getFiltersSummary(segment.filters)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleApply(segment)}
                              title="Применить фильтры"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(segment)}
                              title="Редактировать"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => {
                                setSegmentToDelete(segment);
                                setDeleteDialogOpen(true);
                              }}
                              title="Удалить"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Bookmark className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground mb-2">Нет сохраненных сегментов</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Настройте фильтры и сохраните их для быстрого доступа
                    </p>
                    <Button onClick={handleCreateNew} size="sm">
                      Создать первый сегмент
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name">Название сегмента *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Например: Активные ученики филиала Окская"
                />
                {errors.name && (
                  <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Опциональное описание сегмента"
                  rows={3}
                />
                {errors.description && (
                  <p className="text-xs text-destructive mt-1">{errors.description.message}</p>
                )}
              </div>

              {mode === 'create' && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Текущие фильтры:</p>
                  <p className="text-xs text-muted-foreground">
                    {getFiltersSummary(currentFilters)}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={createSegment.isPending || updateSegment.isPending}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={createSegment.isPending || updateSegment.isPending}
                >
                  {(createSegment.isPending || updateSegment.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {mode === 'create' ? 'Создать' : 'Сохранить'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить сегмент?</AlertDialogTitle>
            <AlertDialogDescription>
              Сегмент "{segmentToDelete?.name}" будет удален. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
