import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AddCorporateChatModalProps {
  onChatAdded?: () => void;
}

const branches = [
  'Окская',
  'Котельники',
  'Стахановская',
  'Новокосино',
  'Мытищи',
  'Солнцево',
  'Онлайн'
];

export const AddCorporateChatModal = ({ onChatAdded }: AddCorporateChatModalProps) => {
  const [open, setOpen] = useState(false);
  const [chatName, setChatName] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!chatName.trim()) {
      toast.error("Введите название чата");
      return;
    }

    if (!selectedBranch) {
      toast.error("Выберите филиал");
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
        .eq('branch', selectedBranch)
        .maybeSingle();

      if (existingClient) {
        toast.error("Чат с таким названием уже существует в этом филиале");
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('clients')
        .insert({
          name: clientName,
          phone: '-',
          branch: selectedBranch
        });

      if (error) throw error;

      toast.success("Кастомный чат создан");
      setChatName("");
      setSelectedBranch("");
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="branch" className="text-text-primary">
              Филиал
            </Label>
            <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={isSubmitting}>
              <SelectTrigger className="bg-bg-soft text-text-primary border-border/50">
                <SelectValue placeholder="Выберите филиал" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? "Создание..." : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
