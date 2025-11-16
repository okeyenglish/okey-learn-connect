import { Building2, GraduationCap, Users } from 'lucide-react';
import FlowDiagram from '@/components/effects/FlowDiagram';

export default function HowItWorks() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Как работает Академиус?
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            От заявки до отчёта — единый процесс без разрывов. Все данные автоматически передаются между этапами.
          </p>
        </div>

        {/* Flow Diagram */}
        <div className="mb-20">
          <FlowDiagram />
        </div>

        {/* Roles section */}
        <div className="text-center mb-12">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">
            Одна платформа — три роли, общий результат
          </h3>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Академиус связывает школу, педагога и родителя в один понятный процесс.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center group">
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-6 group-hover:scale-110 transition-transform">
              <Building2 className="h-10 w-10 text-primary" />
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-0 group-hover:opacity-75"></div>
            </div>
            <h3 className="text-2xl font-bold mb-4">Школа</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                <span>Не теряет заявки из мессенджеров</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                <span>Видит выручку и прибыль в реальном времени</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                <span>Контролирует загрузку филиалов</span>
              </li>
            </ul>
            <div className="mt-4 text-sm font-semibold text-success">–18 часов рутины в месяц</div>
          </div>

          <div className="text-center group">
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-6 group-hover:scale-110 transition-transform">
              <GraduationCap className="h-10 w-10 text-primary" />
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-0 group-hover:opacity-75"></div>
            </div>
            <h3 className="text-2xl font-bold mb-4">Педагог</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                <span>Всё расписание с уведомлениями</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                <span>Журнал за 2 клика, ДЗ автоматически</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                <span>Прозрачный расчёт зарплаты</span>
              </li>
            </ul>
            <div className="mt-4 text-sm font-semibold text-success">0 пропущенных уроков</div>
          </div>

          <div className="text-center group">
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-6 group-hover:scale-110 transition-transform">
              <Users className="h-10 w-10 text-primary" />
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-0 group-hover:opacity-75"></div>
            </div>
            <h3 className="text-2xl font-bold mb-4">Родитель</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                <span>Видит оценки и комментарии преподавателя</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                <span>Расписание с push-уведомлениями</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                <span>Оплата онлайн картой за 30 секунд</span>
              </li>
            </ul>
            <div className="mt-4 text-sm font-semibold text-success">–80% звонков по расписанию</div>
          </div>
        </div>
      </div>
    </section>
  );
}
