import { ReactNode } from 'react';

interface InstallStepProps {
  step: number;
  title: string;
  description: string;
  icon: ReactNode;
  highlight?: string;
}

export function InstallStep({ step, title, description, icon, highlight }: InstallStepProps) {
  return (
    <div className="relative flex gap-4 p-4 bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
      {/* Step number */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
        {step}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
        {highlight && (
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium">
            {icon}
            <span>{highlight}</span>
          </div>
        )}
      </div>
      
      {/* Icon illustration */}
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
    </div>
  );
}
