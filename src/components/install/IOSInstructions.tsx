import { Share, Plus, Check, Compass } from 'lucide-react';
import { InstallStep } from './InstallStep';

export function IOSInstructions() {
  const steps = [
    {
      step: 1,
      title: 'Откройте Safari',
      description: 'Убедитесь, что вы открыли сайт именно в браузере Safari — это стандартный браузер на iPhone и iPad.',
      icon: <Compass className="w-6 h-6" />,
      highlight: 'Safari'
    },
    {
      step: 2,
      title: 'Нажмите "Поделиться"',
      description: 'Найдите кнопку "Поделиться" внизу экрана — это квадрат со стрелкой вверх.',
      icon: <Share className="w-6 h-6" />,
      highlight: 'Квадрат со стрелкой ↑'
    },
    {
      step: 3,
      title: 'Выберите "На экран Домой"',
      description: 'Прокрутите меню вниз и найдите пункт "На экран Домой" с иконкой плюса.',
      icon: <Plus className="w-6 h-6" />,
      highlight: 'На экран Домой'
    },
    {
      step: 4,
      title: 'Подтвердите добавление',
      description: 'Нажмите "Добавить" в правом верхнем углу. Готово! Иконка приложения появится на главном экране.',
      icon: <Check className="w-6 h-6" />,
      highlight: 'Добавить'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Safari illustration */}
      <div className="relative bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 rounded-2xl p-6 mb-6 overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
              <Compass className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Safari</h3>
              <p className="text-sm text-muted-foreground">Используйте только Safari</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Chrome и другие браузеры на iPhone не поддерживают установку приложений на главный экран.
          </p>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-blue-200/30 dark:bg-blue-500/10" />
        <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-blue-300/20 dark:bg-blue-400/10" />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((stepData) => (
          <InstallStep key={stepData.step} {...stepData} />
        ))}
      </div>

      {/* Visual guide */}
      <div className="mt-6 p-4 bg-muted/50 rounded-xl">
        <h4 className="font-medium text-foreground mb-3 text-center">Где найти кнопку "Поделиться"</h4>
        <div className="flex justify-center">
          <div className="relative w-64 h-32 bg-background rounded-xl border-2 border-border shadow-lg">
            {/* Mock iPhone bottom bar */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-muted/80 rounded-b-xl flex items-center justify-around px-4">
              <div className="w-6 h-6 rounded bg-muted-foreground/20" />
              <div className="w-6 h-6 rounded bg-muted-foreground/20" />
              {/* Share button highlighted */}
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center animate-pulse">
                  <Share className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-primary">
                  ← Здесь!
                </div>
              </div>
              <div className="w-6 h-6 rounded bg-muted-foreground/20" />
              <div className="w-6 h-6 rounded bg-muted-foreground/20" />
            </div>
            {/* Address bar */}
            <div className="absolute top-3 left-3 right-3 h-8 bg-muted rounded-lg flex items-center px-3">
              <span className="text-xs text-muted-foreground truncate">newacademcrm.lovable.app</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
