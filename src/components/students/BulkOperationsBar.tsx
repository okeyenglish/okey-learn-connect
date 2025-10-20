import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Edit3, Tag, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useBulkUpdateStatus,
  useBulkAddToSegment,
  useBulkDeleteStudents,
} from '@/hooks/useBulkStudentOperations';

type StudentStatus = 'active' | 'inactive' | 'trial' | 'graduated';

interface BulkOperationsBarProps {
  selectedCount: number;
  selectedIds: string[];
  onClearSelection: () => void;
}

export const BulkOperationsBar = ({
  selectedCount,
  selectedIds,
  onClearSelection,
}: BulkOperationsBarProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedSegment, setSelectedSegment] = useState<string>('');

  const updateStatus = useBulkUpdateStatus();
  const addToSegment = useBulkAddToSegment();
  const deleteStudents = useBulkDeleteStudents();

  // Mock segments - will be replaced with real data later
  const segments = [
    { id: '1', name: 'VIP клиенты' },
    { id: '2', name: 'Новые студенты' },
    { id: '3', name: 'Активные' },
  ];

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    updateStatus.mutate(
      { studentIds: selectedIds, status: status as StudentStatus },
      {
        onSuccess: () => {
          onClearSelection();
          setSelectedStatus('');
        },
      }
    );
  };

  const handleAddToSegment = (segmentId: string) => {
    setSelectedSegment(segmentId);
    addToSegment.mutate(
      { studentIds: selectedIds, segmentId },
      {
        onSuccess: () => {
          onClearSelection();
          setSelectedSegment('');
        },
      }
    );
  };

  const handleDelete = () => {
    deleteStudents.mutate(selectedIds, {
      onSuccess: () => {
        onClearSelection();
        setShowDeleteDialog(false);
      },
    });
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
        <div className="bg-card border rounded-lg shadow-lg p-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              Выбрано: <span className="text-primary">{selectedCount}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-8 w-px bg-border" />

          <div className="flex items-center gap-2">
            <Select value={selectedStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px] h-9">
                <Edit3 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Изменить статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Активный</SelectItem>
                <SelectItem value="inactive">Неактивный</SelectItem>
                <SelectItem value="archived">В архиве</SelectItem>
                <SelectItem value="graduated">Завершил обучение</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedSegment} onValueChange={handleAddToSegment}>
              <SelectTrigger className="w-[180px] h-9">
                <Tag className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Добавить в сегмент" />
              </SelectTrigger>
              <SelectContent>
                {segments?.map((segment) => (
                  <SelectItem key={segment.id} value={segment.id}>
                    {segment.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить студентов?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить {selectedCount} студентов? Это
              действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
