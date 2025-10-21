import { useState, useEffect } from "react";
import { X, Check, DollarSign, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Student {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  attendance_status?: string;
}

interface AttendanceDrawerProps {
  open: boolean;
  onClose: () => void;
  students: Student[];
  sessionDate: string;
  onSave: (rows: { id: string; present: boolean; status: string; notes?: string }[]) => Promise<void>;
}

type AttendanceStatus = 'present' | 'paid_absence' | 'unpaid_absence' | 'excused';

export function AttendanceDrawer({ 
  open, 
  onClose, 
  students, 
  sessionDate,
  onSave 
}: AttendanceDrawerProps) {
  const [rows, setRows] = useState<Record<string, { status: AttendanceStatus; notes: string }>>({});

  useEffect(() => {
    if (open && students) {
      const initial: Record<string, { status: AttendanceStatus; notes: string }> = {};
      students.forEach(s => {
        initial[s.id] = { status: 'present', notes: '' };
      });
      setRows(initial);
    }
  }, [open, students]);

  const onToggle = (id: string, status: AttendanceStatus) => {
    setRows(prev => ({
      ...prev,
      [id]: { ...prev[id], status },
    }));
  };

  const updateNotes = (id: string, notes: string) => {
    setRows(prev => ({
      ...prev,
      [id]: { ...prev[id], notes },
    }));
  };

  const handleSave = async () => {
    const data = Object.entries(rows).map(([id, data]) => ({
      id,
      present: data.status === 'present',
      status: data.status,
      notes: data.notes || undefined,
    }));
    await onSave(data);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-end z-50 animate-fade-in">
      <div className="w-full max-w-md bg-background h-full rounded-l-2xl shadow-xl flex flex-col animate-slide-in-right">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Посещаемость</h2>
            <p className="text-sm text-muted-foreground">{sessionDate}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-4">
            {students.map(s => {
              const r = rows[s.id];
              if (!r) return null;

              const displayName = s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim();

              return (
                <div key={s.id} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="truncate font-medium">{displayName}</div>
                    {s.attendance_status && s.attendance_status !== 'not_marked' && (
                      <Badge variant="secondary" className="text-xs">
                        {s.attendance_status}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <StatusButton
                      active={r.status === 'present'}
                      onClick={() => onToggle(s.id, 'present')}
                      icon={Check}
                      label="Был"
                    />
                    <StatusButton
                      active={r.status === 'paid_absence'}
                      onClick={() => onToggle(s.id, 'paid_absence')}
                      icon={DollarSign}
                      label="Оплач."
                    />
                    <StatusButton
                      active={r.status === 'unpaid_absence'}
                      onClick={() => onToggle(s.id, 'unpaid_absence')}
                      icon={X}
                      label="Пропуск"
                    />
                    <StatusButton
                      active={r.status === 'excused'}
                      onClick={() => onToggle(s.id, 'excused')}
                      icon={Gift}
                      label="Уважит."
                    />
                  </div>

                  {r.status !== 'present' && (
                    <Textarea
                      placeholder="Комментарий (опционально)"
                      value={r.notes}
                      onChange={(e) => updateNotes(s.id, e.target.value)}
                      className="text-sm"
                      rows={2}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Отмена
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusButton({ 
  active, 
  onClick, 
  icon: Icon, 
  label 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: any; 
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
        active 
          ? "bg-primary text-primary-foreground border-primary" 
          : "bg-background hover:bg-surface"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}
