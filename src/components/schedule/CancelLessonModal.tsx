import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle, XCircle } from "lucide-react";
import { useUpdateLessonSession } from "@/hooks/useLessonSessions";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CancelLessonModalProps {
  session: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CancelLessonModal = ({ session, open, onOpenChange }: CancelLessonModalProps) => {
  const [reason, setReason] = useState("");
  const [cancelType, setCancelType] = useState<"single" | "all">("single");
  const updateSession = useUpdateLessonSession();
  const { toast } = useToast();

  const handleCancel = async () => {
    if (!session) return;

    try {
      await updateSession.mutateAsync({
        id: session.id,
        data: {
          status: 'cancelled',
          notes: `${session.notes || ''}\nОтменено: ${reason}`.trim(),
        },
      });

      toast({
        title: "Занятие отменено",
        description: cancelType === "all" 
          ? "Все занятия в серии отменены" 
          : "Занятие успешно отменено",
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error cancelling session:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отменить занятие",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Отменить занятие
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {session && (
            <div className="bg-muted p-3 rounded-lg space-y-1">
              <div className="font-medium">{session.learning_groups?.name || 'Группа'}</div>
              <div className="text-sm text-muted-foreground">
                {session.teacher_name} • {session.classroom}
              </div>
              <div className="text-sm text-muted-foreground">
                {session.start_time} - {session.end_time}
              </div>
            </div>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Отмена занятия зафиксируется в системе. Студенты будут уведомлены об отмене.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Label>Тип отмены</Label>
            <RadioGroup value={cancelType} onValueChange={(value) => setCancelType(value as "single" | "all")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="single" />
                <Label htmlFor="single" className="font-normal cursor-pointer">
                  Только это занятие
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="font-normal cursor-pointer">
                  Все занятия в серии
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Причина отмены *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Укажите причину отмены занятия..."
              rows={3}
              required
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Назад
          </Button>
          <Button 
            variant="destructive"
            onClick={handleCancel}
            disabled={!reason.trim() || updateSession.isPending}
          >
            {updateSession.isPending ? "Отменяется..." : "Отменить занятие"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};