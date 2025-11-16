import { useEffect, useState } from 'react';
import { Users, BookOpen, CreditCard, Zap, Globe } from 'lucide-react';

const LiveStats = () => {
  const [stats, setStats] = useState({
    studentsOnline: 12543,
    lessonsNow: 347,
    paymentsToday: 2847291,
    aiRequests: 1204
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        studentsOnline: prev.studentsOnline + Math.floor(Math.random() * 10) - 5,
        lessonsNow: prev.lessonsNow + Math.floor(Math.random() * 6) - 3,
        paymentsToday: prev.paymentsToday + Math.floor(Math.random() * 5000),
        aiRequests: prev.aiRequests + Math.floor(Math.random() * 20)
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  const statsData = [
    {
      icon: Users,
      value: formatNumber(stats.studentsOnline),
      label: "учеников онлайн прямо сейчас",
      color: "from-category-crm to-category-crm/50",
      pulse: true
    },
    {
      icon: BookOpen,
      value: formatNumber(stats.lessonsNow),
      label: "уроков проходит в эту минуту",
      color: "from-category-education to-category-education/50",
      pulse: true
    },
    {
      icon: CreditCard,
      value: `₽${formatNumber(stats.paymentsToday)}`,
      label: "обработано платежей сегодня",
      color: "from-category-finance to-category-finance/50",
      pulse: false
    },
    {
      icon: Zap,
      value: formatNumber(stats.aiRequests),
      label: "AI-запросов за последний час",
      color: "from-category-tech to-category-tech/50",
      pulse: true
    }
  ];

  return (
    <section className="relative py-20 overflow-hidden bg-gradient-to-b from-background/50 via-background to-background/50">
      {/* Animated world map background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_50%)]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Live данные • обновляется в реальном времени</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Сейчас в Академиусе
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Тысячи школ по всему миру доверяют нашей платформе каждый день
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {statsData.map((stat, index) => (
            <div
              key={index}
              className="glass-card p-6 relative overflow-hidden group hover:scale-105 transition-all duration-300"
            >
              {/* Animated gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
              
              {/* Pulse effect for live stats */}
              {stat.pulse && (
                <div className="absolute top-4 right-4">
                  <div className="relative w-3 h-3">
                    <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75" />
                    <div className="absolute inset-0 bg-green-500 rounded-full" />
                  </div>
                </div>
              )}

              <div className="relative">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>

                <div className="mb-2">
                  <div className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent transition-all duration-300">
                    {stat.value}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-tight">
                  {stat.label}
                </p>
              </div>

              {/* Hover glow effect */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300 -z-10`} />
            </div>
          ))}
        </div>

        {/* World Map with Active Users */}
        <div className="mt-16 glass-card p-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Globe className="w-6 h-6 text-category-tech" />
              <h3 className="text-xl font-semibold">Активность по всему миру</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-category-tech rounded-full animate-pulse" />
              <span className="text-sm text-muted-foreground">Обновлено только что</span>
            </div>
          </div>

          {/* Simplified world map visualization */}
          <div className="relative h-48 bg-gradient-to-br from-background to-muted/20 rounded-xl overflow-hidden">
            {/* Animated dots representing active users */}
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  backgroundColor: `hsl(${Math.random() * 360}, 70%, 60%)`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 3}s`
                }}
              />
            ))}

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-bold mb-2 bg-gradient-to-r from-category-tech to-category-crm bg-clip-text text-transparent">
                  87 стран
                </div>
                <p className="text-sm text-muted-foreground">используют Академиус</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LiveStats;
