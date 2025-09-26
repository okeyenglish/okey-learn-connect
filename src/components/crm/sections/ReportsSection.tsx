import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Calendar,
  Download,
  Filter,
  FileText,
  PieChart,
  Activity
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function ReportsSection() {
  const [dateRange, setDateRange] = useState<string>('month');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [reportType, setReportType] = useState<string>('overview');

  // Моковые данные для демонстрации
  const mockData = {
    overview: {
      totalRevenue: 2450000,
      revenueChange: 12.5,
      totalStudents: 485,
      studentsChange: 8.2,
      totalLessons: 1250,
      lessonsChange: -2.1,
      averageGroupSize: 8.5,
      groupSizeChange: 5.3
    },
    branches: [
      { name: 'Окская', students: 120, revenue: 650000, lessons: 300 },
      { name: 'Котельники', students: 95, revenue: 580000, lessons: 280 },
      { name: 'Мытищи', students: 87, revenue: 520000, lessons: 250 },
      { name: 'Солнцево', students: 78, revenue: 450000, lessons: 220 },
      { name: 'Новокосино', students: 65, revenue: 380000, lessons: 180 },
      { name: 'Онлайн', students: 40, revenue: 250000, lessons: 120 }
    ],
    teachers: [
      { name: 'Иванова А.И.', students: 45, lessons: 120, rating: 4.8 },
      { name: 'Петров С.М.', students: 38, lessons: 95, rating: 4.7 },
      { name: 'Сидорова М.К.', students: 42, lessons: 110, rating: 4.9 },
      { name: 'Козлов Д.А.', students: 35, lessons: 88, rating: 4.6 },
      { name: 'Морозова Е.В.', students: 40, lessons: 105, rating: 4.8 }
    ]
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getChangeIcon = (change: number) => {
    return change >= 0 ? TrendingUp : TrendingDown;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Отчеты и аналитика</h1>
          <p className="text-muted-foreground">
            Анализ деятельности учебного центра
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Период" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Последняя неделя</SelectItem>
              <SelectItem value="month">Последний месяц</SelectItem>
              <SelectItem value="quarter">Последний квартал</SelectItem>
              <SelectItem value="year">Последний год</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Филиал" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все филиалы</SelectItem>
              <SelectItem value="okskaya">Окская</SelectItem>
              <SelectItem value="kotelniki">Котельники</SelectItem>
              <SelectItem value="mytishchi">Мытищи</SelectItem>
              <SelectItem value="solntsevo">Солнцево</SelectItem>
              <SelectItem value="novokosino">Новокосино</SelectItem>
              <SelectItem value="online">Онлайн</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
        </div>
      </div>

      {/* Основные метрики */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Общая выручка
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(mockData.overview.totalRevenue)}
            </div>
            <p className={`text-xs flex items-center ${getChangeColor(mockData.overview.revenueChange)}`}>
              {mockData.overview.revenueChange >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {Math.abs(mockData.overview.revenueChange)}% от прошлого периода
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Всего студентов
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockData.overview.totalStudents}</div>
            <p className={`text-xs flex items-center ${getChangeColor(mockData.overview.studentsChange)}`}>
              {mockData.overview.studentsChange >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {Math.abs(mockData.overview.studentsChange)}% от прошлого периода
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Проведено занятий
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockData.overview.totalLessons}</div>
            <p className={`text-xs flex items-center ${getChangeColor(mockData.overview.lessonsChange)}`}>
              {mockData.overview.lessonsChange >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {Math.abs(mockData.overview.lessonsChange)}% от прошлого периода
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Средний размер группы
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockData.overview.averageGroupSize}</div>
            <p className={`text-xs flex items-center ${getChangeColor(mockData.overview.groupSizeChange)}`}>
              {mockData.overview.groupSizeChange >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {Math.abs(mockData.overview.groupSizeChange)}% от прошлого периода
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Детальные отчеты */}
      <Tabs defaultValue="branches" className="space-y-4">
        <TabsList>
          <TabsTrigger value="branches">По филиалам</TabsTrigger>
          <TabsTrigger value="teachers">По преподавателям</TabsTrigger>
          <TabsTrigger value="finance">Финансовые</TabsTrigger>
          <TabsTrigger value="attendance">Посещаемость</TabsTrigger>
        </TabsList>
        
        <TabsContent value="branches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Статистика по филиалам</CardTitle>
              <CardDescription>
                Сравнение показателей всех филиалов
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockData.branches.map((branch, index) => (
                  <div key={branch.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="font-medium">{branch.name}</div>
                    </div>
                    <div className="flex items-center space-x-8 text-sm">
                      <div className="text-center">
                        <div className="font-medium">{branch.students}</div>
                        <div className="text-muted-foreground">студентов</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{formatCurrency(branch.revenue)}</div>
                        <div className="text-muted-foreground">выручка</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{branch.lessons}</div>
                        <div className="text-muted-foreground">занятий</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="teachers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Статистика по преподавателям</CardTitle>
              <CardDescription>
                Эффективность работы преподавателей
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockData.teachers.map((teacher, index) => (
                  <div key={teacher.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="font-medium">{teacher.name}</div>
                    </div>
                    <div className="flex items-center space-x-8 text-sm">
                      <div className="text-center">
                        <div className="font-medium">{teacher.students}</div>
                        <div className="text-muted-foreground">студентов</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{teacher.lessons}</div>
                        <div className="text-muted-foreground">занятий</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{teacher.rating}</div>
                        <div className="text-muted-foreground">рейтинг</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="finance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Финансовая отчетность</CardTitle>
              <CardDescription>
                Доходы, расходы и прибыль
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <PieChart className="h-12 w-12 mx-auto mb-4" />
                <p>Финансовые отчеты в разработке</p>
                <p className="text-sm">Здесь будут отображаться графики доходов и расходов</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Отчет по посещаемости</CardTitle>
              <CardDescription>
                Статистика посещений занятий
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                <p>Отчеты по посещаемости в разработке</p>
                <p className="text-sm">Здесь будут отображаться графики посещаемости</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}