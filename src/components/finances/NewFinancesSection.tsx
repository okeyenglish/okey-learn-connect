import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, DollarSign, CreditCard, Wallet, Building2 } from 'lucide-react';
import { useCurrencies, useInvoices, usePayments, useBonusAccounts } from '@/hooks/useFinances';
import { useUserAllowedBranches } from '@/hooks/useUserAllowedBranches';
import { usePersistedBranch } from '@/hooks/usePersistedBranch';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Typed interfaces for joined data from hooks
interface StudentProfile {
  first_name: string;
  last_name: string;
  email?: string;
}

interface CurrencyInfo {
  code: string;
  symbol: string;
}

interface InvoiceWithJoins {
  id: string;
  student_id: string;
  amount: number;
  due_date: string;
  status: string;
  created_at: string;
  student: StudentProfile | null;
  currency: CurrencyInfo | null;
}

interface PaymentWithJoins {
  id: string;
  student_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes: string | null;
  student: StudentProfile | null;
  currency: CurrencyInfo | null;
}

interface BonusAccountWithJoins {
  id: string;
  student_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  student: StudentProfile | null;
}

export const NewFinancesSection = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('invoices');
  const { selectedBranch, setSelectedBranch } = usePersistedBranch('all');
  
  const { branchesForDropdown } = useUserAllowedBranches();

  const { data: currencies, isLoading: currenciesLoading } = useCurrencies();
  const { data: invoicesRaw, isLoading: invoicesLoading } = useInvoices();
  const { data: paymentsRaw, isLoading: paymentsLoading } = usePayments();
  const { data: bonusAccountsRaw, isLoading: bonusLoading } = useBonusAccounts();

  // Cast to typed versions
  const invoices = invoicesRaw as InvoiceWithJoins[] | undefined;
  const payments = paymentsRaw as PaymentWithJoins[] | undefined;
  const bonusAccounts = bonusAccountsRaw as BonusAccountWithJoins[] | undefined;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      paid: 'default',
      overdue: 'destructive',
      cancelled: 'secondary'
    };
    
    const labels: Record<string, string> = {
      pending: 'Ожидает оплаты',
      paid: 'Оплачено',
      overdue: 'Просрочено',
      cancelled: 'Отменено'
    };

    return <Badge variant={variants[status] || 'default'}>{labels[status] || status}</Badge>;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Наличные',
      card: 'Карта',
      bank_transfer: 'Банковский перевод',
      online: 'Онлайн',
      bonus: 'Бонусы'
    };
    return labels[method] || method;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Финансы</h2>
          <p className="text-muted-foreground">Управление счетами, платежами и валютами</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[180px]">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Филиал" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все филиалы</SelectItem>
              {branchesForDropdown.map((branch) => (
                <SelectItem key={branch} value={branch}>
                  {branch}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Всего счетов</p>
              <p className="text-2xl font-bold">{invoices?.length || 0}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Всего платежей</p>
              <p className="text-2xl font-bold">{payments?.length || 0}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Бонусные счета</p>
              <p className="text-2xl font-bold">{bonusAccounts?.length || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="invoices">Счета</TabsTrigger>
          <TabsTrigger value="payments">Платежи</TabsTrigger>
          <TabsTrigger value="bonus">Бонусные счета</TabsTrigger>
          <TabsTrigger value="currencies">Валюты</TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 max-w-sm">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Поиск счетов..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать счёт
                </Button>
              </div>

              {invoicesLoading ? (
                <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Студент</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Срок оплаты</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Дата создания</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices && invoices.length > 0 ? (
                      invoices
                        .filter(invoice => 
                          !searchQuery || 
                          invoice.student?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          invoice.student?.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell>
                              {invoice.student?.first_name} {invoice.student?.last_name}
                            </TableCell>
                            <TableCell>
                              {invoice.amount} {invoice.currency?.symbol}
                            </TableCell>
                            <TableCell>
                              {format(new Date(invoice.due_date), 'dd MMM yyyy', { locale: ru })}
                            </TableCell>
                            <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                            <TableCell>
                              {format(new Date(invoice.created_at), 'dd MMM yyyy', { locale: ru })}
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Счета не найдены
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 max-w-sm">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Поиск платежей..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить платёж
                </Button>
              </div>

              {paymentsLoading ? (
                <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Студент</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Способ оплаты</TableHead>
                      <TableHead>Дата платежа</TableHead>
                      <TableHead>Примечание</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments && payments.length > 0 ? (
                      payments
                        .filter(payment => 
                          !searchQuery || 
                          payment.student?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          payment.student?.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              {payment.student?.first_name} {payment.student?.last_name}
                            </TableCell>
                            <TableCell>
                              {payment.amount} {payment.currency?.symbol}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {getPaymentMethodLabel(payment.payment_method)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(payment.payment_date), 'dd MMM yyyy HH:mm', { locale: ru })}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {payment.notes || '—'}
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Платежи не найдены
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Bonus Accounts Tab */}
        <TabsContent value="bonus" className="space-y-4">
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 max-w-sm">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Поиск бонусных счетов..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {bonusLoading ? (
                <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Студент</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Баланс</TableHead>
                      <TableHead>Начислено</TableHead>
                      <TableHead>Потрачено</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bonusAccounts && bonusAccounts.length > 0 ? (
                      bonusAccounts
                        .filter(account => 
                          !searchQuery || 
                          account.student?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          account.student?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          account.student?.email?.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((account) => (
                          <TableRow key={account.id}>
                            <TableCell>
                              {account.student?.first_name} {account.student?.last_name}
                            </TableCell>
                            <TableCell>{account.student?.email || '—'}</TableCell>
                            <TableCell>
                              <span className="font-semibold">{account.balance}</span>
                            </TableCell>
                            <TableCell className="text-green-600">
                              +{account.total_earned}
                            </TableCell>
                            <TableCell className="text-red-600">
                              -{account.total_spent}
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Бонусные счета не найдены
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Currencies Tab */}
        <TabsContent value="currencies" className="space-y-4">
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Управление валютами</h3>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить валюту
                </Button>
              </div>

              {currenciesLoading ? (
                <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Код</TableHead>
                      <TableHead>Название</TableHead>
                      <TableHead>Символ</TableHead>
                      <TableHead>По умолчанию</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currencies && currencies.length > 0 ? (
                      currencies.map((currency) => (
                        <TableRow key={currency.id}>
                          <TableCell className="font-mono">{currency.code}</TableCell>
                          <TableCell>{currency.name}</TableCell>
                          <TableCell className="text-lg">{currency.symbol}</TableCell>
                          <TableCell>
                            {currency.is_default && (
                              <Badge>По умолчанию</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Валюты не найдены
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};