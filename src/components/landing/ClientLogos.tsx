import { Shield, Award, MessageCircle, TrendingUp, Users, Zap } from 'lucide-react';

export default function ClientLogos() {
  const stats = [
    { value: '347', label: 'школ', gradient: 'from-[hsl(var(--category-crm))] to-purple-600' },
    { value: '8,432', label: 'учеников', gradient: 'from-[hsl(var(--category-education))] to-blue-600' },
    { value: '9/10', label: 'рейтинг', gradient: 'from-[hsl(var(--category-tech))] to-amber-500' }
  ];

  const clients = [
    { 
      name: 'Полиглот', 
      icon: MessageCircle,
      gradient: 'from-purple-500 to-pink-500',
      shape: 'rounded-2xl'
    },
    { 
      name: 'Умники', 
      icon: Award,
      gradient: 'from-blue-500 to-cyan-500',
      shape: 'rounded-xl'
    },
    { 
      name: 'CodeKids', 
      icon: Zap,
      gradient: 'from-orange-500 to-red-500',
      shape: 'rounded-2xl rotate-45'
    },
    { 
      name: 'Эрудит', 
      icon: TrendingUp,
      gradient: 'from-green-500 to-emerald-500',
      shape: 'rounded-xl'
    },
    { 
      name: 'Знайка', 
      icon: Users,
      gradient: 'from-indigo-500 to-purple-500',
      shape: 'rounded-xl'
    }
  ];

  const badges = [
    { text: '100% безопасность данных', icon: Shield, color: 'text-green-500' },
    { text: 'Резервное копирование 24/7', icon: Award, color: 'text-blue-500' },
    { text: 'Поддержка на русском', icon: MessageCircle, color: 'text-purple-500' }
  ];

  return (
    <section className="py-24 bg-gradient-subtle relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Stats with gradients */}
        <div className="grid grid-cols-3 gap-12 mb-20 max-w-3xl mx-auto">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className="text-center animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`text-5xl md:text-6xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mb-3`}>
                {stat.value}
              </div>
              <div className="text-base text-muted-foreground font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Client Logos with gradient designs */}
        <div className="text-center mb-12">
          <p className="text-lg text-muted-foreground font-medium">
            Нам доверяют ведущие образовательные центры
          </p>
        </div>
        <div className="flex flex-wrap justify-center items-center gap-10 max-w-4xl mx-auto mb-16">
          {clients.map((client, index) => {
            const Icon = client.icon;
            return (
              <div 
                key={index}
                className="flex flex-col items-center justify-center transition-all duration-500 hover:scale-110 animate-fade-in cursor-pointer group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`w-20 h-20 ${client.shape} bg-gradient-to-br ${client.gradient} flex items-center justify-center shadow-lg hover:shadow-2xl transition-all duration-500 relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Icon className="h-10 w-10 text-white relative z-10" strokeWidth={2} />
                  <div className={`absolute inset-0 bg-gradient-to-br ${client.gradient} blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300 -z-10`} />
                </div>
                <span className="text-sm font-semibold mt-4 text-foreground group-hover:text-primary transition-colors">
                  {client.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Trust Badges with icons and colors */}
        <div className="flex flex-wrap justify-center gap-8 max-w-3xl mx-auto">
          {badges.map((badge, index) => {
            const BadgeIcon = badge.icon;
            return (
              <div 
                key={index} 
                className="glass-card px-6 py-4 rounded-xl flex items-center gap-3 hover:scale-105 transition-all duration-300 cursor-pointer group"
              >
                <div className={`${badge.color} group-hover:scale-110 transition-transform duration-300`}>
                  <BadgeIcon className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <span className="text-sm font-medium text-foreground">{badge.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}