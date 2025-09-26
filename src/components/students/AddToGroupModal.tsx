import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useLearningGroups } from '@/hooks/useLearningGroups';
import { useGroupStudents } from '@/hooks/useGroupStudents';
import { useToast } from '@/hooks/use-toast';

interface AddToGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
}

export function AddToGroupModal({ open, onOpenChange, studentId, studentName }: AddToGroupModalProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { groups } = useLearningGroups({ status: ['active'] });
  const { addStudentToGroup } = useGroupStudents(selectedGroupId);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedGroupId) {
      toast({
        title: "Ошибка",
        description: "Выберите группу",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const success = await addStudentToGroup(studentId, notes);
    setLoading(false);

    if (success) {
      setSelectedGroupId('');
      setNotes('');
      onOpenChange(false);
    }
  };

  const availableGroups = groups.filter(group => 
    group.status === 'active' && 
    (group.current_students || 0) < (group.capacity || 0)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить в группу</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Студент</Label>
            <div className="text-sm text-muted-foreground">{studentName}</div>
          </div>

          <div>
            <Label htmlFor="group">Группа</Label>
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите группу" />
              </SelectTrigger>
              <SelectContent>
                {availableGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name} ({group.current_students || 0}/{group.capacity || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Примечания</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительная информация..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Добавление...' : 'Добавить'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}