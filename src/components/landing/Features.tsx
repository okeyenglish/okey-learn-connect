import { 
  Users, Database, Calendar, FileText, DollarSign, 
  CreditCard, GraduationCap, Smartphone, Sparkles, Plug 
} from 'lucide-react';

export default function Features() {
  const features = [
    { 
      icon: Users, 
      title: 'CRM и воронка продаж',
      description: 'Собирайте заявки из всех каналов и ведите их до покупки',
      category: 'crm',
      gradient: 'from-[hsl(var(--category-crm))] to-[hsl(var(--accent-purple))]'
    },
    { 
      icon: Database, 
      title: 'База учеников и семей',
      description: 'Вся информация о клиентах в одном месте',
      category: 'crm',
      gradient: 'from-[hsl(var(--category-crm))] to-[hsl(var(--accent-pink))]'
    },
    { 
      icon: Calendar, 
      title: 'Расписание и посещаемость',
      description: 'Отмечайте присутствие одним кликом',
      category: 'education',
      gradient: 'from-[hsl(var(--category-education))] to-[hsl(var(--accent-cyan))]'
    },
    { 
      icon: FileText, 
      title: 'Домашние задания и материалы',
      description: 'Выдавайте ДЗ и делитесь материалами с учениками',
      category: 'education',
      gradient: 'from-[hsl(var(--category-education))] to-[hsl(var(--glow-blue))]'
    },
    { 
      icon: DollarSign, 
      title: 'Финансы и выручка',
      description: 'Видите деньги в реальном времени по всем филиалам',
      category: 'finance',
      gradient: 'from-[hsl(var(--category-finance))] to-emerald-500'
    },
    { 
      icon: CreditCard, 
      title: 'Начисление зарплат',
      description: 'Автоматический расчет зарплат преподавателей',
      category: 'finance',
      gradient: 'from-[hsl(var(--category-finance))] to-green-500'
    },
    { 
      icon: GraduationCap, 
      title: 'Личный кабинет педагога',
      description: 'Всё для работы в одном месте',
      category: 'education',
      gradient: 'from-[hsl(var(--category-education))] to-[hsl(var(--brand))]'
    },
    { 
      icon: Smartphone, 
      title: 'Приложение для родителей',
      description: 'Прогресс ребёнка и оплата в приложении',
      category: 'parent',
      gradient: 'from-[hsl(var(--category-parent))] to-[hsl(var(--accent-pink))]'
    },
    { 
      icon: Sparkles, 
      title: 'AI-инструменты для контента',
      description: 'Генерация планов уроков и упражнений',
      category: 'tech',
      gradient: 'from-[hsl(var(--category-tech))] to-amber-500'
    },
    { 
      icon: Plug, 
      title: 'Интеграции',
      description: 'Телефония, мессенджеры, платёжные системы',
      category: 'tech',
      gradient: 'from-[hsl(var(--category-tech))] to-orange-500'
    }
  ];

  return (
    <section id="features" className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Возможности</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Что входит в Академиус
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Полный набор инструментов для эффективного управления образовательным процессом
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const categoryColor = `hsl(var(--category-${feature.category}))`;
            return (
              <div 
                key={index} 
                className="feature-card glass-card p-6 rounded-xl border border-border/50 text-center cursor-pointer animate-fade-in group"
                style={{ 
                  animationDelay: `${index * 50}ms`,
                  color: categoryColor
                }}
              >
                <div className="relative">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-2xl transition-all duration-300 icon-glow`}>
                    <Icon className="h-8 w-8 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"
                       style={{ 
                         background: `linear-gradient(135deg, ${categoryColor}, transparent)`,
                         top: 0,
                         left: '50%',
                         transform: 'translateX(-50%)',
                         width: '80px',
                         height: '80px'
                       }} />
                  <h3 className="text-sm font-bold mb-2 text-foreground group-hover:text-[var(--category-color)] transition-colors" 
                      style={{ '--category-color': categoryColor } as React.CSSProperties}>
                    {feature.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
