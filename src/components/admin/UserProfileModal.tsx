import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Building2, User, Check, X, Loader2, Shield, Edit2, Phone } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AVAILABLE_BRANCHES } from "@/hooks/useUserBranches";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database['public']['Enums']['app_role'];

const AVAILABLE_ROLES: { value: AppRole; label: string }[] = [
  { value: 'admin', label: 'Администратор' },
  { value: 'manager', label: 'Менеджер' },
  { value: 'teacher', label: 'Преподаватель' },
  { value: 'branch_manager', label: 'Менеджер филиала' },
  { value: 'accountant', label: 'Бухгалтер' },
];

interface UserProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  userName: string;
}

export const UserProfileModal = ({ 
  open, 
  onOpenChange, 
  userId,
  userEmail,
  userName
}: UserProfileModalProps) => {
  const [isEditingBranches, setIsEditingBranches] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [isEditingExtension, setIsEditingExtension] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<AppRole>('manager');
  const [onlinepbxExtension, setOnlinepbxExtension] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's current branches
  const { data: userBranches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['user-branches', userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('user_branches')
        .select('branch')
        .eq('user_id', userId);
        
      if (error) {
        console.warn('Error fetching user branches:', error);
        return [];
      }
      
      return (data || []).map((row: { branch: string }) => row.branch);
    },
    enabled: open && !!userId,
  });

  // Fetch user's role
  const { data: userRole, isLoading: roleLoading } = useQuery({
    queryKey: ['user-role', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
        
      if (error) {
        console.warn('Error fetching user role:', error);
        return 'manager' as AppRole;
      }
      
      return (data?.role || 'manager') as AppRole;
    },
    enabled: open && !!userId,
  });

  // Fetch user's OnlinePBX extension
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile-extension', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('onlinepbx_extension, onlinepbx_user_id')
        .eq('id', userId)
        .maybeSingle();
        
      if (error) {
        console.warn('Error fetching profile extension:', error);
        return null;
      }
      
      return data;
    },
    enabled: open && !!userId,
  });

  useEffect(() => {
    setSelectedBranches(userBranches);
  }, [userBranches]);

  useEffect(() => {
    if (userRole) {
      setSelectedRole(userRole);
    }
  }, [userRole]);

  useEffect(() => {
    if (profileData?.onlinepbx_extension) {
      setOnlinepbxExtension(profileData.onlinepbx_extension);
    }
  }, [profileData]);

  const updateBranchesMutation = useMutation({
    mutationFn: async (branches: string[]) => {
      // Delete all existing branches
      await (supabase as any)
        .from('user_branches')
        .delete()
        .eq('user_id', userId);

      // Insert new branches
      if (branches.length > 0) {
        const { error } = await (supabase as any)
          .from('user_branches')
          .insert(branches.map(branch => ({ user_id: userId, branch })));

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-branches', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-branches-management'] });
      queryClient.invalidateQueries({ queryKey: ['user-allowed-branches'] });
      toast({
        title: 'Филиалы обновлены',
        description: 'Доступные филиалы пользователя успешно обновлены',
      });
      setIsEditingBranches(false);
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить филиалы',
        variant: 'destructive',
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (newRole: AppRole) => {
      // Check if user already has a role entry
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);
        
        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-role', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      toast({
        title: 'Роль обновлена',
        description: 'Роль пользователя успешно изменена',
      });
      setIsEditingRole(false);
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить роль',
        variant: 'destructive',
      });
    },
  });

  const updateExtensionMutation = useMutation({
    mutationFn: async (extension: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          onlinepbx_extension: extension || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile-extension', userId] });
      toast({
        title: 'Трубка привязана',
        description: 'Номер внутренней линии OnlinePBX сохранён',
      });
      setIsEditingExtension(false);
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить номер трубки',
        variant: 'destructive',
      });
    },
  });

  const toggleBranch = (branch: string) => {
    setSelectedBranches(prev => 
      prev.includes(branch) 
        ? prev.filter(b => b !== branch)
        : [...prev, branch]
    );
  };

  const handleSaveBranches = () => {
    updateBranchesMutation.mutate(selectedBranches);
  };

  const handleSaveRole = () => {
    updateRoleMutation.mutate(selectedRole);
  };

  const handleSaveExtension = () => {
    updateExtensionMutation.mutate(onlinepbxExtension);
  };

  const handleCancelBranches = () => {
    setSelectedBranches(userBranches);
    setIsEditingBranches(false);
  };

  const handleCancelRole = () => {
    setSelectedRole(userRole || 'manager');
    setIsEditingRole(false);
  };

  const handleCancelExtension = () => {
    setOnlinepbxExtension(profileData?.onlinepbx_extension || '');
    setIsEditingExtension(false);
  };

  const selectAll = () => setSelectedBranches([...AVAILABLE_BRANCHES]);
  const clearAll = () => setSelectedBranches([]);

  const initials = userName
    ? userName.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)
    : userEmail?.charAt(0).toUpperCase() || "U";

  const getRoleLabel = (role: AppRole | null) => {
    const found = AVAILABLE_ROLES.find(r => r.value === role);
    return found?.label || 'Менеджер';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <span>Профиль пользователя</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{userName || 'Без имени'}</h2>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="text-sm">{userEmail}</span>
              </div>
            </div>
          </div>

          {/* Role Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Роль пользователя
                  </CardTitle>
                  <CardDescription>
                    Определяет права доступа в системе
                  </CardDescription>
                </div>
                {!isEditingRole && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsEditingRole(true)}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Изменить
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {roleLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Загрузка...</span>
                </div>
              ) : isEditingRole ? (
                <div className="space-y-4">
                  <div>
                    <Label>Выберите роль</Label>
                    <Select 
                      value={selectedRole} 
                      onValueChange={(value) => setSelectedRole(value as AppRole)}
                    >
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCancelRole}
                      disabled={updateRoleMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Отмена
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleSaveRole}
                      disabled={updateRoleMutation.isPending}
                    >
                      {updateRoleMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Сохранить
                    </Button>
                  </div>
                </div>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Shield className="h-3 w-3" />
                  {getRoleLabel(userRole || null)}
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* OnlinePBX Extension Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Трубка OnlinePBX
                  </CardTitle>
                  <CardDescription>
                    Внутренний номер для идентификации звонков
                  </CardDescription>
                </div>
                {!isEditingExtension && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsEditingExtension(true)}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Изменить
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {profileLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Загрузка...</span>
                </div>
              ) : isEditingExtension ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="extension">Внутренний номер (extension)</Label>
                    <Input
                      id="extension"
                      value={onlinepbxExtension}
                      onChange={(e) => setOnlinepbxExtension(e.target.value)}
                      placeholder="Например: 101 или user@domain"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Укажите внутренний номер или SIP-аккаунт из OnlinePBX
                    </p>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCancelExtension}
                      disabled={updateExtensionMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Отмена
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleSaveExtension}
                      disabled={updateExtensionMutation.isPending}
                    >
                      {updateExtensionMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Сохранить
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  {profileData?.onlinepbx_extension ? (
                    <Badge variant="secondary" className="gap-1">
                      <Phone className="h-3 w-3" />
                      {profileData.onlinepbx_extension}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Не привязана
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Branches Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Доступные филиалы
                  </CardTitle>
                  <CardDescription>
                    Филиалы, к которым у пользователя есть доступ
                  </CardDescription>
                </div>
                {!isEditingBranches && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsEditingBranches(true)}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Изменить
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {branchesLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Загрузка...</span>
                </div>
              ) : isEditingBranches ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAll}>
                      Выбрать все
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearAll}>
                      Очистить
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg">
                    {AVAILABLE_BRANCHES.map((branch) => (
                      <div key={branch} className="flex items-center space-x-2">
                        <Checkbox
                          id={`branch-edit-${branch}`}
                          checked={selectedBranches.includes(branch)}
                          onCheckedChange={() => toggleBranch(branch)}
                          disabled={updateBranchesMutation.isPending}
                        />
                        <Label 
                          htmlFor={`branch-edit-${branch}`} 
                          className="text-sm font-normal cursor-pointer"
                        >
                          {branch}
                        </Label>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Выбрано: {selectedBranches.length} из {AVAILABLE_BRANCHES.length} филиалов
                  </p>

                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCancelBranches}
                      disabled={updateBranchesMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Отмена
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleSaveBranches}
                      disabled={updateBranchesMutation.isPending}
                    >
                      {updateBranchesMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Сохранить
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {userBranches.length > 0 ? (
                    userBranches.map((branch: string) => (
                      <Badge key={branch} variant="secondary" className="gap-1">
                        <Building2 className="h-3 w-3" />
                        {branch}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-amber-600">
                      ⚠️ Нет назначенных филиалов (если это админ — видит всё)
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
