import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus } from "lucide-react";

interface CreateInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
}

export const CreateInvoiceModal = ({ open, onOpenChange, clientName }: CreateInvoiceModalProps) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    invoiceNumber: Math.floor(Math.random() * 10000000000).toString(),
    student: "",
    package: "",
    calculateDate: "",
    hours1: "1",
    hours2: "16",
    sum: "12490",
    paymentMethod: "cash",
    validUntil: "",
    addedBy: "Пышнов Данил Александрович",
    acceptedBy: "",
    acceptedDate: "",
    comments: ""
  });

  // Mock student data - would come from Supabase
  const students = [
    { id: "1", name: "Группа ОКЗВ_PR7", course: "Prepare_LITE2_80" },
    { id: "2", name: "Группа ENG_A1", course: "Kids_Box_1" },
    { id: "3", name: "Группа ADV_B2", course: "Empower_B2" }
  ];

  const packages = [
    { id: "prepare_80", name: "Prepare_LITE2_80", price: 12490, description: "12 490,00 за 16 а.ч." },
    { id: "kids_box", name: "Kids_Box_Basic", price: 8990, description: "8 990,00 за 12 а.ч." },
    { id: "empower", name: "Empower_Advanced", price: 15990, description: "15 990,00 за 20 а.ч." }
  ];

  const selectedPackage = packages.find(p => p.id === formData.package);

  const handleSave = () => {
    console.log('Creating invoice:', formData);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const calendarDates = [
    { date: "26.08", status: "past" },
    { date: "28.08", status: "past" },
    { date: "2.09", status: "past" },
    { date: "4.09", status: "past" },
    { date: "9.09", status: "past" },
    { date: "11.09", status: "past" },
    { date: "16.09", status: "past" },
    { date: "18.09", status: "past" },
    { date: "23.09", status: "active" },
    { date: "25.09", status: "active" },
    { date: "30.09", status: "future" },
    { date: "2.10", status: "future" },
    { date: "7.10", status: "future" },
    { date: "9.10", status: "future" },
    { date: "14.10", status: "future" },
    { date: "16.10", status: "future" },
    { date: "21.10", status: "future" },
    { date: "23.10", status: "future" },
    { date: "28.10", status: "future" },
    { date: "30.10", status: "future" },
    { date: "4.11", status: "future" },
    { date: "6.11", status: "future" },
    { date: "11.11", status: "future" },
    { date: "13.11", status: "future" },
    { date: "18.11", status: "future" },
    { date: "20.11", status: "future" },
    { date: "25.11", status: "future" }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-medium">
              {clientName}. Платёж за <span className="text-blue-600 underline">обучение</span>
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
          Денежные средства будут зачислены на личный счет плательщика и сразу переведены на счет его обучения за указанные занятия
        </div>

        <div className="space-y-6 py-4">
          {/* Date and Invoice Number Row */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="date">Дата:</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">№:</Label>
              <Input
                id="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                className="bg-muted"
                readOnly
              />
            </div>
          </div>

          {/* Student Selection */}
          <div className="space-y-2">
            <Label htmlFor="student">Занятия:</Label>
            <Select value={formData.student} onValueChange={(value) => setFormData({ ...formData, student: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Группа ОКЗВ_PR7" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Package and Price Row */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="package">Цена:</Label>
              <Select value={formData.package} onValueChange={(value) => {
                const pkg = packages.find(p => p.id === value);
                setFormData({ 
                  ...formData, 
                  package: value,
                  sum: pkg?.price.toString() || ""
                });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Пакетная" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="package">Пакетная</SelectItem>
                  <SelectItem value="hourly">Почасовая</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Пакет:</Label>
              <Select value={formData.package} onValueChange={(value) => {
                const pkg = packages.find(p => p.id === value);
                setFormData({ 
                  ...formData, 
                  package: value,
                  sum: pkg?.price.toString() || ""
                });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Prepare_LITE2_80 (12 490,00 за 16 а.ч.)" />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.description})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Calculate by Date */}
          <div className="space-y-2">
            <Label htmlFor="calculateDate">Рассчитать по дате:</Label>
            <Input
              id="calculateDate"
              type="date"
              value={formData.calculateDate}
              onChange={(e) => setFormData({ ...formData, calculateDate: e.target.value })}
            />
          </div>

          {/* Hours Calculation */}
          <div className="grid grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="hours1">Часы:</Label>
              <Input
                id="hours1"
                value={formData.hours1}
                onChange={(e) => setFormData({ ...formData, hours1: e.target.value })}
                className="text-center"
              />
            </div>
            <div className="flex items-center justify-center">
              <span className="text-2xl">×</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours2"></Label>
              <Input
                id="hours2"
                value={formData.hours2}
                onChange={(e) => setFormData({ ...formData, hours2: e.target.value })}
                className="text-center bg-muted"
                readOnly
              />
            </div>
            <div className="col-span-3">
              <Button variant="link" className="text-blue-600 p-0 h-auto">
                Академические часы
              </Button>
            </div>
          </div>

          {/* Sum and Payment Status */}
          <div className="grid grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="sum">Сумма:</Label>
              <Input
                id="sum"
                value={formData.sum}
                onChange={(e) => setFormData({ ...formData, sum: e.target.value })}
                className="bg-green-100 font-semibold"
              />
            </div>
            <div className="text-center">
              <span className="text-green-600 font-medium">рубли</span>
            </div>
            <div className="text-center">
              <Button variant="link" className="text-blue-600 p-0 h-auto underline">
                Оплачен
              </Button>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Способ оплаты:</Label>
            <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Наличные</SelectItem>
                <SelectItem value="card">Банковская карта</SelectItem>
                <SelectItem value="transfer">Банковский перевод</SelectItem>
                <SelectItem value="online">Онлайн оплата</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Discount and Additional Payment */}
          <div className="flex gap-4">
            <Button variant="link" className="text-blue-600 p-0 h-auto">
              <Plus className="h-4 w-4 mr-1" />
              скидка
            </Button>
            <Button variant="link" className="text-blue-600 p-0 h-auto">
              <Plus className="h-4 w-4 mr-1" />
              доплата
            </Button>
          </div>

          {/* Calculation Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-blue-800 font-medium">
              Расчёт: {formData.sum} руб. за {formData.hours2} а.ч. к оплате клиентом
            </p>
          </div>

          {/* Valid Until */}
          <div className="space-y-2">
            <Label htmlFor="validUntil">Действительна по:</Label>
            <Input
              id="validUntil"
              type="date"
              value={formData.validUntil}
              onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
            />
          </div>

          {/* Who Added */}
          <div className="space-y-2">
            <Label htmlFor="addedBy">Кто добавил:</Label>
            <Select value={formData.addedBy} onValueChange={(value) => setFormData({ ...formData, addedBy: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Пышнов Данил Александрович">Пышнов Данил Александрович</SelectItem>
                <SelectItem value="Иванов Иван Иванович">Иванов Иван Иванович</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Accepted By and Date */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="acceptedDate">Принял:</Label>
              <Input
                id="acceptedDate"
                type="date"
                value={formData.acceptedDate}
                onChange={(e) => setFormData({ ...formData, acceptedDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acceptedBy"></Label>
              <Select value={formData.acceptedBy} onValueChange={(value) => setFormData({ ...formData, acceptedBy: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Пышнов Данил Александрович" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Пышнов Данил Александрович">Пышнов Данил Александрович</SelectItem>
                  <SelectItem value="Иванов Иван Иванович">Иванов Иван Иванович</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <Label htmlFor="comments">Комментарий:</Label>
            <Textarea
              id="comments"
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              className="min-h-[80px]"
              placeholder="Добавить комментарий..."
            />
          </div>

          {/* Calendar */}
          <div className="space-y-2">
            <Label>Календарь занятий:</Label>
            <div className="grid grid-cols-14 gap-1">
              {calendarDates.map((dateObj, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className={`h-8 text-xs ${
                    dateObj.status === 'past' 
                      ? 'bg-gray-400 text-white' 
                      : dateObj.status === 'active'
                      ? 'bg-green-500 text-white'
                      : 'bg-teal-400 text-white'
                  }`}
                >
                  {dateObj.date}
                </Button>
              ))}
              <Button variant="outline" size="sm" className="h-8 text-xs">
                &gt;&gt;
              </Button>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Отменить
          </Button>
          <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
            Создать счёт
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};