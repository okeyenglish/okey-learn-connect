import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AddCorporateChatModalProps {
  onChatAdded?: () => void;
}

export const AddCorporateChatModal = ({ onChatAdded }: AddCorporateChatModalProps) => {
  const [open, setOpen] = useState(false);
  const [chatName, setChatName] = useState("");
  const [userBranch, setUserBranch] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Загружаем филиал текущего пользователя
  useEffect(() => {
    const loadUserBranch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('branch')
        .eq('id', user.id)
        .maybeSingle();

      setUserBranch(profile?.branch || null);
    };
    
    if (open) {
      loadUserBranch();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!chatName.trim()) {
      toast.error("Введите название чата");
      return;
    }

    if (!userBranch) {
      toast.error("Не удалось определить ваш филиал");
      return;
    }

    setIsSubmitting(true);

    try {
      // Создаем клиента для кастомного чата
      const clientName = `Кастомный чат - ${chatName}`;
      
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('name', clientName)
        .eq('branch', userBranch)
        .maybeSingle();

      if (existingClient) {
        toast.error("Чат с таким названием уже существует");
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('clients')
        .insert({
          name: clientName,
          phone: '-',
          branch: userBranch
        });

      if (error) throw error;

      toast.success("Кастомный чат создан");
      setChatName("");
      setOpen(false);
      onChatAdded?.();
    } catch (error) {
      console.error('Error creating custom chat:', error);
      toast.error("Ошибка создания чата");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-surface">
        <DialogHeader>
          <DialogTitle className="text-text-primary">Создать кастомный чат</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chatName" className="text-text-primary">
              Название чата
            </Label>
            <Input
              id="chatName"
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
              placeholder="Например: Маркетинг, Администрация"
              className="bg-bg-soft text-text-primary border-border/50"
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          {userBranch && (
            <div className="text-sm text-text-secondary">
              Филиал: <span className="font-medium text-text-primary">{userBranch}</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting || !userBranch} className="btn-primary">
              {isSubmitting ? "Создание..." : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
