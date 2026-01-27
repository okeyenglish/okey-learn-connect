import React, { useState } from 'react';
import { Phone, Users, MessageCircle, Send, X } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';
import type { PresenceInfo, PresenceType } from '@/hooks/useChatPresence';

interface ChatPresenceIndicatorProps {
  presence: PresenceInfo | null | undefined;
  compact?: boolean;
  clientName?: string;
}

// Animated reading eyes component - emoji style 👀 with blinking
const ReadingEyes: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center gap-[2px] ${className}`}>
    {/* Left eye - oval shape like 👀 */}
    <div className="relative w-[9px] h-[11px] rounded-[45%] bg-white border border-slate-300 overflow-hidden shadow-sm animate-blink origin-center">
      {/* Black pupil */}
      <div 
        className="absolute w-[5px] h-[5px] bg-slate-900 rounded-full animate-look-around"
        style={{ top: '3px', left: '2px' }}
      />
    </div>
    {/* Right eye - oval shape like 👀 */}
    <div className="relative w-[9px] h-[11px] rounded-[45%] bg-white border border-slate-300 overflow-hidden shadow-sm animate-blink origin-center">
      {/* Black pupil */}
      <div 
        className="absolute w-[5px] h-[5px] bg-slate-900 rounded-full animate-look-around"
        style={{ top: '3px', left: '2px' }}
      />
    </div>
  </div>
);

// Sleepy eyes component - closed eyes with Z for idle status 😴
const SleepyEyes: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center gap-[2px] ${className}`}>
    {/* Left closed eye - curved line */}
    <div className="relative w-[9px] h-[11px] flex items-center justify-center">
      <div className="w-[7px] h-[2px] bg-slate-400 rounded-full" 
           style={{ transform: 'rotate(-10deg)' }} />
    </div>
    {/* Right closed eye - curved line */}
    <div className="relative w-[9px] h-[11px] flex items-center justify-center">
      <div className="w-[7px] h-[2px] bg-slate-400 rounded-full" 
           style={{ transform: 'rotate(10deg)' }} />
    </div>
    {/* Floating Z */}
    <span className="text-[8px] font-bold text-slate-400 animate-pulse ml-0.5">
      z
    </span>
  </div>
);

// Quick message input component
const QuickMessageInput: React.FC<{
  recipientId: string;
  recipientName: string;
  clientName?: string;
  onClose: () => void;
}> = ({ recipientId, recipientName, clientName, onClose }) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!message.trim()) return;
    
    setSending(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Get sender profile
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name, organization_id')
        .eq('id', userData.user.id)
        .maybeSingle();

      const senderName = [senderProfile?.first_name, senderProfile?.last_name]
        .filter(Boolean).join(' ') || 'Коллега';

      // Create notification message with context
      const contextMessage = clientName 
        ? `💬 Сообщение от ${senderName} (чат: ${clientName}):\n\n${message}`
        : `💬 Сообщение от ${senderName}:\n\n${message}`;

      // Insert into assistant_messages for the recipient
      if (senderProfile?.organization_id) {
        await supabase.from('assistant_messages').insert({
          user_id: recipientId,
          organization_id: senderProfile.organization_id,
          role: 'system',
          content: contextMessage,
          is_read: false,
        });
      }

      toast({
        title: "Сообщение отправлено",
        description: `${recipientName} получит уведомление`,
      });

      setMessage('');
      onClose();
    } catch (err) {
      console.error('Failed to send quick message:', err);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить сообщение",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Написать {recipientName}</span>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex gap-1.5">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Сообщение..."
          className="h-7 text-xs"
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          autoFocus
        />
        <Button 
          size="icon" 
          className="h-7 w-7 shrink-0" 
          onClick={handleSend}
          disabled={!message.trim() || sending}
        >
          <Send className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

const getTooltipTitle = (viewers: Array<{ type: PresenceType }>) => {
  const hasCall = viewers.some(v => v.type === 'on_call');
  const allIdle = viewers.every(v => v.type === 'idle');
  
  if (hasCall) return '📞 На связи:';
  if (allIdle) return '😴 Неактивны:';
  return '👀 Сейчас смотрят:';
};

// Viewer row with message button
const ViewerRow: React.FC<{
  viewer: { userId: string; name: string; avatarUrl: string | null; type: PresenceType };
  clientName?: string;
}> = ({ viewer, clientName }) => {
  const [showMessageInput, setShowMessageInput] = useState(false);

  if (showMessageInput) {
    return (
      <QuickMessageInput
        recipientId={viewer.userId}
        recipientName={viewer.name}
        clientName={clientName}
        onClose={() => setShowMessageInput(false)}
      />
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 group">
      <div className="flex items-center gap-2">
        <Avatar className="h-5 w-5">
          {viewer.avatarUrl && <AvatarImage src={viewer.avatarUrl} alt={viewer.name} />}
          <AvatarFallback className="text-[8px] bg-primary/10">
            {viewer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs flex items-center gap-1">
          {viewer.name}
          {viewer.type === 'on_call' && (
            <Phone className="h-3 w-3 text-green-500 ml-1" />
          )}
          {viewer.type === 'idle' && (
            <span className="text-[10px] text-slate-400 ml-1">💤</span>
          )}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          setShowMessageInput(true);
        }}
      >
        <MessageCircle className="h-3 w-3 text-muted-foreground" />
      </Button>
    </div>
  );
};

export const ChatPresenceIndicator: React.FC<ChatPresenceIndicatorProps> = ({
  presence,
  compact = false,
  clientName,
}) => {
  if (!presence || presence.viewers.length === 0) {
    return null;
  }

  const { viewers } = presence;
  const hasCall = viewers.some(v => v.type === 'on_call');
  const allIdle = viewers.every(v => v.type === 'idle');
  const primaryViewer = viewers[0];
  const additionalCount = viewers.length - 1;

  // Determine main icon based on presence types (priority: call > viewing > idle)
  const mainIcon = hasCall 
    ? <Phone className="h-3 w-3 text-green-500 animate-pulse" />
    : allIdle 
      ? <SleepyEyes />
      : <ReadingEyes />;

  const containerClass = hasCall
    ? 'bg-green-100 border-green-300 dark:bg-green-950/50 dark:border-green-700'
    : allIdle
      ? 'bg-slate-100 border-slate-300 dark:bg-slate-800/50 dark:border-slate-600'
      : 'bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-700';

  const popoverContent = (
    <div className="space-y-1.5 p-1 min-w-[180px]">
      <p className="text-xs font-medium text-muted-foreground mb-2">
        {getTooltipTitle(viewers)}
      </p>
      {viewers.map((viewer) => (
        <ViewerRow key={viewer.userId} viewer={viewer} clientName={clientName} />
      ))}
    </div>
  );

  if (compact) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border ${containerClass} cursor-pointer hover:opacity-80 transition-opacity`}>
            {mainIcon}
            {additionalCount > 0 && (
              <span className="text-[10px] font-medium text-muted-foreground ml-0.5">
                +{additionalCount}
              </span>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent side="left" className="w-auto p-0">
          {popoverContent}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full border ${containerClass} cursor-pointer hover:opacity-80 transition-opacity`}>
          {/* Show first viewer's avatar */}
          <Avatar className="h-4 w-4">
            {primaryViewer.avatarUrl && (
              <AvatarImage src={primaryViewer.avatarUrl} alt={primaryViewer.name} />
            )}
            <AvatarFallback className="text-[7px] bg-primary/10">
              {primaryViewer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          {mainIcon}
          
          {additionalCount > 0 && (
            <div className="flex items-center gap-0.5">
              <Users className="h-2.5 w-2.5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">
                +{additionalCount}
              </span>
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent side="left" className="w-auto p-0">
        {popoverContent}
      </PopoverContent>
    </Popover>
  );
};

export default ChatPresenceIndicator;
