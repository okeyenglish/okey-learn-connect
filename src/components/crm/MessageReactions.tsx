import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useGroupedReactions, useAddReaction, useRemoveReaction } from "@/hooks/useMessageReactions";
import { cn } from "@/lib/utils";

interface MessageReactionsProps {
  messageId: string;
  showAddButton?: boolean;
  className?: string;
  showOnHover?: boolean;
}

// Популярные эмодзи для быстрого выбора
const POPULAR_EMOJIS = ['👍', '👎', '❤️', '😂', '😮', '😢', '🔥', '👏'];

export const MessageReactions = ({ messageId, showAddButton = true, className, showOnHover = false }: MessageReactionsProps) => {
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  
  const { groupedReactions, isLoading } = useGroupedReactions(messageId);
  const addReactionMutation = useAddReaction();
  const removeReactionMutation = useRemoveReaction();

  const handleEmojiClick = async (emoji: string) => {
    try {
      // Проверяем, есть ли уже реакция пользователя с этим эмодзи
      const existingReaction = groupedReactions?.find(r => 
        r.emoji === emoji && r.hasUserReaction
      );

      if (existingReaction) {
        // Если реакция уже есть - удаляем её
        await removeReactionMutation.mutateAsync(messageId);
      } else {
        // Если реакции нет - добавляем
        await addReactionMutation.mutateAsync({
          messageId,
          emoji,
        });
      }
      
      setIsEmojiPickerOpen(false);
    } catch (error) {
      console.error('Error handling emoji click:', error);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-1 flex-wrap", 
      className,
      showOnHover && "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
    )}>
      {/* Отображение существующих реакций */}
      {groupedReactions?.map((reaction) => (
        <TooltipProvider key={reaction.emoji}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110",
                  "bg-muted/80 backdrop-blur-sm border border-border/50 shadow-sm",
                  "hover:bg-muted hover:shadow-md",
                  reaction.hasUserReaction && "bg-primary/20 border-primary/40 shadow-primary/20"
                )}
                onClick={() => handleEmojiClick(reaction.emoji)}
                disabled={addReactionMutation.isPending || removeReactionMutation.isPending}
              >
                <span className="text-base">{reaction.emoji}</span>
                {reaction.count > 1 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-medium">
                    {reaction.count}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                {reaction.users.map((user, index) => (
                  <div key={user.id}>
                    {user.name}
                    {index < reaction.users.length - 1 && ', '}
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}

      {/* Кнопка добавления реакции */}
      {showAddButton && (
        <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
          <PopoverTrigger asChild>
            <button
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50"
              disabled={addReactionMutation.isPending}
            >
              <span className="text-sm">😊</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-4 gap-1">
              {POPULAR_EMOJIS.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-muted"
                  onClick={() => handleEmojiClick(emoji)}
                >
                  <span className="text-base">{emoji}</span>
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};