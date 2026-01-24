import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTransferBetweenStudents } from '@/hooks/useStudentBalances';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { ArrowRightLeft, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface StudentBalanceTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyGroupId?: string;
  preselectedFromStudentId?: string;
}

export const StudentBalanceTransferModal = ({
  open,
  onOpenChange,
  familyGroupId,
  preselectedFromStudentId,
}: StudentBalanceTransferModalProps) => {
  const [fromStudentId, setFromStudentId] = useState(preselectedFromStudentId || '');
  const [toStudentId, setToStudentId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [viaFamilyLedger, setViaFamilyLedger] = useState(true);

  const transferMutation = useTransferBetweenStudents();

  // Загружаем студентов семейной группы
  const { data: students = [] } = useQuery({
    queryKey: ['family-students', familyGroupId],
    queryFn: async () => {
      if (!familyGroupId) return [];
      
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('family_group_id', familyGroupId)
        .eq('status', 'active');

      if (error) throw error;
      return data || [];
    },
    enabled: !!familyGroupId && open,
  });

  // Загружаем балансы студентов
  const { data: balances } = useQuery({
    queryKey: ['student-balances-for-transfer', students.map(s => s.id)],
    queryFn: async () => {
      if (students.length === 0) return [];
      
      const { data, error } = await supabase
        .from('student_balances')
        .select('student_id, balance')
        .in('student_id', students.map(s => s.id));

      if (error) throw error;
      return data || [];
    },
    enabled: students.length > 0 && open,
  });

  const getStudentBalance = (studentId: string) => {
    const balance = balances?.find(b => b.student_id === studentId);
    return balance?.balance || 0;
  };

  const handleTransfer = async () => {
    if (!fromStudentId || !toStudentId || !amount || parseFloat(amount) <= 0) {
      return;
    }

    await transferMutation.mutateAsync({
      fromStudentId,
      toStudentId,
      amount: parseFloat(amount),
      description: description || 'Перевод между студентами',
      viaFamilyLedger,
    });

    // Reset form
    setFromStudentId(preselectedFromStudentId || '');
    setToStudentId('');
    setAmount('');
    setDescription('');
    onOpenChange(false);
  };

  const fromStudentBalance = fromStudentId ? getStudentBalance(fromStudentId) : 0;
  const insufficientFunds = parseFloat(amount) > fromStudentBalance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Перевод между студентами
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* От кого */}
          <div className="space-y-2">
            <Label>От кого (студент-отправитель)</Label>
            <Select value={fromStudentId} onValueChange={setFromStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите студента" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.first_name} {student.last_name} (
                    {getStudentBalance(student.id).toFixed(2)} ₽)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fromStudentId && (
              <p className="text-sm text-muted-foreground">
                Текущий баланс: <strong>{fromStudentBalance.toFixed(2)} ₽</strong>
              </p>
            )}
          </div>

          {/* Кому */}
          <div className="space-y-2">
            <Label>Кому (студент-получатель)</Label>
            <Select value={toStudentId} onValueChange={setToStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите студента" />
              </SelectTrigger>
              <SelectContent>
                {students
                  .filter((s) => s.id !== fromStudentId)
                  .map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.first_name} {student.last_name} (
                      {getStudentBalance(student.id).toFixed(2)} ₽)
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Сумма */}
          <div className="space-y-2">
            <Label>Сумма перевода (₽)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            {insufficientFunds && amount && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Недостаточно средств. Доступно: {fromStudentBalance.toFixed(2)} ₽
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Описание */}
          <div className="space-y-2">
            <Label>Описание (необязательно)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Причина перевода..."
              rows={2}
            />
          </div>

          {/* Метод перевода */}
          <div className="space-y-2">
            <Label>Метод перевода</Label>
            <Select
              value={viaFamilyLedger ? 'family' : 'direct'}
              onValueChange={(v) => setViaFamilyLedger(v === 'family')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="family">
                  Через семейный счет (рекомендуется)
                </SelectItem>
                <SelectItem value="direct">Прямой перевод</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {viaFamilyLedger
                ? 'Средства сначала возвращаются на семейный счет, затем переводятся получателю'
                : 'Прямой перевод со счета отправителя на счет получателя'}
            </p>
          </div>

          {/* Кнопки */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleTransfer}
              disabled={
                !fromStudentId ||
                !toStudentId ||
                !amount ||
                parseFloat(amount) <= 0 ||
                insufficientFunds ||
                transferMutation.isPending
              }
              className="flex-1"
            >
              {transferMutation.isPending ? 'Перевод...' : 'Перевести'}
            </Button>
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Отмена
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
