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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Send, Users, Loader2, Forward, MessageSquare, GraduationCap, UserCircle } from 'lucide-react';
import { useStaffMembers, useSendStaffMessage } from '@/hooks/useInternalStaffMessages';
import { useStaffGroupChats } from '@/hooks/useStaffGroupChats';
import { useForwardClients, useForwardTeachers } from '@/hooks/useForwardRecipients';
import { useAllIntegrationsStatus } from '@/hooks/useMessengerIntegrationStatus';
import { useSendChatOSMessage } from '@/hooks/useChatOSMessages';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type RecipientType = 'staff' | 'group' | 'client' | 'teacher';
export type MessengerChannel = 'whatsapp' | 'telegram' | 'max' | 'chatos';

interface Recipient {
  type: RecipientType;
  id: string;
  name: string;
  avatar_url?: string | null;
  branch?: string | null;
  phone?: string | null;
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
  const [selectedMessenger, setSelectedMessenger] = useState<MessengerChannel | null>(null);
  const [messageText, setMessageText] = useState('');
  const [activeTab, setActiveTab] = useState<string>('staff');
  const [isSending, setIsSending] = useState(false);

  const { data: staffMembers = [], isLoading: staffLoading } = useStaffMembers();
  const { data: groupChats = [], isLoading: groupsLoading } = useStaffGroupChats();
  const { data: clients = [], isLoading: clientsLoading } = useForwardClients(search, activeTab === 'clients');
  const { data: teachers = [], isLoading: teachersLoading } = useForwardTeachers(search, activeTab === 'teachers');
  const { data: integrationsStatus } = useAllIntegrationsStatus();
  const sendStaffMessage = useSendStaffMessage();
  const sendChatOSMessage = useSendChatOSMessage();
  const { user, profile } = useAuth();

  // Build staff recipients list
  const staffRecipients = useMemo(() => {
    const items: Recipient[] = [];
    (groupChats || []).forEach((g: any) => {
      items.push({ type: 'group', id: g.id, name: g.name, branch: g.branch_name });
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

  const clientRecipients = useMemo(() => {
    return (clients || []).map(c => ({
      type: 'client' as RecipientType,
      id: c.id,
      name: c.name,
      branch: c.branch,
      phone: c.phone,
    }));
  }, [clients]);

  const teacherRecipients = useMemo(() => {
    return (teachers || []).map(t => ({
      type: 'teacher' as RecipientType,
      id: t.id,
      name: `${t.first_name} ${t.last_name || ''}`.trim(),
      branch: t.branch,
      phone: t.phone,
    }));
  }, [teachers]);

  // Available messengers for client/teacher
  const availableMessengers = useMemo(() => {
    const channels: { id: MessengerChannel; label: string; icon: string }[] = [];
    if (integrationsStatus?.whatsapp?.isEnabled && integrationsStatus?.whatsapp?.isConfigured) {
      channels.push({ id: 'whatsapp', label: 'WhatsApp', icon: '💬' });
    }
    if (integrationsStatus?.telegram?.isEnabled && integrationsStatus?.telegram?.isConfigured) {
      channels.push({ id: 'telegram', label: 'Telegram', icon: '✈️' });
    }
    if (integrationsStatus?.max?.isEnabled && integrationsStatus?.max?.isConfigured) {
      channels.push({ id: 'max', label: 'MAX', icon: '🔵' });
    }
    return channels;
  }, [integrationsStatus]);

  const needsMessengerSelection = selectedRecipient && (selectedRecipient.type === 'client' || selectedRecipient.type === 'teacher');
  const isReadyToSend = selectedRecipient && (!needsMessengerSelection || selectedMessenger);

  const handleRecipientSelect = (r: Recipient) => {
    setSelectedRecipient(r);
    setSelectedMessenger(null);
    // Staff/group don't need messenger selection
    if (r.type === 'staff' || r.type === 'group') {
      setSelectedMessenger(null);
    }
  };

  const handleSend = async () => {
    if (!selectedRecipient || !isReadyToSend) return;
    setIsSending(true);

    try {
      const cleanTexts = selectedMessages.map(msg => msg.message);
      const fullCleanText = messageText.trim()
        ? `${cleanTexts.join('\n')}\n\n💬 ${messageText.trim()}`
        : cleanTexts.join('\n');

      if (selectedRecipient.type === 'staff' || selectedRecipient.type === 'group') {
        // Existing staff/group logic
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

          await sendStaffMessage.mutateAsync(payload);
        }
      } else if (selectedRecipient.type === 'client') {
        if (selectedMessenger === 'chatos') {
          // Send via ChatOS — clean text only
          await sendChatOSMessage.mutateAsync({
            client_id: selectedRecipient.id,
            message_text: fullCleanText,
            sender_role: 'company',
          });
        } else if (selectedMessenger) {
          // Send via external messenger — clean text to recipient
          const endpointMap: Record<string, string> = {
            whatsapp: 'whatsapp-send',
            telegram: 'telegram-send',
            max: 'max-send',
          };
          await selfHostedPost(endpointMap[selectedMessenger], {
            clientId: selectedRecipient.id,
            message: fullCleanText,
            phoneNumber: selectedRecipient.phone,
          });
        }
      } else if (selectedRecipient.type === 'teacher' && selectedMessenger) {
        // Teacher — send via messenger clean text
        const endpointMap: Record<string, string> = {
          whatsapp: 'whatsapp-send',
          telegram: 'telegram-send',
          max: 'max-send',
        };
        await selfHostedPost(endpointMap[selectedMessenger], {
          teacherId: selectedRecipient.id,
          phoneNumber: selectedRecipient.phone,
          message: fullCleanText,
        });
      }

      const sentRecipient = {
        type: selectedRecipient.type,
        id: selectedRecipient.id,
        name: selectedRecipient.name,
      };

      toast.success(`Сообщение переслано: ${selectedRecipient.name}`);
      onOpenChange(false);
      setSelectedRecipient(null);
      setSelectedMessenger(null);
      setMessageText('');
      setSearch('');
      setActiveTab('staff');
      onSent?.(sentRecipient);
    } catch (error) {
      console.error('Error forwarding message:', error);
      toast.error('Не удалось переслать сообщение');
    } finally {
      setIsSending(false);
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '?';

  const renderRecipientList = (items: Recipient[], loading: boolean) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (items.length === 0) {
      return (
        <p className="text-center text-sm text-muted-foreground py-8">
          {search.trim() ? 'Ничего не найдено' : 'Нет доступных получателей'}
        </p>
      );
    }
    return (
      <div className="space-y-0.5">
        {items.map((r) => (
          <button
            key={`${r.type}-${r.id}`}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
              selectedRecipient?.id === r.id && selectedRecipient?.type === r.type
                ? 'bg-primary/10 ring-1 ring-primary/30'
                : 'hover:bg-accent/50'
            }`}
            onClick={() => handleRecipientSelect(r)}
          >
            <Avatar className="h-8 w-8">
              {r.avatar_url && <AvatarImage src={r.avatar_url} />}
              <AvatarFallback className={`text-xs font-medium ${
                r.type === 'group' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                r.type === 'teacher' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
                r.type === 'client' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' :
                'bg-[hsl(var(--avatar-blue))] text-[hsl(var(--text-primary))]'
              }`}>
                {r.type === 'group' ? <Users className="h-3.5 w-3.5" /> : getInitials(r.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{r.name}</p>
              {r.branch && <p className="text-xs text-muted-foreground truncate">{r.branch}</p>}
              {r.phone && <p className="text-xs text-muted-foreground truncate">{r.phone}</p>}
            </div>
            {r.type === 'group' && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5">Группа</Badge>
            )}
          </button>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" style={{ zIndex: 9999 }} overlayZIndex={9998}>
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedRecipient(null); setSelectedMessenger(null); }}>
          <TabsList className="w-full">
            <TabsTrigger value="staff" className="flex-1 gap-1 text-xs">
              <MessageSquare className="h-3.5 w-3.5" />
              Сотрудники
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex-1 gap-1 text-xs">
              <UserCircle className="h-3.5 w-3.5" />
              Клиенты
            </TabsTrigger>
            <TabsTrigger value="teachers" className="flex-1 gap-1 text-xs">
              <GraduationCap className="h-3.5 w-3.5" />
              Преподаватели
            </TabsTrigger>
          </TabsList>

          {/* Search */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={activeTab === 'staff' ? 'Поиск сотрудника или группы...' : activeTab === 'clients' ? 'Поиск клиента...' : 'Поиск преподавателя...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <TabsContent value="staff" className="mt-0">
            <ScrollArea className="h-[200px] -mx-2 px-2">
              {renderRecipientList(staffRecipients, staffLoading || groupsLoading)}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="clients" className="mt-0">
            <ScrollArea className="h-[200px] -mx-2 px-2">
              {renderRecipientList(clientRecipients, clientsLoading)}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="teachers" className="mt-0">
            <ScrollArea className="h-[200px] -mx-2 px-2">
              {renderRecipientList(teacherRecipients, teachersLoading)}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Messenger selection for client/teacher */}
        {needsMessengerSelection && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Выберите канал отправки:</p>
            <div className="flex flex-wrap gap-2">
              {selectedRecipient?.type === 'client' && (
                <Button
                  size="sm"
                  variant={selectedMessenger === 'chatos' ? 'default' : 'outline'}
                  onClick={() => setSelectedMessenger('chatos')}
                  className="text-xs h-8"
                >
                  💬 ChatOS
                </Button>
              )}
              {availableMessengers.map(m => (
                <Button
                  key={m.id}
                  size="sm"
                  variant={selectedMessenger === m.id ? 'default' : 'outline'}
                  onClick={() => setSelectedMessenger(m.id)}
                  className="text-xs h-8"
                >
                  {m.icon} {m.label}
                </Button>
              ))}
              {availableMessengers.length === 0 && selectedRecipient?.type === 'teacher' && (
                <p className="text-xs text-muted-foreground">Нет настроенных мессенджеров</p>
              )}
            </div>
          </div>
        )}

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!isReadyToSend || isSending}
          className="w-full gap-2"
        >
          {isSending ? (
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
