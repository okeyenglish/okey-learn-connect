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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Link2, Loader2, Search, User, Check } from 'lucide-react';
import { useStaffMembers } from '@/hooks/useInternalStaffMessages';
import { supabase } from '@/integrations/supabase/typedClient';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface LinkTeacherProfileModalProps {
  teacherId: string;
  teacherName: string;
  currentProfileId?: string | null;
  onLinked?: () => void;
  children?: React.ReactNode;
}

export const LinkTeacherProfileModal: React.FC<LinkTeacherProfileModalProps> = ({
  teacherId,
  teacherName,
  currentProfileId,
  onLinked,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(currentProfileId || null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: staffMembers, isLoading: membersLoading } = useStaffMembers();
  const queryClient = useQueryClient();

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

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || '?';
  };

  const handleLink = async () => {
    if (!selectedProfileId) {
      toast.error('Выберите профиль пользователя');
      return;
    }

    setIsLinking(true);

    try {
      const { error } = await supabase
        .from('teachers')
        .update({ profile_id: selectedProfileId })
        .eq('id', teacherId);

      if (error) throw error;

      toast.success(`Преподаватель "${teacherName}" привязан к профилю`);
      
      // Invalidate teacher queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['teacher-chats'] });
      
      setOpen(false);
      onLinked?.();
    } catch (error: any) {
      console.error('Error linking teacher to profile:', error);
      toast.error(error.message || 'Ошибка привязки профиля');
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlink = async () => {
    setIsLinking(true);

    try {
      const { error } = await supabase
        .from('teachers')
        .update({ profile_id: null })
        .eq('id', teacherId);

      if (error) throw error;

      toast.success(`Привязка профиля для "${teacherName}" удалена`);
      setSelectedProfileId(null);
      
      queryClient.invalidateQueries({ queryKey: ['teacher-chats'] });
      
      setOpen(false);
      onLinked?.();
    } catch (error: any) {
      console.error('Error unlinking teacher profile:', error);
      toast.error(error.message || 'Ошибка отвязки профиля');
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="gap-1.5">
            <Link2 className="h-4 w-4" />
            Привязать профиль
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Привязка профиля
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Teacher info */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Преподаватель</p>
            <p className="font-medium">{teacherName}</p>
            {currentProfileId && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Профиль уже привязан
              </p>
            )}
          </div>

          {/* Profile Selection */}
          <div className="space-y-2 flex-1 overflow-hidden flex flex-col min-h-0">
            <Label>Выберите профиль пользователя</Label>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени или email..."
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
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
                  <User className="h-8 w-8 mb-2 opacity-50" />
                  {searchQuery ? 'Пользователи не найдены' : 'Нет доступных профилей'}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredMembers.map(member => {
                    const isSelected = selectedProfileId === member.id;
                    
                    return (
                      <button
                        key={member.id}
                        onClick={() => setSelectedProfileId(member.id)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-md transition-colors text-left ${
                          isSelected 
                            ? 'bg-primary/10 ring-1 ring-primary' 
                            : 'hover:bg-muted'
                        }`}
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className={`text-xs ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            {getInitials(member.first_name, member.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {member.first_name} {member.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.email}
                          </p>
                          {member.branch && (
                            <p className="text-xs text-muted-foreground truncate">
                              {member.branch}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-between pt-2">
            <div>
              {currentProfileId && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleUnlink}
                  disabled={isLinking}
                >
                  {isLinking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Отвязать
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLinking}
              >
                Отмена
              </Button>
              <Button
                onClick={handleLink}
                disabled={isLinking || !selectedProfileId || selectedProfileId === currentProfileId}
              >
                {isLinking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Привязать
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
