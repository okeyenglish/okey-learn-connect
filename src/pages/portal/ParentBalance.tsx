import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Wallet, ArrowUpCircle, ArrowDownCircle, CreditCard, Clock, TrendingUp, TrendingDown } from "lucide-react";

interface PortalContext {
  selectedStudent: any;
  students: any[];
}

interface BalanceTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  description: string | null;
  payment_method: string | null;
  payment_date: string | null;
  created_at: string;
}

export default function ParentBalance() {
  const { selectedStudent, students } = useOutletContext<PortalContext>();
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"transactions" | "payments">("transactions");

  useEffect(() => {
    if (selectedStudent?.id) {
      loadData();
    }
  }, [selectedStudent?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load transactions
      const { data: transData } = await supabase
        .from("balance_transactions")
        .select("*")
        .eq("student_id", selectedStudent.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setTransactions((transData as BalanceTransaction[]) || []);

      // Load payments
      const { data: payData } = await supabase
        .from("payments")
        .select("*")
        .eq("student_id", selectedStudent.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setPayments((payData as Payment[]) || []);
    } catch (err) {
      console.error("Error loading balance data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount > 0 || type === "payment" || type === "deposit") {
      return <ArrowUpCircle className="h-5 w-5 text-green-500" />;
    }
    return <ArrowDownCircle className="h-5 w-5 text-red-500" />;
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Оплачено</Badge>;
      case "pending":
        return <Badge variant="secondary">Ожидает</Badge>;
      case "failed":
        return <Badge variant="destructive">Ошибка</Badge>;
      case "refunded":
        return <Badge variant="outline">Возврат</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = Math.abs(
    transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0)
  );

  const currentBalance = selectedStudent?.balance || 0;

  if (!selectedStudent) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Выберите ребёнка для просмотра баланса
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-6 w-6" />
          Баланс и оплаты
        </h1>
        <p className="text-muted-foreground">
          {selectedStudent.first_name} {selectedStudent.last_name}
        </p>
      </div>

      {/* Balance cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Текущий баланс</p>
                <p className={`text-3xl font-bold ${currentBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {currentBalance.toLocaleString("ru-RU")} ₽
                </p>
              </div>
              <Wallet className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Пополнения</p>
                <p className="text-2xl font-bold text-green-600">
                  +{totalIncome.toLocaleString("ru-RU")} ₽
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Списания</p>
                <p className="text-2xl font-bold text-red-600">
                  -{totalExpense.toLocaleString("ru-RU")} ₽
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        <Button
          variant={view === "transactions" ? "default" : "outline"}
          onClick={() => setView("transactions")}
        >
          Операции
        </Button>
        <Button
          variant={view === "payments" ? "default" : "outline"}
          onClick={() => setView("payments")}
        >
          Платежи
        </Button>
      </div>

      {/* Transactions list */}
      {view === "transactions" && (
        <Card>
          <CardHeader>
            <CardTitle>История операций</CardTitle>
            <CardDescription>Все списания и пополнения</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Операций пока нет
              </p>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(tx.transaction_type, tx.amount)}
                      <div>
                        <p className="font-medium">
                          {tx.description || tx.transaction_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(tx.created_at), "d MMM yyyy, HH:mm", { locale: ru })}
                        </p>
                      </div>
                    </div>
                    <p className={`font-semibold ${tx.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {tx.amount >= 0 ? "+" : ""}{tx.amount.toLocaleString("ru-RU")} ₽
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payments list */}
      {view === "payments" && (
        <Card>
          <CardHeader>
            <CardTitle>История платежей</CardTitle>
            <CardDescription>Все проведённые оплаты</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
                ))}
              </div>
            ) : payments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Платежей пока нет
              </p>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">
                          {payment.description || "Оплата"}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(
                            parseISO(payment.payment_date || payment.created_at),
                            "d MMM yyyy",
                            { locale: ru }
                          )}
                          {payment.payment_method && ` • ${payment.payment_method}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {payment.amount.toLocaleString("ru-RU")} ₽
                      </p>
                      {getPaymentStatusBadge(payment.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
