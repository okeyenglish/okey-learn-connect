import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Filter, 
  Download, 
  Mail, 
  Plus, 
  Edit, 
  Trash2, 
  Phone,
  Users,
  Tag,
  Bookmark,
  Clock
} from "lucide-react";
import { useStudents } from "@/hooks/useStudents";
import { CreateStudentDialog } from "@/components/students/CreateStudentDialog";
import { StudentCard } from "@/components/students/StudentCard";
import { StudentTagsManager } from "@/components/students/StudentTagsManager";
import { BulkActionsPanel } from "@/components/students/BulkActionsPanel";
import { StudentHistoryTimeline } from "@/components/students/StudentHistoryTimeline";
import { StudentSegmentsDialog } from "@/components/students/StudentSegmentsDialog";
import { useUserAllowedBranches } from "@/hooks/useUserAllowedBranches";
import { AVAILABLE_BRANCHES } from "@/hooks/useUserBranches";

export const StudentsSection = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSegmentsDialog, setShowSegmentsDialog] = useState(false);

  const { students, isLoading } = useStudents();
  const { allowedBranches, hasRestrictions } = useUserAllowedBranches();
  
  // Фильтруем список филиалов по доступным для пользователя
  const availableBranchOptions = hasRestrictions 
    ? AVAILABLE_BRANCHES.filter(b => allowedBranches.includes(b))
    : AVAILABLE_BRANCHES;

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

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedBranch("all");
    setSelectedStatus("all");
  };

  const handleApplySegment = (filters: Record<string, any>) => {
    if (filters.branch) setSelectedBranch(filters.branch);
    if (filters.status) setSelectedStatus(filters.status);
  };

  const getCurrentFilters = () => {
    const filters: Record<string, any> = {};
    if (selectedBranch !== 'all') filters.branch = selectedBranch;
    if (selectedStatus !== 'all') filters.status = selectedStatus;
    return filters;
  };

  const handleMassAction = (action: string) => {
    console.log(`Mass action: ${action} for students:`, selectedStudents);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h2 className="text-xl font-bold">Ученики</h2>
          <Badge variant="secondary">{filteredStudents.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleMassAction('export')}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить ученика
          </Button>
          <CreateStudentDialog open={showAddModal} onOpenChange={setShowAddModal} />
        </div>
      </div>

      <BulkActionsPanel 
        selectedStudents={selectedStudents} 
        onClearSelection={() => setSelectedStudents([])} 
      />

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Filters Sidebar */}
          <div className="w-80 border-r bg-muted/30 p-4 overflow-y-auto">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Фильтры</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Поиск</label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Имя, телефон..."
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
                      {availableBranchOptions.map((branch) => (
                        <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                      ))}
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

                <div className="flex gap-2 pt-2">
                  <Button variant="default" size="sm" className="flex-1">
                    <Search className="h-3 w-3 mr-1" />
                    Искать
                  </Button>
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Сбросить
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setShowSegmentsDialog(true)}
                  >
                    <Bookmark className="h-4 w-4 mr-2" />
                    Сегменты
                  </Button>
                </div>

                {selectedStudents.length > 0 && (
                  <div className="space-y-2 pt-4 border-t">
                    <h4 className="text-xs font-medium">Выбрано: {selectedStudents.length}</h4>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleMassAction('email')}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Рассылка
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Students Table */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-auto">
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
                    <TableHead>Теги</TableHead>
                    <TableHead>Телефон</TableHead>
                    <TableHead>Дата создания</TableHead>
                    <TableHead className="w-32">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Загрузка...
                      </TableCell>
                    </TableRow>
                  ) : filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        Ученики не найдены
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => (
                      <TableRow key={student.id} className="group">
                        <TableCell>
                          <Checkbox 
                            checked={selectedStudents.includes(student.id)}
                            onCheckedChange={(checked) => handleStudentSelect(student.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.age || '—'}</TableCell>
                        <TableCell>
                          {student.branch ? (
                            <Badge variant="outline" className="text-xs">
                              {student.branch}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={(student.status as string) === 'active' ? 'default' : 'secondary'} 
                            className="text-xs"
                          >
                            {(student.status as string) === 'active' ? 'Активный' : 
                             (student.status as string) === 'trial' ? 'Пробный' :
                             (student.status as string) === 'not_started' ? 'Не начал' :
                             (student.status as string) === 'archived' ? 'Архив' :
                             (student.status as string) === 'on_pause' ? 'На паузе' : 
                             'Неактивный'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StudentTagsManager studentId={student.id} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {student.phone}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {student.created_at ? new Date(student.created_at).toLocaleDateString('ru-RU') : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Trash2 className="h-4 w-4" />
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
      </div>

      <StudentSegmentsDialog
        open={showSegmentsDialog}
        onOpenChange={setShowSegmentsDialog}
        currentFilters={getCurrentFilters()}
        onApplySegment={handleApplySegment}
      />
    </div>
  );
};