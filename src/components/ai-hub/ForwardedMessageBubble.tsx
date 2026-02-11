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
    <div className="space-y-1.5">
      {/* Comment above the forwarded block */}
      {comment && (
        <p className="text-sm whitespace-pre-wrap">{comment}</p>
      )}

      {/* Forwarded message block */}
      <div
        className={`rounded-xl overflow-hidden cursor-pointer transition-all hover:opacity-90 active:scale-[0.98] ${
          isOwn
            ? 'bg-primary text-primary-foreground'
            : 'bg-accent text-accent-foreground'
        }`}
        onClick={handleClick}
      >
        {/* Header */}
        <div className={`flex items-center gap-1.5 px-3 pt-2.5 pb-1 text-xs font-medium ${
          isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
        }`}>
          <Forward className="h-3 w-3" />
          <span>Переслано от</span>
        </div>

        {/* Client name */}
        <div className={`px-3 pb-1 text-xs font-semibold ${
          isOwn ? 'text-primary-foreground/90' : 'text-primary'
        }`}>
          {clientName}
        </div>

        {/* Message text */}
        <div className="px-3 pb-2">
          <p className="text-sm whitespace-pre-wrap">{messageText}</p>
        </div>

        {/* Footer hint */}
        <div className={`px-3 pb-2 text-[10px] ${
          isOwn ? 'text-primary-foreground/50' : 'text-muted-foreground/70'
        }`}>
          Нажмите, чтобы перейти к сообщению
        </div>
      </div>
    </div>
  );
};
