import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { StudentCard } from './StudentCard';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  phone: string;
  email: string;
  level: string;
  status: 'active' | 'paused' | 'inactive' | 'trial';
  branch: string;
  birthDate: string;
  enrollmentDate: string;
  lastVisit?: string;
  subscriptionStatus?: 'active' | 'expired' | 'none';
  avatar?: string;
  bonusBalance: number;
}

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

  // Моковые данные студентов
  const allStudents: Student[] = [
    {
      id: '1',
      firstName: 'Анна',
      lastName: 'Иванова',
      middleName: 'Сергеевна',
      phone: '+7 (999) 123-45-67',
      email: 'anna.ivanova@example.com',
      level: 'Intermediate',
      status: 'active',
      branch: 'Окская',
      birthDate: '2005-03-15',
      enrollmentDate: '2024-01-10',
      lastVisit: '2024-01-25',
      subscriptionStatus: 'active',
      bonusBalance: 150
    },
    {
      id: '2',
      firstName: 'Михаил',
      lastName: 'Петров',
      phone: '+7 (999) 234-56-78',
      email: 'mikhail.petrov@example.com',
      level: 'Elementary',
      status: 'paused',
      branch: 'Мытищи',
      birthDate: '2008-07-22',
      enrollmentDate: '2023-11-05',
      lastVisit: '2024-01-15',
      subscriptionStatus: 'active',
      bonusBalance: 75
    },
    {
      id: '3',
      firstName: 'Екатерина',
      lastName: 'Сидорова',
      middleName: 'Александровна',
      phone: '+7 (999) 345-67-89',
      email: 'ekaterina.sidorova@example.com',
      level: 'Advanced',
      status: 'active',
      branch: 'Люберцы',
      birthDate: '2002-11-08',
      enrollmentDate: '2023-09-01',
      lastVisit: '2024-01-24',
      subscriptionStatus: 'active',
      bonusBalance: 320
    },
    {
      id: '4',
      firstName: 'Дмитрий',
      lastName: 'Козлов',
      phone: '+7 (999) 456-78-90',
      email: 'dmitry.kozlov@example.com',
      level: 'Pre-Intermediate',
      status: 'trial',
      branch: 'Котельники',
      birthDate: '2006-12-03',
      enrollmentDate: '2024-01-20',
      subscriptionStatus: 'none',
      bonusBalance: 0
    },
    {
      id: '5',
      firstName: 'София',
      lastName: 'Морозова',
      middleName: 'Викторовна',
      phone: '+7 (999) 567-89-01',
      email: 'sofia.morozova@example.com',
      level: 'Beginner',
      status: 'inactive',
      branch: 'Окская',
      birthDate: '2009-04-18',
      enrollmentDate: '2023-08-15',
      lastVisit: '2023-12-20',
      subscriptionStatus: 'expired',
      bonusBalance: 25
    }
  ];

  // Фильтрация студентов
  const filteredStudents = allStudents.filter(student => {
    // Фильтр по статусу из табов
    if (statusFilter !== 'all' && student.status !== statusFilter) {
      return false;
    }

    // Поиск по имени, телефону, email
    const searchLower = filters.searchTerm.toLowerCase();
    const matchesSearch = !filters.searchTerm || 
      student.firstName.toLowerCase().includes(searchLower) ||
      student.lastName.toLowerCase().includes(searchLower) ||
      (student.middleName?.toLowerCase().includes(searchLower)) ||
      student.phone.includes(searchLower) ||
      student.email.toLowerCase().includes(searchLower);

    // Фильтр по филиалу
    const matchesBranch = filters.branch === 'all' || student.branch === filters.branch;

    // Фильтр по статусу
    const matchesStatus = filters.status === 'all' || student.status === filters.status;

    // Фильтр по уровню
    const matchesLevel = filters.level === 'all' || 
      student.level.toLowerCase().replace('-', '').includes(filters.level.toLowerCase().replace('-', ''));

    return matchesSearch && matchesBranch && matchesStatus && matchesLevel;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Активный</Badge>;
      case 'paused':
        return <Badge variant="secondary">На паузе</Badge>;
      case 'inactive':
        return <Badge variant="outline">Неактивный</Badge>;
      case 'trial':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Пробный</Badge>;
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
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
    setShowStudentCard(true);
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
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
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  {allStudents.length === 0 ? 'Нет учеников' : 'Не найдено учеников по заданным критериям'}
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => (
                <TableRow key={student.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={student.avatar} />
                        <AvatarFallback className="text-xs">
                          {getInitials(student.firstName, student.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {student.lastName} {student.firstName}
                        </p>
                        {student.middleName && (
                          <p className="text-sm text-muted-foreground">
                            {student.middleName}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3" />
                        <span>{student.phone}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{student.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{student.level}</Badge>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(student.status)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{student.branch}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {calculateAge(student.birthDate)} лет
                    </span>
                  </TableCell>
                  <TableCell>
                    {getSubscriptionBadge(student.subscriptionStatus)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {student.bonusBalance > 0 ? (
                        <Badge variant="secondary">
                          {student.bonusBalance} б.
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {student.lastVisit ? (
                      <span className="text-sm text-muted-foreground">
                        {formatDate(student.lastVisit)}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
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
                        {student.status === 'paused' && (
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
        <StudentCard
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
            На паузе: {filteredStudents.filter(s => s.status === 'paused').length} | 
            Пробных: {filteredStudents.filter(s => s.status === 'trial').length}
          </span>
        </div>
      )}
    </>
  );
}