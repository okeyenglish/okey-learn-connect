import { Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const comparisonData: Array<{
  feature: string;
  excel: { status: 'full' | 'partial' | 'none'; text: string };
  competitors: { status: 'full' | 'partial' | 'none'; text: string };
  academius: { status: 'full' | 'partial' | 'none'; text: string };
}> = [
  {
    feature: 'Автоматизация заявок',
    excel: { status: 'none', text: 'Только вручную' },
    competitors: { status: 'partial', text: 'Частично' },
    academius: { status: 'full', text: 'Полная автоматизация' }
  },
  {
    feature: 'CRM + Расписание + Финансы',
    excel: { status: 'none', text: 'Разные файлы' },
    competitors: { status: 'partial', text: 'Нужно 3 сервиса' },
    academius: { status: 'full', text: 'Всё в одном' }
  },
  {
    feature: 'Приложение для родителей',
    excel: { status: 'none', text: 'Нет' },
    competitors: { status: 'none', text: 'Редко' },
    academius: { status: 'full', text: 'iOS + Android' }
  },
  {
    feature: 'Интеграция мессенджеров',
    excel: { status: 'none', text: 'Нет' },
    competitors: { status: 'partial', text: 'Только WhatsApp' },
    academius: { status: 'full', text: 'WhatsApp + Telegram + VK' }
  },
  {
    feature: 'Онлайн оплата занятий',
    excel: { status: 'none', text: 'Нет' },
    competitors: { status: 'partial', text: 'За доп. плату' },
    academius: { status: 'full', text: 'Включено' }
  },
  {
    feature: 'Автоматические отчёты',
    excel: { status: 'none', text: 'Вручную' },
    competitors: { status: 'partial', text: 'Базовые' },
    academius: { status: 'full', text: '15+ готовых отчётов' }
  },
  {
    feature: 'Многофилиальность',
    excel: { status: 'none', text: 'Невозможно' },
    competitors: { status: 'partial', text: 'Дорого' },
    academius: { status: 'full', text: 'Без ограничений' }
  },
  {
    feature: 'Стоимость в месяц',
    excel: { status: 'partial', text: 'Бесплатно' },
    competitors: { status: 'none', text: 'От 15,000₽' },
    academius: { status: 'full', text: 'От 5,990₽' }
  },
  {
    feature: 'Техническая поддержка',
    excel: { status: 'none', text: 'Нет' },
    competitors: { status: 'partial', text: 'Email, медленно' },
    academius: { status: 'full', text: 'Чат + Телефон 24/7' }
  },
  {
    feature: 'Время внедрения',
    excel: { status: 'none', text: 'Недели настройки' },
    competitors: { status: 'partial', text: '5-7 дней' },
    academius: { status: 'full', text: '1-2 дня' }
  }
];

const StatusIcon = ({ status }: { status: 'full' | 'partial' | 'none' }) => {
  if (status === 'full') {
    return <Check className="w-5 h-5 text-green-600 dark:text-green-400" />;
  }
  if (status === 'partial') {
    return <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
  }
  return <X className="w-5 h-5 text-destructive" />;
};

export default function Comparison() {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-primary/5">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Сравните Академиус с альтернативами
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Почему школы выбирают нас вместо Excel и других CRM
          </p>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block max-w-6xl mx-auto">
          <div className="bg-card rounded-2xl border border-border shadow-elevated overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-4 bg-muted/30 sticky top-0 z-10">
              <div className="p-6 font-semibold text-muted-foreground border-r border-border">
                Возможность
              </div>
              <div className="p-6 text-center font-semibold border-r border-border">
                Excel
              </div>
              <div className="p-6 text-center font-semibold border-r border-border">
                Конкуренты
              </div>
              <div className="p-6 text-center font-semibold bg-gradient-to-r from-primary/10 to-primary/5">
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Академиус
                </span>
              </div>
            </div>

            {/* Rows */}
            {comparisonData.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-4 border-t border-border hover:bg-muted/20 transition-colors"
              >
                <div className="p-6 font-medium border-r border-border">
                  {row.feature}
                </div>
                <div className="p-6 border-r border-border">
                  <div className="flex flex-col items-center gap-2">
                    <StatusIcon status={row.excel.status} />
                    <span className="text-sm text-muted-foreground text-center">
                      {row.excel.text}
                    </span>
                  </div>
                </div>
                <div className="p-6 border-r border-border">
                  <div className="flex flex-col items-center gap-2">
                    <StatusIcon status={row.competitors.status} />
                    <span className="text-sm text-muted-foreground text-center">
                      {row.competitors.text}
                    </span>
                  </div>
                </div>
                <div className="p-6 bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="flex flex-col items-center gap-2">
                    <StatusIcon status={row.academius.status} />
                    <span className="text-sm font-semibold text-center">
                      {row.academius.text}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-4">
          {comparisonData.map((row, index) => (
            <div
              key={index}
              className="bg-card rounded-xl border border-border p-4 space-y-4"
            >
              <h3 className="font-semibold text-lg">{row.feature}</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium">Excel</span>
                  <div className="flex items-center gap-2">
                    <StatusIcon status={row.excel.status} />
                    <span className="text-xs text-muted-foreground">
                      {row.excel.text}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium">Конкуренты</span>
                  <div className="flex items-center gap-2">
                    <StatusIcon status={row.competitors.status} />
                    <span className="text-xs text-muted-foreground">
                      {row.competitors.text}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                  <span className="text-sm font-semibold">Академиус</span>
                  <div className="flex items-center gap-2">
                    <StatusIcon status={row.academius.status} />
                    <span className="text-xs font-semibold">
                      {row.academius.text}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Button size="lg" variant="hero">
            Попробовать Академиус бесплатно
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            14 дней без ограничений, без привязки карты
          </p>
        </div>
      </div>
    </section>
  );
}
