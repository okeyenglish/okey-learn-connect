import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DashboardRouter } from "./DashboardRouter";

interface DashboardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DashboardModal = ({ open, onOpenChange }: DashboardModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-[95vh] p-0 gap-0">
        <ScrollArea className="h-full w-full">
          <div className="p-6">
            <DashboardRouter />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
