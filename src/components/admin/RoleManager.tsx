import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { 
  Users, 
  Shield, 
  Plus, 
  Trash2, 
  Search, 
  UserPlus, 
  Settings,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { AddUserModal } from './AddUserModal';
import { useRoles } from '@/hooks/useRoles';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import type { AppRole } from '@/lib/permissions';

interface UserWithRoles {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  branch: string | null;
  roles: AppRole[];
}

export const RoleManager = () => {
  const { hasPermissionSync, user, role, roles, profile, loading: authLoading } = useAuth();
  const { 
    loading,
    userRoles,
    rolePermissions,
    availableRoles,
    fetchUsersWithRoles,
    assignRole,
    revokeRole,
    getRoleDisplayName,
    getRoleDescription
  } = useRoles();
  
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Проверяем разрешения с учетом роли администратора
  const isAdmin = role === 'admin' || roles?.includes?.('admin');
  const canManageRoles = isAdmin || hasPermissionSync('manage', 'roles') || hasPermissionSync('manage', 'all');
  
  // Отладочная информация
  console.log('RoleManager permissions check:', {
    canManageRoles,
    isAdmin,
    hasManageRoles: hasPermissionSync('manage', 'roles'),
    hasManageAll: hasPermissionSync('manage', 'all'),
    user: user,
    roles: roles,
    role: role,
    profile: profile
  });

  // Загрузка пользователей с ролями
  const loadUsers = async () => {
    console.log('Loading users, current permissions:', {
      canManageRoles,
      user: user?.id,
      role,
      roles
    });
    setLoadingUsers(true);
    try {
      const usersData = await fetchUsersWithRoles();
      console.log('Loaded users:', usersData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    }
    setLoadingUsers(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Фильтрация пользователей
  const filteredUsers = users.filter(user => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const email = user.email?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    
    return fullName.includes(search) || email.includes(search);
  });

  // Обработчик назначения роли
  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) return;
    
    const success = await assignRole(selectedUser.id, selectedRole);
    if (success) {
      await loadUsers();
      setShowAssignDialog(false);
      setSelectedUser(null);
      setSelectedRole('');
    }
  };

  // Обработчик отзыва роли
  const handleRevokeRole = async (userId: string, role: AppRole) => {
    const success = await revokeRole(userId, role);
    if (success) {
      await loadUsers();
    }
  };

  // Получить цвет бейджа роли
  const getRoleBadgeVariant = (role: AppRole) => {
    const variants = {
      'admin': 'destructive',
      'branch_manager': 'default',
      'methodist': 'secondary',
      'head_teacher': 'outline',
      'sales_manager': 'default',
      'marketing_manager': 'secondary',
      'manager': 'outline',
      'accountant': 'secondary',
      'receptionist': 'outline',
      'teacher': 'default',
      'student': 'secondary'
    };
    
    return variants[role] as 'default' | 'destructive' | 'outline' | 'secondary';
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canManageRoles) {
    return (
      <div className="text-center py-8">
        <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Доступ запрещен</h3>
        <p className="text-muted-foreground">
          У вас нет прав для управления ролями пользователей
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Управление ролями</h2>
          <p className="text-muted-foreground">
            Назначение и управление ролями пользователей системы
          </p>
        </div>
        
        <div className="flex gap-2">
          <AddUserModal 
            open={showAddUserDialog} 
            onOpenChange={setShowAddUserDialog}
            onUserAdded={loadUsers}
          >
            <Button variant="outline">
              <UserPlus className="h-4 w-4 mr-2" />
              Добавить пользователя
            </Button>
          </AddUserModal>

          <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
            <DialogTrigger asChild>
              <Button>
                <Settings className="h-4 w-4 mr-2" />
                Назначить роль
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Назначить роль пользователю</DialogTitle>
              <DialogDescription>
                Выберите пользователя и роль для назначения
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="user">Пользователь</Label>
                <Select onValueChange={(value) => {
                  const user = users.find(u => u.id === value);
                  setSelectedUser(user || null);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите пользователя" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="role">Роль</Label>
                <Select onValueChange={(value) => setSelectedRole(value as AppRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите роль" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map(role => (
                      <SelectItem key={role} value={role}>
                        {getRoleDisplayName(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedRole && (
                <div className="p-3 bg-muted rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4" />
                    <span className="font-medium">Описание роли</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getRoleDescription(selectedRole)}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Отмена
              </Button>
              <Button 
                onClick={handleAssignRole}
                disabled={!selectedUser || !selectedRole}
              >
                Назначить роль
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Пользователи и роли
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Settings className="h-4 w-4 mr-2" />
            Права ролей
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Пользователи системы</CardTitle>
              <CardDescription>
                Управление ролями для всех пользователей
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск пользователей..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {loadingUsers ? (
                <div className="text-center py-4">Загрузка пользователей...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Пользователь</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Филиал</TableHead>
                      <TableHead>Роли</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(user => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {user.first_name} {user.last_name}
                            </div>
                            {user.phone && (
                              <div className="text-sm text-muted-foreground">
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.branch}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map(role => (
                              <Badge 
                                key={role} 
                                variant={getRoleBadgeVariant(role)}
                                className="text-xs"
                              >
                                {getRoleDisplayName(role)}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <button className="ml-1 hover:bg-white/20 rounded-full p-1">
                                      <XCircle className="h-3 w-3" />
                                    </button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Отозвать роль</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Вы уверены, что хотите отозвать роль "{getRoleDisplayName(role)}" 
                                        у пользователя {user.first_name} {user.last_name}?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleRevokeRole(user.id, role)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Отозвать
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </Badge>
                            ))}
                            {user.roles.length === 0 && (
                              <span className="text-sm text-muted-foreground">
                                Роли не назначены
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowAssignDialog(true);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Добавить роль
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Права доступа ролей</CardTitle>
              <CardDescription>
                Просмотр прав доступа для каждой роли в системе
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {availableRoles.map(role => (
                  <div key={role} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant={getRoleBadgeVariant(role)}>
                        {getRoleDisplayName(role)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {getRoleDescription(role)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {rolePermissions
                        .filter(perm => perm.role === role)
                        .map(perm => (
                          <div key={perm.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                            <span>{perm.permission}:{perm.resource}</span>
                            <TooltipProvider>
                              <div className="flex gap-1">
                                {perm.can_create && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <CheckCircle className="h-3 w-3 text-green-600" />
                                    </TooltipTrigger>
                                    <TooltipContent>Создание</TooltipContent>
                                  </Tooltip>
                                )}
                                {perm.can_read && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <CheckCircle className="h-3 w-3 text-blue-600" />
                                    </TooltipTrigger>
                                    <TooltipContent>Чтение</TooltipContent>
                                  </Tooltip>
                                )}
                                {perm.can_update && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <CheckCircle className="h-3 w-3 text-yellow-600" />
                                    </TooltipTrigger>
                                    <TooltipContent>Обновление</TooltipContent>
                                  </Tooltip>
                                )}
                                {perm.can_delete && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <CheckCircle className="h-3 w-3 text-red-600" />
                                    </TooltipTrigger>
                                    <TooltipContent>Удаление</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TooltipProvider>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};