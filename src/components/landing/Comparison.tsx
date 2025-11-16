import { Check, X, AlertCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import ScrollReveal from '@/components/effects/ScrollReveal';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const comparisonData: Array<{
  feature: string;
  excel: { status: 'full' | 'partial' | 'none'; text: string };
  competitors: { status: 'full' | 'partial' | 'none'; text: string };
  academius: { status: 'full' | 'partial' | 'none'; text: string; exclusive?: boolean };
  details?: string;
  importance?: string;
}> = [
  {
    feature: 'Автоматизация заявок',
    excel: { status: 'none' as const, text: 'Только вручную' },
    competitors: { status: 'partial' as const, text: 'Частично' },
    academius: { status: 'full' as const, text: 'Полная автоматизация', exclusive: true },
    details: 'Автоматический перенос заявок из всех источников в CRM без потери данных',
    importance: 'Экономит до 15 часов в неделю на ручной ввод данных'
  },
  {
    feature: 'CRM + Расписание + Финансы',
    excel: { status: 'none' as const, text: 'Разные файлы' },
    competitors: { status: 'partial' as const, text: 'Нужно 3 сервиса' },
    academius: { status: 'full' as const, text: 'Всё в одном', exclusive: true },
    details: 'Единая платформа без необходимости переключаться между системами',
    importance: 'Снижает вероятность ошибок на 80% и ускоряет работу в 3 раза'
  },
  {
    feature: 'Приложение для родителей',
    excel: { status: 'none' as const, text: 'Нет' },
    competitors: { status: 'none' as const, text: 'Редко' },
    academius: { status: 'full' as const, text: 'iOS + Android', exclusive: true },
    details: 'Родители видят расписание, оценки, домашние задания и могут оплачивать занятия',
    importance: 'Повышает лояльность родителей на 95%'
  },
  {
    feature: 'Интеграция мессенджеров',
    excel: { status: 'none' as const, text: 'Нет' },
    competitors: { status: 'partial' as const, text: 'Только WhatsApp' },
    academius: { status: 'full' as const, text: 'WhatsApp + Telegram + VK', exclusive: true },
    details: 'Автоматическая интеграция с популярными мессенджерами',
    importance: 'Увеличивает скорость ответа клиентам в 5 раз'
  },
  {
    feature: 'Онлайн оплата занятий',
    excel: { status: 'none' as const, text: 'Нет' },
    competitors: { status: 'partial' as const, text: 'За доп. плату' },
    academius: { status: 'full' as const, text: 'Включено' },
    details: 'Встроенная оплата через ЮKassa, Stripe, Сбербанк без дополнительных комиссий',
    importance: 'Увеличивает своевременность платежей на 40%'
  },
  {
    feature: 'Автоматические отчёты',
    excel: { status: 'none' as const, text: 'Вручную' },
    competitors: { status: 'partial' as const, text: 'Базовые' },
    academius: { status: 'full' as const, text: '15+ готовых отчётов' },
    details: '15+ готовых отчётов по финансам, посещаемости, зарплатам и продажам',
    importance: 'Экономит 20+ часов в месяц на составление отчётов'
  },
  {
    feature: 'Многофилиальность',
    excel: { status: 'none' as const, text: 'Невозможно' },
    competitors: { status: 'partial' as const, text: 'Дорого' },
    academius: { status: 'full' as const, text: 'Без ограничений', exclusive: true },
    details: 'Управляйте неограниченным количеством филиалов из одного аккаунта',
    importance: 'Снижает затраты на управление филиалами на 60%'
  },
  {
    feature: 'Стоимость в месяц',
    excel: { status: 'partial' as const, text: 'Бесплатно' },
    competitors: { status: 'none' as const, text: 'От 15,000₽' },
    academius: { status: 'full' as const, text: 'От 5,990₽' }
  },
  {
    feature: 'Техническая поддержка',
    excel: { status: 'none' as const, text: 'Нет' },
    competitors: { status: 'partial' as const, text: 'Email, медленно' },
    academius: { status: 'full' as const, text: 'Чат + Телефон 24/7' },
    details: 'Круглосуточная поддержка через чат, email и телефон на русском языке',
    importance: 'Среднее время ответа: 3 минуты'
  },
  {
    feature: 'Время внедрения',
    excel: { status: 'none' as const, text: 'Недели настройки' },
    competitors: { status: 'partial' as const, text: '5-7 дней' },
    academius: { status: 'full' as const, text: '1-2 дня' },
    details: 'Быстрое внедрение с помощью личного менеджера и готовых шаблонов',
    importance: 'Начните экономить время уже через день'
  }
];

const StatusIcon = ({ status }: { status: 'full' | 'partial' | 'none' }) => {
  if (status === 'full') return <Check className="w-5 h-5 text-green-600 dark:text-green-400 animate-scale-in" />;
  if (status === 'partial') return <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
  return <X className="w-5 h-5 text-destructive" />;
};

export default function Comparison() {
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);
  const [showOnlyWins, setShowOnlyWins] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const filteredData = comparisonData.filter(row => {
    if (showOnlyWins) {
      return row.academius.status === 'full' && 
             (row.excel.status !== 'full' || row.competitors.status !== 'full');
    }
    if (showOnlyDifferences) {
      return row.excel.status !== row.academius.status || 
             row.competitors.status !== row.academius.status;
    }
    return true;
  });

  return (
    <section className="py-24 bg-gradient-to-b from-background to-primary/5">
      <div className="container mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Сравните Академиус с альтернативами</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Почему школы выбирают нас вместо Excel и других CRM</p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="flex justify-center gap-2 mb-8 flex-wrap">
            <button
              onClick={() => {
                setShowOnlyDifferences(false);
                setShowOnlyWins(false);
              }}
              className={`px-4 py-2 rounded-lg transition-colors ${
                !showOnlyDifferences && !showOnlyWins
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border hover:border-primary'
              }`}
            >
              Показать все
            </button>
            <button
              onClick={() => {
                setShowOnlyDifferences(true);
                setShowOnlyWins(false);
              }}
              className={`px-4 py-2 rounded-lg transition-colors ${
                showOnlyDifferences
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border hover:border-primary'
              }`}
            >
              Только различия
            </button>
            <button
              onClick={() => {
                setShowOnlyWins(true);
                setShowOnlyDifferences(false);
              }}
              className={`px-4 py-2 rounded-lg transition-colors ${
                showOnlyWins
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border hover:border-primary'
              }`}
            >
              Только Академиус выигрывает
            </button>
          </div>
        </ScrollReveal>

        <div className="hidden lg:block max-w-6xl mx-auto">
          <ScrollReveal delay={200}>
            <div className="bg-card rounded-2xl border-2 border-primary/20 shadow-xl overflow-hidden">
              <div className="grid grid-cols-4 bg-muted/30 sticky top-0 z-10">
                <div className="p-6 font-semibold text-muted-foreground border-r border-border">Возможность</div>
                <div className="p-6 text-center border-r border-border"><div className="font-semibold">Excel</div><div className="text-xs text-muted-foreground">Бесплатно</div></div>
                <div className="p-6 text-center border-r border-border"><div className="font-semibold">Конкуренты</div><div className="text-xs text-muted-foreground">От 15,000₽/мес</div></div>
                <div className="p-6 text-center bg-primary/10"><div className="font-bold text-primary">Академиус</div><div className="text-xs text-primary/80">От 5,990₽/мес</div></div>
              </div>
              {filteredData.map((row, index) => (
                <div key={index} className="animate-fade-in">
                  <div 
                    className={`grid grid-cols-4 border-t border-border hover:bg-muted/50 transition-colors cursor-pointer ${
                      expandedRow === index ? 'bg-muted/30' : ''
                    }`}
                    onClick={() => setExpandedRow(expandedRow === index ? null : index)}
                  >
                    <div className="p-6 font-medium border-r border-border flex items-center justify-between">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-2">
                              {row.feature}
                              {row.academius.exclusive && (
                                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                                  Эксклюзивно
                                </Badge>
                              )}
                            </span>
                          </TooltipTrigger>
                          {row.importance && (
                            <TooltipContent>
                              <p className="font-semibold mb-1">Почему это важно:</p>
                              <p>{row.importance}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                      {row.details && (
                        <ChevronDown className={`w-4 h-4 transition-transform ${
                          expandedRow === index ? 'rotate-180' : ''
                        }`} />
                      )}
                    </div>
                    <div className="p-6 border-r border-border">
                      <div className="flex items-center gap-2">
                        <StatusIcon status={row.excel.status} />
                        <span className="text-sm">{row.excel.text}</span>
                      </div>
                    </div>
                    <div className="p-6 border-r border-border">
                      <div className="flex items-center gap-2">
                        <StatusIcon status={row.competitors.status} />
                        <span className="text-sm">{row.competitors.text}</span>
                      </div>
                    </div>
                    <div className="p-6 bg-primary/5">
                      <div className="flex items-center gap-2">
                        <StatusIcon status={row.academius.status} />
                        <span className="text-sm font-medium">{row.academius.text}</span>
                      </div>
                    </div>
                  </div>
                  {expandedRow === index && row.details && (
                    <div className="grid grid-cols-4 border-t border-border bg-muted/30 animate-accordion-down">
                      <div className="col-span-4 p-6">
                        <p className="text-sm text-muted-foreground">{row.details}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>

        <div className="lg:hidden space-y-4">
          {filteredData.map((row, index) => (
            <ScrollReveal key={index} delay={index * 50}>
              <div className="bg-card rounded-lg border border-border p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  {row.feature}
                  {row.academius.exclusive && (
                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                      Эксклюзивно
                    </Badge>
                  )}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Excel:</span>
                    <div className="flex items-center gap-2">
                      <StatusIcon status={row.excel.status} />
                      <span className="text-sm">{row.excel.text}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Конкуренты:</span>
                    <div className="flex items-center gap-2">
                      <StatusIcon status={row.competitors.status} />
                      <span className="text-sm">{row.competitors.text}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-primary/5 p-2 rounded">
                    <span className="text-sm font-medium text-primary">Академиус:</span>
                    <div className="flex items-center gap-2">
                      <StatusIcon status={row.academius.status} />
                      <span className="text-sm font-medium">{row.academius.text}</span>
                    </div>
                  </div>
                </div>
                {row.details && (
                  <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                    {row.details}
                  </p>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={300}>
          <div className="text-center mt-12"><Button size="lg">Начать бесплатно</Button></div>
        </ScrollReveal>
      </div>
    </section>
  );
}
