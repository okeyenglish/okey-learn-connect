import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Receipt, Users, FileText, Mail, MessageSquare, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface InvoiceGeneratorModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

interface Student {
  id: string;
  name: string;
  phone: string;
  email?: string;
  branch: string;
  group: string;
  balance: number;
}

export function InvoiceGeneratorModal({ open, onOpenChange, children }: InvoiceGeneratorModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('single');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const [singleInvoiceData, setSingleInvoiceData] = useState({
    student_id: '',
    amount: 0,
    description: '',
    notes: '',
    send_email: true,
    send_sms: false,
    send_whatsapp: false
  });

  const [bulkInvoiceData, setBulkInvoiceData] = useState({
    target_type: 'branch' as 'branch' | 'group' | 'selected' | 'overdue',
    target_value: '',
    amount: 0,
    description: '',
    notes: '',
    send_email: true,
    send_sms: false,
    send_whatsapp: false
  });

  // Моковые данные студентов
  const students: Student[] = [
    {
      id: '1',
      name: 'Иван Иванов',
      phone: '+7 (999) 123-45-67',
      email: 'ivan@example.com',
      branch: 'Окская',
      group: 'Начинающие A1',
      balance: -2500
    },
    {
      id: '2',
      name: 'Мария Петрова',
      phone: '+7 (999) 234-56-78',
      email: 'maria@example.com',
      branch: 'Мытищи',
      group: 'Продолжающие B1',
      balance: 1200
    },
    {
      id: '3',
      name: 'Алексей Сидоров',
      phone: '+7 (999) 345-67-89',
      email: 'alexey@example.com',
      branch: 'Люберцы',
      group: 'Разговорный клуб',
      balance: -800
    }
  ];

  const handleSingleInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!singleInvoiceData.student_id || singleInvoiceData.amount <= 0) {
      toast({
        title: "Ошибка",
        description: "Выберите студента и укажите сумму",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // В реальном приложении здесь будет вызов API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Успешно",
        description: "Счет создан и отправлен студенту"
      });

      // Сброс формы
      setSingleInvoiceData({
        student_id: '',
        amount: 0,
        description: '',
        notes: '',
        send_email: true,
        send_sms: false,
        send_whatsapp: false
      });
      setDueDate(undefined);
      
      onOpenChange?.(false);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать счет",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (bulkInvoiceData.amount <= 0) {
      toast({
        title: "Ошибка",
        description: "Укажите сумму счета",
        variant: "destructive"
      });
      return;
    }

    if (bulkInvoiceData.target_type === 'selected' && selectedStudents.length === 0) {
      toast({
        title: "Ошибка",
        description: "Выберите студентов для выставления счетов",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // В реальном приложении здесь будет вызов API
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const targetCount = bulkInvoiceData.target_type === 'selected' 
        ? selectedStudents.length 
        : getTargetStudentsCount();
      
      toast({
        title: "Успешно",
        description: `Создано и отправлено ${targetCount} счетов`
      });

      // Сброс формы
      setBulkInvoiceData({
        target_type: 'branch',
        target_value: '',
        amount: 0,
        description: '',
        notes: '',
        send_email: true,
        send_sms: false,
        send_whatsapp: false
      });
      setSelectedStudents([]);
      setDueDate(undefined);
      
      onOpenChange?.(false);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать счета",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTargetStudentsCount = () => {
    switch (bulkInvoiceData.target_type) {
      case 'branch':
        return students.filter(s => s.branch === bulkInvoiceData.target_value).length;
      case 'group':
        return students.filter(s => s.group === bulkInvoiceData.target_value).length;
      case 'overdue':
        return students.filter(s => s.balance < 0).length;
      default:
        return 0;
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    setSelectedStudents(students.map(s => s.id));
  };

  const deselectAllStudents = () => {
    setSelectedStudents([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создание счетов</DialogTitle>
          <DialogDescription>
            Создание и отправка счетов студентам
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="single">
              <Receipt className="h-4 w-4 mr-2" />
              Один счет
            </TabsTrigger>
            <TabsTrigger value="bulk">
              <FileText className="h-4 w-4 mr-2" />
              Массово
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Users className="h-4 w-4 mr-2" />
              Шаблоны
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Создать счет для студента</CardTitle>
                <CardDescription>
                  Выставление индивидуального счета
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSingleInvoice} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Студент</Label>
                      <Select
                        value={singleInvoiceData.student_id}
                        onValueChange={(value) => setSingleInvoiceData({...singleInvoiceData, student_id: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите студента" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{student.name}</span>
                                <Badge variant={student.balance < 0 ? "destructive" : "default"} className="ml-2">
                                  {student.balance < 0 ? `Долг: ${Math.abs(student.balance)}` : `Баланс: ${student.balance}`} ₽
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Сумма счета (₽)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={singleInvoiceData.amount || ''}
                        onChange={(e) => setSingleInvoiceData({...singleInvoiceData, amount: Number(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Срок оплаты</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dueDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dueDate ? format(dueDate, "PPP", { locale: ru }) : "Выберите дату"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dueDate}
                          onSelect={setDueDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Описание</Label>
                    <Input
                      placeholder="Например: Оплата за занятия в январе 2024"
                      value={singleInvoiceData.description}
                      onChange={(e) => setSingleInvoiceData({...singleInvoiceData, description: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Примечания</Label>
                    <Textarea
                      placeholder="Дополнительные комментарии к счету..."
                      value={singleInvoiceData.notes}
                      onChange={(e) => setSingleInvoiceData({...singleInvoiceData, notes: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Способы отправки</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="send_email"
                          checked={singleInvoiceData.send_email}
                          onCheckedChange={(checked) => 
                            setSingleInvoiceData({...singleInvoiceData, send_email: !!checked})
                          }
                        />
                        <Label htmlFor="send_email" className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Отправить по email
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="send_sms"
                          checked={singleInvoiceData.send_sms}
                          onCheckedChange={(checked) => 
                            setSingleInvoiceData({...singleInvoiceData, send_sms: !!checked})
                          }
                        />
                        <Label htmlFor="send_sms" className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Отправить SMS
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="send_whatsapp"
                          checked={singleInvoiceData.send_whatsapp}
                          onCheckedChange={(checked) => 
                            setSingleInvoiceData({...singleInvoiceData, send_whatsapp: !!checked})
                          }
                        />
                        <Label htmlFor="send_whatsapp" className="flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          Отправить в WhatsApp
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
                      Отмена
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Создаем счет..." : "Создать и отправить"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Массовое создание счетов</CardTitle>
                <CardDescription>
                  Создайте счета для группы студентов
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBulkInvoice} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Кому выставить счета</Label>
                      <Select
                        value={bulkInvoiceData.target_type}
                        onValueChange={(value: 'branch' | 'group' | 'selected' | 'overdue') => 
                          setBulkInvoiceData({...bulkInvoiceData, target_type: value, target_value: ''})
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="branch">По филиалу</SelectItem>
                          <SelectItem value="group">По группе</SelectItem>
                          <SelectItem value="selected">Выбранным студентам</SelectItem>
                          <SelectItem value="overdue">Должникам</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(bulkInvoiceData.target_type === 'branch' || bulkInvoiceData.target_type === 'group') && (
                      <div className="space-y-2">
                        <Label>
                          {bulkInvoiceData.target_type === 'branch' ? 'Филиал' : 'Группа'}
                        </Label>
                        <Select
                          value={bulkInvoiceData.target_value}
                          onValueChange={(value) => setBulkInvoiceData({...bulkInvoiceData, target_value: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={
                              bulkInvoiceData.target_type === 'branch' ? 'Выберите филиал' : 'Выберите группу'
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {bulkInvoiceData.target_type === 'branch' ? (
                              <>
                                <SelectItem value="Окская">Окская</SelectItem>
                                <SelectItem value="Мытищи">Мытищи</SelectItem>
                                <SelectItem value="Люберцы">Люберцы</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="Начинающие A1">Начинающие A1</SelectItem>
                                <SelectItem value="Продолжающие B1">Продолжающие B1</SelectItem>
                                <SelectItem value="Разговорный клуб">Разговорный клуб</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {bulkInvoiceData.target_type === 'selected' && (
                    <Card>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-base">Выберите студентов</CardTitle>
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={selectAllStudents}>
                              Выбрать всех
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={deselectAllStudents}>
                              Снять выбор
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[50px]">Выбор</TableHead>
                                <TableHead>Студент</TableHead>
                                <TableHead>Филиал</TableHead>
                                <TableHead>Группа</TableHead>
                                <TableHead>Баланс</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {students.map((student) => (
                                <TableRow key={student.id}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedStudents.includes(student.id)}
                                      onCheckedChange={() => toggleStudentSelection(student.id)}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    <div>
                                      <p>{student.name}</p>
                                      <p className="text-sm text-muted-foreground">{student.phone}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{student.branch}</Badge>
                                  </TableCell>
                                  <TableCell>{student.group}</TableCell>
                                  <TableCell>
                                    <Badge variant={student.balance < 0 ? "destructive" : "default"}>
                                      {student.balance < 0 
                                        ? `Долг: ${Math.abs(student.balance)} ₽` 
                                        : `${student.balance} ₽`
                                      }
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="mt-4 text-sm text-muted-foreground">
                          Выбрано студентов: {selectedStudents.length}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Сумма счета (₽)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={bulkInvoiceData.amount || ''}
                        onChange={(e) => setBulkInvoiceData({...bulkInvoiceData, amount: Number(e.target.value)})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Срок оплаты</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dueDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dueDate ? format(dueDate, "PPP", { locale: ru }) : "Выберите дату"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dueDate}
                            onSelect={setDueDate}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Описание</Label>
                    <Input
                      placeholder="Например: Оплата за занятия в январе 2024"
                      value={bulkInvoiceData.description}
                      onChange={(e) => setBulkInvoiceData({...bulkInvoiceData, description: e.target.value})}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Способы отправки</Label>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="bulk_send_email"
                          checked={bulkInvoiceData.send_email}
                          onCheckedChange={(checked) => 
                            setBulkInvoiceData({...bulkInvoiceData, send_email: !!checked})
                          }
                        />
                        <Label htmlFor="bulk_send_email" className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="bulk_send_sms"
                          checked={bulkInvoiceData.send_sms}
                          onCheckedChange={(checked) => 
                            setBulkInvoiceData({...bulkInvoiceData, send_sms: !!checked})
                          }
                        />
                        <Label htmlFor="bulk_send_sms" className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          SMS
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="bulk_send_whatsapp"
                          checked={bulkInvoiceData.send_whatsapp}
                          onCheckedChange={(checked) => 
                            setBulkInvoiceData({...bulkInvoiceData, send_whatsapp: !!checked})
                          }
                        />
                        <Label htmlFor="bulk_send_whatsapp" className="flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          WhatsApp
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm font-medium mb-1">Предварительный расчет:</p>
                    <p className="text-sm text-muted-foreground">
                      Будет создано примерно{' '}
                      <span className="font-medium">
                        {bulkInvoiceData.target_type === 'selected' 
                          ? selectedStudents.length 
                          : getTargetStudentsCount()
                        }
                      </span>{' '}
                      счетов на общую сумму{' '}
                      <span className="font-medium">
                        {((bulkInvoiceData.target_type === 'selected' 
                          ? selectedStudents.length 
                          : getTargetStudentsCount()) * bulkInvoiceData.amount).toLocaleString('ru-RU')} ₽
                      </span>
                    </p>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
                      Отмена
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Создаем счета..." : "Создать все счета"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Шаблоны счетов</CardTitle>
                <CardDescription>
                  Готовые шаблоны для быстрого создания счетов
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">Месячный абонемент</h4>
                        <Badge>4500 ₽</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Стандартный месячный абонемент на групповые занятия
                      </p>
                      <Button size="sm" variant="outline" className="w-full">
                        Использовать шаблон
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">Индивидуальные занятия</h4>
                        <Badge>8000 ₽</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Пакет из 4 индивидуальных занятий по 60 минут
                      </p>
                      <Button size="sm" variant="outline" className="w-full">
                        Использовать шаблон
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">Разговорный клуб</h4>
                        <Badge>2800 ₽</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Месячный абонемент на посещение разговорного клуба
                      </p>
                      <Button size="sm" variant="outline" className="w-full">
                        Использовать шаблон
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">Материалы и учебники</h4>
                        <Badge>1200 ₽</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Комплект учебных материалов на семестр
                      </p>
                      <Button size="sm" variant="outline" className="w-full">
                        Использовать шаблон
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}