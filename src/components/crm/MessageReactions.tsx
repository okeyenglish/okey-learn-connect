import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useGroupedReactions, useAddReaction, useRemoveReaction } from "@/hooks/useMessageReactions";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface MessageReactionsProps {
  messageId: string;
  showAddButton?: boolean;
  className?: string;
}

// Популярные эмодзи для быстрого выбора
const POPULAR_EMOJIS = ['👍', '👎', '❤️', '😂', '😮', '😢', '🔥', '👏'];

export const MessageReactions = ({ messageId, showAddButton = true, className }: MessageReactionsProps) => {
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  
  const { data: groupedReactions, isLoading } = useGroupedReactions(messageId);
  const addReactionMutation = useAddReaction();
  const removeReactionMutation = useRemoveReaction();

  const handleEmojiClick = async (emoji: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const myUserId = user?.id;

      // Проверяем, есть ли какая-то реакция текущего пользователя
      const myReactionGroup = groupedReactions?.find(r =>
        r.users.some(u => u.type === 'manager' && u.id === myUserId)
      );

      if (myReactionGroup && myReactionGroup.emoji === emoji) {
        // Нажали на тот же эмодзи — убираем реакцию
        await removeReactionMutation.mutateAsync(messageId);
      } else {
        // Ставим/меняем реакцию на выбранный эмодзи
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
      className
    )}>
      {/* Отображение существующих реакций */}
      {groupedReactions?.map((reaction) => (
        <TooltipProvider key={reaction.emoji}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "relative w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110",
                  "bg-background/95 backdrop-blur-sm border border-border/40 shadow-sm",
                  "hover:bg-background hover:shadow-md",
                  reaction.hasUserReaction && "bg-primary/15 border-primary/30"
                )}
                onClick={() => handleEmojiClick(reaction.emoji)}
                disabled={addReactionMutation.isPending || removeReactionMutation.isPending}
              >
                <span className="text-[10px] leading-none">{reaction.emoji}</span>
                {reaction.count > 1 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary text-primary-foreground text-[7px] rounded-full flex items-center justify-center font-medium leading-none">
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
              className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 bg-white/90 hover:bg-white text-muted-foreground hover:text-foreground border border-border/50 shadow-md opacity-0 group-hover:opacity-100"
              disabled={addReactionMutation.isPending}
            >
              <span className="text-xs">😊</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-1" align="start">
            <div className="grid grid-cols-4 gap-1">
              {POPULAR_EMOJIS.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-muted"
                  onClick={() => handleEmojiClick(emoji)}
                >
                  <span className="text-sm">{emoji}</span>
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};