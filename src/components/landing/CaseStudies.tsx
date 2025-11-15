import { CheckCircle2, Download, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const caseStudies = [
  {
    id: 1,
    company: 'Языковая школа "Полиглот"',
    location: 'Москва',
    logo: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&h=200&fit=crop',
    director: 'Мария Иванова',
    directorPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
    problem: 'Теряли 30% заявок из Instagram и WhatsApp — они просто терялись в разных чатах. Админ тратил 40 часов в месяц на составление расписания вручную.',
    solution: 'Внедрили Академиус за 2 дня. Все мессенджеры подключили к CRM, автоматизировали расписание и настроили родительское приложение.',
    quote: 'До Академиуса я работала до 9 вечера каждый день. Сейчас ухожу в 6 и всё под контролем.',
    metrics: [
      { label: 'Конверсия заявок', before: '25%', after: '42%', growth: '+68%' },
      { label: 'Время на рутину', before: '40 ч/мес', after: '10 ч/мес', growth: '-75%' },
      { label: 'Выручка за квартал', before: '—', after: '+28%', growth: '+28%' }
    ],
    pdfUrl: '#'
  },
  {
    id: 2,
    company: 'Детский центр "Умники"',
    location: 'Санкт-Петербург',
    logo: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=200&h=200&fit=crop',
    director: 'Алексей Петров',
    directorPhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
    problem: 'Родители постоянно звонили с вопросами по расписанию, оплатам и домашкам. Секретарь не успевала всем отвечать.',
    solution: 'Запустили мобильное приложение для родителей — теперь вся информация у них под рукой. Оплаты принимаем онлайн прямо в приложении.',
    quote: 'Количество звонков сократилось на 80%. Теперь секретарь успевает заниматься продажами, а не отвечать на одни и те же вопросы.',
    metrics: [
      { label: 'Входящих звонков', before: '120/день', after: '25/день', growth: '-79%' },
      { label: 'Скорость оплат', before: '7 дней', after: '1 день', growth: '-86%' },
      { label: 'Удовлетворённость', before: '3.8/5', after: '4.9/5', growth: '+29%' }
    ],
    pdfUrl: '#'
  },
  {
    id: 3,
    company: 'Сеть школ "CodeKids"',
    location: 'Казань, 3 филиала',
    logo: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=200&h=200&fit=crop',
    director: 'Дмитрий Соколов',
    directorPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    problem: 'У каждого филиала была своя таблица Excel. Невозможно было понять общую картину по сети. Учителя постоянно путали аудитории.',
    solution: 'Объединили все 3 филиала в Академиус. Теперь вижу онлайн загрузку каждого филиала, учителя, аудитории. Расписание синхронизируется автоматически.',
    quote: 'Открыли 4-й филиал за 2 месяца — с прежней системой это было бы невозможно.',
    metrics: [
      { label: 'Загрузка аудиторий', before: '62%', after: '89%', growth: '+44%' },
      { label: 'Конфликты расписания', before: '15/мес', after: '0/мес', growth: '-100%' },
      { label: 'Время на отчёты', before: '3 дня', after: '5 минут', growth: '-99%' }
    ],
    pdfUrl: '#'
  }
];

export default function CaseStudies() {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-background/50">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Истории успеха наших клиентов
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Реальные результаты школ, которые перешли на Академиус
          </p>
        </div>

        <div className="space-y-24">
          {caseStudies.map((study, index) => (
            <div
              key={study.id}
              className={`flex flex-col ${
                index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
              } gap-12 items-center animate-fade-in`}
            >
              {/* Image Side */}
              <div className="flex-1 w-full">
                <div className="relative rounded-2xl overflow-hidden shadow-elevated bg-gradient-to-br from-primary/10 to-primary/5 p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <img
                      src={study.logo}
                      alt={`Логотип ${study.company}, ${study.location}`}
                      className="w-20 h-20 rounded-xl object-cover shadow-md"
                      loading="lazy"
                    />
                    <div>
                      <h3 className="text-2xl font-bold">{study.company}</h3>
                      <p className="text-muted-foreground">{study.location}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 bg-background/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
                    <img
                      src={study.directorPhoto}
                      alt={`Фото ${study.director}, директор ${study.company}`}
                      className="w-16 h-16 rounded-full object-cover shadow-md flex-shrink-0"
                      loading="lazy"
                    />
                    <div>
                      <p className="text-lg italic mb-2">"{study.quote}"</p>
                      <p className="text-sm font-semibold">{study.director}</p>
                      <p className="text-xs text-muted-foreground">Директор</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Side */}
              <div className="flex-1 w-full">
                <div className="space-y-6">
                  {/* Problem */}
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-sm font-semibold mb-3">
                      ❌ Проблема
                    </div>
                    <p className="text-muted-foreground">{study.problem}</p>
                  </div>

                  {/* Solution */}
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-3">
                      <CheckCircle2 className="w-4 h-4" />
                      Решение
                    </div>
                    <p className="text-muted-foreground">{study.solution}</p>
                  </div>

                  {/* Metrics */}
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-semibold mb-4">
                      <TrendingUp className="w-4 h-4" />
                      Результаты
                    </div>
                    <div className="grid sm:grid-cols-3 gap-4">
                      {study.metrics.map((metric, idx) => (
                        <div
                          key={idx}
                          className="bg-card rounded-xl p-4 border border-border hover:border-primary/50 transition-colors"
                        >
                          <p className="text-sm text-muted-foreground mb-2">
                            {metric.label}
                          </p>
                          <div className="space-y-1">
                            <p className="text-xs line-through text-muted-foreground/60">
                              {metric.before}
                            </p>
                            <p className="text-lg font-bold">{metric.after}</p>
                          </div>
                          <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                            {metric.growth}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    Скачать полный кейс (PDF)
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
