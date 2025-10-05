import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface StudentLessonStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentLessonSessionId: string;
  studentName: string;
  lessonDate: string;
  onUpdate?: () => void;
}

export const StudentLessonStatusModal = ({
  isOpen,
  onClose,
  studentLessonSessionId,
  studentName,
  lessonDate,
  onUpdate
}: StudentLessonStatusModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && studentLessonSessionId) {
      fetchSessionData();
    }
  }, [isOpen, studentLessonSessionId]);

  const fetchSessionData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_lesson_sessions')
        .select('*')
        .eq('id', studentLessonSessionId)
        .single();

      if (error) throw error;
      setSessionData(data);
    } catch (error) {
      console.error('Error fetching session data:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные занятия",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!sessionData) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('student_lesson_sessions')
        .update({
          attendance_status: sessionData.attendance_status,
          payment_status: sessionData.payment_status,
          payment_amount: sessionData.payment_amount,
          notes: sessionData.notes,
          is_cancelled_for_student: sessionData.is_cancelled_for_student,
          cancellation_reason: sessionData.cancellation_reason,
        } as any)
        .eq('id', studentLessonSessionId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Данные занятия обновлены",
      });

      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Error updating session:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить данные",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Редактирование занятия для {studentName}
            <div className="text-sm text-muted-foreground mt-1">
              Дата: {new Date(lessonDate).toLocaleDateString('ru-RU')}
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sessionData ? (
          <div className="space-y-4">
            <div>
              <Label>Посещаемость</Label>
              <Select
                value={sessionData.attendance_status}
                onValueChange={(value) => setSessionData({ ...sessionData, attendance_status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_marked">Не отмечено</SelectItem>
                  <SelectItem value="present">Присутствовал</SelectItem>
                  <SelectItem value="absent">Отсутствовал</SelectItem>
                  <SelectItem value="excused">Отсутствовал (уважительная)</SelectItem>
                  <SelectItem value="late">Опоздал</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Статус оплаты</Label>
              <Select
                value={sessionData.payment_status}
                onValueChange={(value) => setSessionData({ ...sessionData, payment_status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_paid">Не оплачено</SelectItem>
                  <SelectItem value="paid">Оплачено</SelectItem>
                  <SelectItem value="free">Бесплатно</SelectItem>
                  <SelectItem value="bonus">Бонусами</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {sessionData.payment_status === 'paid' && (
              <div>
                <Label>Сумма оплаты</Label>
                <Input
                  type="number"
                  value={sessionData.payment_amount || 0}
                  onChange={(e) => setSessionData({ ...sessionData, payment_amount: parseFloat(e.target.value) || 0 })}
                  placeholder="Введите сумму"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cancelled"
                checked={sessionData.is_cancelled_for_student}
                onChange={(e) => setSessionData({ ...sessionData, is_cancelled_for_student: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="cancelled">Отменено для этого студента</Label>
            </div>

            {sessionData.is_cancelled_for_student && (
              <div>
                <Label>Причина отмены</Label>
                <Input
                  value={sessionData.cancellation_reason || ''}
                  onChange={(e) => setSessionData({ ...sessionData, cancellation_reason: e.target.value })}
                  placeholder="Укажите причину"
                />
              </div>
            )}

            <div>
              <Label>Заметки</Label>
              <Textarea
                value={sessionData.notes || ''}
                onChange={(e) => setSessionData({ ...sessionData, notes: e.target.value })}
                placeholder="Дополнительные заметки"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose}>
                Отмена
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Сохранить
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
