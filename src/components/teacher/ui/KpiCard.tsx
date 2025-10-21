import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  hint?: string;
  onClick?: () => void;
  tone?: "neutral" | "ok" | "warn" | "danger" | "info";
  icon?: LucideIcon;
}

export function KpiCard({ 
  title, 
  value, 
  hint, 
  onClick, 
  tone = "neutral",
  icon: Icon 
}: KpiCardProps) {
  const toneCls = {
    neutral: "border-border hover:border-border/80",
    ok: "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20",
    warn: "border-amber-300 bg-amber-50 dark:bg-amber-950/20",
    danger: "border-rose-300 bg-rose-50 dark:bg-rose-950/20",
    info: "border-blue-300 bg-blue-50 dark:bg-blue-950/20",
  }[tone];

  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={`text-left w-full rounded-2xl border p-4 transition-all ${toneCls} ${
        onClick ? "hover:shadow-md hover:scale-[1.01] cursor-pointer" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-muted-foreground">{title}</div>
        {Icon && <Icon className="h-4 w-4 text-primary" />}
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </Component>
  );
}
