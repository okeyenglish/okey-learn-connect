import React, { useState } from 'react';
import { Trash2, RotateCcw, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useDeletedChats, useRestoreChat, usePermanentDeleteChat, DeletedChat } from '@/hooks/useDeletedChats';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TrashChatListProps {
  onClose?: () => void;
}

export const TrashChatList: React.FC<TrashChatListProps> = ({ onClose }) => {
  const { data: deletedChats = [], isLoading } = useDeletedChats();
  const restoreMutation = useRestoreChat();
  const permanentDeleteMutation = usePermanentDeleteChat();
  
  const [confirmDelete, setConfirmDelete] = useState<DeletedChat | null>(null);

  const handleRestore = (chat: DeletedChat) => {
    restoreMutation.mutate(chat.id);
  };

  const handlePermanentDelete = () => {
    if (confirmDelete) {
      permanentDeleteMutation.mutate(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (deletedChats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Trash2 className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">Корзина пуста</p>
        <p className="text-sm">Удалённые чаты будут отображаться здесь</p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-[400px]">
        <div className="space-y-2 p-1">
          {deletedChats.map((chat) => (
            <TrashChatItem
              key={chat.id}
              chat={chat}
              onRestore={() => handleRestore(chat)}
              onDelete={() => setConfirmDelete(chat)}
              isRestoring={restoreMutation.isPending && restoreMutation.variables === chat.id}
            />
          ))}
        </div>
      </ScrollArea>

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Удалить навсегда?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Чат с "{confirmDelete?.name}" и все его сообщения будут удалены безвозвратно. 
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {permanentDeleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Удалить навсегда
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

interface TrashChatItemProps {
  chat: DeletedChat;
  onRestore: () => void;
  onDelete: () => void;
  isRestoring: boolean;
}

const TrashChatItem: React.FC<TrashChatItemProps> = ({
  chat,
  onRestore,
  onDelete,
  isRestoring,
}) => {
  const deletedAgo = chat.updated_at
    ? formatDistanceToNow(new Date(chat.updated_at), { addSuffix: true, locale: ru })
    : '';

  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border",
      "bg-card hover:bg-accent/50 transition-colors"
    )}>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{chat.name || 'Без имени'}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {chat.phone && <span>{chat.phone}</span>}
          {chat.branch && <span>• {chat.branch}</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Удалён {deletedAgo}
        </p>
      </div>
      
      <div className="flex items-center gap-2 ml-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRestore}
          disabled={isRestoring}
          className="h-8"
        >
          {isRestoring ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          <span className="ml-1 hidden sm:inline">Восстановить</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default TrashChatList;
