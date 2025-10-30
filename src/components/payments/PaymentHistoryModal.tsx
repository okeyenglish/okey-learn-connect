import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EntityAuditHistory } from '@/components/audit/EntityAuditHistory';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PaymentHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string;
}

export const PaymentHistoryModal = ({ 
  open, 
  onOpenChange, 
  paymentId 
}: PaymentHistoryModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>История платежа</DialogTitle>
          <DialogDescription>
            Все изменения и переходы статусов для этого платежа
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[600px]">
          <EntityAuditHistory
            entityType="payment"
            entityId={paymentId}
            title="История изменений платежа"
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
