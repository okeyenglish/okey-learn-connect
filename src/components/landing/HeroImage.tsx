import { useState, useEffect } from 'react';
import { Monitor, Tablet, Smartphone, CheckCircle2 } from 'lucide-react';

export default function HeroImage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      {/* Header Section */}
      <div className="text-center mb-8 space-y-3">
        <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
          Работает плавно на любом устройстве
        </h3>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Веб-версия, планшет и мобильное приложение всегда синхронизированы: откройте платформу там, где удобно — всё уже на месте.
        </p>
      </div>

      {/* Devices Showcase */}
      <div className="relative">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-3 items-center justify-center">
          {/* Desktop */}
          <DeviceFrame 
            icon={<Monitor className="w-5 h-5" />}
            label="Ноутбук"
            className="w-full sm:w-72"
            animationDelay="0s"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-surface rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(var(--accent-purple))] to-[hsl(var(--brand))]" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-foreground">app.academyos.ru</div>
                  <div className="text-[10px] text-muted-foreground">Веб-версия</div>
                </div>
              </div>
              <SyncedCard delay="0s" />
            </div>
          </DeviceFrame>

          {/* Tablet */}
          <DeviceFrame 
            icon={<Tablet className="w-4 h-4" />}
            label="Планшет"
            className="w-full sm:w-56 sm:scale-95"
            animationDelay="0.3s"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-surface rounded-lg">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[hsl(var(--accent-purple))] to-[hsl(var(--brand))]" />
                <div className="flex-1">
                  <div className="text-[10px] font-medium text-foreground">iPad Pro</div>
                </div>
              </div>
              <SyncedCard delay="0.3s" />
            </div>
          </DeviceFrame>

          {/* Mobile */}
          <DeviceFrame 
            icon={<Smartphone className="w-3 h-3" />}
            label="Телефон"
            className="w-full sm:w-44 sm:scale-90"
            animationDelay="0.6s"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-2 py-2 bg-surface rounded-lg">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[hsl(var(--accent-purple))] to-[hsl(var(--brand))]" />
                <div className="flex-1">
                  <div className="text-[10px] font-medium text-foreground">iOS App</div>
                </div>
              </div>
              <SyncedCard delay="0.6s" />
            </div>
          </DeviceFrame>
        </div>

        {/* Sync Indicator Badge */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/70 dark:bg-white/10 backdrop-blur-xl shadow-lg border border-white/60 dark:border-white/20">
            <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))]" />
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-muted-foreground" />
              <Tablet className="w-4 h-4 text-muted-foreground" />
              <Smartphone className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-[hsl(var(--brand))]">
                Работает на всех устройствах
              </div>
              <div className="text-xs text-muted-foreground">
                Откройте с ноутбука, планшета или телефона — продолжите с того же места
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeviceFrame({ 
  children, 
  icon, 
  label, 
  className = "",
  animationDelay = "0s"
}: { 
  children: React.ReactNode;
  icon: React.ReactNode;
  label: string;
  className?: string;
  animationDelay?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className={`relative ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tooltip */}
      {isHovered && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-foreground text-background text-xs font-medium rounded-lg whitespace-nowrap z-10 animate-fade-in">
          {label}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rotate-45" />
        </div>
      )}

      {/* Device Frame */}
      <div 
        className="rounded-[20px] sm:rounded-[28px] bg-white/80 dark:bg-surface/80 backdrop-blur-xl shadow-xl border border-white/60 dark:border-white/20 p-3 sm:p-4 transition-all duration-300 hover:shadow-2xl"
        style={{ animationDelay }}
      >
        {/* Browser Bar */}
        <div className="h-2 sm:h-3 flex gap-1 mb-3">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-400" />
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-yellow-400" />
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-400" />
        </div>

        {/* Content Area */}
        <div className="rounded-xl sm:rounded-2xl bg-background/50 p-3 sm:p-4 min-h-[140px] sm:min-h-[160px]">
          {children}
        </div>

        {/* Device Label */}
        <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}

function SyncedCard({ delay }: { delay: string }) {
  return (
    <div 
      className="w-full h-12 sm:h-14 rounded-xl bg-gradient-to-r from-[hsl(262,83%,68%)] to-[hsl(262,83%,58%)] animate-pulse-sync flex items-center justify-center gap-2 text-white font-medium text-sm"
      style={{ animationDelay: delay }}
    >
      <CheckCircle2 className="w-4 h-4" />
      <span>Урок математики</span>
    </div>
  );
}
