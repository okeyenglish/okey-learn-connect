import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  User, 
  Users, 
  Building2, 
  GraduationCap, 
  FileText,
  ChevronDown,
  ChevronRight,
  Save,
  Info,
  Shield
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { toast } from 'sonner';

// Структура разрешений по категориям
interface Permission {
  id: string;
  name: string;
  description?: string;
}

interface PermissionCategory {
  id: string;
  name: string;
  icon: any;
  permissions: Permission[];
}

interface PermissionSection {
  id: string;
  name: string;
  categories: PermissionCategory[];
}

const permissionSections: PermissionSection[] = [
  {
    id: 'branches',
    name: 'ФИЛИАЛЫ',
    categories: [
      {
        id: 'branch_management',
        name: 'Управление филиалами',
        icon: Building2,
        permissions: [
          { id: 'view_branches', name: 'Просмотр филиалов' },
          { id: 'manage_branches', name: 'Управление филиалами' },
          { id: 'assign_managers', name: 'Назначение менеджеров филиалов' }
        ]
      }
    ]
  },
  {
    id: 'users',
    name: 'ПОЛЬЗОВАТЕЛИ',
    categories: [
      {
        id: 'user_management',
        name: 'Управление пользователями',
        icon: Users,
        permissions: [
          { id: 'view_users', name: 'Просмотр пользователей' },
          { id: 'create_users', name: 'Создание пользователей' },
          { id: 'edit_users', name: 'Редактирование пользователей' },
          { id: 'delete_users', name: 'Удаление пользователей' },
          { id: 'manage_roles', name: 'Управление ролями' }
        ]
      }
    ]
  },
  {
    id: 'education',
    name: 'УЧ. ЕДИНИЦЫ',
    categories: [
      {
        id: 'groups',
        name: 'Уч. единицы',
        icon: GraduationCap,
        permissions: [
          { id: 'add_edit_groups', name: 'Добавление/удаление групп/мини-групп/инд. занятий' },
          { id: 'edit_group_params', name: 'Редактирование параметров групп/мини-групп/инд. занятий' },
          { id: 'change_responsible', name: 'Смена ответственного у группы/мини-группы/инд. занятия' },
          { id: 'access_contracts', name: 'Доступ к файлам договоров' },
          { id: 'manage_students_groups', name: 'Добавление/удаление учеников в группы и редактирование параметров договора' },
          { id: 'delete_contracts', name: 'Полное удаление договоров (в т.ч. расторгнутых)' },
          { id: 'change_group_status', name: 'Изменение статуса группы с формирующейся на рабочую' },
          { id: 'set_group_name', name: 'Установка произвольного имени группы' },
          { id: 'manage_absences', name: 'Установка занятий/пропусков у лидов/учеников' },
          { id: 'edit_day_info', name: 'Изменение информации о днях (установка занятий/пропусков и стоимость дня у уч. единиц и учеников)' },
          { id: 'manage_individual_schedule', name: 'Установка занятий/пропусков у уч. единиц, лидов и учеников по ...' },
          { id: 'edit_lesson_plans', name: 'Редактирование планов занятий' },
          { id: 'view_schedules', name: 'Изменение расписаний' },
          { id: 'view_schedule_table', name: 'Просмотр таблицы расписаний' }
        ]
      },
      {
        id: 'students',
        name: 'Ученики',
        icon: User,
        permissions: [
          { id: 'view_student_contacts', name: 'Просмотр контактных данных лидов/учеников' },
          { id: 'view_students_other_branches', name: 'Открытие страниц учеников/лидов недоступных филиалов и просмотр учеников/лидов без филиала' },
          { id: 'manage_students', name: 'Добавление/редактирование учеников' },
          { id: 'delete_students', name: 'Удаление учеников' },
          { id: 'edit_contact_dates', name: 'Редактирование дат обращения лидов/учеников' },
          { id: 'manage_preferred_schedule', name: 'Добавление/редактирование/удаление предпочтительного расписания учеников' },
          { id: 'change_client_responsible', name: 'Смена ответственных за клиента' },
          { id: 'add_ad_source', name: 'Добавление произвольного значения в поле "Рекламный источник"' },
          { id: 'add_learning_goal', name: 'Добавление произвольного значения в поле "Цель обучения"' }
        ]
      },
      {
        id: 'tests',
        name: 'Тесты',
        icon: FileText,
        permissions: [
          { id: 'manage_tests', name: 'Управление тестами' },
          { id: 'view_test_results', name: 'Просмотр результатов тестов' }
        ]
      }
    ]
  }
];

interface UserWithPermissions {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  branch: string | null;
  roles: string[];
  permissions: Record<string, boolean>;
}

export const UserPermissionsManager = () => {
  const { user, profile, roles, loading: authLoading } = useAuth();
  const { fetchUsersWithRoles, loading: rolesLoading } = useRoles();
  
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    branches: true,
    users: true,
    education: true
  });
  const [loading, setLoading] = useState(false);

  // Загрузка пользователей
  const loadUsers = async () => {
    setLoading(true);
    try {
      const usersData = await fetchUsersWithRoles();
      const usersWithPermissions = usersData.map(user => ({
        ...user,
        permissions: {} // TODO: загрузить реальные разрешения из БД
      }));
      setUsers(usersWithPermissions);
      
      // Автоматически выбираем текущего пользователя
      const currentUser = usersWithPermissions.find(u => u.id === user?.id);
      if (currentUser) setSelectedUser(currentUser);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Ошибка загрузки пользователей');
    }
    setLoading(false);
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

  // Переключение секции
  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Обработка изменения разрешения
  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    if (!selectedUser) return;
    
    setSelectedUser(prev => ({
      ...prev!,
      permissions: {
        ...prev!.permissions,
        [permissionId]: checked
      }
    }));
  };

  // Сохранение разрешений
  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    
    try {
      // TODO: сохранить разрешения в БД
      toast.success('Разрешения сохранены');
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Ошибка сохранения разрешений');
    }
  };

  if (authLoading || rolesLoading) {
    return <div className="flex items-center justify-center py-12">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Управление разрешениями</h2>
          <p className="text-muted-foreground">
            Детальное управление правами доступа пользователей
          </p>
        </div>
      </div>

      <Tabs defaultValue="current-user" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current-user">
            <User className="h-4 w-4 mr-2" />
            Мой профиль
          </TabsTrigger>
          <TabsTrigger value="manage-users">
            <Users className="h-4 w-4 mr-2" />
            Управление пользователями
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current-user" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Информация о пользователе
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Имя</Label>
                  <div className="text-sm font-medium">
                    {profile?.first_name} {profile?.last_name}
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <div className="text-sm">{profile?.email}</div>
                </div>
                <div>
                  <Label>Телефон</Label>
                  <div className="text-sm">{profile?.phone || 'Не указан'}</div>
                </div>
                <div>
                  <Label>Филиал</Label>
                  <div className="text-sm">{profile?.branch}</div>
                </div>
                <div className="md:col-span-2">
                  <Label>Роли</Label>
                  <div className="flex gap-2 mt-1">
                    {roles?.map(role => (
                      <Badge key={role} variant="secondary">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Разрешения текущего пользователя */}
          <Card>
            <CardHeader>
              <CardTitle>Мои разрешения</CardTitle>
            </CardHeader>
            <CardContent>
              {permissionSections.map((section) => (
                <Collapsible
                  key={section.id}
                  open={openSections[section.id]}
                  onOpenChange={() => toggleSection(section.id)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-primary text-primary-foreground rounded-t-lg hover:bg-primary/90 transition-colors">
                    <span className="font-medium">{section.name}</span>
                    {openSections[section.id] ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border border-t-0 rounded-b-lg p-4">
                    {section.categories.map((category) => (
                      <div key={category.id} className="mb-6 last:mb-0">
                        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
                          <category.icon className="h-4 w-4" />
                          {category.name}
                        </div>
                        <div className="space-y-2 pl-6">
                          {category.permissions.map((permission) => (
                            <div key={permission.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={permission.id}
                                checked={true} // TODO: проверить реальные разрешения
                                disabled={true} // Только просмотр для своих разрешений
                              />
                              <Label 
                                htmlFor={permission.id}
                                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {permission.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage-users" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Список пользователей */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Пользователи</CardTitle>
                <div className="relative">
                  <Input
                    placeholder="Поиск пользователей..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  {filteredUsers.map(user => (
                    <div
                      key={user.id}
                      className={`p-3 border-b cursor-pointer hover:bg-muted transition-colors ${
                        selectedUser?.id === user.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="font-medium">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                      <div className="flex gap-1 mt-1">
                        {user.roles.map(role => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Управление разрешениями */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {selectedUser ? 
                      `Разрешения: ${selectedUser.first_name} ${selectedUser.last_name}` : 
                      'Выберите пользователя'
                    }
                  </CardTitle>
                  {selectedUser && (
                    <Button onClick={handleSavePermissions}>
                      <Save className="h-4 w-4 mr-2" />
                      Сохранить
                    </Button>
                  )}
                </div>
                {selectedUser && (
                  <div className="flex gap-2">
                    {selectedUser.roles.map(role => (
                      <Badge key={role} variant="secondary">
                        {role}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {selectedUser ? (
                  <div className="space-y-4">
                    {permissionSections.map((section) => (
                      <Collapsible
                        key={section.id}
                        open={openSections[section.id]}
                        onOpenChange={() => toggleSection(section.id)}
                      >
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-primary text-primary-foreground rounded-t-lg hover:bg-primary/90 transition-colors">
                          <span className="font-medium">{section.name}</span>
                          {openSections[section.id] ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                          }
                        </CollapsibleTrigger>
                        <CollapsibleContent className="border border-t-0 rounded-b-lg p-4">
                          {section.categories.map((category) => (
                            <div key={category.id} className="mb-6 last:mb-0">
                              <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
                                <category.icon className="h-4 w-4" />
                                {category.name}
                              </div>
                              <div className="space-y-2 pl-6">
                                {category.permissions.map((permission) => (
                                  <div key={permission.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={permission.id}
                                      checked={selectedUser.permissions[permission.id] || false}
                                      onCheckedChange={(checked) => 
                                        handlePermissionChange(permission.id, Boolean(checked))
                                      }
                                    />
                                    <Label 
                                      htmlFor={permission.id}
                                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                      {permission.name}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Выберите пользователя для управления разрешениями</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};