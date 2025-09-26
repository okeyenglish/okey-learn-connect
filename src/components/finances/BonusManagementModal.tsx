import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Plus, Minus, Gift, TrendingUp, TrendingDown, User, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BonusManagementModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
  studentId?: string;
  currentBalance?: number;
}

export function BonusManagementModal({ 
  open, 
  onOpenChange, 
  children, 
  studentId,
  currentBalance = 0 
}: BonusManagementModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('add');

  const [bonusData, setBonusData] = useState({
    student_id: studentId || '',
    amount: 0,
    transaction_type: 'earned' as 'earned' | 'spent',
    reason: '',
    description: '',
    expires_at: ''
  });

  const [bulkBonusData, setBulkBonusData] = useState({
    target_type: 'all_students' as 'all_students' | 'branch' | 'group',
    target_value: '',
    amount: 0,
    reason: '',
    description: '',
    expires_at: ''
  });

  const handleSingleBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bonusData.student_id || bonusData.amount <= 0) {
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
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const action = bonusData.transaction_type === 'earned' ? 'начислены' : 'списаны';
      
      toast({
        title: "Успешно",
        description: `Бонусы ${action}: ${bonusData.amount} б.`
      });

      // Сброс формы
      setBonusData({
        student_id: studentId || '',
        amount: 0,
        transaction_type: 'earned',
        reason: '',
        description: '',
        expires_at: ''
      });
      
      onOpenChange?.(false);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось обработать бонусы",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (bulkBonusData.amount <= 0) {
      toast({
        title: "Ошибка",
        description: "Укажите сумму бонусов",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // В реальном приложении здесь будет вызов API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Успешно",
        description: `Массовое начисление бонусов выполнено`
      });

      // Сброс формы
      setBulkBonusData({
        target_type: 'all_students',
        target_value: '',
        amount: 0,
        reason: '',
        description: '',
        expires_at: ''
      });
      
      onOpenChange?.(false);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось выполнить массовое начисление",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getReasonsForType = (type: 'earned' | 'spent') => {
    if (type === 'earned') {
      return [
        { value: 'payment', label: 'Оплата занятий' },
        { value: 'referral', label: 'Приведение друга' },
        { value: 'attendance', label: 'Посещаемость' },
        { value: 'promotion', label: 'Акция/промо' },
        { value: 'manual', label: 'Ручная корректировка' }
      ];
    } else {
      return [
        { value: 'payment', label: 'Оплата занятий' },
        { value: 'materials', label: 'Учебные материалы' },
        { value: 'events', label: 'Мероприятия' },
        { value: 'correction', label: 'Корректировка' }
      ];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Управление бонусами</DialogTitle>
          <DialogDescription>
            Начисление и списание бонусных баллов
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="add">
              <Plus className="h-4 w-4 mr-2" />
              Начислить
            </TabsTrigger>
            <TabsTrigger value="deduct">
              <Minus className="h-4 w-4 mr-2" />
              Списать
            </TabsTrigger>
            <TabsTrigger value="bulk">
              <Gift className="h-4 w-4 mr-2" />
              Массово
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Начисление бонусов
                </CardTitle>
                <CardDescription>
                  Начислите бонусные баллы студенту
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSingleBonus} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="student">Студент</Label>
                    <Select
                      value={bonusData.student_id}
                      onValueChange={(value) => setBonusData({...bonusData, student_id: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите студента" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student1">Иван Иванов</SelectItem>
                        <SelectItem value="student2">Мария Петрова</SelectItem>
                        <SelectItem value="student3">Алексей Сидоров</SelectItem>
                      </SelectContent>
                    </Select>
                    {currentBalance > 0 && (
                      <div className="text-sm text-muted-foreground">
                        Текущий баланс: <Badge variant="outline">{currentBalance} б.</Badge>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Сумма бонусов</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="Введите количество бонусов"
                        value={bonusData.amount || ''}
                        onChange={(e) => setBonusData({...bonusData, amount: Number(e.target.value)})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reason">Причина</Label>
                      <Select
                        value={bonusData.reason}
                        onValueChange={(value) => setBonusData({...bonusData, reason: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите причину" />
                        </SelectTrigger>
                        <SelectContent>
                          {getReasonsForType('earned').map((reason) => (
                            <SelectItem key={reason.value} value={reason.value}>
                              {reason.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Комментарий</Label>
                    <Textarea
                      id="description"
                      placeholder="Дополнительная информация о начислении..."
                      value={bonusData.description}
                      onChange={(e) => setBonusData({...bonusData, description: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
                      Отмена
                    </Button>
                    <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      {loading ? "Начисляем..." : "Начислить бонусы"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deduct" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  Списание бонусов
                </CardTitle>
                <CardDescription>
                  Спишите бонусные баллы у студента
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form 
                  onSubmit={(e) => {
                    setBonusData({...bonusData, transaction_type: 'spent'});
                    handleSingleBonus(e);
                  }} 
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="student">Студент</Label>
                    <Select
                      value={bonusData.student_id}
                      onValueChange={(value) => setBonusData({...bonusData, student_id: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите студента" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student1">Иван Иванов</SelectItem>
                        <SelectItem value="student2">Мария Петрова</SelectItem>
                        <SelectItem value="student3">Алексей Сидоров</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="deduct-amount">Сумма к списанию</Label>
                      <Input
                        id="deduct-amount"
                        type="number"
                        placeholder="Введите количество бонусов"
                        value={bonusData.amount || ''}
                        onChange={(e) => setBonusData({...bonusData, amount: Number(e.target.value)})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deduct-reason">Причина</Label>
                      <Select
                        value={bonusData.reason}
                        onValueChange={(value) => setBonusData({...bonusData, reason: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите причину" />
                        </SelectTrigger>
                        <SelectContent>
                          {getReasonsForType('spent').map((reason) => (
                            <SelectItem key={reason.value} value={reason.value}>
                              {reason.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deduct-description">Комментарий</Label>
                    <Textarea
                      id="deduct-description"
                      placeholder="Дополнительная информация о списании..."
                      value={bonusData.description}
                      onChange={(e) => setBonusData({...bonusData, description: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
                      Отмена
                    </Button>
                    <Button type="submit" disabled={loading} variant="destructive">
                      <TrendingDown className="h-4 w-4 mr-2" />
                      {loading ? "Списываем..." : "Списать бонусы"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-blue-600" />
                  Массовое начисление
                </CardTitle>
                <CardDescription>
                  Начислите бонусы группе студентов
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBulkBonus} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="target-type">Кому начислить</Label>
                      <Select
                        value={bulkBonusData.target_type}
                        onValueChange={(value: 'all_students' | 'branch' | 'group') => 
                          setBulkBonusData({...bulkBonusData, target_type: value, target_value: ''})
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all_students">Всем студентам</SelectItem>
                          <SelectItem value="branch">По филиалу</SelectItem>
                          <SelectItem value="group">По группе</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {bulkBonusData.target_type !== 'all_students' && (
                      <div className="space-y-2">
                        <Label htmlFor="target-value">
                          {bulkBonusData.target_type === 'branch' ? 'Филиал' : 'Группа'}
                        </Label>
                        <Select
                          value={bulkBonusData.target_value}
                          onValueChange={(value) => setBulkBonusData({...bulkBonusData, target_value: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={
                              bulkBonusData.target_type === 'branch' ? 'Выберите филиал' : 'Выберите группу'
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {bulkBonusData.target_type === 'branch' ? (
                              <>
                                <SelectItem value="Окская">Окская</SelectItem>
                                <SelectItem value="Мытищи">Мытищи</SelectItem>
                                <SelectItem value="Люберцы">Люберцы</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="group1">Начинающие A1</SelectItem>
                                <SelectItem value="group2">Продолжающие B1</SelectItem>
                                <SelectItem value="group3">Разговорный клуб</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bulk-amount">Сумма бонусов каждому</Label>
                      <Input
                        id="bulk-amount"
                        type="number"
                        placeholder="Введите количество бонусов"
                        value={bulkBonusData.amount || ''}
                        onChange={(e) => setBulkBonusData({...bulkBonusData, amount: Number(e.target.value)})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bulk-reason">Причина</Label>
                      <Select
                        value={bulkBonusData.reason}
                        onValueChange={(value) => setBulkBonusData({...bulkBonusData, reason: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите причину" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="promotion">Промо-акция</SelectItem>
                          <SelectItem value="holiday">Праздничные бонусы</SelectItem>
                          <SelectItem value="loyalty">Программа лояльности</SelectItem>
                          <SelectItem value="compensation">Компенсация</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bulk-description">Описание акции</Label>
                    <Textarea
                      id="bulk-description"
                      placeholder="Описание промо-акции или причины массового начисления..."
                      value={bulkBonusData.description}
                      onChange={(e) => setBulkBonusData({...bulkBonusData, description: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
                      Отмена
                    </Button>
                    <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                      <Gift className="h-4 w-4 mr-2" />
                      {loading ? "Начисляем..." : "Массовое начисление"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}