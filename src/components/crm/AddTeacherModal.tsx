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
      
    } catch (error) {
      console.error('Error adding teacher:', error);
      toast.error('Ошибка при добавлении преподавателя');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Добавить преподавателя
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Добавить преподавателя
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Имя *</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Введите имя"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="lastName">Фамилия *</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Введите фамилию"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Телефон *</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (999) 123-45-67"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>Филиал</Label>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{userBranch || 'Не указан'}</p>
              <p className="text-xs text-muted-foreground">
                Преподаватель будет добавлен в ваш филиал
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="gap-2"
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