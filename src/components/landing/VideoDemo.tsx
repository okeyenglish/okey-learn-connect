import { Play, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const timeline = [
  { time: '0:15', label: 'CRM и работа с лидами' },
  { time: '0:45', label: 'Умное расписание' },
  { time: '1:20', label: 'Финансы и зарплаты' },
  { time: '1:50', label: 'Мобильное приложение' }
];

export default function VideoDemo() {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    setIsPlaying(true);
    // В реальности здесь будет логика запуска видео
  };

  return (
    <section className="py-24 bg-gradient-to-b from-primary/5 to-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Посмотрите, как работает Академиус
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            За 2 минуты вы увидите все ключевые возможности платформы
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Video Container */}
          <div className="relative rounded-2xl overflow-hidden shadow-elevated bg-gradient-to-br from-primary/20 to-primary/5 aspect-video mb-8">
            {!isPlaying ? (
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Thumbnail */}
                <div className="absolute inset-0">
                  <img
                    src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&h=675&fit=crop"
                    alt="Превью демо-видео платформы Академиус - интерфейс CRM системы для школ"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>

                {/* Play Button */}
                <button
                  onClick={handlePlay}
                  className="relative z-10 group"
                  aria-label="Воспроизвести видео"
                >
                  <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-75" />
                  <div className="relative bg-primary hover:bg-primary-hover text-white rounded-full p-8 transition-all duration-300 group-hover:scale-110 shadow-elevated">
                    <Play className="w-12 h-12" fill="currentColor" />
                  </div>
                </button>

                {/* Duration Badge */}
                <div className="absolute bottom-6 left-6 bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  2:10
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {/* В реальности здесь будет YouTube embed или video player */}
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                  title="Академиус Demo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {timeline.map((item, index) => (
              <div
                key={index}
                className="bg-card rounded-xl p-4 border border-border hover:border-primary/50 transition-all hover:shadow-md cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 text-primary rounded-lg px-3 py-1 text-sm font-bold group-hover:bg-primary group-hover:text-white transition-colors">
                    {item.time}
                  </div>
                  <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors flex-1">
                    {item.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button size="lg" variant="hero" className="gap-2">
              Хочу такую же систему
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Бесплатная демонстрация занимает 30 минут
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
