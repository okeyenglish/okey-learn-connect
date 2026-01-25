import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Building2, Edit2, X, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AVAILABLE_BRANCHES } from "@/hooks/useUserBranches";

interface ProfileBranchesEditorProps {
  userId: string;
  currentBranches: string[];
  isLoading: boolean;
}

export const ProfileBranchesEditor = ({ 
  userId, 
  currentBranches, 
  isLoading 
}: ProfileBranchesEditorProps) => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    setSelectedBranches(currentBranches);
  }, [currentBranches]);

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
      queryClient.invalidateQueries({ queryKey: ['user-allowed-branches'] });
      queryClient.invalidateQueries({ queryKey: ['user-branches-management'] });
      toast({
        title: 'Филиалы обновлены',
        description: 'Доступные филиалы успешно обновлены',
      });
      setIsEditing(false);
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
    setSelectedBranches(currentBranches);
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div>
        <Label>Доступные филиалы</Label>
        <div className="flex items-center gap-2 mt-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Загрузка...</span>
        </div>
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <Label>Доступные филиалы</Label>
          {isAdmin && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsEditing(true)}
              className="h-7 px-2 text-xs"
            >
              <Edit2 className="h-3 w-3 mr-1" />
              Изменить
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {currentBranches.length > 0 ? (
            currentBranches.map((branch) => (
              <Badge key={branch} variant="secondary" className="gap-1">
                <Building2 className="h-3 w-3" />
                {branch}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">
              {isAdmin ? 'Доступ ко всем филиалам (администратор)' : 'Нет назначенных филиалов'}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Редактирование филиалов</Label>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCancel}
            className="h-7 px-2 text-xs"
            disabled={updateBranchesMutation.isPending}
          >
            <X className="h-3 w-3 mr-1" />
            Отмена
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleSave}
            className="h-7 px-2 text-xs"
            disabled={updateBranchesMutation.isPending}
          >
            {updateBranchesMutation.isPending ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Check className="h-3 w-3 mr-1" />
            )}
            Сохранить
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg">
        {AVAILABLE_BRANCHES.map((branch) => (
          <div key={branch} className="flex items-center space-x-2">
            <Checkbox
              id={`branch-${branch}`}
              checked={selectedBranches.includes(branch)}
              onCheckedChange={() => toggleBranch(branch)}
              disabled={updateBranchesMutation.isPending}
            />
            <Label 
              htmlFor={`branch-${branch}`} 
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
    </div>
  );
};
