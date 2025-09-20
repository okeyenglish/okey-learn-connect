import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Pin, PinOff } from "lucide-react";
import { cn } from "@/lib/utils";
import * as React from "react";

interface PinnableModalHeaderProps {
  title: string;
  isPinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
  onClose: () => void;
  children?: ReactNode;
}

// DialogContent без встроенного крестика для использования с PinnableModalHeader
export const PinnableDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
PinnableDialogContent.displayName = "PinnableDialogContent";

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