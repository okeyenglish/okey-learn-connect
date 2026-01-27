import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AddTeacherModal } from '@/components/admin/AddTeacherModal';
import { useTeachers, getTeacherFullName } from '@/hooks/useTeachers';
import { useTeacherInvitations } from '@/hooks/useTeacherInvitations';
import { useOrganization } from '@/hooks/useOrganization';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  GraduationCap, 
  FileSpreadsheet, 
  MailPlus, 
  MoreHorizontal, 
  Edit, 
  Eye, 
  Phone, 
  Mail,
  MapPin,
  UserPlus,
  Users,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useState } from 'react';

export const TeachersManagementSection: React.FC = () => {
  const navigate = useNavigate();
  const { teachers, isLoading } = useTeachers();
  const { invitations } = useTeacherInvitations();
  const { branches } = useOrganization();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');

  // Статистика
  const pendingInvitations = invitations.filter(i => i.status === 'pending').length;
  const linkedTeachers = teachers.filter(t => t.profile_id).length;

  // Фильтрация
  const filteredTeachers = teachers.filter(teacher => {
    const fullName = getTeacherFullName(teacher).toLowerCase();
    const matchesSearch = 
      fullName.includes(searchTerm.toLowerCase()) ||
      teacher.phone?.includes(searchTerm) ||
      teacher.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesBranch = branchFilter === 'all' || teacher.branch === branchFilter;
    
    return matchesSearch && matchesBranch;
  });

  const uniqueBranches = [...new Set(teachers.map(t => t.branch).filter(Boolean))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Преподаватели</h1>
          <p className="text-muted-foreground">
            Управление преподавателями и приглашениями
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/teachers/invitations')}>
            <MailPlus className="h-4 w-4 mr-2" />
            Приглашения
            {pendingInvitations > 0 && (
              <Badge variant="secondary" className="ml-2">{pendingInvitations}</Badge>
            )}
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/teachers/import')}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Массовый импорт
          </Button>
          <AddTeacherModal onTeacherAdded={() => {}}>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Добавить
            </Button>
          </AddTeacherModal>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего преподавателей</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teachers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">С аккаунтом</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{linkedTeachers}</div>
            <p className="text-xs text-muted-foreground">
              Привязан profile_id
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ожидают регистрации</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInvitations}</div>
            <p className="text-xs text-muted-foreground">
              Активных приглашений
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Филиалы</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueBranches.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени, телефону, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Все филиалы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все филиалы</SelectItem>
                {uniqueBranches.map((branch) => (
                  <SelectItem key={branch} value={branch!}>
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Таблица */}
      <Card>
        <CardHeader>
          <CardTitle>Список преподавателей</CardTitle>
          <CardDescription>
            Показано {filteredTeachers.length} из {teachers.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Преподаватель</TableHead>
                  <TableHead>Контакты</TableHead>
                  <TableHead>Филиал</TableHead>
                  <TableHead>Предметы</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeachers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {teachers.length === 0 
                        ? 'Нет преподавателей. Добавьте первого преподавателя.'
                        : 'Не найдено преподавателей по заданным критериям'
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTeachers.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>
                              {teacher.first_name[0]}{teacher.last_name?.[0] || ''}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{getTeacherFullName(teacher)}</div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          {teacher.phone && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {teacher.phone}
                            </span>
                          )}
                          {teacher.email && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {teacher.email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {teacher.branch ? (
                          <Badge variant="outline" className="gap-1">
                            <MapPin className="h-3 w-3" />
                            {teacher.branch}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {teacher.subjects?.slice(0, 2).map((subject, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {subject}
                            </Badge>
                          ))}
                          {(teacher.subjects?.length || 0) > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{(teacher.subjects?.length || 0) - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {teacher.profile_id ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Активен
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                            <Clock className="h-3 w-3 mr-1" />
                            Ожидает
                          </Badge>
                        )}
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
};
