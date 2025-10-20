import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  useStudentDiscounts,
  useApplyDiscountToStudent,
  useRemoveStudentDiscount,
  useDiscountsSurcharges,
} from "@/hooks/useDiscounts";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Plus, Trash2, Calendar as CalendarIcon, TrendingDown, TrendingUp } from "lucide-react";

interface StudentDiscountsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
}

export function StudentDiscountsModal({
  open,
  onOpenChange,
  studentId,
  studentName,
}: StudentDiscountsModalProps) {
  const [activeTab, setActiveTab] = useState("list");
  const [selectedDiscountId, setSelectedDiscountId] = useState("");
  const [isPermanent, setIsPermanent] = useState(false);
  const [maxUses, setMaxUses] = useState("");
  const [validFrom, setValidFrom] = useState<Date | undefined>();
  const [validUntil, setValidUntil] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");

  const { data: studentDiscounts = [] } = useStudentDiscounts(studentId);
  const { data: availableDiscounts = [] } = useDiscountsSurcharges();
  const applyDiscount = useApplyDiscountToStudent();
  const removeDiscount = useRemoveStudentDiscount();

  const resetForm = () => {
    setSelectedDiscountId("");
    setIsPermanent(false);
    setMaxUses("");
    setValidFrom(undefined);
    setValidUntil(undefined);
    setNotes("");
  };

  const handleApply = async () => {
    if (!selectedDiscountId) return;

    await applyDiscount.mutateAsync({
      studentId,
      discountId: selectedDiscountId,
      isPermanent,
      maxUses: maxUses ? parseInt(maxUses) : undefined,
      validFrom: validFrom ? format(validFrom, 'yyyy-MM-dd') : undefined,
      validUntil: validUntil ? format(validUntil, 'yyyy-MM-dd') : undefined,
      notes,
    });

    resetForm();
    setActiveTab("list");
  };

  const handleRemove = async (id: string) => {
    await removeDiscount.mutateAsync({ id, studentId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Скидки и доплаты: {studentName}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">Применённые</TabsTrigger>
            <TabsTrigger value="add">Добавить</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <ScrollArea className="h-[500px] pr-4">
              {studentDiscounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Скидки не применены
                </div>
              ) : (
                <div className="space-y-3">
                  {studentDiscounts.map((sd) => (
                    <Card key={sd.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            {sd.discount?.type === 'discount' ? (
                              <TrendingDown className="h-4 w-4 text-green-500 mt-1" />
                            ) : (
                              <TrendingUp className="h-4 w-4 text-orange-500 mt-1" />
                            )}
                            <div>
                              <p className="font-medium">{sd.discount?.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {sd.is_permanent && (
                                  <Badge variant="outline" className="text-xs">Постоянная</Badge>
                                )}
                                {sd.max_uses && (
                                  <Badge variant="secondary" className="text-xs">
                                    {sd.times_used} / {sd.max_uses} использований
                                  </Badge>
                                )}
                              </div>
                              {(sd.valid_from || sd.valid_until) && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {sd.valid_from && `С ${format(new Date(sd.valid_from), 'd MMM yyyy', { locale: ru })}`}
                                  {sd.valid_from && sd.valid_until && ' • '}
                                  {sd.valid_until && `До ${format(new Date(sd.valid_until), 'd MMM yyyy', { locale: ru })}`}
                                </p>
                              )}
                              {sd.notes && (
                                <p className="text-xs text-muted-foreground mt-1">{sd.notes}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <p className={`text-lg font-bold ${
                              sd.discount?.type === 'discount' ? 'text-green-600' : 'text-orange-600'
                            }`}>
                              {sd.discount?.type === 'discount' ? '-' : '+'}
                              {sd.discount?.value}
                              {sd.discount?.value_type === 'percent' ? '%' : '₽'}
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemove(sd.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="add" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="discount">Выберите скидку/доплату</Label>
                <Select value={selectedDiscountId} onValueChange={setSelectedDiscountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите из списка" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDiscounts.map((discount) => (
                      <SelectItem key={discount.id} value={discount.id}>
                        {discount.name} ({discount.type === 'discount' ? '-' : '+'}
                        {discount.value}{discount.value_type === 'percent' ? '%' : '₽'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="permanent">Постоянная скидка</Label>
                <Switch
                  id="permanent"
                  checked={isPermanent}
                  onCheckedChange={setIsPermanent}
                />
              </div>

              <div>
                <Label htmlFor="max-uses">Максимум использований</Label>
                <Input
                  id="max-uses"
                  type="number"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="Неограниченно"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Действительна с</Label>
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
                        {validFrom ? format(validFrom, "d MMM yyyy", { locale: ru }) : "Выберите дату"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={validFrom}
                        onSelect={setValidFrom}
                        locale={ru}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Действительна до</Label>
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
                        {validUntil ? format(validUntil, "d MMM yyyy", { locale: ru }) : "Выберите дату"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={validUntil}
                        onSelect={setValidUntil}
                        locale={ru}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Примечания</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Комментарий"
                  rows={3}
                />
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
                  onClick={handleApply}
                  disabled={!selectedDiscountId || applyDiscount.isPending}
                  className="flex-1"
                >
                  Применить
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
