import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, 
  Filter, 
  Download, 
  Mail, 
  MessageSquare,
  Plus, 
  Edit, 
  Trash2, 
  UserPlus,
  Phone,
  ChevronRight,
  ChevronDown,
  Users,
  Calendar,
  Building
} from "lucide-react";
import { useStudents } from "@/hooks/useStudents";
import { AddStudentModal } from "@/components/students/AddStudentModal";

interface StudentsModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export const StudentsModal = ({ open, onOpenChange, children }: StudentsModalProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Expandable sections state
  const [expandedSections, setExpandedSections] = useState({
    additional: false,
    appeal: false,
    newCourse: false,
    schedule: false,
    custom: false,
    applications: false
  });

  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    age: true,
    branch: true,
    category: true,
    subject: true,
    group: true,
    appealDate: true,
    visitDate: true,
    contacts: true,
    comments: true
  });

  const isControlled = open !== undefined && onOpenChange !== undefined;
  const modalOpen = isControlled ? open : internalOpen;
  const handleOpenChange = isControlled ? onOpenChange : setInternalOpen;

  const { students, isLoading } = useStudents();

  // Filter students based on current filters
  const filteredStudents = students.filter(student => {
    if (searchTerm && !student.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !student.phone.includes(searchTerm)) {
      return false;
    }
    if (selectedBranch !== "all" && !student.phone.includes(selectedBranch)) {
      return false;
    }
    if (selectedStatus !== "all" && student.status !== selectedStatus) {
      return false;
    }
    return true;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(filteredStudents.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleStudentSelect = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents([...selectedStudents, studentId]);
    } else {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedBranch("all");
    setSelectedStatus("all");
    setSelectedCategory("all");
    setSelectedLevel("all");
  };

  const handleMassAction = (action: string) => {
    console.log(`Mass action: ${action} for students:`, selectedStudents);
    // Implement mass actions (email, SMS, export)
  };

  return (
    <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-foreground">
              Ученики и клиенты
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleMassAction('export')}>
                <Download className="h-4 w-4 mr-2" />
                Экспорт в XLS
              </Button>
              <AddStudentModal open={showAddModal} onOpenChange={setShowAddModal}>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить
                </Button>
              </AddStudentModal>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="h-full flex">
            {/* Filters Sidebar */}
            <div className="w-80 border-r bg-muted/30 p-4 overflow-y-auto">
              <div className="space-y-4">
                {/* Basic Filters */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Основные фильтры</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Поиск</label>
                      <div className="relative mt-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Имя, телефон, email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9 h-8"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Филиал</label>
                      <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                        <SelectTrigger className="h-8 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все филиалы</SelectItem>
                          <SelectItem value="Окская">Окская</SelectItem>
                          <SelectItem value="Мытищи">Мытищи</SelectItem>
                          <SelectItem value="Люберцы">Люберцы</SelectItem>
                          <SelectItem value="Котельники">Котельники</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Статус</label>
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger className="h-8 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все статусы</SelectItem>
                          <SelectItem value="active">Активные</SelectItem>
                          <SelectItem value="trial">Пробные</SelectItem>
                          <SelectItem value="inactive">Неактивные</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Категория</label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="h-8 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все категории</SelectItem>
                          <SelectItem value="preschool">Дошкольники</SelectItem>
                          <SelectItem value="school">Школьники</SelectItem>
                          <SelectItem value="adult">Взрослые</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="default" size="sm" className="flex-1">
                        <Search className="h-3 w-3 mr-1" />
                        Искать
                      </Button>
                      <Button variant="outline" size="sm" onClick={resetFilters}>
                        Сбросить
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Expandable Sections */}
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSection('additional')}
                    className="w-full justify-start h-8 px-2"
                  >
                    {expandedSections.additional ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="text-sm">Дополнительные параметры</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSection('appeal')}
                    className="w-full justify-start h-8 px-2"
                  >
                    {expandedSections.appeal ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="text-sm">Обращение и визит</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSection('newCourse')}
                    className="w-full justify-start h-8 px-2"
                  >
                    {expandedSections.newCourse ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="text-sm">Фильтр для продажи новых курсов</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSection('schedule')}
                    className="w-full justify-start h-8 px-2"
                  >
                    {expandedSections.schedule ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="text-sm">Предпочтительное расписание</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSection('custom')}
                    className="w-full justify-start h-8 px-2"
                  >
                    {expandedSections.custom ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="text-sm">Пользовательские поля</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSection('applications')}
                    className="w-full justify-start h-8 px-2"
                  >
                    {expandedSections.applications ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="text-sm">По данным заявок</span>
                  </Button>
                </div>

                {/* Mass Actions */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">По найденным ({selectedStudents.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      disabled={selectedStudents.length === 0}
                      onClick={() => handleMassAction('email')}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Рассылка
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      disabled={selectedStudents.length === 0}
                      onClick={() => handleMassAction('export')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Экспорт в XLS
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Students Table */}
            <div className="flex-1 overflow-hidden">
              <Card className="h-full rounded-none border-0">
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Список учеников ({filteredStudents.length})
                    </CardTitle>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Показать/Скрыть колонки
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="h-full overflow-auto p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox 
                            checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>ФИО</TableHead>
                        <TableHead>Возраст</TableHead>
                        <TableHead>Филиал</TableHead>
                        <TableHead>Категория</TableHead>
                        <TableHead>Дисциплина</TableHead>
                        <TableHead>Группа</TableHead>
                        <TableHead>Дата визита</TableHead>
                        <TableHead>Контакты</TableHead>
                        <TableHead>Комментарий</TableHead>
                        <TableHead className="w-32">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-8">
                            Загрузка...
                          </TableCell>
                        </TableRow>
                      ) : filteredStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-8">
                            Ученики не найдены
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStudents.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell>
                              <Checkbox 
                                checked={selectedStudents.includes(student.id)}
                                onCheckedChange={(checked) => handleStudentSelect(student.id, checked as boolean)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell>{student.age || '—'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                Не указан
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {student.status === 'active' ? 'Активный' : 
                                 student.status === 'trial' ? 'Пробный' : 'Неактивный'}
                              </Badge>
                            </TableCell>
                            <TableCell>English</TableCell>
                            <TableCell>—</TableCell>
                            <TableCell>
                              {student.created_at ? new Date(student.created_at).toLocaleDateString() : '—'}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-sm">
                                  <Phone className="h-3 w-3" />
                                  {student.phone}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">—</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-green-600 hover:text-green-700">
                                  <Plus className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-yellow-600 hover:text-yellow-700">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700">
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};