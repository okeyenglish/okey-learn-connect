import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Users, Loader2, Search } from 'lucide-react';
import { useStaffMembers } from '@/hooks/useInternalStaffMessages';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CreateStaffGroupModalProps {
  onGroupCreated?: (groupId: string) => void;
  children?: React.ReactNode;
}

export const CreateStaffGroupModal: React.FC<CreateStaffGroupModalProps> = ({
  onGroupCreated,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: staffMembers, isLoading: membersLoading } = useStaffMembers();
  const { user, profile } = useAuth();

  const filteredMembers = useMemo(() => {
    if (!staffMembers) return [];
    if (!searchQuery.trim()) return staffMembers;
    
    const query = searchQuery.toLowerCase();
    return staffMembers.filter(member => 
      member.first_name?.toLowerCase().includes(query) ||
      member.last_name?.toLowerCase().includes(query) ||
      member.email?.toLowerCase().includes(query)
    );
  }, [staffMembers, searchQuery]);

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || '?';
  };

  const resetForm = () => {
    setGroupName('');
    setDescription('');
    setSelectedMembers([]);
    setSearchQuery('');
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error('Введите название группы');
      return;
    }
    
    if (selectedMembers.length === 0) {
      toast.error('Выберите хотя бы одного участника');
      return;
    }

    if (!user?.id || !profile?.organization_id) {
      toast.error('Ошибка аутентификации');
      return;
    }

    setIsCreating(true);

    try {
      // Create group in internal_chats table
      const { data: groupData, error: groupError } = await supabase
        .from('internal_chats')
        .insert({
          organization_id: profile.organization_id,
          name: groupName.trim(),
          description: description.trim() || null,
          chat_type: 'group',
          created_by: user.id,
          is_active: true,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add participants including creator
      const participantsToAdd = [
        { chat_id: groupData.id, user_id: user.id, role: 'admin', is_admin: true },
        ...selectedMembers.map(memberId => ({
          chat_id: groupData.id,
          user_id: memberId,
          role: 'member',
          is_admin: false,
        })),
      ];

      const { error: participantsError } = await supabase
        .from('internal_chat_participants')
        .insert(participantsToAdd);

      if (participantsError) throw participantsError;

      toast.success(`Групповой чат "${groupName}" создан`);
      resetForm();
      setOpen(false);
      onGroupCreated?.(groupData.id);
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast.error(error.message || 'Ошибка создания группы');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Создать групповой чат
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="groupName">Название группы *</Label>
            <Input
              id="groupName"
              placeholder="Например: Педагогический совет"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Input
              id="description"
              placeholder="Краткое описание группы"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={255}
            />
          </div>

          {/* Members Selection */}
          <div className="space-y-2 flex-1 overflow-hidden flex flex-col min-h-0">
            <Label>Участники ({selectedMembers.length} выбрано)</Label>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск сотрудников..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Members List */}
            <ScrollArea className="flex-1 border rounded-md min-h-[200px]">
              {membersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                  {searchQuery ? 'Сотрудники не найдены' : 'Нет доступных сотрудников'}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredMembers.map(member => (
                    <label
                      key={member.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedMembers.includes(member.id)}
                        onCheckedChange={() => toggleMember(member.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(member.first_name, member.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.first_name} {member.last_name}
                        </p>
                        {member.email && (
                          <p className="text-xs text-muted-foreground truncate">
                            {member.email}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
              disabled={isCreating}
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !groupName.trim() || selectedMembers.length === 0}
            >
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
