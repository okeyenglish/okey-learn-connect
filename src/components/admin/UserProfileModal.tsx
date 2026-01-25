import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Building2, User, Check, X, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AVAILABLE_BRANCHES } from "@/hooks/useUserBranches";

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
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
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
  const { data: userRole } = useQuery({
    queryKey: ['user-role', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
        
      if (error) {
        console.warn('Error fetching user role:', error);
        return null;
      }
      
      return data?.role || 'manager';
    },
    enabled: open && !!userId,
  });

  useEffect(() => {
    setSelectedBranches(userBranches);
  }, [userBranches]);

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

  const toggleBranch = (branch: string) => {
    setSelectedBranches(prev => 
      prev.includes(branch) 
        ? prev.filter(b => b !== branch)
        : [...prev, branch]
    );
  };

  const handleSave = () => {
    updateBranchesMutation.mutate(selectedBranches);
  };

  const handleCancel = () => {
    setSelectedBranches(userBranches);
    setIsEditingBranches(false);
  };

  const selectAll = () => setSelectedBranches([...AVAILABLE_BRANCHES]);
  const clearAll = () => setSelectedBranches([]);

  const initials = userName
    ? userName.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)
    : userEmail?.charAt(0).toUpperCase() || "U";

  const getRoleLabel = (role: string | null) => {
    const labels: Record<string, string> = {
      admin: 'Администратор',
      manager: 'Менеджер',
      teacher: 'Преподаватель',
      branch_manager: 'Менеджер филиала',
      accountant: 'Бухгалтер',
    };
    return labels[role || 'manager'] || role || 'Менеджер';
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
              <Badge variant="secondary" className="mt-1">
                {getRoleLabel(userRole)}
              </Badge>
            </div>
          </div>

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
                      onClick={handleCancel}
                      disabled={updateBranchesMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Отмена
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleSave}
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
