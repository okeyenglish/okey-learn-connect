import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Plus, Trash2, DollarSign, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface CreatePriceListModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

interface ServicePrice {
  id: string;
  service_name: string;
  service_category: string;
  price: number;
  unit: string;
  duration_minutes?: number;
  max_students?: number;
  is_active: boolean;
}

export function CreatePriceListModal({ open, onOpenChange, children }: CreatePriceListModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [validFrom, setValidFrom] = useState<Date | undefined>();
  const [validUntil, setValidUntil] = useState<Date | undefined>();
  const [services, setServices] = useState<ServicePrice[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    branch: '',
    is_default: false,
    is_active: true,
    currency: 'RUB'
  });

  const [newService, setNewService] = useState({
    service_name: '',
    service_category: 'individual',
    price: 0,
    unit: 'занятие',
    duration_minutes: 60,
    max_students: 1,
    is_active: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.branch) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive"
      });
      return;
    }

    if (services.length === 0) {
      toast({
        title: "Ошибка", 
        description: "Добавьте хотя бы одну услугу в прайс-лист",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // В реальном приложении здесь будет вызов API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Успешно",
        description: "Прайс-лист создан"
      });

      // Сброс формы
      setFormData({
        name: '',
        description: '',
        branch: '',
        is_default: false,
        is_active: true,
        currency: 'RUB'
      });
      setServices([]);
      setValidFrom(undefined);
      setValidUntil(undefined);
      
      onOpenChange?.(false);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать прайс-лист",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addService = () => {
    if (!newService.service_name || newService.price <= 0) {
      toast({
        title: "Ошибка",
        description: "Заполните название и цену услуги",
        variant: "destructive"
      });
      return;
    }

    const service: ServicePrice = {
      id: Date.now().toString(),
      ...newService
    };

    setServices([...services, service]);
    setNewService({
      service_name: '',
      service_category: 'individual',
      price: 0,
      unit: 'занятие',
      duration_minutes: 60,
      max_students: 1,
      is_active: true
    });
  };

  const removeService = (id: string) => {
    setServices(services.filter(s => s.id !== id));
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'individual': return 'Индивидуальные';
      case 'group': return 'Групповые';
      case 'club': return 'Клубы';
      case 'workshop': return 'Мастер-классы';
      default: return category;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать прайс-лист</DialogTitle>
          <DialogDescription>
            Создайте новый прайс-лист с ценами на услуги
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Основная информация */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Основная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Название прайс-листа *</Label>
                  <Input
                    id="name"
                    placeholder="Например: Стандартные цены 2024"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch">Филиал *</Label>
                  <Select
                    value={formData.branch}
                    onValueChange={(value) => setFormData({...formData, branch: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите филиал" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Окская">Окская</SelectItem>
                      <SelectItem value="Мытищи">Мытищи</SelectItem>
                      <SelectItem value="Люберцы">Люберцы</SelectItem>
                      <SelectItem value="Котельники">Котельники</SelectItem>
                      <SelectItem value="Солнцево">Солнцево</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  placeholder="Краткое описание прайс-листа..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Действует с</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !validFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {validFrom ? format(validFrom, "PPP", { locale: ru }) : "Выберите дату"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={validFrom}
                        onSelect={setValidFrom}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Действует до</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !validUntil && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {validUntil ? format(validUntil, "PPP", { locale: ru }) : "Без ограничений"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={validUntil}
                        onSelect={setValidUntil}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  />
                  <Label htmlFor="is_active">Активный</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_default"
                    checked={formData.is_default}
                    onCheckedChange={(checked) => setFormData({...formData, is_default: checked})}
                  />
                  <Label htmlFor="is_default">По умолчанию</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Добавление услуг */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Услуги и цены</CardTitle>
              <CardDescription>
                Добавьте услуги в прайс-лист
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Форма добавления новой услуги */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <Label>Название услуги</Label>
                  <Input
                    placeholder="Название"
                    value={newService.service_name}
                    onChange={(e) => setNewService({...newService, service_name: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Категория</Label>
                  <Select
                    value={newService.service_category}
                    onValueChange={(value) => setNewService({...newService, service_category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Индивидуальные</SelectItem>
                      <SelectItem value="group">Групповые</SelectItem>
                      <SelectItem value="club">Клубы</SelectItem>
                      <SelectItem value="workshop">Мастер-классы</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Цена (₽)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newService.price || ''}
                    onChange={(e) => setNewService({...newService, price: Number(e.target.value)})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Единица</Label>
                  <Select
                    value={newService.unit}
                    onValueChange={(value) => setNewService({...newService, unit: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="занятие">занятие</SelectItem>
                      <SelectItem value="час">час</SelectItem>
                      <SelectItem value="месяц">месяц</SelectItem>
                      <SelectItem value="абонемент">абонемент</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Длительность (мин)</Label>
                  <Input
                    type="number"
                    placeholder="60"
                    value={newService.duration_minutes || ''}
                    onChange={(e) => setNewService({...newService, duration_minutes: Number(e.target.value)})}
                  />
                </div>

                <div className="space-y-2 flex flex-col">
                  <Label className="mb-auto">Действие</Label>
                  <Button type="button" onClick={addService} className="h-10">
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить
                  </Button>
                </div>
              </div>

              {/* Список добавленных услуг */}
              {services.length > 0 && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Услуга</TableHead>
                        <TableHead>Категория</TableHead>
                        <TableHead>Цена</TableHead>
                        <TableHead>Длительность</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead className="w-[100px]">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.map((service) => (
                        <TableRow key={service.id}>
                          <TableCell className="font-medium">
                            {service.service_name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getCategoryLabel(service.service_category)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              {service.price.toLocaleString('ru-RU')} ₽
                              <span className="text-sm text-muted-foreground">/ {service.unit}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {service.duration_minutes} мин
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={service.is_active ? "default" : "secondary"}>
                              {service.is_active ? "Активна" : "Неактивна"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeService(service.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {services.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Добавьте услуги в прайс-лист
                </div>
              )}
            </CardContent>
          </Card>

          {/* Кнопки действий */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Создание..." : "Создать прайс-лист"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}