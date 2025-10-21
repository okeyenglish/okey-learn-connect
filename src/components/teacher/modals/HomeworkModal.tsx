import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload } from 'lucide-react';

interface HomeworkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  groupId: string;
  existingHomework?: {
    text: string;
    files: any[];
  };
}

export const HomeworkModal = ({ 
  open, 
  onOpenChange, 
  sessionId, 
  groupId,
  existingHomework 
}: HomeworkModalProps) => {
  const [homeworkText, setHomeworkText] = useState(existingHomework?.text || '');
  const [showInPortal, setShowInPortal] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveHomework = useMutation({
    mutationFn: async () => {
      // Обновляем lesson_session с домашним заданием
      const { error } = await supabase
        .from('lesson_sessions')
        .update({
          notes: homeworkText, // Используем notes для хранения домашнего задания
        })
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson_sessions'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-journal-groups'] });
      toast({
        title: 'Домашнее задание сохранено',
        description: 'Задание успешно добавлено',
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error saving homework:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить домашнее задание',
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Домашнее задание</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="homework">Текст задания</Label>
            <Textarea
              id="homework"
              placeholder="Опишите домашнее задание..."
              value={homeworkText}
              onChange={(e) => setHomeworkText(e.target.value)}
              rows={6}
              className="mt-2"
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <Label htmlFor="show-portal" className="font-medium">
                Показать в личном кабинете студента
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Студенты увидят это задание в своем портале
              </p>
            </div>
            <Switch
              id="show-portal"
              checked={showInPortal}
              onCheckedChange={setShowInPortal}
            />
          </div>

          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">Прикрепить файлы</p>
            <p className="text-xs text-muted-foreground">
              PDF, изображения, документы (скоро)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button 
            onClick={() => saveHomework.mutate()} 
            disabled={saveHomework.isPending || !homeworkText.trim()}
          >
            {saveHomework.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
