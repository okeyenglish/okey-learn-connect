import { useState, useEffect } from 'react';
import { Sparkles, Zap, Brain, TrendingUp, Clock, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AIShowcase = () => {
  const [typingText, setTypingText] = useState('');
  const [currentExample, setCurrentExample] = useState(0);
  const [counter, setCounter] = useState(0);

  const examples = [
    { prompt: "Создай план урока по английскому для группы А1", response: "Конечно! Создаю персонализированный план урока с учетом уровня группы..." },
    { prompt: "Проанализируй посещаемость за месяц", response: "Анализирую данные... Выявлено 3 ученика с низкой посещаемостью..." },
    { prompt: "Составь отчет для родителей", response: "Формирую детальный отчет с прогрессом ученика..." }
  ];

  useEffect(() => {
    const text = examples[currentExample].response;
    let index = 0;
    setTypingText('');

    const timer = setInterval(() => {
      if (index < text.length) {
        setTypingText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        setTimeout(() => {
          setCurrentExample((prev) => (prev + 1) % examples.length);
        }, 2000);
      }
    }, 30);

    return () => clearInterval(timer);
  }, [currentExample]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCounter(prev => (prev + 1) % 1000);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative py-32 overflow-hidden bg-gradient-to-b from-background via-background to-background/50">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-category-tech/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-category-tech/10 border border-category-tech/20 mb-6">
            <Sparkles className="w-4 h-4 text-category-tech" />
            <span className="text-sm font-medium text-category-tech">AI-Powered Platform</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-category-tech via-category-crm to-category-tech bg-clip-text text-transparent animate-gradient">
            Искусственный интеллект — ваш персональный ассистент
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Автоматизируйте рутину и сосредоточьтесь на преподавании. AI экономит до 15 часов в неделю
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start max-w-6xl mx-auto">
          {/* Interactive Chat Demo */}
          <div className="glass-card p-8 relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-category-tech/5 via-transparent to-category-crm/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-category-tech to-category-crm flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">AI Ассистент</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-muted-foreground">Онлайн</span>
                  </div>
                </div>
              </div>

              {/* User message */}
              <div className="mb-4 flex justify-end">
                <div className="bg-primary text-primary-foreground px-4 py-3 rounded-2xl rounded-tr-sm max-w-[80%]">
                  {examples[currentExample].prompt}
                </div>
              </div>

              {/* AI response with typing effect */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-category-tech to-category-crm flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="glass-card px-4 py-3 rounded-2xl rounded-tl-sm flex-1">
                  <p className="text-sm">{typingText}</p>
                  <span className="inline-block w-2 h-4 bg-category-tech ml-1 animate-pulse" />
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Zap className="w-4 h-4 text-category-tech" />
                  <span>Ответ сгенерирован за 0.{counter}с</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Stats & Features */}
          <div className="space-y-6">
            {/* Saved Time Counter */}
            <div className="glass-card p-6 relative overflow-hidden group hover:scale-105 transition-transform">
              <div className="absolute inset-0 bg-gradient-to-br from-category-tech/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-category-tech to-category-tech/50 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-3xl font-bold bg-gradient-to-r from-category-tech to-category-crm bg-clip-text text-transparent">
                    2,847
                  </div>
                  <p className="text-sm text-muted-foreground">часов сэкономлено сегодня</p>
                </div>
              </div>
            </div>

            {/* AI Requests */}
            <div className="glass-card p-6 relative overflow-hidden group hover:scale-105 transition-transform">
              <div className="absolute inset-0 bg-gradient-to-br from-category-crm/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-category-crm to-category-crm/50 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-3xl font-bold bg-gradient-to-r from-category-crm to-category-tech bg-clip-text text-transparent">
                    15,204
                  </div>
                  <p className="text-sm text-muted-foreground">AI-запросов за последний час</p>
                </div>
              </div>
            </div>

            {/* Accuracy */}
            <div className="glass-card p-6 relative overflow-hidden group hover:scale-105 transition-transform">
              <div className="absolute inset-0 bg-gradient-to-br from-category-education/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-category-education to-category-education/50 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-3xl font-bold bg-gradient-to-r from-category-education to-category-tech bg-clip-text text-transparent">
                    99.4%
                  </div>
                  <p className="text-sm text-muted-foreground">точность AI-рекомендаций</p>
                </div>
              </div>
            </div>

            <Button className="w-full bg-gradient-to-r from-category-tech to-category-crm hover:from-category-tech/90 hover:to-category-crm/90 text-white shadow-lg shadow-category-tech/25">
              <Sparkles className="w-4 h-4 mr-2" />
              Попробовать AI бесплатно
            </Button>
          </div>
        </div>

        {/* AI Features Grid */}
        <div className="grid md:grid-cols-4 gap-6 mt-16">
          {[
            { icon: Brain, title: "Умные планы уроков", desc: "Генерация за 30 секунд" },
            { icon: MessageSquare, title: "Авто-ответы родителям", desc: "24/7 коммуникация" },
            { icon: TrendingUp, title: "Прогноз успеваемости", desc: "Предиктивная аналитика" },
            { icon: Zap, title: "Автоматизация задач", desc: "Экономия 15+ часов" }
          ].map((feature, i) => (
            <div key={i} className="glass-card p-6 text-center group hover:scale-105 transition-transform">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-category-tech/20 to-category-crm/20 flex items-center justify-center mx-auto mb-4 group-hover:from-category-tech group-hover:to-category-crm transition-all">
                <feature.icon className="w-6 h-6 text-category-tech group-hover:text-white transition-colors" />
              </div>
              <h4 className="font-semibold mb-2">{feature.title}</h4>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AIShowcase;
