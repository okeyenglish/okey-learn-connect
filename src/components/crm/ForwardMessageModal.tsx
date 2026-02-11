import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Send, Users, Loader2, Forward } from 'lucide-react';
import { useStaffMembers, useSendStaffMessage } from '@/hooks/useInternalStaffMessages';
import { useStaffGroupChats } from '@/hooks/useStaffGroupChats';
import { toast } from 'sonner';

type RecipientType = 'staff' | 'group';

interface Recipient {
  type: RecipientType;
  id: string;
  name: string;
  avatar_url?: string | null;
  branch?: string | null;
}

interface ForwardMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMessages: Array<{
    id: string;
    message: string;
    time: string;
    type: string;
  }>;
  currentClientId: string;
  clientName?: string;
  onForward: (recipients: Array<{ id: string; type: RecipientType; name: string }>) => void;
  onSent?: (recipient: { type: RecipientType; id: string; name: string }) => void;
}

export const ForwardMessageModal = ({
  open,
  onOpenChange,
  selectedMessages,
  currentClientId,
  clientName,
  onForward,
  onSent,
}: ForwardMessageModalProps) => {
  const [search, setSearch] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [messageText, setMessageText] = useState('');

  const { data: staffMembers = [], isLoading: staffLoading } = useStaffMembers();
  const { data: groupChats = [], isLoading: groupsLoading } = useStaffGroupChats();
  const sendMessage = useSendStaffMessage();

  const isLoading = staffLoading || groupsLoading;

  const recipients = useMemo(() => {
    const items: Recipient[] = [];

    (groupChats || []).forEach((g: any) => {
      items.push({
        type: 'group',
        id: g.id,
        name: g.name,
        branch: g.branch_name,
      });
    });

    (staffMembers || []).forEach((s: any) => {
      items.push({
        type: 'staff',
        id: s.id,
        name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.email || 'Сотрудник',
        avatar_url: s.avatar_url,
        branch: s.branch,
      });
    });

    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(r => r.name.toLowerCase().includes(q));
  }, [staffMembers, groupChats, search]);

  const handleSend = async () => {
    if (!selectedRecipient) return;

    try {
      // Send each selected message
      for (const msg of selectedMessages) {
        const forwardedText = [
          `[forwarded_from:${currentClientId}:${msg.id}]`,
          `↩️ Переслано из диалога с ${clientName || 'клиентом'}`,
          '---',
          msg.message,
        ].join('\n');

        const fullMessage = messageText.trim()
          ? `${forwardedText}\n\n💬 ${messageText.trim()}`
          : forwardedText;

        const payload: any = {
          message_text: fullMessage,
          message_type: 'forwarded_message',
        };

        if (selectedRecipient.type === 'group') {
          payload.group_chat_id = selectedRecipient.id;
        } else {
          payload.recipient_user_id = selectedRecipient.id;
        }

        await sendMessage.mutateAsync(payload);
      }

      const sentRecipient = {
        type: selectedRecipient.type,
        id: selectedRecipient.id,
        name: selectedRecipient.name,
      };

      toast.success(`Сообщение переслано: ${selectedRecipient.name}`);
      onOpenChange(false);
      setSelectedRecipient(null);
      setMessageText('');
      setSearch('');
      onSent?.(sentRecipient);
    } catch (error) {
      console.error('Error forwarding message:', error);
      toast.error('Не удалось переслать сообщение');
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Forward className="h-5 w-5" />
            Переслать сообщение
          </DialogTitle>
        </DialogHeader>

        {/* Message preview */}
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">
            Выбрано сообщений: <span className="font-semibold">{selectedMessages.length}</span>
          </p>
          {selectedMessages.length === 1 && (
            <p className="text-sm line-clamp-3">{selectedMessages[0].message}</p>
          )}
        </div>

        {/* Optional comment */}
        <Textarea
          placeholder="Добавить комментарий (необязательно)..."
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          className="min-h-[60px] resize-none text-sm"
          rows={2}
        />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск сотрудника или группы..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Recipients list */}
        <ScrollArea className="h-[240px] -mx-2 px-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : recipients.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              {search.trim() ? 'Ничего не найдено' : 'Нет доступных получателей'}
            </p>
          ) : (
            <div className="space-y-0.5">
              {recipients.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                    selectedRecipient?.id === r.id && selectedRecipient?.type === r.type
                      ? 'bg-primary/10 ring-1 ring-primary/30'
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => setSelectedRecipient(r)}
                >
                  <Avatar className="h-8 w-8">
                    {r.avatar_url && <AvatarImage src={r.avatar_url} />}
                    <AvatarFallback className={`text-xs font-medium ${r.type === 'group' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-[hsl(var(--avatar-blue))] text-[hsl(var(--text-primary))]'}`}>
                      {r.type === 'group' ? <Users className="h-3.5 w-3.5" /> : getInitials(r.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    {r.branch && (
                      <p className="text-xs text-muted-foreground truncate">{r.branch}</p>
                    )}
                  </div>
                  {r.type === 'group' && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">Группа</Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!selectedRecipient || sendMessage.isPending}
          className="w-full gap-2"
        >
          {sendMessage.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {selectedRecipient
            ? `Переслать → ${selectedRecipient.name}`
            : 'Выберите получателя'
          }
        </Button>
      </DialogContent>
    </Dialog>
  );
};
