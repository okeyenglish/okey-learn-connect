import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { 
  GroupedStaffReaction, 
  StaffReaction, 
  groupReactions, 
  useAddStaffReaction, 
  useRemoveStaffReaction 
} from "@/hooks/useStaffMessageReactions";

const EMOJIS = ['👍', '❤️', '🔥', '😂', '😮', '👎', '👏', '🎉'];

interface StaffMessageReactionsProps {
  messageId: string;
  reactions: StaffReaction[];
  isOwn: boolean;
  className?: string;
}

export const StaffMessageReactions = ({ messageId, reactions, isOwn, className }: StaffMessageReactionsProps) => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const addReaction = useAddStaffReaction();
  const removeReaction = useRemoveStaffReaction();

  const grouped = groupReactions(reactions, user?.id);

  const handleEmoji = async (emoji: string) => {
    try {
      const myReaction = grouped.find(g => g.isOwn);
      if (myReaction && myReaction.emoji === emoji) {
        await removeReaction.mutateAsync(messageId);
      } else {
        await addReaction.mutateAsync({ messageId, emoji });
      }
      setOpen(false);
    } catch (e) {
      console.error('Reaction error:', e);
    }
  };

  const isPending = addReaction.isPending || removeReaction.isPending;

  return (
    <div className={cn("flex items-center gap-0.5 flex-wrap", className)}>
      {/* Existing reactions */}
      {grouped.map((r) => (
        <button
          key={r.emoji}
          className={cn(
            "h-5 px-1.5 rounded-full flex items-center gap-0.5 text-[11px] transition-all hover:scale-105",
            "bg-background/90 border border-border/40 shadow-sm",
            r.isOwn && "bg-primary/15 border-primary/30"
          )}
          onClick={() => handleEmoji(r.emoji)}
          disabled={isPending}
        >
          <span className="text-[11px] leading-none">{r.emoji}</span>
          {r.count > 1 && <span className="text-[10px] text-muted-foreground font-medium">{r.count}</span>}
        </button>
      ))}

      {/* Add reaction button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="h-5 w-5 rounded-full flex items-center justify-center transition-all hover:scale-110 bg-background/80 hover:bg-background border border-border/40 shadow-sm opacity-0 group-hover:opacity-100"
            disabled={isPending}
          >
            <span className="text-[11px]">😊</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-1" align={isOwn ? "end" : "start"} side="top">
          <div className="grid grid-cols-4 gap-0.5">
            {EMOJIS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-muted"
                onClick={() => handleEmoji(emoji)}
              >
                <span className="text-sm">{emoji}</span>
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
