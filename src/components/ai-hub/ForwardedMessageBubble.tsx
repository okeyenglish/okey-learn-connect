import { Forward } from 'lucide-react';

interface ForwardedMessageBubbleProps {
  content: string;
  isOwn: boolean;
  onOpenChat?: (clientId: string, messageId?: string) => void;
}

/**
 * Parse forwarded message format:
 * [forwarded_from:clientId:messageId]
 * ↩️ Переслано из диалога с ClientName
 * ---
 * message text
 */
const parseForwardedMessage = (content: string) => {
  const metaMatch = content.match(/\[forwarded_from:([^:]+):([^\]]+)\]/);
  const clientId = metaMatch?.[1] || null;
  const messageId = metaMatch?.[2] || null;

  // Extract client name from "↩️ Переслано из диалога с ..."
  const nameMatch = content.match(/↩️ Переслано из диалога с (.+)/);
  const clientName = nameMatch?.[1]?.trim() || 'клиентом';

  // Extract the actual message text (after ---)
  const parts = content.split('---');
  let messageText = parts.length > 1 ? parts.slice(1).join('---').trim() : '';

  // Remove optional comment prefix
  if (messageText.startsWith('💬 ')) {
    messageText = messageText.substring(2).trim();
  }

  return { clientId, messageId, clientName, messageText };
};

export const isForwardedMessage = (content: string, messageType?: string) =>
  messageType === 'forwarded_message' || content.startsWith('[forwarded_from:');

export const ForwardedMessageBubble = ({ content, isOwn, onOpenChat }: ForwardedMessageBubbleProps) => {
  const { clientId, messageId, clientName, messageText } = parseForwardedMessage(content);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (clientId && onOpenChat) {
      onOpenChat(clientId, messageId || undefined);
    }
  };

  return (
    <div
      className={`rounded-xl p-3 cursor-pointer transition-all hover:ring-2 hover:ring-primary/30 ${
        isOwn ? 'bg-primary/20' : 'bg-accent/50'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-1.5">
        <Forward className="h-3.5 w-3.5" />
        <span>Переслано из диалога с {clientName}</span>
      </div>
      <div className="border-l-2 border-primary/40 pl-2.5">
        <p className="text-sm whitespace-pre-wrap">{messageText}</p>
      </div>
      {clientId && (
        <p className="text-[10px] text-muted-foreground mt-1.5">Нажмите, чтобы перейти к сообщению</p>
      )}
    </div>
  );
};
