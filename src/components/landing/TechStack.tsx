import { Shield, Lock, Server, Zap, Award, CheckCircle2 } from 'lucide-react';

const TechStack = () => {
  const technologies = [
    { name: "React", icon: "⚛️", category: "Frontend" },
    { name: "TypeScript", icon: "📘", category: "Frontend" },
    { name: "Node.js", icon: "🟢", category: "Backend" },
    { name: "PostgreSQL", icon: "🐘", category: "Database" },
    { name: "AWS", icon: "☁️", category: "Cloud" },
    { name: "Redis", icon: "🔴", category: "Cache" },
    { name: "Docker", icon: "🐳", category: "DevOps" },
    { name: "Kubernetes", icon: "☸️", category: "DevOps" }
  ];

  const security = [
    { icon: Lock, title: "256-bit шифрование", desc: "Банковский уровень защиты" },
    { icon: Shield, title: "ISO 27001", desc: "Сертифицированная безопасность" },
    { icon: CheckCircle2, title: "GDPR Compliant", desc: "Соответствие европейским стандартам" },
    { icon: Server, title: "99.9% Uptime SLA", desc: "Гарантированная доступность" }
  ];

  return (
    <section className="relative py-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/5 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
            <Zap className="w-4 h-4 text-category-tech" />
            <span className="text-sm font-medium">Enterprise-grade Technology</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Современные технологии и безопасность
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Платформа построена на проверенном стеке технологий с фокусом на производительность и безопасность
          </p>
        </div>

        {/* Technology Stack */}
        <div className="max-w-5xl mx-auto mb-16">
          <h3 className="text-2xl font-semibold text-center mb-8">Технологический стек</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {technologies.map((tech, index) => (
              <div
                key={index}
                className="glass-card p-6 text-center group hover:scale-105 transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-category-tech/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative">
                  <div className="text-4xl mb-3 transform group-hover:scale-110 transition-transform">
                    {tech.icon}
                  </div>
                  <h4 className="font-semibold mb-1">{tech.name}</h4>
                  <p className="text-xs text-muted-foreground">{tech.category}</p>
                </div>

                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-category-tech/20 to-transparent opacity-0 group-hover:opacity-100 blur-xl transition-opacity -z-10" />
              </div>
            ))}
          </div>
        </div>

        {/* Security Features */}
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-semibold text-center mb-8">Безопасность и надёжность</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {security.map((item, index) => (
              <div
                key={index}
                className="glass-card p-6 group hover:scale-105 transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-category-finance/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-category-finance/20 to-category-tech/20 flex items-center justify-center mb-4 group-hover:from-category-finance group-hover:to-category-tech transition-all">
                    <item.icon className="w-6 h-6 text-category-finance group-hover:text-white transition-colors" />
                  </div>
                  
                  <h4 className="font-semibold mb-2">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>

                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-category-finance/20 to-category-tech/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity -z-10" />
              </div>
            ))}
          </div>
        </div>

        {/* Certifications Banner */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="glass-card p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-category-tech/5 via-category-finance/5 to-category-education/5" />
            
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-category-finance to-category-tech flex items-center justify-center relative">
                  <Shield className="w-8 h-8 text-white" />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-category-finance to-category-tech animate-pulse opacity-50" />
                </div>
                <div>
                  <h4 className="text-xl font-bold mb-1">Банковский уровень безопасности</h4>
                  <p className="text-sm text-muted-foreground">Ваши данные под надёжной защитой 24/7</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="glass-card px-4 py-2 text-center">
                  <Award className="w-6 h-6 text-category-tech mx-auto mb-1" />
                  <div className="text-xs text-muted-foreground">ISO 27001</div>
                </div>
                <div className="glass-card px-4 py-2 text-center">
                  <CheckCircle2 className="w-6 h-6 text-category-finance mx-auto mb-1" />
                  <div className="text-xs text-muted-foreground">GDPR</div>
                </div>
                <div className="glass-card px-4 py-2 text-center">
                  <Server className="w-6 h-6 text-category-education mx-auto mb-1" />
                  <div className="text-xs text-muted-foreground">99.9% SLA</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechStack;
