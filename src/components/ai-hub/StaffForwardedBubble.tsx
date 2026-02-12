import { Forward } from 'lucide-react';

interface StaffForwardedBubbleProps {
  content: string;
  isOwn: boolean;
  onNavigateToChat?: (chatId: string, chatType: 'staff' | 'group') => void;
}

/**
 * Parse staff forwarded message format:
 * [staff_forwarded:senderName:chatName]
 * ---
 * original message text
 * 
 * 💬 optional comment
 */
const parseStaffForwarded = (content: string) => {
  const metaMatch = content.match(/\[staff_forwarded:([^:]*):([^\]]*)\]/);
  const senderName = metaMatch?.[1] || 'Сотрудник';
  const chatName = metaMatch?.[2] || '';

  const parts = content.split('---');
  let messageText = parts.length > 1 ? parts.slice(1).join('---').trim() : '';

  // Separate optional comment
  let comment = '';
  const commentMatch = messageText.match(/\n\n💬 (.+)$/s);
  if (commentMatch) {
    comment = commentMatch[1].trim();
    messageText = messageText.substring(0, messageText.length - commentMatch[0].length).trim();
  }

  return { senderName, chatName, messageText, comment };
};

export const parseStaffForwardedComment = (content: string) => {
  const { comment } = parseStaffForwarded(content);
  return comment || null;
};

export const isStaffForwardedMessage = (content: string, messageType?: string) =>
  messageType === 'staff_forwarded' || content.startsWith('[staff_forwarded:');

export const StaffForwardedBubble = ({ content, isOwn }: StaffForwardedBubbleProps) => {
  const { senderName, chatName, messageText, comment } = parseStaffForwarded(content);

  return (
    <div className="space-y-1">
      {/* Comment above */}
      {comment && (
        <p className="text-[13.5px] leading-[18px] whitespace-pre-wrap">{comment}</p>
      )}

      {/* Forwarded message block */}
      <div className={`border-l-2 ${isOwn ? 'border-primary-foreground/40' : 'border-primary/50'} pl-2.5 py-0.5`}>
        <div className={`flex items-center gap-1 text-[11px] ${
          isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'
        }`}>
          <Forward className="h-3 w-3" />
          <span>Переслано от</span>
          <span className={`font-semibold ${isOwn ? 'text-primary-foreground/80' : 'text-primary'}`}>{senderName}</span>
        </div>

        {chatName && (
          <p className={`text-[10px] ${isOwn ? 'text-primary-foreground/40' : 'text-muted-foreground/60'}`}>
            из «{chatName}»
          </p>
        )}

        {messageText && (
          <p className={`text-[13px] leading-[17px] whitespace-pre-wrap mt-0.5 ${
            isOwn ? 'text-primary-foreground/90' : 'text-foreground/80'
          }`}>{messageText}</p>
        )}
      </div>
    </div>
  );
};
