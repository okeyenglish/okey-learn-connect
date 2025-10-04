import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { X, CheckSquare, FileText, User, Users, MoreHorizontal } from "lucide-react";
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

  const MAX_VISIBLE_TABS = 5;
  const visibleModals = pinnedModals.slice(0, MAX_VISIBLE_TABS);
  const hiddenModals = pinnedModals.slice(MAX_VISIBLE_TABS);

  return (
    <div className="flex items-center">
      <div className="flex flex-wrap gap-1.5 items-center">
        {visibleModals.map((modal) => (
          <Card
            key={`${modal.type}-${modal.id}`}
            className={`p-0 border rounded shadow-none ${getModalColor(modal.type)}`}
          >
            <div className="flex items-center h-8">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 px-2 py-1 h-8 leading-none hover:bg-transparent rounded-l rounded-r-none"
                onClick={() => onOpenModal(modal.id, modal.type)}
              >
                {getModalIcon(modal.type)}
                <span className="text-xs font-medium truncate max-w-[90px]">
                  {modal.title}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-4 p-0 hover:bg-black/5 rounded-r rounded-l-none border-l border-l-border/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnpinModal(modal.id, modal.type);
                }}
                aria-label="Открепить"
              >
                <X className="h-2 w-2 opacity-40 hover:opacity-70 transition-opacity" />
              </Button>
            </div>
          </Card>
        ))}
        
        {hiddenModals.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 gap-1 bg-muted hover:bg-muted/80"
              >
                <MoreHorizontal className="h-3 w-3" />
                <span className="text-xs">+{hiddenModals.length}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {hiddenModals.map((modal) => (
                <DropdownMenuItem
                  key={`${modal.type}-${modal.id}`}
                  className="flex items-center justify-between gap-2"
                  onClick={() => onOpenModal(modal.id, modal.type)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`p-1 rounded ${getModalColor(modal.type)}`}>
                      {getModalIcon(modal.type)}
                    </div>
                    <span className="text-sm truncate">{modal.title}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnpinModal(modal.id, modal.type);
                    }}
                    aria-label="Открепить"
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </Button>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};