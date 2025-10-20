import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AddTeacherModalProps {
  onTeacherAdded?: () => void;
}

export const AddTeacherModal = ({ onTeacherAdded }: AddTeacherModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userBranch, setUserBranch] = useState<string | null>(null);

  // Load user's branch on component mount
  React.useEffect(() => {
    const loadUserBranch = async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('branch')
        .eq('id', uid)
        .maybeSingle();
      
      setUserBranch(profile?.branch || null);
    };
    loadUserBranch();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !userBranch) {
      toast.error('Пожалуйста, заполните все поля');
      return;
    }

    setIsLoading(true);

    try {
      // Create client record for the teacher
      const teacherName = `Преподаватель: ${firstName} ${lastName}`;

      // Prevent duplicates by phone (except system '-')
      const { data: existing } = await supabase
        .from('clients')
        .select('id, name')
        .eq('phone', phone)
        .maybeSingle();
      if (existing?.id) {
        toast.error('Контакт с таким телефоном уже существует');
        setIsOpen(false);
        return;
      }
      
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          name: teacherName,
          phone: phone,
          branch: userBranch,
          notes: `Преподаватель: ${firstName} ${lastName}\nТелефон: ${phone}`
        })
        .select()
        .single();

      if (clientError) {
        throw clientError;
      }

      // Reset form
      setFirstName('');
      setLastName('');
      setPhone('');
      setIsOpen(false);
      
      toast.success('Преподаватель успешно добавлен');
      onTeacherAdded?.();
      
    } catch (error: any) {
      console.error('Error adding teacher:', error);
      if (error?.code === '23505') {
        toast.error('Контакт с таким телефоном уже существует');
      } else {
        toast.error('Ошибка при добавлении преподавателя');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Добавить преподавателя">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-surface">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-text-primary">
            <UserPlus className="h-5 w-5 text-brand" />
            Добавить преподавателя
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-sm font-medium text-text-secondary">Имя *</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Введите имя"
              required
              className="bg-surface border-border/50"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-sm font-medium text-text-secondary">Фамилия *</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Введите фамилию"
              required
              className="bg-surface border-border/50"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium text-text-secondary">Телефон *</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (999) 123-45-67"
              required
              className="bg-surface border-border/50"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium text-text-secondary">Филиал</Label>
            <div className="p-3 bg-bg-soft rounded-lg border border-border/50">
              <p className="text-sm font-medium text-text-primary">{userBranch || 'Не указан'}</p>
              <p className="text-xs text-text-muted">
                Преподаватель будет добавлен в ваш филиал
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
              className="btn-secondary"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="gap-2 btn-primary"
            >
              {isLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              Добавить
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};