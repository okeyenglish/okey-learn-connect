export default function ClientLogos() {
  const clients = [
    { name: 'Полиглот', color: 'from-blue-500 to-cyan-500' },
    { name: 'Умники', color: 'from-purple-500 to-pink-500' },
    { name: 'Лингва', color: 'from-green-500 to-emerald-500' },
    { name: 'Эрудит', color: 'from-orange-500 to-red-500' },
    { name: 'Знайка', color: 'from-indigo-500 to-blue-500' },
    { name: 'Вектор', color: 'from-yellow-500 to-orange-500' },
  ];

  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6">
        <h3 className="text-center text-sm font-medium text-muted-foreground mb-8">
          Нам доверяют ведущие образовательные центры
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-8 items-center">
          {clients.map((client, index) => (
            <div 
              key={index}
              className="flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300 opacity-60 hover:opacity-100"
            >
              <div className="text-center">
                <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${client.color} flex items-center justify-center mb-2 mx-auto shadow-lg`}>
                  <span className="text-white font-bold text-xl">
                    {client.name.charAt(0)}
                  </span>
                </div>
                <span className="text-xs font-medium">{client.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}