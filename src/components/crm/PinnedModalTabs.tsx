import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, CheckSquare, FileText, User, Users } from "lucide-react";
import { PinnedModal } from "@/hooks/usePinnedModalsDB";

interface PinnedModalTabsProps {
  pinnedModals: PinnedModal[];
  onOpenModal: (id: string, type: string) => void;
  onUnpinModal: (id: string, type: string) => void;
}

const getModalIcon = (type: string) => {
  switch (type) {
    case 'task':
      return <CheckSquare className="h-3 w-3" />;
    case 'invoice':
      return <FileText className="h-3 w-3" />;
    case 'client':
      return <User className="h-3 w-3" />;
    case 'student':
      return <User className="h-3 w-3" />;
    case 'family':
      return <Users className="h-3 w-3" />;
    default:
      return null;
  }
};

const getModalColor = (type: string) => {
  switch (type) {
    case 'task':
      return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
    case 'invoice':
      return 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200';
    case 'client':
      return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
    case 'student':
      return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200';
    case 'family':
      return 'bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';
  }
};

export const PinnedModalTabs = ({ pinnedModals, onOpenModal, onUnpinModal }: PinnedModalTabsProps) => {
  if (pinnedModals.length === 0) return null;

  return (
    <div className="mb-1">
      <h3 className="text-xs font-medium text-muted-foreground mb-1">Закрепленные окна</h3>
      <div className="flex flex-wrap gap-1.5">
        {pinnedModals.map((modal) => (
          <Card
            key={`${modal.type}-${modal.id}`}
            className={`p-0 border rounded-full shadow-none ${getModalColor(modal.type)}`}
          >
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 px-2 py-1 h-6 leading-none hover:bg-transparent"
                onClick={() => onOpenModal(modal.id, modal.type)}
              >
                {getModalIcon(modal.type)}
                <span className="text-[11px] font-medium truncate max-w-[90px]">
                  {modal.title}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-1 hover:bg-muted rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnpinModal(modal.id, modal.type);
                }}
                aria-label="Открепить"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};