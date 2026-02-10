import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUnlinkMessenger } from "@/hooks/useUnlinkMessenger";

interface UnlinkMessengerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  messengerType: 'whatsapp' | 'telegram' | 'max';
  onSuccess?: () => void;
}

export const UnlinkMessengerDialog = ({
  open,
  onOpenChange,
  clientId,
  clientName,
  messengerType,
  onSuccess,
}: UnlinkMessengerDialogProps) => {
  const unlinkMutation = useUnlinkMessenger();

  const messengerLabel =
    messengerType === 'whatsapp' ? 'WhatsApp' :
    messengerType === 'telegram' ? 'Telegram' : 'MAX';

  const handleConfirm = async () => {
    await unlinkMutation.mutateAsync({ clientId, messengerType, clientName });
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Отвязать {messengerLabel}?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Будет создан новый клиент с именем «{clientName} ({messengerLabel})»,
              и все сообщения {messengerLabel} будут перенесены на него.
            </p>
            <p className="text-xs text-muted-foreground">
              Это действие нельзя отменить. У текущего клиента останется только номер телефона.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={unlinkMutation.isPending}>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={unlinkMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {unlinkMutation.isPending ? 'Отвязываем...' : 'Отвязать'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
