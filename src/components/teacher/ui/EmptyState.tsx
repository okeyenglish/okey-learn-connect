import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      {Icon && (
        <div className="mx-auto w-12 h-12 flex items-center justify-center mb-3">
          <Icon className="w-full h-full text-muted-foreground opacity-50" />
        </div>
      )}
      <div className="text-base font-medium text-foreground mb-1">{title}</div>
      {subtitle && <div className="text-sm text-muted-foreground mb-4">{subtitle}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
