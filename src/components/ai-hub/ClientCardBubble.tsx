import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ClientCardBubbleProps {
  content: string;
  isOwn: boolean;
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

export const isClientCardMessage = (content: string) =>
  content.includes('📋 Карточка клиента') && content.includes('👤');

export const ClientCardBubble = ({ content, isOwn }: ClientCardBubbleProps) => {
  const navigate = useNavigate();
  const card = parseClientCard(content);

  if (!card) return null;

  const initials = card.name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleClick = () => {
    if (card.clientId) {
      navigate(`/crm/chats?client=${card.clientId}`);
    }
  };

  return (
    <div className="space-y-1.5">
      <button
        onClick={handleClick}
        disabled={!card.clientId}
        className={`flex items-center gap-3 w-full text-left p-2.5 rounded-xl transition-all ${
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
      </button>
      {card.comment && (
        <p className="text-sm whitespace-pre-wrap">{card.comment}</p>
      )}
    </div>
  );
};
