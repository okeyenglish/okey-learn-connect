import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTuitionCharge } from "@/hooks/useTuitionCharges";

interface TuitionChargeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  learningUnitType?: 'group' | 'individual';
  learningUnitId?: string;
  learningUnitName?: string;
}

export function TuitionChargeModal({
  open,
  onOpenChange,
  studentId,
  studentName,
  learningUnitType,
  learningUnitId,
  learningUnitName,
}: TuitionChargeModalProps) {
  const [selectedUnitType, setSelectedUnitType] = useState<'group' | 'individual'>(
    learningUnitType || 'group'
  );
  const [selectedUnitId, setSelectedUnitId] = useState(learningUnitId || "");
  const [academicHours, setAcademicHours] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const createCharge = useCreateTuitionCharge();

  const handleSubmit = async () => {
    if (!selectedUnitId || !academicHours || !amount) return;

    await createCharge.mutateAsync({
      studentId,
      learningUnitType: selectedUnitType,
      learningUnitId: selectedUnitId,
      amount: parseFloat(amount),
      academicHours: parseFloat(academicHours),
      description: description || `Оплата за ${academicHours} ак.ч.`,
    });

    // Сброс формы
    setAcademicHours("");
    setAmount("");
    setDescription("");
    onOpenChange(false);
  };

  const calculateAmount = (hours: string) => {
    const h = parseFloat(hours);
    if (!isNaN(h)) {
      // 1 ак.ч. = 40 мин, базовая цена 1800₽ за 40 мин
      const calculatedAmount = h * 1800;
      setAmount(calculatedAmount.toFixed(2));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Списать средства на обучение
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Студент</Label>
            <Input value={studentName} disabled />
          </div>

          {!learningUnitType && (
            <div>
              <Label htmlFor="unit-type">Тип занятий</Label>
              <Select
                value={selectedUnitType}
                onValueChange={(value: 'group' | 'individual') => setSelectedUnitType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">Групповые</SelectItem>
                  <SelectItem value="individual">Индивидуальные</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {!learningUnitId && (
            <div>
              <Label htmlFor="unit-id">ID группы/курса</Label>
              <Input
                id="unit-id"
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                placeholder="Введите ID"
              />
            </div>
          )}

          {learningUnitName && (
            <div>
              <Label>Группа/Курс</Label>
              <Input value={learningUnitName} disabled />
            </div>
          )}

          <div>
            <Label htmlFor="hours">Количество ак.ч.</Label>
            <Input
              id="hours"
              type="number"
              step="0.5"
              value={academicHours}
              onChange={(e) => {
                setAcademicHours(e.target.value);
                calculateAmount(e.target.value);
              }}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              1 ак.ч. = 40 минут
            </p>
          </div>

          <div>
            <Label htmlFor="amount">Сумма (₽)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="description">Комментарий</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание операции"
              rows={3}
            />
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={
              !selectedUnitId || 
              !academicHours || 
              !amount || 
              createCharge.isPending
            }
            className="w-full"
          >
            {createCharge.isPending ? "Обработка..." : "Списать на обучение"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
