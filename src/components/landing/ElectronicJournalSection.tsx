import { Calendar, CheckSquare, MessageSquare, TrendingUp, FileText, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ScrollReveal from '@/components/effects/ScrollReveal';

export const ElectronicJournalSection = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Электронный журнал
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Всё в одном месте: посещаемость, домашние задания, оценки, оплаты и общение с родителями
            </p>
          </div>
        </ScrollReveal>

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <ScrollReveal delay={0.1}>
              <div className="space-y-6">
                {[
                  {
                    icon: CheckSquare,
                    title: 'Посещаемость одним кликом',
                    description: 'Отмечайте присутствующих прямо на занятии. Родители моментально получают уведомление.',
                  },
                  {
                    icon: FileText,
                    title: 'Домашние задания',
                    description: 'Прикрепляйте файлы, ссылки и описания. Ученики видят задания в своём кабинете.',
                  },
                  {
                    icon: MessageSquare,
                    title: 'Чат с родителями',
                    description: 'Общайтесь напрямую с родителями учеников. История переписки сохраняется.',
                  },
                  {
                    icon: TrendingUp,
                    title: 'Прогресс и оценки',
                    description: 'Отслеживайте успеваемость каждого ученика. Графики и статистика по группе.',
                  },
                  {
                    icon: Calendar,
                    title: 'История занятий',
                    description: 'Полная история всех уроков, домашних заданий и комментариев.',
                  },
                  {
                    icon: Clock,
                    title: 'Автоматический учёт часов',
                    description: 'Система сама считает проведённые часы для начисления зарплаты.',
                  },
                ].map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={index} className="flex gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-2xl blur-xl" />
                <Card className="relative">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-4 border-b">
                        <div>
                          <h3 className="font-semibold">Группа A1 - Начинающие</h3>
                          <p className="text-sm text-muted-foreground">Английский язык</p>
                        </div>
                        <Badge>12 учеников</Badge>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold">
                              АП
                            </div>
                            <div>
                              <div className="font-medium text-sm">Анна Петрова</div>
                              <div className="text-xs text-muted-foreground">Сегодня присутствовала</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                              ДЗ сдано
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold">
                              ИС
                            </div>
                            <div>
                              <div className="font-medium text-sm">Иван Смирнов</div>
                              <div className="text-xs text-muted-foreground">Отсутствовал</div>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/20">
                            Пропуск
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold">
                              МК
                            </div>
                            <div>
                              <div className="font-medium text-sm">Мария Козлова</div>
                              <div className="text-xs text-muted-foreground">Сегодня присутствовала</div>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
                            ДЗ не сдано
                          </Badge>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Посещаемость группы</span>
                          <span className="font-semibold">92%</span>
                        </div>
                        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: '92%' }} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollReveal>
          </div>
        </div>

        <ScrollReveal delay={0.3}>
          <div className="mt-16 max-w-4xl mx-auto">
            <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-2 border-primary/20">
              <CardContent className="p-8 text-center">
                <h3 className="text-2xl font-semibold mb-4">
                  Экономьте до 5 часов в неделю на рутине
                </h3>
                <p className="text-muted-foreground mb-6">
                  Преподаватели тратят в среднем на 70% меньше времени на административные задачи
                </p>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-3xl font-bold text-primary mb-1">−70%</div>
                    <div className="text-sm text-muted-foreground">Времени на админ-задачи</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-primary mb-1">+95%</div>
                    <div className="text-sm text-muted-foreground">Родители довольны информированностью</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-primary mb-1">100%</div>
                    <div className="text-sm text-muted-foreground">История сохраняется</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
