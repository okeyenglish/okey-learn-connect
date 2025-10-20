import { useState } from 'react';
import { 
  useGroupHistory, 
  useAddManualNote,
  formatEventDescription,
  getChangedByName 
} from '@/hooks/useGroupHistory';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Calendar,
  UserPlus,
  UserMinus,
  Edit,
  Trash2,
  Clock,
  RefreshCw,
  StickyNote,
  CheckCircle2,
  AlertCircle,
  Info
} from 'lucide-react';

interface GroupHistoryTabProps {
  groupId: string;
}

export const GroupHistoryTab = ({ groupId }: GroupHistoryTabProps) => {
  const { data: history, isLoading } = useGroupHistory(groupId);
  const addNote = useAddManualNote();
  const [newNote, setNewNote] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    await addNote.mutateAsync({
      groupId,
      note: newNote
    });

    setNewNote('');
    setShowAddNote(false);
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'created':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'updated':
        return <Edit className="h-5 w-5 text-blue-600" />;
      case 'deleted':
        return <Trash2 className="h-5 w-5 text-red-600" />;
      case 'student_added':
        return <UserPlus className="h-5 w-5 text-green-600" />;
      case 'student_removed':
        return <UserMinus className="h-5 w-5 text-orange-600" />;
      case 'student_status_changed':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'status_changed':
        return <RefreshCw className="h-5 w-5 text-purple-600" />;
      case 'schedule_changed':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'teacher_changed':
        return <UserPlus className="h-5 w-5 text-indigo-600" />;
      case 'auto_sync':
        return <RefreshCw className="h-5 w-5 text-cyan-600" />;
      case 'manual_note':
        return <StickyNote className="h-5 w-5 text-amber-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'created':
        return 'bg-green-50 border-green-200';
      case 'updated':
        return 'bg-blue-50 border-blue-200';
      case 'deleted':
        return 'bg-red-50 border-red-200';
      case 'student_added':
        return 'bg-green-50 border-green-200';
      case 'student_removed':
        return 'bg-orange-50 border-orange-200';
      case 'student_status_changed':
        return 'bg-yellow-50 border-yellow-200';
      case 'status_changed':
        return 'bg-purple-50 border-purple-200';
      case 'schedule_changed':
        return 'bg-blue-50 border-blue-200';
      case 'teacher_changed':
        return 'bg-indigo-50 border-indigo-200';
      case 'auto_sync':
        return 'bg-cyan-50 border-cyan-200';
      case 'manual_note':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка истории...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Кнопка добавления заметки */}
      <div className="flex justify-end">
        {!showAddNote ? (
          <Button
            variant="outline"
            onClick={() => setShowAddNote(true)}
            className="gap-2"
          >
            <StickyNote className="h-4 w-4" />
            Добавить заметку
          </Button>
        ) : (
          <Card className="w-full p-4 space-y-3">
            <Textarea
              placeholder="Введите текст заметки..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddNote(false);
                  setNewNote('');
                }}
              >
                Отмена
              </Button>
              <Button
                onClick={handleAddNote}
                disabled={!newNote.trim() || addNote.isPending}
              >
                {addNote.isPending ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Список событий */}
      <ScrollArea className="h-[600px]">
        {!history || history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              История пуста
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              События будут отображаться здесь
            </p>
          </div>
        ) : (
          <div className="space-y-4 pr-4">
            {history.map((event, index) => (
              <div key={event.id}>
                <Card 
                  className={`p-4 border ${getEventColor(event.event_type)} transition-all hover:shadow-md`}
                >
                  <div className="flex items-start gap-4">
                    {/* Иконка события */}
                    <div className="flex-shrink-0 mt-1">
                      {getEventIcon(event.event_type)}
                    </div>

                    {/* Содержимое */}
                    <div className="flex-1 min-w-0">
                      {/* Описание события */}
                      <div className="font-medium text-foreground mb-1">
                        {formatEventDescription(event)}
                      </div>

                      {/* Метаданные */}
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(event.created_at), 'dd MMM yyyy, HH:mm', { locale: ru })}
                        </div>
                        <Separator orientation="vertical" className="h-4" />
                        <div>
                          {getChangedByName(event)}
                        </div>
                      </div>

                      {/* Детали события (если есть) */}
                      {event.event_type === 'manual_note' && event.event_data.note && (
                        <div className="mt-3 p-3 bg-white/50 rounded-md text-sm">
                          {event.event_data.note}
                        </div>
                      )}
                      
                      {event.event_type === 'updated' && event.event_data.changes && (
                        <div className="mt-3 space-y-1">
                          {Object.entries(event.event_data.changes).map(([key, value]) => (
                            <Badge key={key} variant="secondary" className="text-xs">
                              {key}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
                
                {index < history.length - 1 && (
                  <div className="flex items-center justify-center my-2">
                    <div className="w-0.5 h-4 bg-border"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
