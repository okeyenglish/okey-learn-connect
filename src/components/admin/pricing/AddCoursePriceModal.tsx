import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface AddCoursePriceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCoursePriceModal({ open, onOpenChange }: AddCoursePriceModalProps) {
  const [courseName, setCourseName] = useState("");
  const [pricePerLesson, setPricePerLesson] = useState("");
  const [academicHours, setAcademicHours] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    toast.info("Функционал в разработке", {
      description: "Для изменения цен отредактируйте файл src/utils/coursePricing.ts"
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Добавить цену курса</DialogTitle>
          <DialogDescription>
            Добавьте новую стоимость для курса или программы
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="courseName">Название курса</Label>
              <Input
                id="courseName"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="Например: Super Safari 1"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pricePerLesson">Цена за занятие (₽)</Label>
              <Input
                id="pricePerLesson"
                type="number"
                value={pricePerLesson}
                onChange={(e) => setPricePerLesson(e.target.value)}
                placeholder="1250"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="academicHours">Академических часов</Label>
              <Input
                id="academicHours"
                type="number"
                step="0.5"
                value={academicHours}
                onChange={(e) => setAcademicHours(e.target.value)}
                placeholder="1.5"
                required
              />
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                <strong>Пакет 8 занятий:</strong>{" "}
                {pricePerLesson ? (Number(pricePerLesson) * 8).toLocaleString('ru-RU') : '0'} ₽
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit">Добавить</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
