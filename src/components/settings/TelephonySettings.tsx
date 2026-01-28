import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Phone, Save, Loader2, Search, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

interface EmployeeWithExtension {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  extension_number: string | null;
  roles: string[];
}

export const TelephonySettings = () => {
  const { organization } = useOrganization();
  const [employees, setEmployees] = useState<EmployeeWithExtension[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editedExtensions, setEditedExtensions] = useState<Record<string, string>>({});

  useEffect(() => {
    if (organization?.id) {
      loadEmployees();
    }
  }, [organization?.id]);

  const loadEmployees = async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      // Get all profiles for the organization
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, extension_number')
        .eq('organization_id', organization.id)
        .order('first_name', { ascending: true });

      if (profilesError) throw profilesError;

      // Get all roles for these users
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Create a map of user_id to roles
      const rolesByUser = new Map<string, string[]>();
      (roles || []).forEach(r => {
        const arr = rolesByUser.get(r.user_id) ?? [];
        arr.push(r.role);
        rolesByUser.set(r.user_id, arr);
      });

      // Filter out teachers - only show non-teacher employees
      const employeesWithRoles = (profiles || [])
        .map(p => ({
          ...p,
          roles: rolesByUser.get(p.id) ?? []
        }))
        .filter(e => !e.roles.includes('teacher'));

      setEmployees(employeesWithRoles);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('Ошибка загрузки сотрудников');
    } finally {
      setLoading(false);
    }
  };

  const handleExtensionChange = (userId: string, value: string) => {
    setEditedExtensions(prev => ({
      ...prev,
      [userId]: value
    }));
  };

  const getDisplayExtension = (employee: EmployeeWithExtension): string => {
    if (editedExtensions[employee.id] !== undefined) {
      return editedExtensions[employee.id];
    }
    return employee.extension_number || '';
  };

  const hasChanges = (employee: EmployeeWithExtension): boolean => {
    const edited = editedExtensions[employee.id];
    if (edited === undefined) return false;
    return edited !== (employee.extension_number || '');
  };

  const handleSave = async (employee: EmployeeWithExtension) => {
    const newExtension = editedExtensions[employee.id];
    if (newExtension === undefined) return;
    
    setSaving(employee.id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ extension_number: newExtension.trim() || null })
        .eq('id', employee.id);

      if (error) throw error;
      
      // Update local state
      setEmployees(prev => prev.map(e => 
        e.id === employee.id 
          ? { ...e, extension_number: newExtension.trim() || null }
          : e
      ));
      
      // Clear edited state
      setEditedExtensions(prev => {
        const next = { ...prev };
        delete next[employee.id];
        return next;
      });
      
      toast.success('Номер оператора сохранён');
    } catch (error) {
      console.error('Error saving extension:', error);
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(null);
    }
  };

  const getEmployeeFullName = (employee: EmployeeWithExtension): string => {
    const firstName = employee.first_name || '';
    const lastName = employee.last_name || '';
    return `${firstName} ${lastName}`.trim() || employee.email || 'Без имени';
  };

  const getRoleDisplayName = (role: string): string => {
    const roleNames: Record<string, string> = {
      admin: 'Администратор',
      manager: 'Менеджер',
      branch_manager: 'Управляющий филиала',
      accountant: 'Бухгалтер',
      methodist: 'Методист',
      receptionist: 'Администратор',
      sales_manager: 'Менеджер по продажам',
      marketing_manager: 'Маркетолог',
      support: 'Поддержка',
      owner: 'Владелец'
    };
    return roleNames[role] || role;
  };

  const filteredEmployees = employees.filter(e => {
    const name = getEmployeeFullName(e).toLowerCase();
    const email = (e.email || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || email.includes(search);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Номера операторов сотрудников
          </CardTitle>
          <CardDescription>
            Укажите внутренние номера операторов (добавочные) для каждого сотрудника. 
            Эти номера используются для исходящих звонков через OnlinePBX.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск сотрудника..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Сотрудники не найдены</p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Сотрудник</TableHead>
                    <TableHead>Роли</TableHead>
                    <TableHead className="w-[150px]">Номер оператора</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{getEmployeeFullName(employee)}</p>
                          {employee.email && (
                            <p className="text-xs text-muted-foreground">{employee.email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {employee.roles.map((role) => (
                            <Badge key={role} variant="secondary" className="text-xs">
                              {getRoleDisplayName(role)}
                            </Badge>
                          ))}
                          {employee.roles.length === 0 && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="101"
                          value={getDisplayExtension(employee)}
                          onChange={(e) => handleExtensionChange(employee.id, e.target.value)}
                          className="font-mono h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleSave(employee)}
                          disabled={!hasChanges(employee) || saving === employee.id}
                        >
                          {saving === employee.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
