import { useEffect, useState } from 'react';

export default function HeroImage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div 
      className={`relative transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
      }`}
    >
      <div className="relative">
        {/* Main dashboard mockup */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border-2 border-primary/20 p-6 shadow-2xl">
          <div className="bg-background rounded-lg shadow-xl overflow-hidden">
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
              {/* Stats cards */}
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-primary/5 rounded-lg p-3 space-y-1">
                    <div className="h-2 bg-primary/20 rounded w-12" />
                    <div className="h-6 bg-primary/30 rounded w-16" />
                  </div>
                ))}
              </div>
              
              {/* Chart area */}
              <div className="bg-gradient-to-br from-primary/5 to-transparent rounded-lg p-4 space-y-2">
                <div className="h-2 bg-primary/20 rounded w-24" />
                <div className="flex items-end gap-1 h-24">
                  {[40, 65, 45, 80, 60, 85, 70].map((height, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-primary to-primary/50 rounded-t"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Table */}
              <div className="space-y-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-2 items-center bg-muted/30 rounded p-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20" />
                    <div className="flex-1 space-y-1">
                      <div className="h-2 bg-muted rounded w-32" />
                      <div className="h-2 bg-muted/50 rounded w-24" />
                    </div>
                    <div className="h-6 bg-primary/20 rounded w-16" />
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