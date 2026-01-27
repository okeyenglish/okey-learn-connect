import React from 'react';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowRightLeft, FileText } from 'lucide-react';
import type { TakeoverRequest } from '@/hooks/useChatTakeover';

interface TakeoverRequestDialogProps {
  request: TakeoverRequest | null;
  draftText: string;
  onApprove: (draftText: string) => void;
  onDecline: () => void;
}

export const TakeoverRequestDialog: React.FC<TakeoverRequestDialogProps> = ({
  request,
  draftText,
  onApprove,
  onDecline,
}) => {
  if (!request) return null;

  const initials = request.requesterName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <AlertDialog open={!!request}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Запрос на перехват чата
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{request.requesterName}</p>
                  <p className="text-sm text-muted-foreground">
                    хочет взять чат с <span className="font-medium">{request.clientName}</span>
                  </p>
                </div>
              </div>

              {draftText && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-1">
                    <FileText className="h-4 w-4" />
                    <span className="text-xs font-medium">Ваш черновик будет передан:</span>
                  </div>
                  <p className="text-sm text-amber-800 dark:text-amber-300 line-clamp-3">
                    "{draftText}"
                  </p>
                </div>
              )}

              <p className="text-sm">
                Если вы согласитесь, ваш текущий черновик будет передан коллеге, 
                и он сможет продолжить общение с клиентом.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDecline}>
            Отказать
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => onApprove(draftText)}>
            Передать чат
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default TakeoverRequestDialog;
