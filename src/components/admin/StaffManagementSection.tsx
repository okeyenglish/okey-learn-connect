import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddTeacherModal } from './AddTeacherModal';
import { EditTeacherModal } from './EditTeacherModal';
import { AddUserModal } from './AddUserModal';
import { BulkProfileLinkModal } from './BulkProfileLinkModal';
import { useTeachers, getTeacherFullName } from '@/hooks/useTeachers';
import { useOrganization } from '@/hooks/useOrganization';
import { useRoles } from '@/hooks/useRoles';
import { supabase } from '@/integrations/supabase/typedClient';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errorUtils';
import { syncBranchGroupMembership } from '@/lib/syncBranchGroupMembership';
import { SELF_HOSTED_URL, SELF_HOSTED_ANON_KEY } from '@/lib/selfHostedApi';
import type { Teacher } from '@/integrations/supabase/database.types';
import type { AppRole } from '@/integrations/supabase/database.types';
import {
  Search,
  Users,
  GraduationCap,
  UserPlus,
  MoreHorizontal,
  Edit,
  Phone,
  Mail,
  MapPin,
  UserX,
  UserCheck,
  Link2,
  AlertCircle,
  Shield,
  Building2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';

interface StaffMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  branch: string | null;
  roles: string[];
  type: 'employee' | 'teacher' | 'both';
  is_active: boolean;
  teacher_id?: string;
  profile_id?: string | null;
  subjects?: string[];
  categories?: string[];
}

type StaffFilter = 'all' | 'employees' | 'teachers';
type StatusFilter = 'all' | 'active' | 'inactive';

export const StaffManagementSection: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<StaffFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [addUserOpen, setAddUserOpen] = useState(false);

  const { teachers, isLoading: teachersLoading, refetch: refetchTeachers, toggleActive } = useTeachers({ includeInactive: true });
  const { branches } = useOrganization();
  const { 
    fetchUsersWithRoles, 
    assignRole, 
    revokeRole, 
    getRoleDisplayName, 
    availableRoles,
    loading: rolesLoading 
  } = useRoles();

  const [employees, setEmployees] = useState<Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    branch: string | null;
    roles: string[];
  }>>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);

  const loadEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    try {
      const data = await fetchUsersWithRoles();
      setEmployees(data);
    } catch (e) {
      console.error('Error loading employees:', e);
    }
    setEmployeesLoading(false);
  }, []);

  useEffect(() => {
    loadEmployees();
  }, []);

  // Merge employees and teachers into unified staff list
  const staffList = useMemo<StaffMember[]>(() => {
    const map = new Map<string, StaffMember>();

    // Add employees first
    employees.forEach(emp => {
      map.set(emp.id, {
        id: emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        email: emp.email,
        phone: emp.phone,
        branch: emp.branch,
        roles: emp.roles,
        type: 'employee',
        is_active: true,
      });
    });

    // Merge teachers
    teachers.forEach(teacher => {
      if (teacher.profile_id && map.has(teacher.profile_id)) {
        // Teacher linked to a profile — merge
        const existing = map.get(teacher.profile_id)!;
        existing.type = 'both';
        existing.teacher_id = teacher.id;
        existing.profile_id = teacher.profile_id;
        existing.subjects = teacher.subjects || [];
        existing.categories = teacher.categories || [];
        existing.is_active = teacher.is_active !== false;
        // Prefer teacher branch if set
        if (teacher.branch) existing.branch = teacher.branch;
      } else {
        // Standalone teacher (no profile link)
        map.set(`teacher-${teacher.id}`, {
          id: `teacher-${teacher.id}`,
          first_name: teacher.first_name,
          last_name: teacher.last_name,
          email: teacher.email,
          phone: teacher.phone,
          branch: teacher.branch,
          roles: [],
          type: 'teacher',
          is_active: teacher.is_active !== false,
          teacher_id: teacher.id,
          profile_id: teacher.profile_id,
          subjects: teacher.subjects || [],
          categories: teacher.categories || [],
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const nameA = `${a.last_name || ''} ${a.first_name || ''}`.trim().toLowerCase();
      const nameB = `${b.last_name || ''} ${b.first_name || ''}`.trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [employees, teachers]);

  // Filtering
  const filteredStaff = useMemo(() => {
    return staffList.filter(member => {
      const fullName = `${member.first_name || ''} ${member.last_name || ''} ${member.email || ''}`.toLowerCase();
      const matchesSearch = fullName.includes(searchTerm.toLowerCase());
      const matchesBranch = branchFilter === 'all' || member.branch === branchFilter;
      const matchesType = typeFilter === 'all' ||
        (typeFilter === 'employees' && (member.type === 'employee' || member.type === 'both')) ||
        (typeFilter === 'teachers' && (member.type === 'teacher' || member.type === 'both'));
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && member.is_active) ||
        (statusFilter === 'inactive' && !member.is_active);
      return matchesSearch && matchesBranch && matchesType && matchesStatus;
    });
  }, [staffList, searchTerm, branchFilter, typeFilter, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const totalEmployees = staffList.filter(s => s.type === 'employee' || s.type === 'both').length;
    const totalTeachers = staffList.filter(s => s.type === 'teacher' || s.type === 'both').length;
    const active = staffList.filter(s => s.is_active).length;
    const inactive = staffList.filter(s => !s.is_active).length;
    const unlinkedTeachers = teachers.filter(t => !t.profile_id && t.is_active !== false).length;
    return { total: staffList.length, totalEmployees, totalTeachers, active, inactive, unlinkedTeachers };
  }, [staffList, teachers]);

  const uniqueBranches = useMemo(() => {
    return [...new Set(staffList.map(s => s.branch).filter(Boolean))] as string[];
  }, [staffList]);

  // Handlers
  const handleEditTeacher = (member: StaffMember) => {
    const teacher = teachers.find(t => t.id === member.teacher_id);
    if (teacher) {
      setEditingTeacher(teacher);
      setEditModalOpen(true);
    }
  };

  const handleToggleActive = (member: StaffMember) => {
    if (member.teacher_id) {
      const teacher = teachers.find(t => t.id === member.teacher_id);
      if (teacher) {
        toggleActive.mutate({ id: teacher.id, isActive: !member.is_active });
      }
    }
  };

  const handleOpenRoleModal = (member: StaffMember) => {
    setSelectedStaff(member);
    setSelectedRoles([...member.roles]);
    setRoleModalOpen(true);
  };

  const handleSaveRoles = async () => {
    if (!selectedStaff) return;
    const userId = selectedStaff.type === 'teacher' && !selectedStaff.profile_id
      ? null
      : (selectedStaff.type === 'teacher' ? selectedStaff.profile_id : selectedStaff.id);

    if (!userId) {
      toast.error('У этого преподавателя нет привязанного профиля. Сначала привяжите профиль.');
      setRoleModalOpen(false);
      return;
    }

    try {
      // Determine roles to add and remove
      const currentRoles = selectedStaff.roles;
      const toAdd = selectedRoles.filter(r => !currentRoles.includes(r));
      const toRemove = currentRoles.filter(r => !selectedRoles.includes(r));

      for (const role of toAdd) {
        await assignRole(userId, role as AppRole);
      }
      for (const role of toRemove) {
        await revokeRole(userId, role as AppRole);
      }

      await loadEmployees();
      setRoleModalOpen(false);
      toast.success('Роли обновлены');
    } catch (e) {
      toast.error('Ошибка обновления ролей: ' + getErrorMessage(e));
    }
  };

  const handleOpenBranchModal = (member: StaffMember) => {
    setSelectedStaff(member);
    setSelectedBranch(member.branch || '');
    setBranchModalOpen(true);
  };

  const handleSaveBranch = async () => {
    if (!selectedStaff) return;

    try {
      const oldBranch = selectedStaff.branch || null;
      const newBranch = selectedBranch || null;

      // Update profile branch
      const profileId = selectedStaff.type === 'teacher' 
        ? selectedStaff.profile_id 
        : selectedStaff.id;

      if (profileId) {
        const { error } = await supabase
          .from('profiles')
          .update({ branch: newBranch })
          .eq('id', profileId);
        if (error) throw error;
      }

      // Update teacher branch too if exists
      if (selectedStaff.teacher_id) {
        const { error } = await supabase
          .from('teachers')
          .update({ branch: newBranch })
          .eq('id', selectedStaff.teacher_id);
        if (error) throw error;
      }

      // Sync branch group membership (remove from old, add to new)
      if (profileId) {
        syncBranchGroupMembership(profileId, oldBranch, newBranch).catch(e =>
          console.error('[handleSaveBranch] Group sync error:', e)
        );
      }

      await loadEmployees();
      refetchTeachers();
      setBranchModalOpen(false);
      toast.success('Филиал обновлён');
    } catch (e) {
      toast.error('Ошибка: ' + getErrorMessage(e));
    }
  };

  const handleDeactivateEmployee = async (member: StaffMember) => {
    if (!confirm(`Деактивировать ${member.first_name} ${member.last_name}?`)) return;

    try {
      const profileId = member.type === 'teacher' ? member.profile_id : member.id;
      if (profileId) {
        const res = await fetch(
          `${SELF_HOSTED_URL}/rest/v1/profiles?id=eq.${profileId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SELF_HOSTED_ANON_KEY,
              'Authorization': `Bearer ${SELF_HOSTED_ANON_KEY}`,
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ is_active: false }),
          }
        );
        if (!res.ok) throw new Error(`Profile deactivation failed: ${res.status}`);
      }
      if (member.teacher_id) {
        const res = await fetch(
          `${SELF_HOSTED_URL}/rest/v1/teachers?id=eq.${member.teacher_id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SELF_HOSTED_ANON_KEY,
              'Authorization': `Bearer ${SELF_HOSTED_ANON_KEY}`,
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ is_active: false }),
          }
        );
        if (!res.ok) throw new Error(`Teacher deactivation failed: ${res.status}`);
      }
      await loadEmployees();
      refetchTeachers();
      toast.success('Сотрудник деактивирован');
    } catch (e) {
      toast.error('Ошибка: ' + getErrorMessage(e));
    }
  };

  const handleActivateEmployee = async (member: StaffMember) => {
    try {
      const profileId = member.type === 'teacher' ? member.profile_id : member.id;
      if (profileId) {
        const res = await fetch(
          `${SELF_HOSTED_URL}/rest/v1/profiles?id=eq.${profileId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SELF_HOSTED_ANON_KEY,
              'Authorization': `Bearer ${SELF_HOSTED_ANON_KEY}`,
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ is_active: true }),
          }
        );
        if (!res.ok) throw new Error(`Profile activation failed: ${res.status}`);
      }
      if (member.teacher_id) {
        const res = await fetch(
          `${SELF_HOSTED_URL}/rest/v1/teachers?id=eq.${member.teacher_id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SELF_HOSTED_ANON_KEY,
              'Authorization': `Bearer ${SELF_HOSTED_ANON_KEY}`,
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ is_active: true }),
          }
        );
        if (!res.ok) throw new Error(`Teacher activation failed: ${res.status}`);
      }
      await loadEmployees();
      refetchTeachers();
      toast.success('Сотрудник активирован');
    } catch (e) {
      toast.error('Ошибка: ' + getErrorMessage(e));
    }
  };

  const getTypeLabel = (type: StaffMember['type']) => {
    switch (type) {
      case 'employee': return { label: 'Сотрудник', variant: 'secondary' as const, icon: Users };
      case 'teacher': return { label: 'Преподаватель', variant: 'outline' as const, icon: GraduationCap };
      case 'both': return { label: 'Сотрудник + Преп.', variant: 'default' as const, icon: Users };
    }
  };

  const isLoading = teachersLoading || employeesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Управление персоналом</h1>
          <p className="text-muted-foreground">
            Сотрудники и преподаватели — роли, филиалы, статусы
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BulkProfileLinkModal teachers={teachers} onLinked={() => { refetchTeachers(); loadEmployees(); }}>
            <Button variant="outline" className={stats.unlinkedTeachers > 0 ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50' : ''}>
              <Link2 className="h-4 w-4 mr-2" />
              Привязка профилей
              {stats.unlinkedTeachers > 0 && (
                <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-700">{stats.unlinkedTeachers}</Badge>
              )}
            </Button>
          </BulkProfileLinkModal>
          <AddTeacherModal onTeacherAdded={() => { refetchTeachers(); loadEmployees(); }}>
            <Button variant="outline">
              <GraduationCap className="h-4 w-4 mr-2" />
              Добавить преподавателя
            </Button>
          </AddTeacherModal>
          <AddUserModal open={addUserOpen} onOpenChange={setAddUserOpen} onUserAdded={() => loadEmployees()}>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Добавить сотрудника
            </Button>
          </AddUserModal>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Сотрудники</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Преподаватели</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeachers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активные</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card className={stats.unlinkedTeachers > 0 ? 'border-yellow-200' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Без профиля</CardTitle>
            <AlertCircle className={`h-4 w-4 ${stats.unlinkedTeachers > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.unlinkedTeachers > 0 ? 'text-yellow-700' : ''}`}>{stats.unlinkedTeachers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени, email, телефону..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as StaffFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="employees">Сотрудники</SelectItem>
                <SelectItem value="teachers">Преподаватели</SelectItem>
              </SelectContent>
            </Select>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Все филиалы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все филиалы</SelectItem>
                {uniqueBranches.map(branch => (
                  <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="active">Активные</SelectItem>
                <SelectItem value="inactive">Неактивные</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список персонала</CardTitle>
          <CardDescription>
            Показано {filteredStaff.length} из {staffList.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Сотрудник</TableHead>
                  <TableHead>Контакты</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Роли</TableHead>
                  <TableHead>Филиал</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Не найдено сотрудников по заданным критериям
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStaff.map(member => {
                    const typeInfo = getTypeLabel(member.type);
                    return (
                      <TableRow key={member.id} className={!member.is_active ? 'opacity-60' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback>
                                {(member.first_name?.[0] || '')}{(member.last_name?.[0] || '')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {`${member.last_name || ''} ${member.first_name || ''}`.trim() || 'Без имени'}
                              </div>
                              {member.subjects && member.subjects.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {member.subjects.slice(0, 2).map((s, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                                  ))}
                                  {member.subjects.length > 2 && (
                                    <Badge variant="secondary" className="text-xs">+{member.subjects.length - 2}</Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col gap-1 text-sm">
                            {member.phone && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3 w-3" />{member.phone}
                              </span>
                            )}
                            {member.email && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="h-3 w-3" />{member.email}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant={typeInfo.variant} className="gap-1">
                            <typeInfo.icon className="h-3 w-3" />
                            {typeInfo.label}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {member.roles.length > 0 ? member.roles.map(role => (
                              <Badge key={role} variant="outline" className="text-xs">
                                {getRoleDisplayName(role as AppRole)}
                              </Badge>
                            )) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          {member.branch ? (
                            <Badge variant="outline" className="gap-1">
                              <MapPin className="h-3 w-3" />{member.branch}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {!member.is_active ? (
                            <Badge variant="outline" className="text-gray-500 border-gray-200">
                              <XCircle className="h-3 w-3 mr-1" />Неактивен
                            </Badge>
                          ) : member.type === 'teacher' && !member.profile_id ? (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                              <Clock className="h-3 w-3 mr-1" />Без профиля
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                              <CheckCircle2 className="h-3 w-3 mr-1" />Активен
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
                              <DropdownMenuItem onClick={() => handleOpenRoleModal(member)}>
                                <Shield className="mr-2 h-4 w-4" />
                                Управление ролями
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenBranchModal(member)}>
                                <Building2 className="mr-2 h-4 w-4" />
                                Изменить филиал
                              </DropdownMenuItem>
                              {(member.type === 'teacher' || member.type === 'both') && member.teacher_id && (
                                <DropdownMenuItem onClick={() => handleEditTeacher(member)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Редактировать преподавателя
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {member.is_active ? (
                                <DropdownMenuItem
                                  onClick={() => handleDeactivateEmployee(member)}
                                  className="text-destructive"
                                >
                                  <UserX className="mr-2 h-4 w-4" />
                                  Деактивировать
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleActivateEmployee(member)}>
                                  <UserCheck className="mr-2 h-4 w-4 text-green-600" />
                                  Активировать
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Teacher Modal */}
      <EditTeacherModal
        teacher={editingTeacher}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onUpdated={() => { refetchTeachers(); loadEmployees(); }}
      />

      {/* Role Management Modal */}
      <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Управление ролями
            </DialogTitle>
            <DialogDescription>
              {selectedStaff && `${selectedStaff.first_name || ''} ${selectedStaff.last_name || ''}`.trim()}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3 py-2">
              {availableRoles.map(role => (
                <label
                  key={role}
                  className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedRoles.includes(role)}
                    onCheckedChange={(checked) => {
                      setSelectedRoles(prev =>
                        checked ? [...prev, role] : prev.filter(r => r !== role)
                      );
                    }}
                  />
                  <div>
                    <div className="font-medium text-sm">{getRoleDisplayName(role as AppRole)}</div>
                  </div>
                </label>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleModalOpen(false)}>Отмена</Button>
            <Button onClick={handleSaveRoles}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branch Change Modal */}
      <Dialog open={branchModalOpen} onOpenChange={setBranchModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Изменить филиал
            </DialogTitle>
            <DialogDescription>
              {selectedStaff && `${selectedStaff.first_name || ''} ${selectedStaff.last_name || ''}`.trim()}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Филиал</Label>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Выберите филиал" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Не выбран</SelectItem>
                {branches.map(branch => (
                  <SelectItem key={branch.id} value={branch.name}>{branch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBranchModalOpen(false)}>Отмена</Button>
            <Button onClick={handleSaveBranch}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
