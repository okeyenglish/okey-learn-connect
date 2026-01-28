import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface TelephonyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TelephonyModal = ({ open, onOpenChange }: TelephonyModalProps) => {
  const { user, profile } = useAuth();
  const [extensionNumber, setExtensionNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadExtensionNumber();
    }
  }, [open, user]);

  const loadExtensionNumber = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('extension_number')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setExtensionNumber(data?.extension_number || '');
    } catch (error) {
      console.error('Error loading extension number:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ extension_number: extensionNumber.trim() || null })
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success('Номер оператора сохранён');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving extension number:', error);
      toast.error('Ошибка сохранения номера оператора');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Телефония
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Укажите ваш внутренний номер оператора (добавочный), который будет использоваться для исходящих звонков через OnlinePBX.
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="extension">Номер оператора</Label>
            {loading ? (
              <div className="h-10 flex items-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Input
                id="extension"
                placeholder="101"
                value={extensionNumber}
                onChange={(e) => setExtensionNumber(e.target.value)}
                className="font-mono"
              />
            )}
            <p className="text-xs text-muted-foreground">
              Например: 101, 102, 201 и т.д.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Сохранить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
