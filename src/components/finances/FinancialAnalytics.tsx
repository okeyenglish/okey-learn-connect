import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Calendar,
  FileText,
  Download,
  Target
} from 'lucide-react';

export function FinancialAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedBranch, setSelectedBranch] = useState('all');

  // Моковые данные для графиков
  const revenueData = [
    { month: 'Янв', revenue: 450000, expenses: 180000, profit: 270000 },
    { month: 'Фев', revenue: 520000, expenses: 190000, profit: 330000 },
    { month: 'Мар', revenue: 480000, expenses: 185000, profit: 295000 },
    { month: 'Апр', revenue: 580000, expenses: 200000, profit: 380000 },
    { month: 'Май', revenue: 650000, expenses: 220000, profit: 430000 },
    { month: 'Июн', revenue: 720000, expenses: 240000, profit: 480000 }
  ];

  const paymentMethodsData = [
    { name: 'Наличные', value: 35, amount: 252000 },
    { name: 'Банковская карта', value: 45, amount: 324000 },
    { name: 'Банковский перевод', value: 15, amount: 108000 },
    { name: 'Онлайн платежи', value: 5, amount: 36000 }
  ];

  const servicesData = [
    { service: 'Индивидуальные', students: 45, revenue: 337500 },
    { service: 'Групповые', students: 120, revenue: 432000 },
    { service: 'Разговорный клуб', students: 65, revenue: 156000 },
    { service: 'Мастер-классы', students: 25, revenue: 75000 }
  ];

  const branchPerformance = [
    { branch: 'Окская', revenue: 280000, students: 85, growth: 12.5 },
    { branch: 'Мытищи', revenue: 320000, students: 95, growth: 15.2 },
    { branch: 'Люберцы', revenue: 250000, students: 75, growth: 8.7 },
    { branch: 'Котельники', revenue: 150000, students: 55, growth: 22.1 }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const formatCurrency = (value: number) => {
    return value.toLocaleString('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    });
  };

  const formatPercent = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Фильтры и управление */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Последняя неделя</SelectItem>
              <SelectItem value="month">Последний месяц</SelectItem>
              <SelectItem value="quarter">Последний квартал</SelectItem>
              <SelectItem value="year">Последний год</SelectItem>
              <SelectItem value="custom">Выбрать период</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все филиалы</SelectItem>
              <SelectItem value="okskaya">Окская</SelectItem>
              <SelectItem value="mytishchi">Мытищи</SelectItem>
              <SelectItem value="lyubertsy">Люберцы</SelectItem>
              <SelectItem value="kotelniki">Котельники</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Создать отчет
          </Button>
        </div>
      </div>

      {/* KPI карточки */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общий доход</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(720000)}</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              {formatPercent(15.2)} к прошлому месяцу
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Чистая прибыль</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(480000)}</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              {formatPercent(18.5)} к прошлому месяцу
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активных студентов</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">255</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              {formatPercent(8.3)} к прошлому месяцу
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Средний чек</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(2824)}</div>
            <div className="flex items-center text-xs text-red-600">
              <TrendingDown className="h-4 w-4 mr-1" />
              {formatPercent(-2.1)} к прошлому месяцу
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Графики и аналитика */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Доходы и расходы</TabsTrigger>
          <TabsTrigger value="payments">Способы оплаты</TabsTrigger>
          <TabsTrigger value="services">По услугам</TabsTrigger>
          <TabsTrigger value="branches">По филиалам</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Динамика доходов и расходов</CardTitle>
              <CardDescription>
                Помесячная динамика финансовых показателей
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}к`} />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                    name="Доходы"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stackId="2"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    fillOpacity={0.6}
                    name="Расходы"
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#ff7300"
                    strokeWidth={3}
                    name="Прибыль"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Способы оплаты</CardTitle>
                <CardDescription>
                  Распределение платежей по способам оплаты
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentMethodsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentMethodsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Суммы по способам</CardTitle>
                <CardDescription>
                  Объемы платежей в денежном выражении
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {paymentMethodsData.map((method, index) => (
                    <div key={method.name} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span>{method.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(method.amount)}</div>
                        <div className="text-sm text-muted-foreground">{method.value}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Доходы по типам услуг</CardTitle>
              <CardDescription>
                Сравнение эффективности различных образовательных программ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={servicesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="service" />
                  <YAxis yAxisId="left" orientation="left" tickFormatter={(value) => `${(value / 1000).toFixed(0)}к`} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(value as number) : value,
                      name === 'revenue' ? 'Доходы' : 'Студенты'
                    ]}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" name="Доходы" />
                  <Bar yAxisId="right" dataKey="students" fill="#82ca9d" name="Студенты" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Производительность филиалов</CardTitle>
              <CardDescription>
                Сравнение доходов и роста по филиалам
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {branchPerformance.map((branch, index) => (
                  <div key={branch.branch} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{branch.branch}</h4>
                        <p className="text-sm text-muted-foreground">{branch.students} активных студентов</p>
                      </div>
                      <Badge
                        variant={branch.growth > 15 ? "default" : branch.growth > 10 ? "secondary" : "outline"}
                        className={branch.growth > 15 ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                      >
                        {formatPercent(branch.growth)}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Доходы:</span>
                        <span className="font-medium">{formatCurrency(branch.revenue)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(branch.revenue / 320000) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}