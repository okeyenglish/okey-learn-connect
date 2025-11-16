import { useEffect, useState } from 'react';
import { Smartphone, Tablet, Monitor } from 'lucide-react';

export default function HeroImage() {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredDevice, setHoveredDevice] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 10;
    setMousePosition({ x, y });
  };

  return (
    <div 
      className={`relative transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
      }`}
      onMouseMove={handleMouseMove}
      style={{
        transform: `perspective(1000px) rotateY(${mousePosition.x * 0.5}deg) rotateX(${mousePosition.y * -0.5}deg)`,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.1s ease-out'
      }}
    >
      <div className="relative flex items-center justify-center gap-4">
        {/* Desktop - Main display */}
        <div 
          className="relative z-10"
          onMouseEnter={() => setHoveredDevice('desktop')}
          onMouseLeave={() => setHoveredDevice(null)}
        >
          <div className="glass-card neon-border p-4 shadow-2xl hover:shadow-[0_0_60px_rgba(139,92,246,0.3)] transition-all duration-500 group">
            <div className="absolute inset-0 bg-gradient-to-br from-category-tech/0 via-category-tech/5 to-category-crm/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
            <div className="bg-background/80 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden w-[420px]">
              {/* Browser chrome */}
              <div className="bg-muted px-3 py-1.5 flex items-center gap-2 border-b">
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 bg-background rounded px-2 py-0.5 text-[10px] text-muted-foreground flex items-center gap-1">
                  <Monitor className="w-3 h-3" />
                  app.academyos.ru
                </div>
              </div>
              
              {/* Dashboard content */}
              <div className="p-3 space-y-2 bg-background/95">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Учеников', value: '1,234', color: 'bg-gradient-to-br from-[hsl(262,83%,68%)] to-[hsl(262,83%,58%)]' },
                    { label: 'Уроков', value: '856', color: 'bg-gradient-to-br from-[hsl(189,94%,43%)] to-[hsl(189,94%,33%)]' },
                    { label: 'Групп', value: '48', color: 'bg-gradient-to-br from-[hsl(330,81%,60%)] to-[hsl(330,81%,50%)]' }
                  ].map((stat, i) => (
                    <div key={i} className={`${stat.color} p-2 rounded-lg text-white`}>
                      <div className="text-xs opacity-90">{stat.label}</div>
                      <div className="text-lg font-bold">{stat.value}</div>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80" />
                      <div className="flex-1 space-y-1">
                        <div className="h-2 bg-foreground/20 rounded w-3/4" />
                        <div className="h-1.5 bg-foreground/10 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {hoveredDevice === 'desktop' && (
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 glass-card px-4 py-2 whitespace-nowrap animate-fade-in z-30">
              <div className="text-sm font-semibold">Веб-версия</div>
              <div className="text-xs text-muted-foreground">Полный функционал</div>
            </div>
          )}
        </div>

        {/* Tablet */}
        <div 
          className="relative -ml-8 z-20"
          onMouseEnter={() => setHoveredDevice('tablet')}
          onMouseLeave={() => setHoveredDevice(null)}
          style={{
            transform: 'translateZ(40px) scale(0.85)',
          }}
        >
          <div className="glass-card p-2 rounded-[20px] shadow-xl hover:shadow-[0_0_40px_rgba(59,130,246,0.3)] transition-all duration-500 group border-4 border-muted/30">
            <div className="bg-background rounded-[16px] overflow-hidden w-[200px] h-[280px]">
              <div className="p-2 space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <Tablet className="w-4 h-4 text-primary" />
                  <div className="text-[10px] font-medium">Планшет</div>
                </div>
                
                <div className="grid grid-cols-2 gap-1.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-gradient-to-br from-primary/20 to-primary/10 p-2 rounded-lg">
                      <div className="w-6 h-6 rounded bg-primary/40 mb-1" />
                      <div className="h-1 bg-foreground/20 rounded w-full" />
                    </div>
                  ))}
                </div>
                
                <div className="space-y-1.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-1.5 p-1.5 rounded bg-muted/30">
                      <div className="w-5 h-5 rounded bg-gradient-to-br from-category-tech to-category-crm" />
                      <div className="flex-1 space-y-0.5">
                        <div className="h-1 bg-foreground/20 rounded w-3/4" />
                        <div className="h-1 bg-foreground/10 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {hoveredDevice === 'tablet' && (
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 glass-card px-4 py-2 whitespace-nowrap animate-fade-in z-30">
              <div className="text-sm font-semibold">Планшет</div>
              <div className="text-xs text-muted-foreground">Удобно везде</div>
            </div>
          )}
        </div>

        {/* Mobile Phone */}
        <div 
          className="relative -ml-6 z-30"
          onMouseEnter={() => setHoveredDevice('mobile')}
          onMouseLeave={() => setHoveredDevice(null)}
          style={{
            transform: 'translateZ(60px) scale(0.75)',
          }}
        >
          <div className="glass-card p-2 rounded-[24px] shadow-xl hover:shadow-[0_0_40px_rgba(236,72,153,0.3)] transition-all duration-500 group border-4 border-muted/30">
            <div className="bg-background rounded-[20px] overflow-hidden w-[140px] h-[280px]">
              {/* Phone notch */}
              <div className="h-6 bg-muted/50 rounded-b-3xl mx-auto w-24 mb-2" />
              
              <div className="px-2 space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <Smartphone className="w-3 h-3 text-primary" />
                  <div className="text-[9px] font-medium">Мобильное приложение</div>
                </div>
                
                <div className="grid grid-cols-4 gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="aspect-square rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                      <div className="w-4 h-4 rounded bg-primary/50" />
                    </div>
                  ))}
                </div>
                
                <div className="space-y-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-1 p-1 rounded bg-muted/30">
                      <div className="w-4 h-4 rounded bg-gradient-to-br from-category-education to-category-tech" />
                      <div className="flex-1 space-y-0.5">
                        <div className="h-1 bg-foreground/20 rounded w-full" />
                        <div className="h-0.5 bg-foreground/10 rounded w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {hoveredDevice === 'mobile' && (
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 glass-card px-4 py-2 whitespace-nowrap animate-fade-in z-40">
              <div className="text-sm font-semibold">iOS & Android</div>
              <div className="text-xs text-muted-foreground">Всегда под рукой</div>
            </div>
          )}
        </div>
      </div>

      {/* Floating badge */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 glass-card px-6 py-2 animate-fade-in">
        <div className="flex items-center gap-3">
          <Monitor className="w-4 h-4 text-primary" />
          <Tablet className="w-4 h-4 text-primary" />
          <Smartphone className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium gradient-text">Работает на всех устройствах</span>
        </div>
      </div>
    </div>
  );
}
