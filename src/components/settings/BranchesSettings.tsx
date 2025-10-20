import { useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, MapPin, Phone, Mail, Edit, Trash2, Loader2 } from 'lucide-react';
import { OrganizationBranch } from '@/hooks/useOrganization';

export const BranchesSettings = () => {
  const { organization, branches, isLoading } = useOrganization();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<OrganizationBranch | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
    });
    setEditingBranch(null);
  };

  const handleEdit = (branch: OrganizationBranch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
    });
    setIsAddOpen(true);
  };

  const handleSave = async () => {
    if (!organization?.id) return;
    if (!formData.name) {
      toast.error('Укажите название филиала');
      return;
    }

    setIsSaving(true);
    try {
      if (editingBranch) {
        // Update existing branch
        const { error } = await supabase
          .from('organization_branches')
          .update({
            name: formData.name,
            address: formData.address || null,
            phone: formData.phone || null,
            email: formData.email || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingBranch.id);

        if (error) throw error;
        toast.success('Филиал обновлен');
      } else {
        // Create new branch
        const { error } = await supabase
          .from('organization_branches')
          .insert({
            organization_id: organization.id,
            name: formData.name,
            address: formData.address || null,
            phone: formData.phone || null,
            email: formData.email || null,
            sort_order: branches.length,
          });

        if (error) throw error;
        toast.success('Филиал добавлен');
      }

      setIsAddOpen(false);
      resetForm();
      window.location.reload(); // Reload to refresh data
    } catch (error) {
      console.error('Error saving branch:', error);
      toast.error('Ошибка при сохранении филиала');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (branchId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот филиал?')) return;

    try {
      const { error } = await supabase
        .from('organization_branches')
        .update({ is_active: false })
        .eq('id', branchId);

      if (error) throw error;
      toast.success('Филиал удален');
      window.location.reload();
    } catch (error) {
      console.error('Error deleting branch:', error);
      toast.error('Ошибка при удалении филиала');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Всего филиалов: {branches.length}
        </p>
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Добавить филиал
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBranch ? 'Редактировать филиал' : 'Добавить филиал'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="branch-name">Название филиала *</Label>
                <Input
                  id="branch-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Центральный офис"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-address">Адрес</Label>
                <Textarea
                  id="branch-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="г. Москва, ул. Ленина, д. 1"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-phone">Телефон</Label>
                <Input
                  id="branch-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-email">Email</Label>
                <Input
                  id="branch-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="branch@example.com"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingBranch ? 'Сохранить' : 'Добавить'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {branches.map((branch) => (
          <Card key={branch.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold">{branch.name}</h3>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(branch)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(branch.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                {branch.address && (
                  <div className="flex gap-2">
                    <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{branch.address}</span>
                  </div>
                )}
                {branch.phone && (
                  <div className="flex gap-2">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span>{branch.phone}</span>
                  </div>
                )}
                {branch.email && (
                  <div className="flex gap-2">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span>{branch.email}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {branches.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Нет добавленных филиалов
        </div>
      )}
    </div>
  );
};
