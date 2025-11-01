import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';
import { Branch } from '@/hooks/useTeacherBranches';

interface BranchFilterProps {
  branches: Branch[];
  selectedBranchId: string | 'all';
  onSelectBranch: (branchId: string | 'all') => void;
}

export const BranchFilter = ({
  branches,
  selectedBranchId,
  onSelectBranch,
}: BranchFilterProps) => {
  if (branches.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedBranchId} onValueChange={onSelectBranch}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Выберите филиал" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center justify-between gap-3 w-full">
              <span className="font-medium">Все филиалы</span>
              {branches.some(b => b.lessonsCount !== undefined) && (
                <span className="text-xs text-muted-foreground">
                  {branches.reduce((sum, b) => sum + (b.lessonsCount || 0), 0)} занятий
                </span>
              )}
            </div>
          </SelectItem>
          {branches.map((branch) => (
            <SelectItem key={branch.id} value={branch.id}>
              <div className="flex items-center justify-between gap-3 w-full">
                <span>{branch.name}</span>
                {branch.lessonsCount !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {branch.lessonsCount} занятий
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
