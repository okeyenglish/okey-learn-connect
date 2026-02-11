import { Forward } from 'lucide-react';

interface ForwardedMessageBubbleProps {
  content: string;
  isOwn: boolean;
  onOpenChat?: (clientId: string, messageId?: string) => void;
}

const parseForwardedMessage = (content: string) => {
  const metaMatch = content.match(/\[forwarded_from:([^:]+):([^\]]+)\]/);
  const clientId = metaMatch?.[1] || null;
  const messageId = metaMatch?.[2] || null;

  const nameMatch = content.match(/↩️ Переслано из диалога с (.+)/);
  const clientName = nameMatch?.[1]?.trim() || 'клиентом';

  const parts = content.split('---');
  let messageText = parts.length > 1 ? parts.slice(1).join('---').trim() : '';

  // Separate optional comment (💬 ...) from the forwarded text
  let comment = '';
  const commentMatch = messageText.match(/\n\n💬 (.+)$/s);
  if (commentMatch) {
    comment = commentMatch[1].trim();
    messageText = messageText.substring(0, messageText.length - commentMatch[0].length).trim();
  }

  return { clientId, messageId, clientName, messageText, comment };
};

export const isForwardedMessage = (content: string, messageType?: string) =>
  messageType === 'forwarded_message' || content.startsWith('[forwarded_from:');

export const ForwardedMessageBubble = ({ content, isOwn, onOpenChat }: ForwardedMessageBubbleProps) => {
  const { clientId, messageId, clientName, messageText, comment } = parseForwardedMessage(content);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (clientId && onOpenChat) {
      onOpenChat(clientId, messageId || undefined);
    }
  };

  return (
    <div className="space-y-1">
      {/* Comment above the forwarded block */}
      {comment && (
        <p className="text-[13.5px] leading-[18px] whitespace-pre-wrap">{comment}</p>
      )}

      {/* Forwarded message block - compact quote style */}
      <div
        className="cursor-pointer transition-opacity hover:opacity-80 active:scale-[0.99]"
        onClick={handleClick}
      >
        <div className={`border-l-2 ${isOwn ? 'border-primary-foreground/40' : 'border-primary/50'} pl-2.5 py-0.5`}>
          {/* Header with icon */}
          <div className={`flex items-center gap-1 text-[11px] ${
            isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'
          }`}>
            <Forward className="h-3 w-3" />
            <span>Переслано от</span>
            <span className={`font-semibold ${isOwn ? 'text-primary-foreground/80' : 'text-primary'}`}>{clientName}</span>
          </div>

          {/* Message text */}
          {messageText && (
            <p className={`text-[13px] leading-[17px] whitespace-pre-wrap mt-0.5 ${
              isOwn ? 'text-primary-foreground/90' : 'text-foreground/80'
            }`}>{messageText}</p>
          )}
        </div>
        
        {/* Footer hint */}
        <p className={`text-[10px] mt-1 ${
          isOwn ? 'text-primary-foreground/40' : 'text-muted-foreground/60'
        }`}>
          Нажмите, чтобы перейти →
        </p>
      </div>
    </div>
  );
};
