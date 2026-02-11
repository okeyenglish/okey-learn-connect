import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, User } from 'lucide-react';

interface ClientCardBubbleProps {
  content: string;
  isOwn: boolean;
  onOpenChat?: (clientId: string) => void;
  hideComment?: boolean;
}

/** Parse client card encoded as: [client_card:UUID]\n📋 ... */
export const parseClientCard = (content: string) => {
  const idMatch = content.match(/\[client_card:([a-f0-9-]+)\]/);
  const nameMatch = content.match(/👤\s*(.+)/);
  const branchMatch = content.match(/📍\s*(.+)/);
  const phoneMatch = content.match(/📞\s*(.+)/);
  const commentMatch = content.match(/💬\s*(.+)/);

  if (!nameMatch) return null;

  return {
    clientId: idMatch?.[1] || null,
    name: nameMatch[1].trim(),
    branch: branchMatch?.[1]?.trim() || null,
    phone: phoneMatch?.[1]?.trim() || null,
    comment: commentMatch?.[1]?.trim() || null,
  };
};

export const isClientCardMessage = (content: string, messageType?: string) =>
  messageType === 'client_card' || (content.includes('📋 Карточка клиента') && content.includes('👤'));

export const ClientCardBubble = ({ content, isOwn, onOpenChat, hideComment }: ClientCardBubbleProps) => {
  const card = parseClientCard(content);

  if (!card) return null;

  const initials = card.name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('[ClientCardBubble] clicked, card:', card);
    if (card.clientId) {
      if (onOpenChat) {
        onOpenChat(card.clientId);
      } else {
        window.location.href = `/?clientId=${card.clientId}`;
      }
    }
  };

  return (
    <div className="space-y-1.5">
      <div
        onClick={handleClick}
        onPointerUp={handleClick}
        role="button"
        tabIndex={0}
        style={{ pointerEvents: 'auto' }}
        className={`flex items-center gap-3 w-full text-left p-2.5 rounded-xl transition-all relative z-50 ${
          card.clientId ? 'cursor-pointer hover:opacity-80 active:scale-[0.98]' : 'cursor-default'
        } ${isOwn ? 'bg-primary-foreground/15' : 'bg-background/60'}`}
      >
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="bg-[hsl(var(--avatar-blue))] text-[hsl(var(--text-primary))] text-sm font-semibold">
            {initials || <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{card.name}</p>
          {card.branch && (
            <p className={`text-xs flex items-center gap-0.5 truncate ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
              <MapPin className="h-3 w-3 shrink-0" />
              {card.branch}
            </p>
          )}
          {card.phone && (
            <p className={`text-xs truncate ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
              {card.phone}
            </p>
          )}
        </div>
      </div>
      {!hideComment && card.comment && (
        <p className="text-sm whitespace-pre-wrap">{card.comment}</p>
      )}
    </div>
  );
};
