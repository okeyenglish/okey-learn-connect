export default function ClientLogos() {
  const stats = [
    { value: '347', label: 'школ' },
    { value: '8,432', label: 'учеников' },
    { value: '18', label: 'часов экономии' },
    { value: '9/10', label: 'оценка' }
  ];

  const clients = [
    { name: 'Полиглот', color: 'from-blue-500 to-cyan-500' },
    { name: 'Умники', color: 'from-purple-500 to-pink-500' },
    { name: 'CodeKids', color: 'from-green-500 to-emerald-500' },
    { name: 'Эрудит', color: 'from-orange-500 to-red-500' },
    { name: 'Знайка', color: 'from-indigo-500 to-blue-500' }
  ];

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 max-w-4xl mx-auto">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Client Logos */}
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground">
            Нам доверяют ведущие образовательные центры
          </p>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-6 items-center max-w-3xl mx-auto">
          {clients.map((client, index) => (
            <div 
              key={index}
              className="flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300 opacity-60 hover:opacity-100"
            >
              <div className="text-center">
                <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${client.color} flex items-center justify-center mx-auto shadow-md`}>
                  <span className="text-white font-bold text-lg">
                    {client.name.charAt(0)}
                  </span>
                </div>
                <span className="text-xs font-medium mt-2 block">{client.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}