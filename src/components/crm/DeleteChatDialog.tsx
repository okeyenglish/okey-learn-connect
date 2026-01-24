import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DeleteChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatName: string;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export const DeleteChatDialog = ({
  open,
  onOpenChange,
  chatName,
  onConfirm,
  isDeleting = false,
}: DeleteChatDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Удалить чат
          </AlertDialogTitle>
          <AlertDialogDescription>
            Вы уверены, что хотите удалить чат с "{chatName}"? 
            <br /><br />
            Клиент будет деактивирован, но сообщения сохранятся в базе данных. 
            Вы сможете восстановить клиента через настройки.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
          <Button
            onClick={onConfirm}
            disabled={isDeleting}
            variant="destructive"
          >
            {isDeleting ? "Удаление..." : "Удалить"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
