import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
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

  // Группируем филиалы по организациям (школам)
  const branchesByOrganization = branches.reduce((acc, branch) => {
    const orgName = branch.organization_name || 'Без организации';
    if (!acc[orgName]) {
      acc[orgName] = [];
    }
    acc[orgName].push(branch);
    return acc;
  }, {} as Record<string, Branch[]>);

  const hasMultipleOrganizations = Object.keys(branchesByOrganization).length > 1;

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedBranchId} onValueChange={onSelectBranch}>
        <SelectTrigger className="w-[240px]">
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
          
          {hasMultipleOrganizations ? (
            // Если несколько школ - группируем
            Object.entries(branchesByOrganization).map(([orgName, orgBranches]) => (
              <SelectGroup key={orgName}>
                <SelectLabel className="font-semibold">{orgName}</SelectLabel>
                {orgBranches.map((branch) => (
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
              </SelectGroup>
            ))
          ) : (
            // Если одна школа - обычный список
            branches.map((branch) => (
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
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
};
