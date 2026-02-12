import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Search, Users, GraduationCap, Send } from 'lucide-react';

interface ForwardTarget {
  id: string;
  name: string;
  type: 'staff' | 'teacher' | 'group';
  icon: 'staff' | 'teacher' | 'group';
}

interface StaffForwardPickerProps {
  open: boolean;
  onClose: () => void;
  onForward: (target: ForwardTarget, comment: string) => void;
  messagePreview: string;
  staffMembers: ForwardTarget[];
}

export const StaffForwardPicker = ({ open, onClose, onForward, messagePreview, staffMembers }: StaffForwardPickerProps) => {
  const [search, setSearch] = useState('');
  const [comment, setComment] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<ForwardTarget | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return staffMembers;
    const q = search.toLowerCase();
    return staffMembers.filter(m => m.name.toLowerCase().includes(q));
  }, [staffMembers, search]);

  const groups = useMemo(() => filtered.filter(t => t.type === 'group'), [filtered]);
  const people = useMemo(() => filtered.filter(t => t.type !== 'group'), [filtered]);

  const handleForward = () => {
    if (!selectedTarget) return;
    onForward(selectedTarget, comment);
    setSearch('');
    setComment('');
    setSelectedTarget(null);
    onClose();
  };

  const handleClose = () => {
    setSearch('');
    setComment('');
    setSelectedTarget(null);
    onClose();
  };

  const getIcon = (type: string) => {
    if (type === 'group') return <Users className="h-3.5 w-3.5 text-purple-600" />;
    if (type === 'teacher') return <GraduationCap className="h-3.5 w-3.5 text-green-600" />;
    return <Users className="h-3.5 w-3.5 text-primary" />;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base">Переслать сообщение</DialogTitle>
        </DialogHeader>

        {/* Preview */}
        <div className="mx-4 mb-2 px-3 py-2 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground line-clamp-2">{messagePreview}</p>
        </div>

        {/* Comment input */}
        <div className="mx-4 mb-2">
          <Input
            placeholder="Добавить комментарий..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        {/* Search */}
        <div className="mx-4 mb-2 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Targets list */}
        <ScrollArea className="max-h-64 px-2">
          {groups.length > 0 && (
            <div className="mb-1">
              <p className="text-[10px] uppercase text-muted-foreground font-medium px-2 py-1">Группы</p>
              {groups.map(t => (
                <button
                  key={t.id}
                  className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors ${
                    selectedTarget?.id === t.id ? 'bg-primary/10' : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedTarget(t)}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-purple-500/10 text-[11px]">
                      {getIcon(t.type)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate">{t.name}</span>
                </button>
              ))}
            </div>
          )}
          {people.length > 0 && (
            <div className="mb-1">
              <p className="text-[10px] uppercase text-muted-foreground font-medium px-2 py-1">Сотрудники</p>
              {people.map(t => (
                <button
                  key={t.id}
                  className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors ${
                    selectedTarget?.id === t.id ? 'bg-primary/10' : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedTarget(t)}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-[11px]">
                      {t.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate">{t.name}</span>
                </button>
              ))}
            </div>
          )}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">Ничего не найдено</p>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t">
          <Button variant="ghost" size="sm" onClick={handleClose}>Отмена</Button>
          <Button size="sm" onClick={handleForward} disabled={!selectedTarget}>
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Переслать
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
