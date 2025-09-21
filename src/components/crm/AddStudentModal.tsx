import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Loader2, User, Calendar, BookOpen, CreditCard, FileText, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddStudentModalProps {
  familyGroupId: string;
  parentLastName?: string;
  onStudentAdded?: () => void;
  children?: React.ReactNode;
}

export const AddStudentModal = ({ familyGroupId, parentLastName, onStudentAdded, children }: AddStudentModalProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    lastName: parentLastName || "",
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
          name: `${formData.name} ${formData.lastName}`.trim(),
          first_name: formData.name,
          last_name: formData.lastName,
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
        lastName: parentLastName || "",
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
        {children || (
          <Button size="sm" className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg" variant="default">
            <GraduationCap className="h-4 w-4" />
            Добавить ученика
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden p-0">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
              <div className="p-2 bg-white/20 rounded-lg">
                <GraduationCap className="h-6 w-6" />
              </div>
              Добавить нового ученика
            </DialogTitle>
            <p className="text-blue-100 mt-2">Заполните информацию об ученике и его курсе</p>
          </DialogHeader>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Основная информация */}
            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-blue-600" />
                  Основная информация
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="student-name" className="flex items-center gap-2 font-medium">
                      <Star className="h-4 w-4 text-red-500" />
                      Имя ученика
                    </Label>
                    <Input
                      id="student-name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Например: Игорь"
                      required
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="student-lastname" className="flex items-center gap-2 font-medium">
                      <Star className="h-4 w-4 text-red-500" />
                      Фамилия ученика
                    </Label>
                    <Input
                      id="student-lastname"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Например: Волков"
                      required
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age" className="flex items-center gap-2 font-medium">
                      <Star className="h-4 w-4 text-red-500" />
                      <Calendar className="h-4 w-4 text-gray-500" />
                      Возраст
                    </Label>
                    <Input
                      id="age"
                      type="number"
                      min="3"
                      max="18"
                      value={formData.age}
                      onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                      placeholder="8 лет"
                      required
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date-of-birth" className="flex items-center gap-2 font-medium">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      Дата рождения
                    </Label>
                    <Input
                      id="date-of-birth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="flex items-center gap-2 font-medium">
                    <Badge className="h-4 w-4 rounded-full p-0" />
                    Статус обучения
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                          Пробный
                        </div>
                      </SelectItem>
                      <SelectItem value="active">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          Активный
                        </div>
                      </SelectItem>
                      <SelectItem value="inactive">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-500 rounded-full" />
                          Неактивный
                        </div>
                      </SelectItem>
                      <SelectItem value="graduated">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          Выпускник
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Информация о курсе */}
            <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="h-5 w-5 text-green-600" />
                  Информация о курсе
                  <Badge variant="secondary" className="text-xs">Опционально</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="course" className="flex items-center gap-2 font-medium">
                    <BookOpen className="h-4 w-4 text-green-600" />
                    Выбор курса
                  </Label>
                  <Select
                    value={formData.courseName}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, courseName: value }))}
                  >
                    <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                      <SelectValue placeholder="Выберите подходящий курс" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <div className="p-2">
                        <div className="text-xs font-semibold text-gray-500 mb-2">KIDS BOX</div>
                        {courses.filter(c => c.startsWith('Kids Box')).map(course => (
                          <SelectItem key={course} value={course} className="ml-2">{course}</SelectItem>
                        ))}
                        
                        <div className="text-xs font-semibold text-gray-500 mb-2 mt-3">SUPER SAFARI</div>
                        {courses.filter(c => c.startsWith('Super Safari')).map(course => (
                          <SelectItem key={course} value={course} className="ml-2">{course}</SelectItem>
                        ))}
                        
                        <div className="text-xs font-semibold text-gray-500 mb-2 mt-3">EMPOWER</div>
                        {courses.filter(c => c.startsWith('Empower')).map(course => (
                          <SelectItem key={course} value={course} className="ml-2">{course}</SelectItem>
                        ))}
                        
                        <div className="text-xs font-semibold text-gray-500 mb-2 mt-3">PREPARE</div>
                        {courses.filter(c => c.startsWith('Prepare')).map(course => (
                          <SelectItem key={course} value={course} className="ml-2">{course}</SelectItem>
                        ))}
                        
                        <div className="text-xs font-semibold text-gray-500 mb-2 mt-3">ДРУГИЕ</div>
                        {courses.filter(c => !c.startsWith('Kids Box') && !c.startsWith('Super Safari') && !c.startsWith('Empower') && !c.startsWith('Prepare')).map(course => (
                          <SelectItem key={course} value={course} className="ml-2">{course}</SelectItem>
                        ))}
                      </div>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment-amount" className="flex items-center gap-2 font-medium">
                      <CreditCard className="h-4 w-4 text-green-600" />
                      Стоимость курса
                    </Label>
                    <div className="relative">
                      <Input
                        id="payment-amount"
                        type="number"
                        value={formData.paymentAmount}
                        onChange={(e) => setFormData(prev => ({ ...prev, paymentAmount: e.target.value }))}
                        placeholder="11490"
                        className="pr-8 transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₽</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="next-payment" className="flex items-center gap-2 font-medium">
                      <Calendar className="h-4 w-4 text-green-600" />
                      Следующая оплата
                    </Label>
                    <Input
                      id="next-payment"
                      type="date"
                      value={formData.nextPaymentDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, nextPaymentDate: e.target.value }))}
                      className="transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Дополнительная информация */}
            <Card className="border-l-4 border-l-purple-500 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Дополнительная информация
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="student-notes" className="flex items-center gap-2 font-medium">
                    <FileText className="h-4 w-4 text-purple-600" />
                    Заметки об ученике
                  </Label>
                  <Textarea
                    id="student-notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Особенности, предпочтения, медицинские ограничения..."
                    rows={3}
                    className="resize-none transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </CardContent>
            </Card>
          </form>
        </div>

        {/* Кнопки действий */}
        <div className="border-t bg-gray-50 px-6 py-4">
          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="px-6"
            >
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              onClick={handleSubmit}
              className="px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Добавить ученика
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};