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
  Shield,
  DollarSign,
  MessageSquare,
  Mail,
  UserCheck,
  Star,
  CheckCircle,
  Target,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { supabaseTyped as supabase } from '@/integrations/supabase/typedClient';
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
    id: 'finances',
    name: 'ФИНАНСЫ',
    categories: [
      {
        id: 'clients_finance',
        name: 'Клиенты',
        icon: DollarSign,
        permissions: [
          { id: 'view_payments', name: 'Просмотр платежей и оплат за обучение' },
          { id: 'add_payments', name: 'Добавление платежей и оплат за обучение' },
          { id: 'edit_unpaid', name: 'Редактирование/удаление неоплаченных платежей и оплат за обучение' },
          { id: 'edit_paid', name: 'Редактирование/удаление оплаченных платежей и оплат за обучение' },
          { id: 'set_paid_status', name: 'Установка для платежей статуса "Оплачено"' },
          { id: 'display_amounts', name: 'Отображать суммы и цены платежей и оплат за обучение' },
          { id: 'add_payments_others', name: 'Добавление платежей и оплат за обучение от имени другого пользователя' }
        ]
      },
      {
        id: 'employees_finance',
        name: 'Сотрудники',
        icon: Users,
        permissions: [
          { id: 'view_teacher_payments', name: 'Просмотр оплат преподавателей' },
          { id: 'manage_teacher_payments', name: 'Добавление/редактирование оплат преподавателей' },
          { id: 'set_monthly_plans', name: 'Установка месячных планов по продажам для сотрудников' },
          { id: 'view_other_plans', name: 'Просмотр результатов выполнения планов по продажам других сотрудников' }
        ]
      },
      {
        id: 'other_finance',
        name: 'Другое',
        icon: FileText,
        permissions: [
          { id: 'view_financial_reports', name: 'Просмотр финансовых отчётов' }
        ]
      }
    ]
  },
  {
    id: 'branches',
    name: 'ФИЛИАЛЫ',
    categories: [
      {
        id: 'branches_management',
        name: 'Филиалы',
        icon: Building2,
        permissions: [
          { id: 'view_branches_list', name: 'Просмотр списка филиалов' },
          { id: 'add_delete_branches', name: 'Добавление/удаление филиалов' },
          { id: 'edit_branches', name: 'Редактирование филиалов' },
          { id: 'manage_classrooms', name: 'Добавление/редактирование/удаление аудиторий' },
          { id: 'view_branch_expenses', name: 'Просмотр расходов филиала' },
          { id: 'manage_branch_expenses', name: 'Добавление/редактирование/удаление расходов филиала' }
        ]
      },
      {
        id: 'corporate',
        name: 'Корпоративный отдел',
        icon: Building2,
        permissions: [
          { id: 'view_companies_list', name: 'Просмотр списка компаний' },
          { id: 'view_company_contacts', name: 'Просмотр контактных данных и реквизитов компаний' },
          { id: 'manage_companies', name: 'Добавление/удаление компаний' },
          { id: 'edit_companies', name: 'Редактирование компаний' }
        ]
      },
      {
        id: 'branches_other',
        name: 'Другое',
        icon: Shield,
        permissions: [
          { id: 'access_all_branches', name: 'Доступ ко всем филиалам и корпоративному отделу' }
        ]
      }
    ]
  },
  {
    id: 'users',
    name: 'ПОЛЬЗОВАТЕЛИ',
    categories: [
      {
        id: 'authorization',
        name: 'Авторизация',
        icon: UserCheck,
        permissions: [
          { id: 'setup_student_auth', name: 'Установка возможности авторизации для учеников' },
          { id: 'setup_teacher_auth', name: 'Установка возможности авторизации для преподавателей' },
          { id: 'setup_employee_auth', name: 'Установка возможности авторизации для сотрудников' }
        ]
      },
      {
        id: 'rating',
        name: 'Рейтинг',
        icon: Star,
        permissions: [
          { id: 'view_teacher_rating', name: 'Просмотр рейтинга преподавателей' },
          { id: 'change_teacher_rating', name: 'Изменение рейтинга преподавателей' },
          { id: 'view_teacher_rating_report', name: 'Просмотр отчёта по рейтингу преподавателей' },
          { id: 'view_employee_rating', name: 'Просмотр рейтинга сотрудников' },
          { id: 'change_employee_rating', name: 'Изменение рейтинга сотрудников' },
          { id: 'view_employee_rating_report', name: 'Просмотр отчёта по рейтингу сотрудников' }
        ]
      },
      {
        id: 'users_other',
        name: 'Другое',
        icon: Info,
        permissions: [
          { id: 'edit_own_info', name: 'Редактирование сведений о себе (контактная информация, школы и др.)' },
          { id: 'view_admins', name: 'Просмотр списка администраторов' },
          { id: 'view_other_roles', name: 'Просмотр списка пользователей других ролей' },
          { id: 'view_teacher_info', name: 'Просмотр информации по преподавателям (дисциплины, уровни, школы, з/п и др.)' },
          { id: 'edit_teacher_availability', name: 'Редактирование занятости преподавателя на стороне' },
          { id: 'view_client_history', name: 'Просмотр истории клиентов' },
          { id: 'view_employee_history', name: 'Просмотр истории сотрудников' }
        ]
      }
    ]
  },
  {
    id: 'education',
    name: 'УЧ. ЕДИНИЦЫ',
    categories: [
      {
        id: 'education_units',
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
          { id: 'edit_day_info', name: 'Изменение информации о днях (установка занятий/пропусков и стоимости дня у уч. единиц и учеников)' },
          { id: 'manage_individual_schedule', name: 'Установка занятий/пропусков у уч. единиц, лидов и учеников по ...' },
          { id: 'edit_lesson_plans', name: 'Редактирование планов занятий' },
          { id: 'change_schedules', name: 'Изменение расписаний' },
          { id: 'view_schedule_table', name: 'Просмотр таблиц расписаний' }
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
          { id: 'manage_entrance_tests', name: 'Добавление/редактирование вступительных тестов' },
          { id: 'delete_entrance_tests', name: 'Удаление вступительных тестов' },
          { id: 'add_test_results', name: 'Добавление результатов тестов' },
          { id: 'edit_test_results', name: 'Редактирование результатов тестов' },
          { id: 'delete_test_results', name: 'Удаление результатов тестов' }
        ]
      }
    ]
  },
  {
    id: 'chats',
    name: 'ЧАТЫ/РАССЫЛКИ',
    categories: [
      {
        id: 'chats',
        name: 'Чаты',
        icon: MessageSquare,
        permissions: [
          { id: 'assign_student_requests', name: 'Возможность быть назначенным на обращения от учеников' },
          { id: 'setup_own_reception', name: 'Настройка собственного приема обращений' },
          { id: 'chat_admin', name: 'Администратор чатов (возможность просмотра всех чатов и ответа в них)' },
          { id: 'reassign_to_unavailable_branches', name: 'Возможность переназначать обращения на недоступные филиалы' }
        ]
      },
      {
        id: 'mailings',
        name: 'Рассылки',
        icon: Mail,
        permissions: [
          { id: 'email_mailings', name: 'Возможность email-рассылки' },
          { id: 'sms_push_telegram_whatsapp', name: 'Возможность рассылки SMS/Push/Telegram/Whatsapp' },
          { id: 'view_sent_mailings', name: 'Просмотр отправленных рассылок' }
        ]
      }
    ]
  },
  {
    id: 'other',
    name: 'ДРУГОЕ',
    categories: [
      {
        id: 'tasks',
        name: 'Задачи',
        icon: CheckCircle,
        permissions: [
          { id: 'add_tasks', name: 'Добавление задач' },
          { id: 'view_others_tasks', name: 'Чтение чужих задач' },
          { id: 'edit_delete_others_tasks', name: 'Редактирование/удаление чужих задач' },
          { id: 'create_task_without_responsible', name: 'Возможность создать задачу без ответственного' },
          { id: 'be_responsible_from_other_branch', name: 'Присутствие в списке ответственных при создании задачи от другого филиала' }
        ]
      },
      {
        id: 'applications',
        name: 'Заявки',
        icon: Target,
        permissions: [
          { id: 'view_learning_applications', name: 'Просмотр заявок на обучение' },
          { id: 'confirm_learning_applications', name: 'Подтверждение заявок на обучение' },
          { id: 'archive_restore_applications', name: 'Удаление заявок на обучение в архив и восстановление из него' },
          { id: 'delete_applications', name: 'Полное удаление заявок на обучение' },
          { id: 'access_application_display_rules', name: 'Доступ к правилам отображения заявок' }
        ]
      },
      {
        id: 'leads',
        name: 'Лиды',
        icon: Target,
        permissions: [
          { id: 'view_leads', name: 'Просмотр лидов' },
          { id: 'manage_leads', name: 'Добавление/редактирование лидов' },
          { id: 'attach_leads_to_students', name: 'Прикрепление лидов к ученикам' },
          { id: 'delete_leads', name: 'Удаление лидов' }
        ]
      },
      {
        id: 'other_misc',
        name: 'Другое',
        icon: Info,
        permissions: [
          { id: 'view_own_reports', name: 'Просмотр сводных отчётов' },
          { id: 'tax_calculation', name: 'Формирование справки для налогового вычета' },
          { id: 'manage_library_units', name: 'Добавление/редактирование/удаление библиотечных единиц' },
          { id: 'edit_library_quantity', name: 'Редактирование количества библиотечных единиц' },
          { id: 'add_company_announcements', name: 'Добавление объявлений компании' },
          { id: 'edit_delete_any_announcements', name: 'Редактирование и удаление любых объявлений' },
          { id: 'edit_delete_own_announcements', name: 'Редактирование и удаление своих объявлений' },
          { id: 'reproduce_call_recordings', name: 'Воспроизведение записей чужих звонков' },
          { id: 'delete_phone_communications', name: 'Удаление коммуникаций телефонии' },
          { id: 'access_learning_materials', name: 'Доступ к загруженным учебным материалам' },
          { id: 'manage_courses', name: 'Добавление/редактирование/удаление курсов' },
          { id: 'ip_binding', name: 'Привязка к IP (Внимание! Это ограничит доступ сотрудников в систему!)' },
          { id: 'access_settings', name: 'Доступ к настройкам' }
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
      const usersWithPermissions = await Promise.all(
        usersData.map(async (user) => {
          const permissions = await loadUserPermissions(user.id);
          return {
            ...user,
            permissions
          };
        })
      );
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

  // Загрузка разрешений пользователя
  const loadUserPermissions = async (userId: string): Promise<Record<string, boolean>> => {
    try {
      const { data, error } = await supabase.rpc('get_user_permissions', {
        _user_id: userId
      });

      if (error) throw error;

      const permissions: Record<string, boolean> = {};
      if (data) {
        data.forEach((perm: any) => {
          permissions[perm.permission_key] = perm.is_granted;
        });
      }

      return permissions;
    } catch (error) {
      console.error('Error loading user permissions:', error);
      return {};
    }
  };

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
    
    setLoading(true);
    try {
      // Получаем все ключи разрешений
      const allPermissionKeys = permissionSections.flatMap(section =>
        section.categories.flatMap(category =>
          category.permissions.map(permission => permission.id)
        )
      );

      // Сохраняем каждое разрешение
      for (const permissionKey of allPermissionKeys) {
        const isGranted = selectedUser.permissions[permissionKey] || false;
        
        const { error } = await supabase
          .from('user_permissions')
          .upsert({
            user_id: selectedUser.id,
            permission_key: permissionKey,
            is_granted: isGranted,
            created_by: user?.id
          }, {
            onConflict: 'user_id,permission_key'
          });

        if (error) throw error;
      }

      // Обновляем список пользователей
      await loadUsers();
      
      toast.success('Разрешения успешно сохранены');
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Ошибка сохранения разрешений');
    }
    setLoading(false);
  };

  // Выдача всех прав администратора
  const handleGrantAllAdminRights = () => {
    if (!selectedUser) return;

    const allPermissionKeys = permissionSections.flatMap(section =>
      section.categories.flatMap(category =>
        category.permissions.map(permission => permission.id)
      )
    );

    const allPermissions: Record<string, boolean> = {};
    allPermissionKeys.forEach(key => {
      allPermissions[key] = true;
    });

    setSelectedUser(prev => ({
      ...prev!,
      permissions: allPermissions
    }));

    toast.success('Все права администратора выданы. Не забудьте сохранить изменения.');
  };

  useEffect(() => {
    loadUsers();
  }, []);

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
                          {category.permissions.map((permission) => {
                            const currentUserPermissions = users.find(u => u.id === user?.id)?.permissions || {};
                            return (
                              <div key={permission.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={permission.id}
                                  checked={currentUserPermissions[permission.id] || false}
                                  disabled={true} // Только просмотр для своих разрешений
                                />
                                <Label 
                                  htmlFor={permission.id}
                                  className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {permission.name}
                                </Label>
                              </div>
                            );
                          })}
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
                    <Button onClick={handleSavePermissions} disabled={loading}>
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? 'Сохранение...' : 'Сохранить'}
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