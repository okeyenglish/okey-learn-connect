interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar: string;
}

const mockChats: Chat[] = [
  {
    id: '1',
    name: 'Анна Смирнова',
    lastMessage: 'Спасибо за урок!',
    time: '14:32',
    unread: 2,
    avatar: 'АС'
  },
  {
    id: '2',
    name: 'Иван Петров',
    lastMessage: 'Когда следующее занятие?',
    time: '14:15',
    unread: 0,
    avatar: 'ИП'
  },
  {
    id: '3',
    name: 'Мария Козлова',
    lastMessage: 'Домашнее задание готово',
    time: '13:48',
    unread: 1,
    avatar: 'МК'
  }
];

interface MiniChatManagerProps {
  delay: number;
}

export default function MiniChatManager({ delay }: MiniChatManagerProps) {
  const activeChat = mockChats[1]; // Иван Петров - активный чат

  return (
    <div className="flex gap-1.5 h-full">
      {/* Левая панель - список чатов */}
      <div className="w-[38%] space-y-1">
        {mockChats.map(chat => (
          <MiniChatItem 
            key={chat.id}
            chat={chat}
            isActive={chat.id === activeChat.id}
            delay={delay}
          />
        ))}
      </div>
      
      {/* Правая панель - окно чата */}
      <div className="w-[62%] flex flex-col bg-white/50 dark:bg-surface/50 rounded-lg">
        <MiniChatHeader chat={activeChat} />
        <MiniChatMessages delay={delay} />
      </div>
    </div>
  );
}

function MiniChatItem({ chat, isActive, delay }: { chat: Chat; isActive: boolean; delay: number }) {
  return (
    <div 
      className={`flex items-center gap-1 p-1.5 rounded-lg transition-colors ${
        isActive 
          ? 'bg-white dark:bg-surface shadow-sm' 
          : 'bg-white/60 dark:bg-surface/60 hover:bg-white/80 dark:hover:bg-surface/80'
      }`}
    >
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[hsl(var(--accent-purple))] to-[hsl(var(--brand))] flex items-center justify-center text-[7px] text-white font-semibold flex-shrink-0">
        {chat.avatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[8px] font-semibold text-foreground truncate">{chat.name}</div>
        <div className="text-[7px] text-muted-foreground truncate">{chat.lastMessage}</div>
      </div>
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        <div className="text-[6px] text-muted-foreground">{chat.time}</div>
        {chat.unread > 0 && (
          <div 
            className="w-3.5 h-3.5 rounded-full bg-[hsl(var(--destructive))] text-white text-[7px] flex items-center justify-center font-bold animate-unread-pulse"
            style={{ animationDelay: `${delay}s` }}
          >
            {chat.unread}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniChatHeader({ chat }: { chat: Chat }) {
  return (
    <div className="flex items-center gap-1 p-1.5 border-b border-border/40">
      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[hsl(var(--accent-purple))] to-[hsl(var(--brand))] flex items-center justify-center text-[7px] text-white font-semibold">
        {chat.avatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[8px] font-semibold text-foreground truncate">{chat.name}</div>
        <div className="text-[6px] text-[hsl(var(--success))]">● онлайн</div>
      </div>
    </div>
  );
}

function MiniChatMessages({ delay }: { delay: number }) {
  return (
    <div className="flex-1 p-2 space-y-2 overflow-hidden">
      {/* Сообщение собеседника */}
      <div className="flex gap-1 items-start">
        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[hsl(var(--accent-purple))] to-[hsl(var(--brand))] flex-shrink-0" />
        <div className="bg-muted/80 rounded-lg px-2 py-1 text-[7px] text-foreground max-w-[75%]">
          Когда следующее занятие?
        </div>
      </div>
      
      {/* Своё сообщение с анимацией появления */}
      <div className="flex justify-end">
        <div 
          className="bg-gradient-to-r from-[hsl(var(--accent-purple))] to-[hsl(var(--brand))] text-white rounded-lg px-2 py-1 text-[7px] max-w-[75%] animate-message-appear flex items-center gap-1"
          style={{ animationDelay: `${delay}s` }}
        >
          <span>Завтра в 15:00</span>
          <span className="text-[6px] opacity-80">✓✓</span>
        </div>
      </div>
    </div>
  );
}
