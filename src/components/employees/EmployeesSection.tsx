import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEmployees, getEmployeeFullName, Employee } from '@/hooks/useEmployees';
import { useAuth } from '@/hooks/useAuth';
import { Search, Users, Building, MoreHorizontal, Edit, Eye, Phone, Mail, UserPlus, Filter } from 'lucide-react';

export default function EmployeesSection() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const { data: employees = [], isLoading, error } = useEmployees();

  // Фильтрация сотрудников
  const filteredEmployees = employees.filter((employee: Employee) => {
    const matchesSearch = 
      getEmployeeFullName(employee).toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesBranch = branchFilter === 'all' || employee.branch === branchFilter;
    const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter;
    
    return matchesSearch && matchesBranch && matchesDepartment;
  });

  // Получение уникальных филиалов и отделов
  const uniqueBranches = [...new Set(employees.map((emp: Employee) => emp.branch).filter(Boolean))];
  const uniqueDepartments = [...new Set(employees.map((emp: Employee) => emp.department).filter(Boolean))];

  // Статистика
  const stats = {
    total: employees.length,
    byBranch: uniqueBranches.reduce((acc: Record<string, number>, branch: string) => {
      acc[branch] = employees.filter((emp: Employee) => emp.branch === branch).length;
      return acc;
    }, {}),
    byDepartment: uniqueDepartments.reduce((acc: Record<string, number>, dept: string) => {
      acc[dept] = employees.filter((emp: Employee) => emp.department === dept).length;
      return acc;
    }, {})
  };

  const getBranchBadgeColor = (branch: string | null) => {
    if (!branch) return 'secondary';
    const colors = ['default', 'secondary', 'outline'];
    return colors[branch.length % colors.length] as 'default' | 'secondary' | 'outline';
  };

  const getDepartmentLabel = (department: string | null) => {
    if (!department) return 'Не указан';
    const departments: Record<string, string> = {
      'administration': 'Администрация',
      'teachers': 'Преподаватели',
      'sales': 'Продажи',
      'marketing': 'Маркетинг',
      'support': 'Поддержка'
    };
    return departments[department] || department;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-muted-foreground">Ошибка при загрузке сотрудников</p>
              <p className="text-sm text-red-500 mt-2">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Заголовок и статистика */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Сотрудники</h1>
            <p className="text-muted-foreground">
              Управление информацией о сотрудниках
            </p>
          </div>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Добавить сотрудника
          </Button>
        </div>

        {/* Статистические карточки */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего сотрудников</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                В активном состоянии
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Филиалы</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueBranches.length}</div>
              <p className="text-xs text-muted-foreground">
                Активных филиалов
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Отделы</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueDepartments.length}</div>
              <p className="text-xs text-muted-foreground">
                Различных отделов
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по имени или email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Все филиалы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все филиалы</SelectItem>
                {uniqueBranches.map((branch) => (
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Все отделы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все отделы</SelectItem>
                {uniqueDepartments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {getDepartmentLabel(dept)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Таблица сотрудников */}
      <Card>
        <CardHeader>
          <CardTitle>Список сотрудников</CardTitle>
          <CardDescription>
            Показано {filteredEmployees.length} из {stats.total} сотрудников
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Сотрудник</TableHead>
                  <TableHead>Филиал</TableHead>
                  <TableHead>Отдел</TableHead>
                  <TableHead>Контакты</TableHead>
                  <TableHead className="w-[100px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {employees.length === 0 ? 'Нет сотрудников' : 'Не найдено сотрудников по заданным критериям'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>
                              {getEmployeeFullName(employee).split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{getEmployeeFullName(employee)}</div>
                            <div className="text-sm text-muted-foreground">{employee.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {employee.branch ? (
                          <Badge variant={getBranchBadgeColor(employee.branch)}>
                            {employee.branch}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">Не указан</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <span className="text-sm">
                          {getDepartmentLabel(employee.department)}
                        </span>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {employee.email && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`mailto:${employee.email}`}>
                                <Mail className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              Просмотреть
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Редактировать
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}