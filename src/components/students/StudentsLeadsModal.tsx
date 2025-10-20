import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, ChevronDown, Eye } from 'lucide-react';
import { useStudents } from '@/hooks/useStudents';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StudentCard } from './StudentCard';
import type { Student } from '@/hooks/useStudents';

interface StudentsLeadsModalProps {
  onLeadClick?: (studentId: string) => void;
}

export function StudentsLeadsModal({ onLeadClick }: StudentsLeadsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentCard, setShowStudentCard] = useState(false);
  
  const { students, isLoading: studentsLoading } = useStudents();
  
  // Получаем активные занятия для студентов
  const { data: activeGroupStudents = [] } = useQuery({
    queryKey: ['active-group-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_students')
        .select('student_id')
        .eq('status', 'active');
      
      if (error) throw error;
      return data.map(gs => gs.student_id);
    },
  });

  const { data: activeIndividualLessons = [] } = useQuery({
    queryKey: ['active-individual-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('individual_lessons')
        .select('student_id')
        .eq('is_active', true)
        .eq('status', 'active');
      
      if (error) throw error;
      return data.map(il => il.student_id);
    },
  });

  // Фильтруем учеников - лиды это те, у кого нет активных занятий
  const leadStudents = useMemo(() => {
    const activeStudentIds = new Set([...activeGroupStudents, ...activeIndividualLessons]);
    
    return students.filter(student => {
      const hasActiveLessons = activeStudentIds.has(student.id);
      return !hasActiveLessons;
    });
  }, [students, activeGroupStudents, activeIndividualLessons]);

  // Фильтрация на клиенте по поисковому запросу
  const filteredLeads = leadStudents.filter(student => {
    const searchLower = searchQuery.toLowerCase();
    const fullName = `${student.first_name || ''} ${student.last_name || ''} ${student.middle_name || ''}`.toLowerCase();
    const phone = student.phone?.toLowerCase() || '';
    
    const matchesSearch = !searchQuery || 
      fullName.includes(searchLower) || 
      phone.includes(searchLower) ||
      student.name?.toLowerCase().includes(searchLower);
    
    return matchesSearch;
  });

  const isLoading = studentsLoading;

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length >= 2 ? `${parts[1].charAt(0)}${parts[0].charAt(0)}`.toUpperCase() : name.charAt(0).toUpperCase();
  };

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

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
    setShowStudentCard(true);
  };

  return (
    <div className="space-y-4">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-lg">Лиды (Ученики без занятий)</h3>
          <p className="text-sm text-muted-foreground">
            Ученики, у которых нет активных групповых или индивидуальных занятий
          </p>
        </div>
      </div>

      {/* Основной поиск */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по имени, фамилии, телефону..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Таблица учеников-лидов */}
      <div className="text-sm text-muted-foreground mb-2">
        Найдено лидов: {filteredLeads.length}
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ученик</TableHead>
              <TableHead>Контакты</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Возраст</TableHead>
              <TableHead>Дата создания</TableHead>
              <TableHead className="w-[100px]">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Загрузка...
                </TableCell>
              </TableRow>
            ) : filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Нет учеников без занятий
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((student) => (
                <TableRow key={student.id} className="hover:bg-muted/50">
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
                    <div className="text-sm">{student.phone || '—'}</div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(student.status)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{student.age || '—'} лет</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {student.created_at ? new Date(student.created_at).toLocaleDateString('ru-RU') : '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewStudent(student)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Открыть
                    </Button>
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
    </div>
  );
}
