import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/hooks/useOrganization';
import { useClassrooms } from '@/hooks/useReferences';
import { supabase } from '@/integrations/supabase/typedClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Phone, Mail, Edit, Trash2, Loader2, ChevronDown, ChevronRight, Building, DoorOpen, Users, GripVertical } from 'lucide-react';
import { OrganizationBranch } from '@/hooks/useOrganization';
import { ClassroomModal } from '@/components/references/ClassroomModal';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableBranchCardProps {
  branch: OrganizationBranch;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  classrooms: any[];
  onAddClassroom: () => void;
  onEditClassroom: (classroom: any) => void;
  onDeleteClassroom: (id: string) => void;
}

const SortableBranchCard = ({
  branch,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  classrooms,
  onAddClassroom,
  onEditClassroom,
  onDeleteClassroom,
}: SortableBranchCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: branch.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={isDragging ? 'ring-2 ring-primary shadow-lg' : ''}>
        <Collapsible open={isExpanded} onOpenChange={onToggle}>
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded transition-colors"
                  {...attributes}
                  {...listeners}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </button>
                <CollapsibleTrigger className="flex items-center gap-3 hover:text-primary transition-colors">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <Building className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <CardTitle className="text-base">{branch.name}</CardTitle>
                    {branch.address && (
                      <p className="text-xs text-muted-foreground font-normal mt-0.5">
                        {branch.address}
                      </p>
                    )}
                  </div>
                </CollapsibleTrigger>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <DoorOpen className="h-3 w-3" />
                  {classrooms.length} аудиторий
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onEdit}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-0 pb-4">
              <div className="border-t pt-4">
                {/* Branch contact info */}
                {(branch.phone || branch.email) && (
                  <div className="flex flex-wrap gap-4 mb-4 text-sm text-muted-foreground">
                    {branch.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        {branch.phone}
                      </div>
                    )}
                    {branch.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {branch.email}
                      </div>
                    )}
                  </div>
                )}

                {/* Classrooms section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <DoorOpen className="h-4 w-4" />
                      Аудитории
                    </h4>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={onAddClassroom}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Добавить
                    </Button>
                  </div>

                  {classrooms.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      Нет аудиторий в этом филиале
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {classrooms.map((classroom) => (
                        <div
                          key={classroom.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <DoorOpen className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{classroom.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {classroom.capacity}
                                </span>
                                {classroom.is_online && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                                    Онлайн
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => onEditClassroom(classroom)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => onDeleteClassroom(classroom.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
};

export const BranchesSettings = () => {
  const queryClient = useQueryClient();
  const { organization, branches, isLoading } = useOrganization();
  const { data: classrooms } = useClassrooms();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<OrganizationBranch | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());
  const [classroomModalOpen, setClassroomModalOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<any>(null);
  const [selectedBranchForClassroom, setSelectedBranchForClassroom] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
      queryClient.invalidateQueries({ queryKey: ['organization-branches'] });
      queryClient.invalidateQueries({ queryKey: ['all-organization-branches'] });
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
      queryClient.invalidateQueries({ queryKey: ['organization-branches'] });
      queryClient.invalidateQueries({ queryKey: ['all-organization-branches'] });
    } catch (error) {
      console.error('Error deleting branch:', error);
      toast.error('Ошибка при удалении филиала');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = branches.findIndex((b) => b.id === active.id);
    const newIndex = branches.findIndex((b) => b.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedBranches = arrayMove(branches, oldIndex, newIndex);

    // Optimistically update the UI
    queryClient.setQueryData(['organization-branches', organization?.id], reorderedBranches);

    setIsReordering(true);
    try {
      // Update sort_order for all affected branches
      const updates = reorderedBranches.map((branch, index) => ({
        id: branch.id,
        sort_order: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('organization_branches')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast.success('Порядок филиалов обновлён');
      queryClient.invalidateQueries({ queryKey: ['organization-branches'] });
      queryClient.invalidateQueries({ queryKey: ['all-organization-branches'] });
    } catch (error) {
      console.error('Error reordering branches:', error);
      toast.error('Ошибка при изменении порядка');
      // Revert on error
      queryClient.invalidateQueries({ queryKey: ['organization-branches'] });
    } finally {
      setIsReordering(false);
    }
  };

  const toggleBranch = (branchId: string) => {
    setExpandedBranches(prev => {
      const next = new Set(prev);
      if (next.has(branchId)) {
        next.delete(branchId);
      } else {
        next.add(branchId);
      }
      return next;
    });
  };

  const getClassroomsForBranch = (branchName: string) => {
    return (classrooms || []).filter(c => c.branch === branchName && c.is_active);
  };

  const handleAddClassroom = (branchName: string) => {
    setSelectedBranchForClassroom(branchName);
    setEditingClassroom({ branch: branchName });
    setClassroomModalOpen(true);
  };

  const handleEditClassroom = (classroom: any) => {
    setEditingClassroom(classroom);
    setClassroomModalOpen(true);
  };

  const handleDeleteClassroom = async (classroomId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту аудиторию?')) return;

    try {
      const { error } = await supabase
        .from('classrooms')
        .update({ is_active: false })
        .eq('id', classroomId);

      if (error) throw error;
      toast.success('Аудитория удалена');
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    } catch (error) {
      console.error('Error deleting classroom:', error);
      toast.error('Ошибка при удалении аудитории');
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
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Всего филиалов: {branches.length}
          </p>
          {isReordering && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Сохранение...
            </div>
          )}
        </div>
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

      {branches.length > 1 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <GripVertical className="h-3 w-3" />
          Перетащите филиалы для изменения порядка
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={branches.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {branches.map((branch) => {
              const branchClassrooms = getClassroomsForBranch(branch.name);
              const isExpanded = expandedBranches.has(branch.id);

              return (
                <SortableBranchCard
                  key={branch.id}
                  branch={branch}
                  isExpanded={isExpanded}
                  onToggle={() => toggleBranch(branch.id)}
                  onEdit={() => handleEdit(branch)}
                  onDelete={() => handleDelete(branch.id)}
                  classrooms={branchClassrooms}
                  onAddClassroom={() => handleAddClassroom(branch.name)}
                  onEditClassroom={handleEditClassroom}
                  onDeleteClassroom={handleDeleteClassroom}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {branches.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Building className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Нет добавленных филиалов</p>
          <p className="text-sm mt-1">Добавьте первый филиал, чтобы начать</p>
        </div>
      )}

      <ClassroomModal
        open={classroomModalOpen}
        onOpenChange={(open) => {
          setClassroomModalOpen(open);
          if (!open) setEditingClassroom(null);
        }}
        classroom={editingClassroom}
      />
    </div>
  );
};