import { Check, Wrench, Lightbulb, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function Roadmap() {
  const roadmapItems = [
    {
      quarter: 'Q4 2024',
      status: 'completed',
      items: [
        { title: 'AI-ассистент для учителей', description: 'Генерация планов уроков за 30 секунд', icon: Check },
        { title: 'Видеозвонки в платформе', description: 'Встроенные уроки без Zoom', icon: Check },
        { title: 'WhatsApp интеграция', description: 'Автоматические уведомления родителям', icon: Check },
      ]
    },
    {
      quarter: 'Q1 2025',
      status: 'in-progress',
      items: [
        { title: 'Мобильное приложение', description: 'iOS и Android для учителей и родителей', icon: Wrench, progress: 75 },
        { title: 'Расширенная аналитика', description: 'Прогнозирование оттока учеников с AI', icon: Wrench, progress: 60 },
        { title: 'Маркетплейс интеграций', description: 'Подключайте любые сервисы в один клик', icon: Wrench, progress: 45 },
      ]
    },
    {
      quarter: 'Q2 2025',
      status: 'planned',
      items: [
        { title: 'VR-классы', description: 'Виртуальная реальность для языковых школ', icon: Lightbulb },
        { title: 'Блокчейн сертификаты', description: 'NFT-сертификаты об окончании курсов', icon: Lightbulb },
        { title: 'AR домашние задания', description: 'Дополненная реальность для обучения', icon: Lightbulb },
      ]
    },
  ];

  const getStatusColor = (status: string) => {
    if (status === 'completed') return 'text-success';
    if (status === 'in-progress') return 'text-primary';
    return 'text-muted-foreground';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') return { text: '✅ Запущено', bg: 'bg-success/10 text-success' };
    if (status === 'in-progress') return { text: '🚧 В разработке', bg: 'bg-primary/10 text-primary' };
    return { text: '💡 Планируется', bg: 'bg-muted text-muted-foreground' };
  };

  return (
    <section className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Roadmap — что дальше?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Мы постоянно развиваемся и добавляем новые функции. Следите за обновлениями и голосуйте за нужные вам фичи
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-success via-primary to-muted-foreground/30 hidden md:block"></div>

            <div className="space-y-12">
              {roadmapItems.map((quarter, qIndex) => {
                const badge = getStatusBadge(quarter.status);
                
                return (
                  <div key={qIndex} className="relative">
                    {/* Quarter marker */}
                    <div className="flex items-center justify-center mb-8">
                      <div className="bg-background border-2 border-primary px-6 py-3 rounded-full shadow-lg">
                        <span className="font-bold text-lg">{quarter.quarter}</span>
                        <span className={`ml-3 text-sm px-3 py-1 rounded-full ${badge.bg}`}>
                          {badge.text}
                        </span>
                      </div>
                    </div>

                    {/* Items grid */}
                    <div className="grid md:grid-cols-3 gap-6">
                      {quarter.items.map((item, iIndex) => {
                        const Icon = item.icon;
                        
                        return (
                          <div
                            key={iIndex}
                            className="bg-card p-6 rounded-xl border border-border hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                          >
                            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${
                              quarter.status === 'completed' ? 'bg-success/10' :
                              quarter.status === 'in-progress' ? 'bg-primary/10' :
                              'bg-muted'
                            }`}>
                              <Icon className={`h-6 w-6 ${getStatusColor(quarter.status)}`} />
                            </div>

                            <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              {item.description}
                            </p>

                            {item.progress !== undefined && (
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Прогресс</span>
                                  <span className="font-semibold text-primary">{item.progress}%</span>
                                </div>
                                <Progress value={item.progress} className="h-2" />
                              </div>
                            )}

                            {quarter.status === 'in-progress' && (
                              <Button variant="outline" size="sm" className="w-full mt-4">
                                <Bell className="w-4 h-4 mr-2" />
                                Напомнить о релизе
                              </Button>
                            )}

                            {quarter.status === 'planned' && (
                              <div className="mt-4 text-center">
                                <button className="text-sm text-primary hover:underline font-semibold">
                                  👍 Хочу эту фичу! (243)
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-center mt-12 p-8 bg-card rounded-xl border border-border">
            <h3 className="text-xl font-bold mb-4">Есть идея для новой функции?</h3>
            <p className="text-muted-foreground mb-6">
              Расскажите нам, что бы вы хотели видеть в Академиусе
            </p>
            <Button size="lg" variant="outline">
              Предложить функцию
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
