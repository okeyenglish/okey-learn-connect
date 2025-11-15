import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export default function ForSchools() {
  const benefits = [
    {
      title: 'CRM по лидам и ученикам',
      description: 'Не теряйте обращения: заявки с сайта, звонки, мессенджеры — в одной воронке'
    },
    {
      title: 'Умное расписание и группы',
      description: 'Автоматические проверки пересечений, замены педагогов, разные тарифы и абонементы'
    },
    {
      title: 'Финансы и оплаты',
      description: 'Учёт оплат по ученикам и группам, просрочки, выручка по филиалам'
    },
    {
      title: 'Зарплата педагогов',
      description: 'Настройка схем оплаты, автоматический расчет по реальным посещениям'
    },
    {
      title: 'Отчеты и аналитика',
      description: 'Лиды, ученики, выручка по филиалам, менеджерам и каналам'
    },
    {
      title: 'Интеграции',
      description: 'Телефония, WhatsApp, онлайн-уроки, агрегаторы — всё связано с CRM'
    }
  ];

  return (
    <section id="for-schools" className="py-20 bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
              <span className="text-sm font-medium text-primary">Для бизнеса</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Для школ и учебных центров
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Академиус помогает владельцам и администраторам держать под контролем продажи, 
              расписание и деньги — без бесконечных таблиц и чатов
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {benefits.map((benefit, index) => (
              <div 
                key={index} 
                className="bg-card p-6 rounded-xl border border-border hover:shadow-xl hover:border-primary/50 transition-all duration-300 group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">{benefit.title}</h3>
                    <p className="text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 p-8 rounded-2xl border border-primary/20">
            <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl hover:scale-105 transition-all">
              Получить демо для школы
            </Button>
            <p className="text-sm text-muted-foreground mt-4 max-w-xl mx-auto">
              Расскажем, как Академиус сэкономит вам десятки часов в месяц и закроет хаос в управлении
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
