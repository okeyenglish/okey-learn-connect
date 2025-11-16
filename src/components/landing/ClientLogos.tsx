export default function ClientLogos() {
  const stats = [
    { value: '347', label: 'школ' },
    { value: '8,432', label: 'учеников' },
    { value: '9/10', label: 'рейтинг' }
  ];

  const clients = [
    { name: 'Полиглот', initial: 'П' },
    { name: 'Умники', initial: 'У' },
    { name: 'CodeKids', initial: 'C' },
    { name: 'Эрудит', initial: 'Э' },
    { name: 'Знайка', initial: 'З' }
  ];

  const badges = [
    { text: '100% безопасность данных', icon: '🔒' },
    { text: 'Резервное копирование 24/7', icon: '💾' },
    { text: 'Поддержка на русском', icon: '💬' }
  ];

  return (
    <section className="py-24 bg-muted/20">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-12 mb-20 max-w-3xl mx-auto">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-5xl md:text-6xl font-bold text-foreground mb-3">
                {stat.value}
              </div>
              <div className="text-base text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Client Logos */}
        <div className="text-center mb-10">
          <p className="text-lg text-muted-foreground">
            Нам доверяют ведущие образовательные центры
          </p>
        </div>
        <div className="flex flex-wrap justify-center items-center gap-8 max-w-4xl mx-auto mb-12">
          {clients.map((client, index) => (
            <div 
              key={index}
              className="flex flex-col items-center justify-center transition-all duration-300 hover:scale-110 animate-fade-in cursor-pointer"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/8 border border-primary/10 flex items-center justify-center shadow-sm hover:shadow-lg hover:bg-primary/15 transition-all duration-300">
                <span className="text-primary font-bold text-xl">
                  {client.initial}
                </span>
              </div>
              <span className="text-sm font-medium mt-3 text-foreground">{client.name}</span>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          {badges.map((badge, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-lg">{badge.icon}</span>
              <span>{badge.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}