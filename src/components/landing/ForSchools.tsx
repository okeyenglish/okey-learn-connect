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
    <section id="for-schools" className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">
            Для школ и учебных центров
          </h2>
          <p className="text-lg text-muted-foreground mb-12 text-center">
            Академиус помогает владельцам и администраторам держать под контролем продажи, 
            расписание и деньги — без бесконечных таблиц и чатов
          </p>

          <div className="grid gap-6 mb-12">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-card p-6 rounded-lg border border-border">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">{benefit.title}</h3>
                    <p className="text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button size="lg">Получить демо для школы</Button>
            <p className="text-sm text-muted-foreground mt-4">
              Расскажем, как Академиус сэкономит вам десятки часов в месяц и закроет хаос в управлении
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
