import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, Pin, PinOff } from "lucide-react";

interface PinnableModalHeaderProps {
  title: string;
  isPinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
  onClose: () => void;
  children?: ReactNode;
}

export const PinnableModalHeader = ({ 
  title, 
  isPinned, 
  onPin, 
  onUnpin, 
  onClose, 
  children 
}: PinnableModalHeaderProps) => {
  return (
    <DialogHeader>
      <div className="flex items-center justify-between">
        <DialogTitle className="text-lg font-medium flex-1 text-muted-foreground">
          {title}
          {children}
        </DialogTitle>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={isPinned ? onUnpin : onPin}
            title={isPinned ? "Открепить" : "Закрепить"}
          >
            {isPinned ? (
              <PinOff className="h-4 w-4 text-orange-600" />
            ) : (
              <Pin className="h-4 w-4 text-gray-600" />
            )}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </DialogHeader>
  );
};