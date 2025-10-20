import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Users, 
  UserCheck, 
  UserX, 
  UserPlus,
  Download,
  Upload,
  Search,
  Filter,
  CalendarClock,
  Pause,
  Bookmark
} from 'lucide-react';
import { AddStudentModal } from './AddStudentModal';
import { ImportStudentsModal } from './ImportStudentsModal';
import { ExportStudentsDialog } from './ExportStudentsDialog';
import { DuplicatesDialog } from './DuplicatesDialog';
import { AdvancedFilters } from './AdvancedFilters';
import { SegmentStatistics } from './SegmentStatistics';
import { StudentSegmentsDialog } from './StudentSegmentsDialog';
import { StudentsTable } from './StudentsTable';
import { StudentCard } from './StudentCard';
import { useStudents } from '@/hooks/useStudents';
import { useStudentsWithFilters, StudentFilters } from '@/hooks/useStudentsWithFilters';

export default function StudentsSection() {
  const [activeTab, setActiveTab] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [segmentsDialogOpen, setSegmentsDialogOpen] = useState(false);
  
  const [filters, setFilters] = useState<StudentFilters>({
    searchTerm: '',
    branch: 'all',
    status: 'all',
    level: 'all',
  });

  const { data: students = [], isLoading: loading } = useStudentsWithFilters(filters);

  // Вычисляем статистику из реальных данных
  const studentsStats = {
    total: students.length,
    active: students.filter(s => s.status === 'active').length,
    paused: students.filter(s => s.status === 'trial').length, // используем trial как paused
    inactive: students.filter(s => s.status === 'inactive').length,
    newThisMonth: students.filter(s => {
      const createdAt = new Date(s.created_at);
      const now = new Date();
      return createdAt.getMonth() === now.getMonth() && 
             createdAt.getFullYear() === now.getFullYear();
    }).length,
    graduatedThisMonth: students.filter(s => {
      if (s.status !== 'graduated') return false;
      const updatedAt = new Date(s.updated_at);
      const now = new Date();
      return updatedAt.getMonth() === now.getMonth() && 
             updatedAt.getFullYear() === now.getFullYear();
    }).length
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ученики и клиенты</h1>
          <p className="text-muted-foreground">
            Управление студентами, их профилями и академической историей
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSegmentsDialogOpen(true)}>
            <Bookmark className="h-4 w-4 mr-2" />
            Сегменты
          </Button>
          <DuplicatesDialog />
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Импорт
          </Button>
          <ExportStudentsDialog />
          <AddStudentModal 
            open={showAddModal} 
            onOpenChange={setShowAddModal}
          >
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Добавить ученика
            </Button>
          </AddStudentModal>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего учеников</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentsStats.total}</div>
            <p className="text-xs text-muted-foreground">
              +{studentsStats.newThisMonth} за месяц
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активные</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{studentsStats.active}</div>
            <p className="text-xs text-muted-foreground">
              {((studentsStats.active / studentsStats.total) * 100).toFixed(1)}% от общего числа
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">На паузе</CardTitle>
            <Pause className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{studentsStats.paused}</div>
            <p className="text-xs text-muted-foreground">
              Временно приостановили
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Неактивные</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{studentsStats.inactive}</div>
            <p className="text-xs text-muted-foreground">
              Завершили обучение
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Новые ученики</CardTitle>
            <UserPlus className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{studentsStats.newThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              За текущий месяц
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Выпускники</CardTitle>
            <CalendarClock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{studentsStats.graduatedThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              За текущий месяц
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Фильтры и поиск</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Поиск</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Имя, телефон, email..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Филиал</label>
              <Select 
                value={filters.branch} 
                onValueChange={(value) => setFilters({ ...filters, branch: value })}
              >
                <SelectTrigger>
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Статус</label>
              <Select 
                value={filters.status} 
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="active">Активные</SelectItem>
                  <SelectItem value="paused">На паузе</SelectItem>
                  <SelectItem value="inactive">Неактивные</SelectItem>
                  <SelectItem value="trial">Пробные</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Уровень</label>
              <Select 
                value={filters.level} 
                onValueChange={(value) => setFilters({ ...filters, level: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все уровни</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="elementary">Elementary</SelectItem>
                  <SelectItem value="pre-intermediate">Pre-Intermediate</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="upper-intermediate">Upper-Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <AdvancedFilters filters={filters} onFiltersChange={setFilters} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Основной контент */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">
            Все ученики
            <Badge variant="secondary" className="ml-2">
              {studentsStats.total}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="active">
            Активные
            <Badge variant="secondary" className="ml-2">
              {studentsStats.active}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="paused">
            На паузе
            <Badge variant="secondary" className="ml-2">
              {studentsStats.paused}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Неактивные
            <Badge variant="secondary" className="ml-2">
              {studentsStats.inactive}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="analytics">
            Аналитика
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <StudentsTable 
            filters={filters}
            statusFilter="all"
          />
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <StudentsTable 
            filters={filters}
            statusFilter="active"
          />
        </TabsContent>

        <TabsContent value="paused" className="space-y-4">
          <StudentsTable 
            filters={filters}
            statusFilter="paused"
          />
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          <StudentsTable 
            filters={filters}
            statusFilter="inactive"
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <SegmentStatistics />
        </TabsContent>
      </Tabs>

      <ImportStudentsModal open={showImportModal} onOpenChange={setShowImportModal} />
      <StudentSegmentsDialog
        open={segmentsDialogOpen}
        onOpenChange={setSegmentsDialogOpen}
        currentFilters={filters}
        onApplySegment={(segmentFilters) => {
          setFilters(segmentFilters);
          setSegmentsDialogOpen(false);
        }}
      />
    </div>
  );
}