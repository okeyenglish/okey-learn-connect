import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign, Receipt, CreditCard, Gift } from 'lucide-react';
import { useFinances } from '@/hooks/useFinances';
import { CreateInvoiceModal } from './CreateInvoiceModal';
import { CreatePaymentModal } from './CreatePaymentModal';
import { InvoicesTable } from './InvoicesTable';
import { PaymentsTable } from './PaymentsTable';

export default function FinancesSection() {
  const { currencies, invoices, payments, bonusAccounts, loading } = useFinances();
  const [activeTab, setActiveTab] = useState('overview');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const stats = {
    totalInvoices: invoices.length,
    paidInvoices: invoices.filter(inv => inv.status === 'paid').length,
    totalRevenue: invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.amount, 0),
    totalPayments: payments.length,
    pendingPayments: payments.filter(p => p.status === 'pending').length,
    totalBonusBalance: bonusAccounts.reduce((sum, acc) => sum + acc.balance, 0),
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Финансы</h1>
          <p className="text-muted-foreground">
            Управление счетами, платежами и бонусными программами
          </p>
        </div>
        <div className="flex gap-2">
          <CreateInvoiceModal 
            open={showInvoiceModal} 
            onOpenChange={setShowInvoiceModal}
          >
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Создать счет
            </Button>
          </CreateInvoiceModal>
          
          <CreatePaymentModal 
            open={showPaymentModal} 
            onOpenChange={setShowPaymentModal}
          >
            <Button variant="outline">
              <CreditCard className="h-4 w-4 mr-2" />
              Добавить платеж
            </Button>
          </CreatePaymentModal>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общий доход</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalRevenue.toLocaleString('ru-RU')} ₽
            </div>
            <p className="text-xs text-muted-foreground">
              Из {stats.totalInvoices} счетов
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Оплаченные счета</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.paidInvoices}</div>
            <p className="text-xs text-muted-foreground">
              из {stats.totalInvoices} всего
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Платежи</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPayments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingPayments} в ожидании
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Бонусные баллы</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalBonusBalance.toLocaleString('ru-RU')}
            </div>
            <p className="text-xs text-muted-foreground">
              У {bonusAccounts.length} клиентов
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Основной контент */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="invoices">
            Счета
            {stats.totalInvoices > 0 && (
              <Badge variant="secondary" className="ml-2">
                {stats.totalInvoices}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="payments">
            Платежи
            {stats.totalPayments > 0 && (
              <Badge variant="secondary" className="ml-2">
                {stats.totalPayments}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="bonuses">
            Бонусы
            {bonusAccounts.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {bonusAccounts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Последние счета</CardTitle>
                <CardDescription>
                  Недавно созданные счета для студентов
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <p className="text-muted-foreground">Нет счетов</p>
                ) : (
                  <div className="space-y-2">
                    {invoices.slice(0, 5).map((invoice) => (
                      <div key={invoice.id} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{invoice.invoice_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {invoice.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{invoice.amount} ₽</p>
                          <Badge
                            variant={
                              invoice.status === 'paid'
                                ? 'default'
                                : invoice.status === 'sent'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {invoice.status === 'paid' ? 'Оплачен' :
                             invoice.status === 'sent' ? 'Отправлен' :
                             invoice.status === 'draft' ? 'Черновик' : 'Отменен'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Последние платежи</CardTitle>
                <CardDescription>
                  Недавно поступившие платежи от студентов
                </CardDescription>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <p className="text-muted-foreground">Нет платежей</p>
                ) : (
                  <div className="space-y-2">
                    {payments.slice(0, 5).map((payment) => (
                      <div key={payment.id} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">
                            {payment.payment_method === 'cash' ? 'Наличные' :
                             payment.payment_method === 'card' ? 'Карта' :
                             payment.payment_method === 'bank_transfer' ? 'Перевод' : 'Онлайн'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(payment.payment_date).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{payment.amount} ₽</p>
                          <Badge
                            variant={
                              payment.status === 'completed' ? 'default' :
                              payment.status === 'pending' ? 'secondary' : 'destructive'
                            }
                          >
                            {payment.status === 'completed' ? 'Завершен' :
                             payment.status === 'pending' ? 'В обработке' :
                             payment.status === 'failed' ? 'Ошибка' : 'Отменен'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Счета на оплату</CardTitle>
              <CardDescription>
                Управление счетами для студентов и клиентов
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InvoicesTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Платежи</CardTitle>
              <CardDescription>
                История и управление платежами от студентов
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentsTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bonuses">
          <Card>
            <CardHeader>
              <CardTitle>Бонусная система</CardTitle>
              <CardDescription>
                Управление бонусными баллами и программами лояльности
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Бонусная система будет доступна после завершения настройки базы данных
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}