import { useEffect, useState } from 'react';

export default function HeroImage() {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
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

  const interactiveZones = [
    { id: 'crm', title: 'CRM система', desc: 'Управление клиентами', position: 'top-[20%] left-[15%]' },
    { id: 'schedule', title: 'Расписание', desc: 'Умное планирование', position: 'top-[35%] right-[20%]' },
    { id: 'finance', title: 'Финансы', desc: 'Учет платежей', position: 'bottom-[30%] left-[20%]' },
    { id: 'analytics', title: 'Аналитика', desc: 'Отчеты и графики', position: 'bottom-[20%] right-[15%]' }
  ];

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
      <div className="relative">
        {/* Interactive hotspots */}
        {interactiveZones.map((zone) => (
          <div
            key={zone.id}
            className={`absolute ${zone.position} z-20`}
            onMouseEnter={() => setHoveredZone(zone.id)}
            onMouseLeave={() => setHoveredZone(null)}
          >
            <div className="relative">
              {/* Pulsing dot */}
              <div className="w-4 h-4 bg-category-tech rounded-full animate-pulse cursor-pointer relative">
                <div className="absolute inset-0 bg-category-tech rounded-full animate-ping" />
              </div>
              
              {/* Tooltip */}
              {hoveredZone === zone.id && (
                <div className="absolute left-6 top-0 glass-card p-3 whitespace-nowrap animate-fade-in z-30">
                  <div className="text-sm font-semibold">{zone.title}</div>
                  <div className="text-xs text-muted-foreground">{zone.desc}</div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Main dashboard mockup with glassmorphism */}
        <div className="glass-card neon-border p-6 shadow-2xl hover:shadow-[0_0_60px_rgba(139,92,246,0.3)] transition-all duration-500 group">
          {/* Glow effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-category-tech/0 via-category-tech/5 to-category-crm/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
          <div className="bg-background/80 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden">
            {/* Browser chrome */}
            <div className="bg-muted px-4 py-2 flex items-center gap-2 border-b">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="flex-1 bg-background rounded px-3 py-1 text-xs text-muted-foreground">
                app.academius.ru
              </div>
            </div>
            
            {/* Dashboard content */}
            <div className="p-4 space-y-3">
              {/* Stats cards with vibrant colors */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { color: 'from-[hsl(262,83%,68%)] to-[hsl(262,83%,58%)]' },
                  { color: 'from-[hsl(330,81%,60%)] to-[hsl(330,81%,50%)]' },
                  { color: 'from-[hsl(189,94%,43%)] to-[hsl(189,94%,33%)]' }
                ].map((item, i) => (
                  <div key={i} className={`bg-gradient-to-br ${item.color} rounded-lg p-3 space-y-1 shadow-lg`}>
                    <div className="h-2 bg-white/30 rounded w-12" />
                    <div className="h-6 bg-white/50 rounded w-16" />
                  </div>
                ))}
              </div>
              
              {/* Chart area with vibrant gradient */}
              <div className="bg-gradient-to-br from-[hsl(262,83%,68%)]/10 via-[hsl(212,85%,58%)]/10 to-transparent rounded-lg p-4 space-y-2 backdrop-blur-sm">
                <div className="h-2 bg-gradient-to-r from-[hsl(262,83%,68%)] to-[hsl(330,81%,60%)] rounded w-24" />
                <div className="flex items-end gap-1 h-24">
                  {[
                    { height: 40, color: 'from-[hsl(262,83%,68%)] to-[hsl(262,83%,78%)]' },
                    { height: 65, color: 'from-[hsl(212,85%,58%)] to-[hsl(212,85%,68%)]' },
                    { height: 45, color: 'from-[hsl(330,81%,60%)] to-[hsl(330,81%,70%)]' },
                    { height: 80, color: 'from-[hsl(262,83%,68%)] to-[hsl(262,83%,78%)]' },
                    { height: 60, color: 'from-[hsl(189,94%,43%)] to-[hsl(189,94%,53%)]' },
                    { height: 85, color: 'from-[hsl(330,81%,60%)] to-[hsl(330,81%,70%)]' },
                    { height: 70, color: 'from-[hsl(212,85%,58%)] to-[hsl(212,85%,68%)]' }
                  ].map((bar, i) => (
                    <div
                      key={i}
                      className={`flex-1 bg-gradient-to-t ${bar.color} rounded-t shadow-lg`}
                      style={{ height: `${bar.height}%` }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Table with colorful avatars */}
              <div className="space-y-1">
                {[
                  { avatar: 'from-[hsl(262,83%,68%)] to-[hsl(262,83%,78%)]', badge: 'from-[hsl(262,83%,68%)] to-[hsl(262,83%,58%)]' },
                  { avatar: 'from-[hsl(330,81%,60%)] to-[hsl(330,81%,70%)]', badge: 'from-[hsl(330,81%,60%)] to-[hsl(330,81%,50%)]' },
                  { avatar: 'from-[hsl(189,94%,43%)] to-[hsl(189,94%,53%)]', badge: 'from-[hsl(189,94%,43%)] to-[hsl(189,94%,33%)]' },
                  { avatar: 'from-[hsl(212,85%,58%)] to-[hsl(212,85%,68%)]', badge: 'from-[hsl(212,85%,58%)] to-[hsl(212,85%,48%)]' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-2 items-center bg-muted/30 rounded p-2 hover:bg-muted/50 transition-all">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${item.avatar} shadow-md`} />
                    <div className="flex-1 space-y-1">
                      <div className="h-2 bg-muted rounded w-32" />
                      <div className="h-2 bg-muted/50 rounded w-24" />
                    </div>
                    <div className={`h-6 bg-gradient-to-r ${item.badge} rounded w-16 shadow-sm`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}