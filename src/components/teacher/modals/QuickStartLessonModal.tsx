import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlayCircle, Video, Users, Clock } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';

interface QuickStartLessonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: {
    id: string;
    group_name?: string;
    student_name?: string;
    lesson_date: string;
    start_time: string;
    online_link?: string;
    type: 'group' | 'individual';
  };
}

export const QuickStartLessonModal = ({ 
  open, 
  onOpenChange, 
  session 
}: QuickStartLessonModalProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const startLesson = useMutation({
    mutationFn: async (action: 'start' | 'start_online') => {
      console.log('Starting lesson:', { sessionId: session.id, type: session.type, action });
      
      const table = session.type === 'group' ? 'lesson_sessions' : 'individual_lesson_sessions';
      console.log('Using table:', table);
      
      const { data, error } = await supabase
        .from(table as any)
        .update({ 
          status: 'in_progress',
        })
        .eq('id', session.id)
        .select();

      console.log('Update result:', { data, error });

      if (error) {
        console.error('Update error:', error);
        throw new Error(`Failed to start lesson: ${error.message}`);
      }

      if (action === 'start_online' && session.online_link) {
        window.open(session.online_link, '_blank');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson_sessions'] });
      queryClient.invalidateQueries({ queryKey: ['individual_lesson_sessions'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-schedule'] });
      toast({
        title: 'Занятие начато',
        description: 'Статус занятия обновлен',
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Error starting lesson:', error);
      const errorMessage = error?.message || 'Не удалось начать занятие';
      toast({
        title: 'Ошибка',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Начать занятие</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {session.group_name || session.student_name}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{session.lesson_date} в {session.start_time}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => startLesson.mutate('start')}
              disabled={startLesson.isPending}
            >
              <PlayCircle className="h-5 w-5 mr-2" />
              Начать очное занятие
            </Button>

            {session.online_link && (
              <Button 
                className="w-full" 
                size="lg"
                variant="outline"
                onClick={() => startLesson.mutate('start_online')}
                disabled={startLesson.isPending}
              >
                <Video className="h-5 w-5 mr-2" />
                Начать онлайн-занятие
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            После начала занятия статус автоматически обновится
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
