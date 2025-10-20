import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit } from 'lucide-react';
import { useTeacherRates, useUpsertTeacherRate, useDeleteTeacherRate, TeacherRate } from '@/hooks/useTeacherSalary';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TeacherRatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
  teacherName: string;
}

export const TeacherRatesModal = ({
  open,
  onOpenChange,
  teacherId,
  teacherName,
}: TeacherRatesModalProps) => {
  const { data: rates = [] } = useTeacherRates(teacherId);
  const upsertRate = useUpsertTeacherRate();
  const deleteRate = useDeleteTeacherRate();
  
  const [editingRate, setEditingRate] = useState<Partial<TeacherRate> | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleSaveRate = async () => {
    if (!editingRate) return;

    await upsertRate.mutateAsync({
      ...editingRate,
      teacher_id: teacherId,
    });

    setEditingRate(null);
    setShowForm(false);
  };

  const handleNewRate = () => {
    setEditingRate({
      teacher_id: teacherId,
      lesson_type: 'group',
      rate_per_hour: 0,
      effective_from: new Date().toISOString().split('T')[0],
      branch: null,
      subject: null,
      level: null,
    });
    setShowForm(true);
  };

  const handleEditRate = (rate: TeacherRate) => {
    setEditingRate(rate);
    setShowForm(true);
  };

  const handleDeleteRate = async (rateId: string) => {
    if (confirm('Удалить эту ставку?')) {
      await deleteRate.mutateAsync(rateId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ставки преподавателя: {teacherName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!showForm ? (
            <>
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Управление ставками за академический час
                </p>
                <Button onClick={handleNewRate} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Добавить ставку
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тип</TableHead>
                    <TableHead>Ставка</TableHead>
                    <TableHead>Действует с</TableHead>
                    <TableHead>Действует до</TableHead>
                    <TableHead>Филиал</TableHead>
                    <TableHead>Предмет</TableHead>
                    <TableHead>Уровень</TableHead>
                    <TableHead className="w-[100px]">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Нет ставок
                      </TableCell>
                    </TableRow>
                  ) : (
                    rates.map((rate) => (
                      <TableRow key={rate.id}>
                        <TableCell>
                          <Badge variant={rate.lesson_type === 'group' ? 'default' : 'secondary'}>
                            {rate.lesson_type === 'group' ? 'Группа' : 'Индивид.'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{rate.rate_per_hour} ₽/ч</TableCell>
                        <TableCell>
                          {format(new Date(rate.effective_from), 'dd MMM yyyy', { locale: ru })}
                        </TableCell>
                        <TableCell>
                          {rate.effective_until
                            ? format(new Date(rate.effective_until), 'dd MMM yyyy', { locale: ru })
                            : '∞'}
                        </TableCell>
                        <TableCell>{rate.branch || '—'}</TableCell>
                        <TableCell>{rate.subject || '—'}</TableCell>
                        <TableCell>{rate.level || '—'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRate(rate)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRate(rate.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Тип занятия</Label>
                  <Select
                    value={editingRate?.lesson_type}
                    onValueChange={(value: 'group' | 'individual') =>
                      setEditingRate({ ...editingRate, lesson_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="group">Групповое</SelectItem>
                      <SelectItem value="individual">Индивидуальное</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ставка (₽/час)</Label>
                  <Input
                    type="number"
                    value={editingRate?.rate_per_hour || ''}
                    onChange={(e) =>
                      setEditingRate({
                        ...editingRate,
                        rate_per_hour: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Действует с</Label>
                  <Input
                    type="date"
                    value={editingRate?.effective_from || ''}
                    onChange={(e) =>
                      setEditingRate({ ...editingRate, effective_from: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Действует до (опционально)</Label>
                  <Input
                    type="date"
                    value={editingRate?.effective_until || ''}
                    onChange={(e) =>
                      setEditingRate({ ...editingRate, effective_until: e.target.value || null })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Филиал (опционально)</Label>
                  <Input
                    value={editingRate?.branch || ''}
                    onChange={(e) =>
                      setEditingRate({ ...editingRate, branch: e.target.value || null })
                    }
                    placeholder="Оставьте пустым для всех"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Предмет (опционально)</Label>
                  <Input
                    value={editingRate?.subject || ''}
                    onChange={(e) =>
                      setEditingRate({ ...editingRate, subject: e.target.value || null })
                    }
                    placeholder="Оставьте пустым для всех"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Уровень (опционально)</Label>
                  <Input
                    value={editingRate?.level || ''}
                    onChange={(e) =>
                      setEditingRate({ ...editingRate, level: e.target.value || null })
                    }
                    placeholder="Оставьте пустым для всех"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingRate(null);
                    setShowForm(false);
                  }}
                >
                  Отмена
                </Button>
                <Button onClick={handleSaveRate} disabled={upsertRate.isPending}>
                  {upsertRate.isPending ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
