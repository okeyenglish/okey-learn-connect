import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign, Receipt, CreditCard, Gift, Users, TrendingDown, Wallet, AlertCircle, Bell } from 'lucide-react';
import { useFinances } from '@/hooks/useFinances';
import { CreateInvoiceModal } from './CreateInvoiceModal';
import { CreatePaymentModal } from './CreatePaymentModal';
import { InvoiceGeneratorModal } from './InvoiceGeneratorModal';
import { InvoicesTable } from './InvoicesTable';
import { PaymentsTable } from './PaymentsTable';
import { BonusAccountsTable } from './BonusAccountsTable';
import { PriceListsTable } from './PriceListsTable';
import { FinancialAnalytics } from './FinancialAnalytics';
import { BulkOperationsModal } from './BulkOperationsModal';
import { InvoicesModal } from './InvoicesModal';
import { DiscountsManagementModal } from './DiscountsManagementModal';
import { TeacherSalaryManagement } from './TeacherSalaryManagement';
import { LowBalanceStudentsWidget } from './LowBalanceStudentsWidget';
import { AddBalanceModal } from './AddBalanceModal';
import { AutomationSettingsPanel } from './AutomationSettingsPanel';
import { useLowBalanceStudents } from '@/hooks/useStudentBalances';

export default function FinancesSection() {
  const { currencies, invoices, payments, bonusAccounts, loading } = useFinances();
  const { data: lowBalanceStudents } = useLowBalanceStudents();
  const [activeTab, setActiveTab] = useState('overview');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceGeneratorModal, setShowInvoiceGeneratorModal] = useState(false);
  const [showBulkOpsModal, setShowBulkOpsModal] = useState(false);
  const [showNewInvoicesModal, setShowNewInvoicesModal] = useState(false);
  const [showDiscountsModal, setShowDiscountsModal] = useState(false);
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudentName, setSelectedStudentName] = useState('');

  const stats = {
    totalInvoices: invoices.length,
    paidInvoices: invoices.filter(inv => inv.status === 'paid').length,
    totalRevenue: invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.amount, 0),
    totalPayments: payments.length,
    pendingPayments: payments.filter(p => p.status === 'pending').length,
    totalBonusBalance: bonusAccounts.reduce((sum, acc) => sum + acc.balance, 0),
    studentsWithLowBalance: lowBalanceStudents?.length || 0,
  };

  const handleAddBalance = (studentId: string, studentName: string) => {
    setSelectedStudentId(studentId);
    setSelectedStudentName(studentName);
    setShowAddBalanceModal(true);
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
        <div className="flex gap-2 flex-wrap">
          <BulkOperationsModal 
            open={showBulkOpsModal}
            onOpenChange={setShowBulkOpsModal}
          />
          
          <InvoicesModal 
            open={showNewInvoicesModal}
            onOpenChange={setShowNewInvoicesModal}
          />
          
          <DiscountsManagementModal 
            open={showDiscountsModal}
            onOpenChange={setShowDiscountsModal}
          />

          <CreateInvoiceModal 
            open={showInvoiceModal} 
            onOpenChange={setShowInvoiceModal}
          >
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Создать счет
            </Button>
          </CreateInvoiceModal>
          
          <CreatePaymentModal 
            open={showPaymentModal} 
            onOpenChange={setShowPaymentModal}
          >
            <Button variant="outline" size="sm">
              <CreditCard className="h-4 w-4 mr-2" />
              Платеж
            </Button>
          </CreatePaymentModal>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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

        <Card className={stats.studentsWithLowBalance > 0 ? 'border-destructive' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Низкий баланс</CardTitle>
            <AlertCircle className={`h-4 w-4 ${stats.studentsWithLowBalance > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.studentsWithLowBalance > 0 ? 'text-destructive' : ''}`}>
              {stats.studentsWithLowBalance}
            </div>
            <p className="text-xs text-muted-foreground">
              Требуется пополнение
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Основной контент */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="balances">
            <AlertCircle className="h-4 w-4 mr-1" />
            Балансы
            {stats.studentsWithLowBalance > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.studentsWithLowBalance}
              </Badge>
            )}
          </TabsTrigger>
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
          <TabsTrigger value="discounts">
            <TrendingDown className="h-4 w-4 mr-1" />
            Скидки
          </TabsTrigger>
          <TabsTrigger value="teacher-salary">
            <Wallet className="h-4 w-4 mr-1" />
            Зарплаты
          </TabsTrigger>
          <TabsTrigger value="bonuses">
            Бонусы
            {bonusAccounts.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {bonusAccounts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="price-lists">
            Прайс-листы
          </TabsTrigger>
          <TabsTrigger value="analytics">
            Аналитика
          </TabsTrigger>
          <TabsTrigger value="bulk-ops">
            <Users className="h-4 w-4 mr-1" />
            Массовые
          </TabsTrigger>
          <TabsTrigger value="automation">
            <Bell className="h-4 w-4 mr-1" />
            Автоматизация
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <LowBalanceStudentsWidget 
            onStudentClick={(studentId) => {
              // Открыть карточку студента
            }}
            onAddBalance={(studentId) => {
              const student = lowBalanceStudents?.find(s => s.student_id === studentId);
              if (student) {
                handleAddBalance(studentId, student.student_name);
              }
            }}
          />
          
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
                             {payment.method === 'cash' ? 'Наличные' :
                              payment.method === 'card' ? 'Карта' :
                              payment.method === 'transfer' ? 'Перевод' : 'Онлайн'}
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

        <TabsContent value="balances">
          <div className="space-y-4">
            <LowBalanceStudentsWidget 
              onStudentClick={(studentId) => {
                // Navigate to student card
              }}
              onAddBalance={(studentId) => {
                const student = lowBalanceStudents?.find(s => s.student_id === studentId);
                if (student) {
                  handleAddBalance(studentId, student.student_name);
                }
              }}
            />
          </div>
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
              <BonusAccountsTable />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="price-lists">
          <Card>
            <CardHeader>
              <CardTitle>Прайс-листы</CardTitle>
              <CardDescription>
                Управление ценами на услуги и тарифами
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PriceListsTable />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="discounts">
          <Card>
            <CardHeader>
              <CardTitle>Скидки и наценки</CardTitle>
              <CardDescription>
                Управление системой скидок и наценок для студентов
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Создавайте и управляйте скидками/наценками через кнопку "Скидки и наценки" выше
              </p>
              <Button onClick={() => setShowDiscountsModal(true)}>
                <TrendingDown className="h-4 w-4 mr-2" />
                Открыть управление скидками
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teacher-salary">
          <TeacherSalaryManagement />
        </TabsContent>

        <TabsContent value="bulk-ops">
          <Card>
            <CardHeader>
              <CardTitle>Массовые операции</CardTitle>
              <CardDescription>
                Выполнение операций сразу для нескольких студентов
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Массовое начисление</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Начислить оплату за обучение всем студентам по фильтрам (филиал, уровень)
                    </p>
                    <Button onClick={() => setShowBulkOpsModal(true)} className="w-full">
                      <Users className="h-4 w-4 mr-2" />
                      Открыть массовые операции
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Генерация счетов</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Автоматически создать счета для студентов с неоплаченными начислениями
                    </p>
                    <Button onClick={() => setShowBulkOpsModal(true)} className="w-full" variant="outline">
                      <Receipt className="h-4 w-4 mr-2" />
                      Сгенерировать счета
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics">
          <FinancialAnalytics />
        </TabsContent>

        <TabsContent value="automation">
          <AutomationSettingsPanel />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AddBalanceModal 
        open={showAddBalanceModal}
        onOpenChange={setShowAddBalanceModal}
        studentId={selectedStudentId}
        studentName={selectedStudentName}
      />
    </div>
  );
}