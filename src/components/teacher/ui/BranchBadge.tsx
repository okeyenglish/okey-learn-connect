import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';

interface BranchBadgeProps {
  branchName: string;
  size?: 'sm' | 'default';
  variant?: 'default' | 'secondary' | 'outline';
}

export const BranchBadge = ({ 
  branchName, 
  size = 'default',
  variant = 'secondary' 
}: BranchBadgeProps) => {
  return (
    <Badge 
      variant={variant}
      className={`gap-1 ${size === 'sm' ? 'text-xs px-2 py-0.5' : ''}`}
    >
      <Building2 className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {branchName}
    </Badge>
  );
};
