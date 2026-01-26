import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar as CalendarIcon, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Phone, 
  MapPin, 
  MessageSquare, 
  Trash2, 
  RefreshCw, 
  Download, 
  Users,
  Link2,
  User,
  GraduationCap
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  useTrialRequests,
  useUpdateTrialRequestStatus,
  useDeleteTrialRequest,
  TRIAL_REQUEST_STATUSES,
  getStatusLabel,
  getStatusColor,
  TrialRequestFilters,
  TrialLessonRequest,
} from '@/hooks/useTrialRequests';
import { useUserAllowedBranches } from '@/hooks/useUserAllowedBranches';
import { LinkTrialRequestModal } from './LinkTrialRequestModal';

export const TrialRequestsManager = () => {
  const [filters, setFilters] = useState<TrialRequestFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [linkRequest, setLinkRequest] = useState<TrialLessonRequest | null>(null);

  const { branchesForDropdown } = useUserAllowedBranches();
  const { data: requests, isLoading, refetch } = useTrialRequests(filters);
  const updateStatus = useUpdateTrialRequestStatus();
  const deleteRequest = useDeleteTrialRequest();

  // Stats
  const stats = useMemo(() => {
    if (!requests) return { total: 0, new: 0, scheduled: 0, enrolled: 0, linked: 0 };
    return {
      total: requests.length,
      new: requests.filter(r => r.status === 'new' || !r.status).length,
      scheduled: requests.filter(r => r.status === 'scheduled').length,
      enrolled: requests.filter(r => r.status === 'enrolled').length,
      linked: requests.filter(r => r.client_id || r.student_id).length,
    };
  }, [requests]);

  const handleExport = () => {
    if (!requests?.length) return;

    const csv = [
      ['Имя', 'Телефон', 'Филиал', 'Адрес', 'Комментарий', 'Статус', 'Источник', 'Клиент', 'Студент', 'Дата'].join(';'),
      ...requests.map(r => [
        r.name,
        r.phone,
        r.branch_name,
        r.branch_address || '',
        r.comment || '',
        getStatusLabel(r.status),
        r.source || '',
        r.client?.name || '',
        r.student ? `${r.student.first_name} ${r.student.last_name || ''}` : '',
        format(new Date(r.created_at), 'dd.MM.yyyy HH:mm'),
      ].join(';')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial-requests-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Заявки на пробные уроки</h1>
          <p className="text-muted-foreground">Управление заявками с сайта и мессенджеров</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!requests?.length}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Всего</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.new}</p>
                <p className="text-xs text-muted-foreground">Новых</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100">
                <CalendarIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.scheduled}</p>
                <p className="text-xs text-muted-foreground">Записаны</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.enrolled}</p>
                <p className="text-xs text-muted-foreground">Записались</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-indigo-100">
                <Link2 className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.linked}</p>
                <p className="text-xs text-muted-foreground">Привязаны</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Фильтры</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Скрыть' : 'Показать'}
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск..."
                  className="pl-9"
                  value={filters.search || ''}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>

              {/* Branch */}
              <Select
                value={filters.branch || 'all'}
                onValueChange={(v) => setFilters({ ...filters, branch: v })}
              >
                <SelectTrigger>
                  <MapPin className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Филиал" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все филиалы</SelectItem>
                  {branchesForDropdown.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status */}
              <Select
                value={filters.status || 'all'}
                onValueChange={(v) => setFilters({ ...filters, status: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  {TRIAL_REQUEST_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Linked filter */}
              <Select
                value={filters.linked || 'all'}
                onValueChange={(v) => setFilters({ ...filters, linked: v as TrialRequestFilters['linked'] })}
              >
                <SelectTrigger>
                  <Link2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Привязка" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="linked">Привязаны</SelectItem>
                  <SelectItem value="unlinked">Не привязаны</SelectItem>
                </SelectContent>
              </Select>

              {/* Date From */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {filters.dateFrom ? format(new Date(filters.dateFrom), 'dd.MM.yyyy') : 'От'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
                    onSelect={(date) => setFilters({ ...filters, dateFrom: date?.toISOString().split('T')[0] })}
                    locale={ru}
                  />
                </PopoverContent>
              </Popover>

              {/* Date To */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {filters.dateTo ? format(new Date(filters.dateTo), 'dd.MM.yyyy') : 'До'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
                    onSelect={(date) => setFilters({ ...filters, dateTo: date?.toISOString().split('T')[0] })}
                    locale={ru}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Clear filters */}
            {Object.values(filters).some(Boolean) && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => setFilters({})}
              >
                Сбросить фильтры
              </Button>
            )}
          </CardContent>
        )}
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : requests && requests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Имя</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Филиал</TableHead>
                  <TableHead>Привязка</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{request.name}</div>
                        {request.comment && (
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {request.comment}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <a
                        href={`tel:${request.phone}`}
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <Phone className="h-3 w-3" />
                        {request.phone}
                      </a>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{request.branch_name}</div>
                    </TableCell>
                    <TableCell>
                      {request.client || request.student ? (
                        <div className="flex flex-col gap-1">
                          {request.client && (
                            <Badge variant="outline" className="gap-1 w-fit">
                              <User className="h-3 w-3" />
                              {request.client.name || 'Клиент'}
                            </Badge>
                          )}
                          {request.student && (
                            <Badge variant="outline" className="gap-1 w-fit">
                              <GraduationCap className="h-3 w-3" />
                              {request.student.first_name} {request.student.last_name || ''}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={() => setLinkRequest(request)}
                        >
                          <Link2 className="h-4 w-4 mr-1" />
                          Привязать
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(request.status)} text-white`}>
                        {getStatusLabel(request.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(request.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setLinkRequest(request)}>
                            <Link2 className="h-4 w-4 mr-2" />
                            Привязать к CRM
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Изменить статус</DropdownMenuLabel>
                          {TRIAL_REQUEST_STATUSES.map((s) => (
                            <DropdownMenuItem
                              key={s.value}
                              onClick={() => updateStatus.mutate({ id: request.id, status: s.value })}
                            >
                              <div className={`w-2 h-2 rounded-full ${s.color} mr-2`} />
                              {s.label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(request.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">Заявок не найдено</h3>
              <p className="text-sm text-muted-foreground">
                {Object.keys(filters).length > 0
                  ? 'Попробуйте изменить параметры фильтрации'
                  : 'Новые заявки появятся здесь'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link modal */}
      <LinkTrialRequestModal
        open={!!linkRequest}
        onOpenChange={(open) => !open && setLinkRequest(null)}
        request={linkRequest}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить заявку?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Заявка будет удалена безвозвратно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) {
                  deleteRequest.mutate(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TrialRequestsManager;
