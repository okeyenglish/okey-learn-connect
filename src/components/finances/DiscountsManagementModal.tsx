import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  useDiscountsSurcharges,
  useCreateDiscount,
  useUpdateDiscount,
  DiscountSurcharge,
} from "@/hooks/useDiscounts";
import { Plus, Percent, DollarSign, Edit, TrendingDown, TrendingUp } from "lucide-react";

interface DiscountsManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DiscountsManagementModal({
  open,
  onOpenChange,
}: DiscountsManagementModalProps) {
  const [activeTab, setActiveTab] = useState("list");
  const [editingDiscount, setEditingDiscount] = useState<DiscountSurcharge | null>(null);
  
  const [name, setName] = useState("");
  const [type, setType] = useState<'discount' | 'surcharge'>('discount');
  const [valueType, setValueType] = useState<'fixed' | 'percent'>('percent');
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [isPermanent, setIsPermanent] = useState(false);
  const [autoApply, setAutoApply] = useState(false);
  const [priority, setPriority] = useState("0");

  const { data: discounts = [] } = useDiscountsSurcharges();
  const { data: surcharges = [] } = useDiscountsSurcharges('surcharge');
  const createDiscount = useCreateDiscount();
  const updateDiscount = useUpdateDiscount();

  const resetForm = () => {
    setName("");
    setType('discount');
    setValueType('percent');
    setValue("");
    setDescription("");
    setIsPermanent(false);
    setAutoApply(false);
    setPriority("0");
    setEditingDiscount(null);
  };

  const handleSubmit = async () => {
    if (!name || !value) return;

    const discountData = {
      name,
      type,
      value_type: valueType,
      value: parseFloat(value),
      description: description || undefined,
      is_permanent: isPermanent,
      auto_apply: autoApply,
      apply_priority: parseInt(priority),
      is_active: true,
    };

    if (editingDiscount) {
      await updateDiscount.mutateAsync({
        id: editingDiscount.id,
        updates: discountData,
      });
    } else {
      await createDiscount.mutateAsync(discountData);
    }

    resetForm();
    setActiveTab("list");
  };

  const handleEdit = (discount: DiscountSurcharge) => {
    setEditingDiscount(discount);
    setName(discount.name);
    setType(discount.type);
    setValueType(discount.value_type);
    setValue(discount.value.toString());
    setDescription(discount.description || "");
    setIsPermanent(discount.is_permanent);
    setAutoApply(discount.auto_apply);
    setPriority(discount.apply_priority.toString());
    setActiveTab("create");
  };

  const renderDiscountCard = (discount: DiscountSurcharge) => (
    <Card key={discount.id}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            {discount.type === 'discount' ? (
              <TrendingDown className="h-5 w-5 text-green-500 mt-1" />
            ) : (
              <TrendingUp className="h-5 w-5 text-orange-500 mt-1" />
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium">{discount.name}</p>
                {discount.is_permanent && (
                  <Badge variant="outline">Постоянная</Badge>
                )}
                {discount.auto_apply && (
                  <Badge variant="secondary">Авто</Badge>
                )}
              </div>
              {discount.description && (
                <p className="text-sm text-muted-foreground mb-2">
                  {discount.description}
                </p>
              )}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Приоритет: {discount.apply_priority}
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold ${
              discount.type === 'discount' ? 'text-green-600' : 'text-orange-600'
            }`}>
              {discount.type === 'discount' ? '-' : '+'}
              {discount.value}
              {discount.value_type === 'percent' ? '%' : '₽'}
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleEdit(discount)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Управление скидками и доплатами</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">Список</TabsTrigger>
            <TabsTrigger value="create">
              {editingDiscount ? "Редактировать" : "Создать"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Скидки</h3>
                  <div className="space-y-2">
                    {discounts.filter(d => d.type === 'discount').map(renderDiscountCard)}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Доплаты</h3>
                  <div className="space-y-2">
                    {discounts.filter(d => d.type === 'surcharge').map(renderDiscountCard)}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Название</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Скидка для постоянных клиентов"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Тип</Label>
                  <Select value={type} onValueChange={(v: any) => setType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discount">Скидка</SelectItem>
                      <SelectItem value="surcharge">Доплата</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="value-type">Способ расчёта</Label>
                  <Select value={valueType} onValueChange={(v: any) => setValueType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Процент</SelectItem>
                      <SelectItem value="fixed">Фиксированная сумма</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="value">Значение</Label>
                  <div className="relative">
                    <Input
                      id="value"
                      type="number"
                      step="0.01"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder="10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {valueType === 'percent' ? '%' : '₽'}
                    </span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="priority">Приоритет</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Опишите условия применения"
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="permanent">Постоянная</Label>
                  <Switch
                    id="permanent"
                    checked={isPermanent}
                    onCheckedChange={setIsPermanent}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-apply">Применять автоматически</Label>
                  <Switch
                    id="auto-apply"
                    checked={autoApply}
                    onCheckedChange={setAutoApply}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setActiveTab("list");
                  }}
                  className="flex-1"
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!name || !value || createDiscount.isPending || updateDiscount.isPending}
                  className="flex-1"
                >
                  {editingDiscount ? "Обновить" : "Создать"}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
