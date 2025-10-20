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
import { 
  useFamilyLedger, 
  useFamilyLedgerTransactions,
  useAddFamilyLedgerTransaction,
  useTransferToStudentBalance 
} from "@/hooks/useFamilyLedger";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ArrowDownCircle, ArrowUpCircle, ArrowRightLeft } from "lucide-react";

interface FamilyLedgerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyGroupId?: string;
  clientId?: string;
  clientName: string;
}

export function FamilyLedgerModal({
  open,
  onOpenChange,
  familyGroupId,
  clientId,
  clientName,
}: FamilyLedgerModalProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transferStudentId, setTransferStudentId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDescription, setTransferDescription] = useState("");

  const { data: ledger } = useFamilyLedger(familyGroupId, clientId);
  const { data: transactions = [] } = useFamilyLedgerTransactions(ledger?.id);
  const addTransaction = useAddFamilyLedgerTransaction();
  const transferToStudent = useTransferToStudentBalance();

  const handleAddMoney = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    await addTransaction.mutateAsync({
      familyGroupId,
      clientId,
      amount: parseFloat(amount),
      transactionType: 'credit',
      description: description || 'Пополнение семейной кассы',
    });

    setAmount("");
    setDescription("");
  };

  const handleTransferToStudent = async () => {
    if (!ledger || !transferStudentId || !transferAmount || parseFloat(transferAmount) <= 0) return;

    await transferToStudent.mutateAsync({
      familyLedgerId: ledger.id,
      studentId: transferStudentId,
      amount: parseFloat(transferAmount),
      description: transferDescription || 'Перевод на ЛС студента',
    });

    setTransferStudentId("");
    setTransferAmount("");
    setTransferDescription("");
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit':
      case 'refund':
        return <ArrowDownCircle className="h-4 w-4 text-green-500" />;
      case 'debit':
        return <ArrowUpCircle className="h-4 w-4 text-red-500" />;
      case 'transfer_to_student':
        return <ArrowRightLeft className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getTransactionLabel = (type: string) => {
    const labels: Record<string, string> = {
      credit: 'Пополнение',
      debit: 'Списание',
      transfer_to_student: 'Перевод студенту',
      refund: 'Возврат',
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Семейная касса: {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Баланс</p>
                <p className="text-3xl font-bold">
                  {ledger?.balance?.toFixed(2) || '0.00'} ₽
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="add" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="add">Пополнить</TabsTrigger>
            <TabsTrigger value="transfer">Перевести</TabsTrigger>
            <TabsTrigger value="history">История</TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Сумма (₽)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="description">Комментарий</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Описание операции"
                  rows={3}
                />
              </div>

              <Button 
                onClick={handleAddMoney}
                disabled={!amount || parseFloat(amount) <= 0 || addTransaction.isPending}
                className="w-full"
              >
                {addTransaction.isPending ? "Обработка..." : "Пополнить кассу"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="transfer" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="student">Студент</Label>
                <Input
                  id="student"
                  value={transferStudentId}
                  onChange={(e) => setTransferStudentId(e.target.value)}
                  placeholder="ID студента"
                />
              </div>

              <div>
                <Label htmlFor="transfer-amount">Сумма (₽)</Label>
                <Input
                  id="transfer-amount"
                  type="number"
                  step="0.01"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="transfer-description">Комментарий</Label>
                <Textarea
                  id="transfer-description"
                  value={transferDescription}
                  onChange={(e) => setTransferDescription(e.target.value)}
                  placeholder="Описание операции"
                  rows={3}
                />
              </div>

              <Button 
                onClick={handleTransferToStudent}
                disabled={
                  !ledger || 
                  !transferStudentId || 
                  !transferAmount || 
                  parseFloat(transferAmount) <= 0 ||
                  transferToStudent.isPending
                }
                className="w-full"
              >
                {transferToStudent.isPending ? "Обработка..." : "Перевести на ЛС студента"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    История операций пуста
                  </p>
                ) : (
                  transactions.map((transaction) => (
                    <Card key={transaction.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            {getTransactionIcon(transaction.transaction_type)}
                            <div>
                              <p className="font-medium">
                                {getTransactionLabel(transaction.transaction_type)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {transaction.description}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(transaction.created_at), "d MMMM yyyy, HH:mm", { locale: ru })}
                              </p>
                            </div>
                          </div>
                          <p className={`font-semibold ${
                            transaction.transaction_type === 'credit' || transaction.transaction_type === 'refund'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {transaction.transaction_type === 'credit' || transaction.transaction_type === 'refund' ? '+' : '-'}
                            {transaction.amount.toFixed(2)} ₽
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
