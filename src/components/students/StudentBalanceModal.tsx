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
import { Loader2, Plus, Minus, History, ArrowDownCircle, ArrowUpCircle, BookOpen } from "lucide-react";
import { useAddBalanceTransaction, useBalanceTransactions, useStudentBalance } from "@/hooks/useStudentBalance";
import { useTuitionCharges } from "@/hooks/useTuitionCharges";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface StudentBalanceModalProps {
  studentId: string;
  studentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StudentBalanceModal = ({ 
  studentId, 
  studentName,
  open, 
  onOpenChange 
}: StudentBalanceModalProps) => {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionType, setTransactionType] = useState<'credit' | 'transfer_in'>('credit');

  const { data: balance } = useStudentBalance(studentId);
  const { data: transactions = [] } = useBalanceTransactions(studentId);
  const { data: tuitionCharges = [] } = useTuitionCharges(studentId);
  const addTransaction = useAddBalanceTransaction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return;
    }

    await addTransaction.mutateAsync({
      studentId,
      amount: numAmount,
      transactionType,
      description: description || `${transactionType === 'credit' ? 'Пополнение' : 'Перенос средств'}`,
    });

    setAmount("");
    setDescription("");
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'credit': return 'Пополнение';
      case 'debit': return 'Списание';
      case 'transfer_in': return 'Перенос средств';
      case 'refund': return 'Возврат';
      default: return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Личный баланс: {studentName}</DialogTitle>
        </DialogHeader>

        <div className="mb-4 p-4 bg-primary/10 rounded-lg">
          <div className="text-sm text-muted-foreground">Текущий баланс</div>
          <div className="text-3xl font-bold">
            {balance?.balance?.toFixed(2) || "0.00"} {balance?.currency || "₽"}
          </div>
        </div>

        <Tabs defaultValue="add" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="add">
              <Plus className="w-4 h-4 mr-2" />
              Пополнить
            </TabsTrigger>
            <TabsTrigger value="charges">
              <BookOpen className="w-4 h-4 mr-2" />
              Списания
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              История
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="transactionType">Тип операции</Label>
                <Select 
                  value={transactionType} 
                  onValueChange={(value: any) => setTransactionType(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Пополнение баланса</SelectItem>
                    <SelectItem value="transfer_in">Перенос неиспользованных средств</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Сумма (₽)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Комментарий к операции (необязательно)"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                >
                  Отмена
                </Button>
                <Button 
                  type="submit" 
                  disabled={addTransaction.isPending || !amount}
                >
                  {addTransaction.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Добавить
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="charges" className="space-y-2">
            <ScrollArea className="h-[400px] pr-4">
              {tuitionCharges.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Списания на обучение не найдены
                </div>
              ) : (
                <div className="space-y-3">
                  {tuitionCharges.map((charge) => (
                    <Card key={charge.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <ArrowDownCircle className="h-4 w-4 text-blue-500 mt-1" />
                            <div>
                              <p className="font-medium">
                                Списание на {charge.learning_unit_type === 'group' ? 'группу' : 'индивидуальные занятия'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {charge.academic_hours} ак.ч. • {charge.description || 'Оплата обучения'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(charge.charge_date), "d MMMM yyyy", { locale: ru })}
                              </p>
                              <span className={`text-xs px-2 py-1 rounded-full mt-2 inline-block ${
                                charge.status === 'active' 
                                  ? 'bg-green-100 text-green-700' 
                                  : charge.status === 'cancelled'
                                  ? 'bg-gray-100 text-gray-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {charge.status === 'active' ? 'Активно' : charge.status === 'cancelled' ? 'Отменено' : 'Возврат'}
                              </span>
                            </div>
                          </div>
                          <p className="font-semibold text-blue-600">
                            {charge.amount.toFixed(2)} ₽
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history" className="space-y-2">
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                История операций пуста
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {transactions.map((transaction) => (
                  <div 
                    key={transaction.id} 
                    className="p-3 border rounded-lg flex items-start justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {transaction.amount > 0 ? (
                          <Plus className="w-4 h-4 text-green-600" />
                        ) : (
                          <Minus className="w-4 h-4 text-red-600" />
                        )}
                        <span className="font-medium">
                          {getTransactionTypeLabel(transaction.transaction_type)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {transaction.description}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(transaction.created_at), "dd MMMM yyyy, HH:mm", { locale: ru })}
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(2)} ₽
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
