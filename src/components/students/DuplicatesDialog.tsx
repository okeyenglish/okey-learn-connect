import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
import { Users, Phone, User, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useFindDuplicates, type DuplicateGroup } from '@/hooks/useFindDuplicates';
import { useMergeStudents } from '@/hooks/useMergeStudents';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface DuplicatesDialogProps {
  children?: React.ReactNode;
}

export const DuplicatesDialog = ({ children }: DuplicatesDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  const [primaryId, setPrimaryId] = useState<string>('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: duplicates, isLoading } = useFindDuplicates();
  const mergeMutation = useMergeStudents();

  const handleMerge = () => {
    if (!selectedGroup || !primaryId) return;

    const duplicateIds = selectedGroup.students
      .filter(s => s.id !== primaryId)
      .map(s => s.id);

    mergeMutation.mutate(
      { primaryId, duplicateIds },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          setSelectedGroup(null);
          setPrimaryId('');
        },
      }
    );
  };

  const getMatchTypeLabel = (type: DuplicateGroup['matchType']) => {
    switch (type) {
      case 'phone':
        return 'По телефону';
      case 'name':
        return 'По ФИО';
      case 'both':
        return 'По телефону и ФИО';
    }
  };

  const getMatchTypeIcon = (type: DuplicateGroup['matchType']) => {
    switch (type) {
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'name':
      case 'both':
        return <User className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'trial':
        return 'bg-blue-100 text-blue-800';
      case 'graduated':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {children || (
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Поиск дубликатов
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Поиск и объединение дубликатов
            </DialogTitle>
            <DialogDescription>
              Найденные возможные дубликаты студентов по телефону или ФИО
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !duplicates || duplicates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Дубликаты не найдены</h3>
              <p className="text-sm text-muted-foreground">
                Все записи студентов уникальны
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {duplicates.map((group, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getMatchTypeIcon(group.matchType)}
                        <span className="font-medium">{getMatchTypeLabel(group.matchType)}</span>
                        <Badge variant="secondary">{group.students.length} записей</Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedGroup(group);
                          setPrimaryId(group.students[0].id);
                        }}
                      >
                        Объединить
                      </Button>
                    </div>

                    <div className="grid gap-3">
                      {group.students.map((student, idx) => (
                        <div key={student.id}>
                          {idx > 0 && <Separator className="my-2" />}
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{student.name}</span>
                                <Badge className={getStatusColor(student.status)}>
                                  {student.status}
                                </Badge>
                              </div>
                              {student.phone && (
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {student.phone}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                Создан: {format(new Date(student.created_at), 'dd MMM yyyy', { locale: ru })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог выбора основной записи */}
      {selectedGroup && (
        <Dialog
          open={!!selectedGroup}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedGroup(null);
              setPrimaryId('');
            }
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Выберите основную запись</DialogTitle>
              <DialogDescription>
                Все данные будут перенесены в выбранную запись. Остальные записи будут архивированы.
              </DialogDescription>
            </DialogHeader>

            <RadioGroup value={primaryId} onValueChange={setPrimaryId}>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {selectedGroup.students.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-start space-x-3 space-y-0 rounded-md border p-4 cursor-pointer hover:bg-accent"
                      onClick={() => setPrimaryId(student.id)}
                    >
                      <RadioGroupItem value={student.id} id={student.id} />
                      <div className="flex-1">
                        <Label
                          htmlFor={student.id}
                          className="font-medium cursor-pointer"
                        >
                          {student.name}
                        </Label>
                        <div className="space-y-1 mt-1">
                          {student.phone && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {student.phone}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            Создан: {format(new Date(student.created_at), 'dd MMM yyyy HH:mm', { locale: ru })}
                          </div>
                          <Badge className={getStatusColor(student.status)}>
                            {student.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </RadioGroup>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedGroup(null);
                  setPrimaryId('');
                }}
              >
                Отмена
              </Button>
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={!primaryId}
              >
                Продолжить
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Диалог подтверждения */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Подтвердите объединение
            </AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите объединить {selectedGroup?.students.length} записей?
              <br />
              <br />
              Все данные (группы, занятия, платежи, история) будут перенесены в основную запись.
              Остальные записи будут помечены как архивные.
              <br />
              <br />
              <strong>Это действие нельзя отменить!</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMerge}
              disabled={mergeMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {mergeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Объединение...
                </>
              ) : (
                'Объединить'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
