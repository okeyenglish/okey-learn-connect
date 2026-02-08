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
import { useCreateStaffGroupChat } from '@/hooks/useStaffGroupChats';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

interface CreateStaffGroupModalProps {
  onGroupCreated?: (groupId: string) => void;
  children?: React.ReactNode;
}

export const CreateStaffGroupModal: React.FC<CreateStaffGroupModalProps> = ({
  onGroupCreated,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: staffMembers, isLoading: membersLoading } = useStaffMembers();
  const { user } = useAuth();
  const createGroup = useCreateStaffGroupChat();
  const queryClient = useQueryClient();

  const filteredMembers = useMemo(() => {
    if (!staffMembers) return [];
    // Exclude current user from the list
    const members = staffMembers.filter(m => m.id !== user?.id);
    
    if (!searchQuery.trim()) return members;
    
    const query = searchQuery.toLowerCase();
    return members.filter(member => 
      member.first_name?.toLowerCase().includes(query) ||
      member.last_name?.toLowerCase().includes(query) ||
      member.email?.toLowerCase().includes(query) ||
      member.branch?.toLowerCase().includes(query)
    );
  }, [staffMembers, searchQuery, user?.id]);

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
    if (!groupName.trim()) return;
    
    try {
      const result = await createGroup.mutateAsync({
        name: groupName.trim(),
        description: description.trim() || undefined,
        member_ids: selectedMembers,
        is_branch_group: false,
      });
      
      queryClient.invalidateQueries({ queryKey: ['staff-group-chats'] });
      resetForm();
      setOpen(false);
      onGroupCreated?.(result.id);
    } catch (error) {
      // Error is handled in the mutation
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
                        <p className="text-xs text-muted-foreground truncate">
                          {member.branch || member.email || ''}
                        </p>
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
              disabled={createGroup.isPending}
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createGroup.isPending || !groupName.trim()}
            >
              {createGroup.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
