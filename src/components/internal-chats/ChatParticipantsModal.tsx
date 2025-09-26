import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, UserPlus, UserMinus, Crown, User } from 'lucide-react';
import { InternalChat, useAddChatParticipant, useRemoveChatParticipant } from '@/hooks/useInternalChats';
import { useEmployees } from '@/hooks/useEmployees';

interface ChatParticipantsModalProps {
  chat: InternalChat;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChatParticipantsModal: React.FC<ChatParticipantsModalProps> = ({
  chat,
  open,
  onOpenChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  const { data: employees } = useEmployees();
  const addParticipant = useAddChatParticipant();
  const removeParticipant = useRemoveChatParticipant();

  const participantIds = chat.participants.map(p => p.user_id);
  const availableEmployees = employees?.filter(emp => 
    !participantIds.includes(emp.id) &&
    emp.first_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredParticipants = chat.participants.filter(participant =>
    participant.profiles.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    participant.profiles.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddParticipant = async () => {
    if (!selectedUserId) return;

    try {
      await addParticipant.mutateAsync({
        chat_id: chat.id,
        user_id: selectedUserId,
        role: 'member'
      });
      setSelectedUserId('');
    } catch (error) {
      console.error('Error adding participant:', error);
    }
  };

  const handleRemoveParticipant = async (userId: string) => {
    try {
      await removeParticipant.mutateAsync({
        chat_id: chat.id,
        user_id: userId
      });
    } catch (error) {
      console.error('Error removing participant:', error);
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Участники чата &quot;{chat.name}&quot;</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Поиск участников..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Add Participant */}
          <div className="flex space-x-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Выберите сотрудника" />
              </SelectTrigger>
              <SelectContent>
                {availableEmployees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name}
                    {employee.branch && ` (${employee.branch})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddParticipant}
              disabled={!selectedUserId || addParticipant.isPending}
              size="sm"
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>

          {/* Participants List */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            <h4 className="font-medium text-sm text-muted-foreground">
              Участники ({filteredParticipants.length})
            </h4>
            
            {filteredParticipants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {searchQuery ? 'Участники не найдены' : 'Нет участников'}
              </p>
            ) : (
              filteredParticipants.map((participant) => (
                <div
                  key={participant.user_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(participant.profiles.first_name, participant.profiles.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <p className="font-medium text-sm">
                        {participant.profiles.first_name} {participant.profiles.last_name}
                      </p>
                      {participant.profiles.email && (
                        <p className="text-xs text-muted-foreground">
                          {participant.profiles.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={participant.is_admin ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {participant.is_admin ? (
                        <>
                          <Crown className="h-3 w-3 mr-1" />
                          Админ
                        </>
                      ) : (
                        <>
                          <User className="h-3 w-3 mr-1" />
                          Участник
                        </>
                      )}
                    </Badge>

                    {participant.is_muted && (
                      <Badge variant="outline" className="text-xs">
                        Отключен
                      </Badge>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveParticipant(participant.user_id)}
                      disabled={removeParticipant.isPending}
                      className="h-6 w-6 p-0"
                    >
                      <UserMinus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Info */}
          <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
            <p>Дата создания: {new Date(chat.created_at).toLocaleDateString('ru-RU')}</p>
            {chat.branch && <p>Филиал: {chat.branch}</p>}
            <p>Тип: {chat.chat_type}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};