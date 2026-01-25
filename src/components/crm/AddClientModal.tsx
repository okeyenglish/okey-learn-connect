import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateClient } from "@/hooks/useClients";
import { toast } from "sonner";
import { UserPlus, Loader2 } from "lucide-react";
import { getErrorMessage } from '@/lib/errorUtils';

interface AddClientModalProps {
  children?: React.ReactNode;
  onClientCreated?: (clientId: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const AddClientModal = ({ children, onClientCreated, open: externalOpen, onOpenChange: externalOnOpenChange }: AddClientModalProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });

  // Use external state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange !== undefined ? externalOnOpenChange : setInternalOpen;

  const createClientMutation = useCreateClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error("Имя и телефон обязательны для заполнения");
      return;
    }

    try {
      const client = await createClientMutation.mutateAsync({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        is_active: true
      });

      toast.success("Клиент успешно создан");
      setFormData({ name: '', phone: '', email: '', notes: '' });
      setOpen(false);
      if (client) {
        onClientCreated?.(client.id);
      }
    } catch (error: unknown) {
      toast.error("Ошибка при создании клиента: " + getErrorMessage(error));
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Render trigger only if children are provided OR if in uncontrolled mode */}
      {(children || externalOpen === undefined) && (
        <DialogTrigger asChild>
          {children || (
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Добавить клиента
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md bg-surface">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-text-primary">
            <UserPlus className="h-5 w-5 text-brand" />
            <span>Добавить нового клиента</span>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-text-secondary">Имя *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Введите имя клиента"
              required
              className="bg-surface border-border/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium text-text-secondary">Телефон *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="+7 (xxx) xxx-xx-xx"
              required
              className="bg-surface border-border/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-text-secondary">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="client@example.com"
              className="bg-surface border-border/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium text-text-secondary">Примечания</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Дополнительная информация о клиенте"
              rows={3}
              className="bg-surface border-border/50"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={createClientMutation.isPending}
              className="btn-secondary"
            >
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={createClientMutation.isPending}
              className="btn-primary"
            >
              {createClientMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Создание...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Создать
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};