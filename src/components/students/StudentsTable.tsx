import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Eye, 
  Edit, 
  Trash2, 
  MoreHorizontal, 
  Phone, 
  Mail,
  Pause,
  Play,
  CreditCard,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { EnhancedStudentCard } from './EnhancedStudentCard';
import { useStudents, Student } from '@/hooks/useStudents';
import { BulkOperationsBar } from './BulkOperationsBar';


interface StudentsTableProps {
  filters: {
    searchTerm: string;
    branch: string;
    status: string;
    level: string;
  };
  statusFilter: string;
}

export function StudentsTable({ filters, statusFilter }: StudentsTableProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentCard, setShowStudentCard] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const { students: allStudents, isLoading } = useStudents();

  // Фильтрация студентов
  const filteredStudents = allStudents.filter(student => {
    // Фильтр по статусу из табов
    if (statusFilter !== 'all' && student.status !== statusFilter) {
      return false;
    }

    // Поиск по имени, телефону
    const searchLower = filters.searchTerm.toLowerCase();
    const matchesSearch = !filters.searchTerm || 
      student.name.toLowerCase().includes(searchLower) ||
      (student.first_name?.toLowerCase().includes(searchLower)) ||
      (student.last_name?.toLowerCase().includes(searchLower)) ||
      (student.phone?.includes(searchLower));

    // Фильтр по статусу из фильтров
    const matchesStatus = filters.status === 'all' || student.status === filters.status;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Активный</Badge>;
      case 'inactive':
        return <Badge variant="outline">Неактивный</Badge>;
      case 'trial':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Пробный</Badge>;
      case 'graduated':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Выпускник</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSubscriptionBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="text-xs">Активен</Badge>;
      case 'expired':
        return <Badge variant="destructive" className="text-xs">Истек</Badge>;
      case 'none':
        return <Badge variant="outline" className="text-xs">Нет</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 'Не указан';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length >= 2 ? `${parts[1].charAt(0)}${parts[0].charAt(0)}`.toUpperCase() : name.charAt(0).toUpperCase();
  };

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
    setShowStudentCard(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredStudents.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    }
  };

  const allSelected = filteredStudents.length > 0 && selectedIds.length === filteredStudents.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < filteredStudents.length;

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allSelected || (someSelected ? 'indeterminate' : false)}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Ученик</TableHead>
              <TableHead>Контакты</TableHead>
              <TableHead>Уровень</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Филиал</TableHead>
              <TableHead>Возраст</TableHead>
              <TableHead>Абонемент</TableHead>
              <TableHead>Бонусы</TableHead>
              <TableHead>Последний визит</TableHead>
              <TableHead className="w-[100px]">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Загрузка...
                </TableCell>
              </TableRow>
            ) : filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  {allStudents.length === 0 ? 'Нет учеников' : 'Не найдено учеников по заданным критериям'}
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => (
                <TableRow key={student.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(student.id)}
                      onCheckedChange={(checked) => handleSelectOne(student.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(student.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        {student.first_name && student.last_name && (
                          <p className="text-sm text-muted-foreground">
                            {student.first_name} {student.last_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3" />
                        <span>{student.phone || '—'}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">—</Badge>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(student.status)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">—</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {student.age || calculateAge(student.date_of_birth || '')} лет
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">—</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">—</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {student.created_at ? formatDate(student.created_at) : '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewStudent(student)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Карточка ученика
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Calendar className="mr-2 h-4 w-4" />
                          Расписание
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Абонементы
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Отправить сообщение
                        </DropdownMenuItem>
                        {student.status === 'active' && (
                          <DropdownMenuItem>
                            <Pause className="mr-2 h-4 w-4" />
                            Приостановить
                          </DropdownMenuItem>
                        )}
                        {student.status === 'inactive' && (
                          <DropdownMenuItem>
                            <Play className="mr-2 h-4 w-4" />
                            Возобновить
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Удалить
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

      {/* Карточка студента */}
      {selectedStudent && (
        <EnhancedStudentCard
          student={selectedStudent}
          open={showStudentCard}
          onOpenChange={setShowStudentCard}
        />
      )}

      {/* Информация о результатах */}
      {filteredStudents.length > 0 && (
        <div className="flex justify-between items-center text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <span>Показано {filteredStudents.length} из {allStudents.length} учеников</span>
          <span>
            Активных: {filteredStudents.filter(s => s.status === 'active').length} | 
            Неактивных: {filteredStudents.filter(s => s.status === 'inactive').length} | 
            Пробных: {filteredStudents.filter(s => s.status === 'trial').length}
          </span>
        </div>
      )}

      {/* Панель массовых операций */}
      <BulkOperationsBar
        selectedCount={selectedIds.length}
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds([])}
      />
    </>
  );
}