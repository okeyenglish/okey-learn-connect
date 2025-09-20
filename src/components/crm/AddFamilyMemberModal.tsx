import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddFamilyMemberModalProps {
  familyGroupId: string;
  onMemberAdded?: () => void;
  children?: React.ReactNode;
}

export const AddFamilyMemberModal = ({ familyGroupId, onMemberAdded, children }: AddFamilyMemberModalProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    relationship: "parent" as "main" | "spouse" | "parent" | "guardian" | "other",
    isPrimaryContact: false,
    notes: ""
  });
  
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // First, create the client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert({
          name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
          notes: formData.notes || null
        })
        .select()
        .single();

      if (clientError) {
        if (clientError.code === '23505') { // Unique constraint violation
          toast({
            title: "Ошибка",
            description: "Клиент с таким номером телефона уже существует",
            variant: "destructive"
          });
          return;
        }
        throw clientError;
      }

      // If setting as primary contact, first remove primary from others
      if (formData.isPrimaryContact) {
        await supabase
          .from('family_members')
          .update({ is_primary_contact: false })
          .eq('family_group_id', familyGroupId);
      }

      // Then, add to family
      const { error: familyError } = await supabase
        .from('family_members')
        .insert({
          family_group_id: familyGroupId,
          client_id: clientData.id,
          relationship_type: formData.relationship,
          is_primary_contact: formData.isPrimaryContact
        });

      if (familyError) throw familyError;

      toast({
        title: "Успешно",
        description: "Новый член семьи добавлен"
      });

      // Reset form
      setFormData({
        name: "",
        phone: "",
        email: "",
        relationship: "parent",
        isPrimaryContact: false,
        notes: ""
      });
      
      setOpen(false);
      onMemberAdded?.();

    } catch (error) {
      console.error('Error adding family member:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить члена семьи",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRelationshipLabel = (value: string) => {
    const labels = {
      main: "Основной контакт",
      spouse: "Супруг(а)",
      parent: "Родитель",
      guardian: "Опекун",
      other: "Другое"
    };
    return labels[value as keyof typeof labels] || value;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button size="sm" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Добавить члена семьи
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить члена семьи</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Имя и фамилия *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Введите имя и фамилию"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Телефон *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+7 (999) 123-45-67"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="relationship">Родственная связь</Label>
            <Select
              value={formData.relationship}
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, relationship: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spouse">Супруг(а)</SelectItem>
                <SelectItem value="parent">Родитель</SelectItem>
                <SelectItem value="guardian">Опекун</SelectItem>
                <SelectItem value="other">Другое</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="primary-contact"
              checked={formData.isPrimaryContact}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPrimaryContact: checked }))}
            />
            <Label htmlFor="primary-contact">Основной контакт</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Заметки</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Дополнительная информация..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Добавить
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};