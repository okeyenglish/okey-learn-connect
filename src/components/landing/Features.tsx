import { 
  Users, Database, Calendar, FileText, DollarSign, 
  CreditCard, GraduationCap, Smartphone, Sparkles, Plug 
} from 'lucide-react';

export default function Features() {
  const features = [
    { 
      icon: Users, 
      title: 'CRM и воронка продаж',
      description: 'Собирайте заявки из всех каналов и ведите их до покупки'
    },
    { 
      icon: Database, 
      title: 'База учеников и семей',
      description: 'Вся информация о клиентах в одном месте'
    },
    { 
      icon: Calendar, 
      title: 'Расписание и посещаемость',
      description: 'Отмечайте присутствие одним кликом'
    },
    { 
      icon: FileText, 
      title: 'Домашние задания и материалы',
      description: 'Выдавайте ДЗ и делитесь материалами с учениками'
    },
    { 
      icon: DollarSign, 
      title: 'Финансы и выручка',
      description: 'Видите деньги в реальном времени по всем филиалам'
    },
    { 
      icon: CreditCard, 
      title: 'Начисление зарплат',
      description: 'Автоматический расчет зарплат преподавателей'
    },
    { 
      icon: GraduationCap, 
      title: 'Личный кабинет педагога',
      description: 'Всё для работы в одном месте'
    },
    { 
      icon: Smartphone, 
      title: 'Приложение для родителей',
      description: 'Прогресс ребёнка и оплата в приложении'
    },
    { 
      icon: Sparkles, 
      title: 'AI-инструменты для контента',
      description: 'Генерация планов уроков и упражнений'
    },
    { 
      icon: Plug, 
      title: 'Интеграции',
      description: 'Телефония, мессенджеры, платёжные системы'
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
            return (
              <div 
                key={index} 
                className="bg-card p-6 rounded-xl border border-border text-center hover:shadow-xl hover:border-primary/50 hover:-translate-y-2 transition-all duration-300 group cursor-pointer relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <p className="text-sm font-semibold mb-2 group-hover:text-primary transition-colors">{feature.title}</p>
                  <p className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
