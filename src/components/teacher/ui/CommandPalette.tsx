import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Calendar, BookOpen, ClipboardCheck, NotebookPen, UserCircle, RefreshCcw, FileText } from "lucide-react";

interface CommandPaletteProps {
  onAttendance?: () => void;
  onHomework?: () => void;
  onStartLesson?: () => void;
}

export function CommandPalette({ onAttendance, onHomework, onStartLesson }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(v => !v);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const commands = [
    { 
      icon: ClipboardCheck, 
      label: "Отметить посещаемость", 
      onClick: () => { onAttendance?.(); setOpen(false); },
      keywords: ["посещаемость", "attendance", "отметить"]
    },
    { 
      icon: NotebookPen, 
      label: "Назначить домашнее задание", 
      onClick: () => { onHomework?.(); setOpen(false); },
      keywords: ["дз", "homework", "задание"]
    },
    { 
      icon: BookOpen, 
      label: "Открыть журнал", 
      onClick: () => { navigate("/teacher-portal"); setOpen(false); },
      keywords: ["журнал", "journal"]
    },
    { 
      icon: Calendar, 
      label: "Открыть расписание", 
      onClick: () => { navigate("/teacher-portal"); setOpen(false); },
      keywords: ["расписание", "schedule"]
    },
    { 
      icon: FileText, 
      label: "Материалы", 
      onClick: () => { navigate("/teacher-portal"); setOpen(false); },
      keywords: ["материалы", "materials"]
    },
    { 
      icon: RefreshCcw, 
      label: "Запросить замену", 
      onClick: () => { navigate("/teacher-portal"); setOpen(false); },
      keywords: ["замена", "substitution"]
    },
    { 
      icon: UserCircle, 
      label: "Мой профиль", 
      onClick: () => { navigate("/teacher-portal"); setOpen(false); },
      keywords: ["профиль", "profile"]
    },
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(search.toLowerCase()) ||
    cmd.keywords.some(k => k.toLowerCase().includes(search.toLowerCase()))
  );

  if (!open) {
    return (
      <button 
        className="px-3 py-2 rounded-lg border text-sm flex items-center gap-2 hover:bg-surface transition-colors"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Поиск</span>
        <kbd className="hidden sm:inline px-1.5 py-0.5 text-xs border rounded bg-muted">⌘K</kbd>
      </button>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black/30 flex items-start justify-center pt-24 z-50 animate-fade-in" 
      onClick={() => setOpen(false)}
    >
      <div 
        className="bg-white dark:bg-surface w-full max-w-xl rounded-2xl shadow-xl animate-scale-in" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              autoFocus
              placeholder="Поиск действий: журнал, расписание, посещаемость…"
              className="w-full pl-10 pr-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="p-2 max-h-[400px] overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Ничего не найдено
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCommands.map((cmd, idx) => (
                <CommandItem 
                  key={idx} 
                  icon={cmd.icon} 
                  label={cmd.label} 
                  onClick={cmd.onClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CommandItem({ icon: Icon, label, onClick }: { 
  icon: any; 
  label: string; 
  onClick: () => void;
}) {
  return (
    <button 
      onClick={onClick} 
      className="w-full text-left border rounded-lg p-3 hover:bg-surface transition-colors flex items-center gap-3"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span>{label}</span>
    </button>
  );
}
