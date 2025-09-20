import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GraduationCap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddStudentModalProps {
  familyGroupId: string;
  onStudentAdded?: () => void;
}

export const AddStudentModal = ({ familyGroupId, onStudentAdded }: AddStudentModalProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    dateOfBirth: "",
    status: "trial" as "active" | "inactive" | "trial" | "graduated",
    courseName: "",
    paymentAmount: "",
    nextPaymentDate: "",
    notes: ""
  });
  
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create the student
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .insert({
          family_group_id: familyGroupId,
          name: formData.name,
          age: parseInt(formData.age),
          date_of_birth: formData.dateOfBirth || null,
          status: formData.status,
          notes: formData.notes || null
        })
        .select()
        .single();

      if (studentError) throw studentError;

      // If course info provided, create student course record
      if (formData.courseName) {
        const { error: courseError } = await supabase
          .from('student_courses')
          .insert({
            student_id: studentData.id,
            course_name: formData.courseName,
            payment_amount: formData.paymentAmount ? parseFloat(formData.paymentAmount) : null,
            next_payment_date: formData.nextPaymentDate || null,
            is_active: true
          });

        if (courseError) throw courseError;
      }

      toast({
        title: "Успешно",
        description: "Новый ученик добавлен"
      });

      // Reset form
      setFormData({
        name: "",
        age: "",
        dateOfBirth: "",
        status: "trial",
        courseName: "",
        paymentAmount: "",
        nextPaymentDate: "",
        notes: ""
      });
      
      setOpen(false);
      onStudentAdded?.();

    } catch (error) {
      console.error('Error adding student:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить ученика",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusLabel = (value: string) => {
    const labels = {
      active: "Активный",
      inactive: "Неактивный", 
      trial: "Пробный",
      graduated: "Выпускник"
    };
    return labels[value as keyof typeof labels] || value;
  };

  const courses = [
    "Kids Box 1", "Kids Box 2", "Kids Box 3", "Kids Box 4", "Kids Box 5", "Kids Box 6",
    "Super Safari 1", "Super Safari 2", "Super Safari 3",
    "Empower A1", "Empower A2", "Empower B1", "Empower B1+", "Empower B2", "Empower C1",
    "Prepare 1", "Prepare 2", "Prepare 3", "Prepare 4", "Prepare 5", "Prepare 6", "Prepare 7",
    "Мини-садик"
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2" variant="outline">
          <GraduationCap className="h-4 w-4" />
          Добавить ученика
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Добавить ученика</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student-name">Имя ученика *</Label>
            <Input
              id="student-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Введите имя ученика"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">Возраст *</Label>
              <Input
                id="age"
                type="number"
                min="3"
                max="18"
                value={formData.age}
                onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                placeholder="8"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-of-birth">Дата рождения</Label>
              <Input
                id="date-of-birth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Статус</Label>
            <Select
              value={formData.status}
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">Пробный</SelectItem>
                <SelectItem value="active">Активный</SelectItem>
                <SelectItem value="inactive">Неактивный</SelectItem>
                <SelectItem value="graduated">Выпускник</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Информация о курсе (опционально)</h4>
            
            <div className="space-y-2">
              <Label htmlFor="course">Курс</Label>
              <Select
                value={formData.courseName}
                onValueChange={(value) => setFormData(prev => ({ ...prev, courseName: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите курс" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(course => (
                    <SelectItem key={course} value={course}>{course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Стоимость (₽)</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  value={formData.paymentAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentAmount: e.target.value }))}
                  placeholder="11490"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="next-payment">Дата оплаты</Label>
                <Input
                  id="next-payment"
                  type="date"
                  value={formData.nextPaymentDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, nextPaymentDate: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="student-notes">Заметки</Label>
            <Textarea
              id="student-notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Дополнительная информация об ученике..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Добавить
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};