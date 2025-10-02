import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Search, 
  Filter, 
  Download, 
  Mail, 
  MessageSquare,
  Plus, 
  Edit,
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
import { StudentCard } from "@/components/students/StudentCard";

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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [showStudentCard, setShowStudentCard] = useState(false);
  
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

  // If open is true and onOpenChange is provided, render content without dialog
  if (open === true && onOpenChange) {
    return <StudentsContent 
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      selectedBranch={selectedBranch}
      setSelectedBranch={setSelectedBranch}
      selectedStatus={selectedStatus}
      setSelectedStatus={setSelectedStatus}
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      selectedLevel={selectedLevel}
      setSelectedLevel={setSelectedLevel}
      selectedStudents={selectedStudents}
      setSelectedStudents={setSelectedStudents}
      showAddModal={showAddModal}
      setShowAddModal={setShowAddModal}
      showAdvancedFilters={showAdvancedFilters}
      setShowAdvancedFilters={setShowAdvancedFilters}
      expandedSections={expandedSections}
      setExpandedSections={setExpandedSections}
      visibleColumns={visibleColumns}
      setVisibleColumns={setVisibleColumns}
      students={students}
      isLoading={isLoading}
      selectedStudent={selectedStudent}
      setSelectedStudent={setSelectedStudent}
      showStudentCard={showStudentCard}
      setShowStudentCard={setShowStudentCard}
    />;
  }

  return (
    <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="w-[98vw] max-w-[1800px] h-[95vh] flex flex-col overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-foreground">
              Ученики и клиенты
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => console.log('export')}>
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

        <StudentsContent 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedBranch={selectedBranch}
          setSelectedBranch={setSelectedBranch}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedLevel={selectedLevel}
          setSelectedLevel={setSelectedLevel}
          selectedStudents={selectedStudents}
          setSelectedStudents={setSelectedStudents}
          showAddModal={showAddModal}
          setShowAddModal={setShowAddModal}
          showAdvancedFilters={showAdvancedFilters}
          setShowAdvancedFilters={setShowAdvancedFilters}
          expandedSections={expandedSections}
          setExpandedSections={setExpandedSections}
          visibleColumns={visibleColumns}
          setVisibleColumns={setVisibleColumns}
          students={students}
          isLoading={isLoading}
          selectedStudent={selectedStudent}
          setSelectedStudent={setSelectedStudent}
          showStudentCard={showStudentCard}
          setShowStudentCard={setShowStudentCard}
        />
      </DialogContent>
    </Dialog>
  );
};

// Separate component for the main content
interface StudentsContentProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedBranch: string;
  setSelectedBranch: (branch: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedLevel: string;
  setSelectedLevel: (level: string) => void;
  selectedStudents: string[];
  setSelectedStudents: (students: string[]) => void;
  showAddModal: boolean;
  setShowAddModal: (show: boolean) => void;
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: (show: boolean) => void;
  expandedSections: any;
  setExpandedSections: (sections: any) => void;
  visibleColumns: any;
  setVisibleColumns: (columns: any) => void;
  students: any[];
  isLoading: boolean;
  selectedStudent: any | null;
  setSelectedStudent: (student: any | null) => void;
  showStudentCard: boolean;
  setShowStudentCard: (show: boolean) => void;
}

const StudentsContent = ({ 
  searchTerm, setSearchTerm, selectedBranch, setSelectedBranch, 
  selectedStatus, setSelectedStatus, selectedCategory, setSelectedCategory,
  selectedLevel, setSelectedLevel, selectedStudents, setSelectedStudents,
  showAddModal, setShowAddModal, showAdvancedFilters, setShowAdvancedFilters,
  expandedSections, setExpandedSections,
  visibleColumns, setVisibleColumns, students, isLoading,
  selectedStudent, setSelectedStudent, showStudentCard, setShowStudentCard
}: StudentsContentProps) => {
  // Filter students based on current filters with proper null checks
  const filteredStudents = students.filter(student => {
    // Search filter - check name, phone, and email
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesName = student.name?.toLowerCase().includes(search) || false;
      const matchesPhone = student.phone?.includes(searchTerm) || false;
      
      if (!matchesName && !matchesPhone) {
        return false;
      }
    }
    
    // Branch filter - for now we don't have branch data on students
    // This would need to be implemented via family_groups or a direct branch field
    if (selectedBranch !== "all") {
      // TODO: Implement branch filtering when branch data is available
    }
    
    // Status filter
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
    setExpandedSections((prev: any) => ({
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
  };

  const handleStudentClick = (student: any) => {
    setSelectedStudent(student);
    setShowStudentCard(true);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Filters Section - Top */}
      <div className="shrink-0 border-b bg-muted/30 p-4">
        {/* Main Search */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Поиск по имени, фамилии или телефону</label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Введите имя, фамилию или телефон..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
          </div>

          {/* Advanced Filters Collapsible */}
          <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                {showAdvancedFilters ? (
                  <ChevronDown className="h-4 w-4 mr-2" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-2" />
                )}
                Дополнительные параметры
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Branch */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Филиал</label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger className="h-9 mt-1">
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

                {/* Status */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Статус</label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="h-9 mt-1">
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

                {/* Category */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Категория</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-9 mt-1">
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
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Сбросить фильтры
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Выбрано: {selectedStudents.length}
            </span>
            {selectedStudents.length > 0 && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleMassAction('email')}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Рассылка
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleMassAction('export')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Экспорт
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Students Table Section */}
      <div className="flex-1 overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="px-6 py-3 border-b bg-background shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <h3 className="font-semibold">Список учеников</h3>
                <Badge variant="secondary">{filteredStudents.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Колонки
                </Button>
                <AddStudentModal open={showAddModal} onOpenChange={setShowAddModal}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить
                  </Button>
                </AddStudentModal>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
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
                    <TableHead>Статус</TableHead>
                    <TableHead>Контакты</TableHead>
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
                        <TableCell 
                          className="font-medium cursor-pointer hover:text-primary hover:underline"
                          onClick={() => handleStudentClick(student)}
                        >
                          {student.name}
                        </TableCell>
                        <TableCell>{student.age || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            <Building className="h-3 w-3 mr-1" />
                            Не указан
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {student.status === 'active' ? 'Активный' : 
                             student.status === 'trial' ? 'Пробный' : 'Неактивный'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {student.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs">{student.phone}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MessageSquare className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Student Card Modal */}
      {selectedStudent && (
        <StudentCard
          student={selectedStudent}
          open={showStudentCard}
          onOpenChange={(open) => {
            setShowStudentCard(open);
            if (!open) setSelectedStudent(null);
          }}
        />
      )}
    </div>
  );
};