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
import { Search, Send, Users, User, Loader2, MapPin } from 'lucide-react';
import { useStaffMembers } from '@/hooks/useInternalStaffMessages';
import { useSendStaffMessage } from '@/hooks/useInternalStaffMessages';
import { useStaffGroupChats } from '@/hooks/useStaffGroupChats';
import { toast } from 'sonner';

interface ClientInfo {
  id: string;
  name: string;
  phone?: string;
  avatar_url?: string | null;
  branch?: string | null;
}

interface ShareClientCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientInfo;
}

type RecipientType = 'staff' | 'group';

interface Recipient {
  type: RecipientType;
  id: string;
  name: string;
  avatar_url?: string | null;
  branch?: string | null;
}

export const ShareClientCardModal = ({
  open,
  onOpenChange,
  client,
}: ShareClientCardModalProps) => {
  const [search, setSearch] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [messageText, setMessageText] = useState('');
  
  const { data: staffMembers = [], isLoading: staffLoading } = useStaffMembers();
  const { data: groupChats = [], isLoading: groupsLoading } = useStaffGroupChats();
  const sendMessage = useSendStaffMessage();

  const isLoading = staffLoading || groupsLoading;

  const recipients = useMemo(() => {
    const items: Recipient[] = [];
    
    // Add groups first
    (groupChats || []).forEach((g: any) => {
      items.push({
        type: 'group',
        id: g.id,
        name: g.name,
        branch: g.branch_name,
      });
    });
    
    // Add staff
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

    // Build the client card message with metadata encoded in the message
    const cardText = `[client_card:${client.id}]\n📋 Карточка клиента\n👤 ${client.name}${client.branch ? `\n📍 ${client.branch}` : ''}${client.phone ? `\n📞 ${client.phone}` : ''}`;
    const fullMessage = messageText.trim() 
      ? `${cardText}\n\n💬 ${messageText.trim()}`
      : cardText;

    try {
      const payload: any = {
        message_text: fullMessage,
        message_type: 'client_card',
      };

      if (selectedRecipient.type === 'group') {
        payload.group_chat_id = selectedRecipient.id;
      } else {
        payload.recipient_user_id = selectedRecipient.id;
      }

      await sendMessage.mutateAsync(payload);
      
      toast.success(`Карточка отправлена: ${selectedRecipient.name}`);
      onOpenChange(false);
      setSelectedRecipient(null);
      setMessageText('');
      setSearch('');
    } catch (error) {
      console.error('Error sharing client card:', error);
      toast.error('Не удалось отправить карточку');
    }
  };

  const getInitials = (name: string) => 
    name.split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Переслать карточку клиента</DialogTitle>
        </DialogHeader>

        {/* Client card preview */}
        <div className="flex items-center gap-3 p-3 bg-accent/30 rounded-xl border border-border/50">
          <Avatar className="h-10 w-10 ring-2 ring-border/30">
            {client.avatar_url && <AvatarImage src={client.avatar_url} />}
            <AvatarFallback className="bg-[hsl(var(--avatar-blue))] text-[hsl(var(--text-primary))] text-sm font-medium">
              {getInitials(client.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{client.name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {client.branch && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" />
                  {client.branch}
                </span>
              )}
              {client.phone && <span>{client.phone}</span>}
            </div>
          </div>
        </div>

        {/* Message input */}
        <Textarea
          placeholder="Добавить сообщение (необязательно)..."
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          className="min-h-[60px] resize-none text-sm"
          rows={2}
        />

        {/* Recipient search */}
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
            ? `Отправить → ${selectedRecipient.name}`
            : 'Выберите получателя'
          }
        </Button>
      </DialogContent>
    </Dialog>
  );
};
