import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  MoreVertical, 
  Edit, 
  Copy, 
  Trash2, 
  Settings2, 
  RefreshCw,
  ExternalLink,
  Link as LinkIcon
} from 'lucide-react';
import { LearningGroup } from '@/hooks/useLearningGroups';
import { useGroupPermissions } from '@/hooks/useGroupPermissions';
import { AutoGroupSettingsModal } from './AutoGroupSettingsModal';
import { CopyGroupModal } from './CopyGroupModal';
import { useToast } from '@/hooks/use-toast';
import { syncAutoGroup } from '@/utils/groupHelpers';

interface GroupActionsMenuProps {
  group: LearningGroup;
  onEdit?: () => void;
  onDelete?: () => void;
  onRefresh?: () => void;
}

export const GroupActionsMenu = ({ 
  group, 
  onEdit, 
  onDelete,
  onRefresh 
}: GroupActionsMenuProps) => {
  const { toast } = useToast();
  const { data: permissions } = useGroupPermissions(group.id);
  const [autoGroupSettingsOpen, setAutoGroupSettingsOpen] = useState(false);
  const [copyGroupOpen, setCopyGroupOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncAutoGroup = async () => {
    setIsSyncing(true);
    try {
      await syncAutoGroup(group.id);
      toast({
        title: "Успешно",
        description: "Состав авто-группы синхронизирован"
      });
      onRefresh?.();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось синхронизировать группу",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyEnrollmentLink = () => {
    if (group.enrollment_url) {
      navigator.clipboard.writeText(group.enrollment_url);
      toast({
        title: "Скопировано",
        description: "Ссылка на запись скопирована в буфер обмена"
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Действия</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {permissions?.canEdit && onEdit && (
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Редактировать
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={() => setCopyGroupOpen(true)}>
            <Copy className="mr-2 h-4 w-4" />
            Копировать группу
          </DropdownMenuItem>

          {group.enrollment_url && (
            <DropdownMenuItem onClick={handleCopyEnrollmentLink}>
              <LinkIcon className="mr-2 h-4 w-4" />
              Копировать ссылку на запись
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setAutoGroupSettingsOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            {group.is_auto_group ? 'Настройки авто-группы' : 'Сделать авто-группой'}
          </DropdownMenuItem>

          {group.is_auto_group && (
            <DropdownMenuItem 
              onClick={handleSyncAutoGroup}
              disabled={isSyncing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              Синхронизировать состав
            </DropdownMenuItem>
          )}

          {permissions?.canDelete && onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Удалить группу
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Модальные окна */}
      <AutoGroupSettingsModal
        group={group}
        open={autoGroupSettingsOpen}
        onOpenChange={setAutoGroupSettingsOpen}
        onSuccess={onRefresh}
      />

      <CopyGroupModal
        sourceGroup={group}
        open={copyGroupOpen}
        onOpenChange={setCopyGroupOpen}
        onSuccess={(newGroupId) => {
          console.log('Group copied, new ID:', newGroupId);
          onRefresh?.();
        }}
      />
    </>
  );
};
