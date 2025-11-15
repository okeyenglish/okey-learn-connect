import { 
  Users, Database, Calendar, FileText, DollarSign, 
  CreditCard, GraduationCap, Smartphone, Sparkles, Plug 
} from 'lucide-react';

export default function Features() {
  const features = [
    { icon: Users, title: 'CRM и воронка продаж' },
    { icon: Database, title: 'База учеников и семей' },
    { icon: Calendar, title: 'Расписание и посещаемость' },
    { icon: FileText, title: 'Домашние задания и материалы' },
    { icon: DollarSign, title: 'Финансы: оплаты, долги, выручка' },
    { icon: CreditCard, title: 'Начисление зарплат' },
    { icon: GraduationCap, title: 'Личный кабинет педагога' },
    { icon: Smartphone, title: 'Приложение для родителей' },
    { icon: Sparkles, title: 'AI-инструменты для контента' },
    { icon: Plug, title: 'Интеграции: телефония, мессенджеры, платежи' }
  ];

  return (
    <section id="features" className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Что входит в Академиус
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="bg-card p-6 rounded-lg border border-border text-center hover:shadow-lg transition-shadow">
                <Icon className="h-8 w-8 text-primary mx-auto mb-3" />
                <p className="text-sm font-medium">{feature.title}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
