import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Search, Users, PlayCircle, ClipboardCheck, NotebookPen, UserCircle, Bot, TrendingUp, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);

  // Горячие клавиши
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setOpen(true)}
      className="gap-2"
    >
      <Search className="h-4 w-4" />
      <span className="text-sm hidden sm:inline">Поиск</span>
      <kbd className="hidden sm:inline pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
        ⌘K
      </kbd>
    </Button>
  );
}
