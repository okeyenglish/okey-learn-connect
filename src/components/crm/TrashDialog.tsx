import React from 'react';
import { Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TrashChatList } from './TrashChatList';
import { useDeletedChats } from '@/hooks/useDeletedChats';
import { Badge } from '@/components/ui/badge';

interface TrashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TrashDialog: React.FC<TrashDialogProps> = ({ open, onOpenChange }) => {
  const { data: deletedChats = [] } = useDeletedChats();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Корзина
            {deletedChats.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {deletedChats.length}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <TrashChatList onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
};

export default TrashDialog;
