import { Chrome, MoreVertical, Download, Check } from 'lucide-react';
import { InstallStep } from './InstallStep';

export function AndroidInstructions() {
  const steps = [
    {
      step: 1,
      title: 'Откройте Chrome',
      description: 'Откройте сайт в браузере Google Chrome — он лучше всего поддерживает установку приложений.',
      icon: <Chrome className="w-6 h-6" />,
      highlight: 'Google Chrome'
    },
    {
      step: 2,
      title: 'Откройте меню',
      description: 'Нажмите на три точки (⋮) в правом верхнем углу экрана, чтобы открыть меню браузера.',
      icon: <MoreVertical className="w-6 h-6" />,
      highlight: 'Три точки ⋮'
    },
    {
      step: 3,
      title: 'Выберите "Установить приложение"',
      description: 'В меню найдите пункт "Установить приложение" или "Добавить на главный экран".',
      icon: <Download className="w-6 h-6" />,
      highlight: 'Установить приложение'
    },
    {
      step: 4,
      title: 'Подтвердите установку',
      description: 'Нажмите "Установить" в появившемся окне. Приложение появится среди ваших приложений!',
      icon: <Check className="w-6 h-6" />,
      highlight: 'Установить'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Chrome illustration */}
      <div className="relative bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/30 dark:to-emerald-900/20 rounded-2xl p-6 mb-6 overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 via-yellow-500 to-green-500 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-blue-500" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Google Chrome</h3>
              <p className="text-sm text-muted-foreground">Рекомендуемый браузер</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Samsung Internet и другие браузеры тоже поддерживают установку, но интерфейс может отличаться.
          </p>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-green-200/30 dark:bg-green-500/10" />
        <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-emerald-300/20 dark:bg-emerald-400/10" />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((stepData) => (
          <InstallStep key={stepData.step} {...stepData} />
        ))}
      </div>

      {/* Visual guide */}
      <div className="mt-6 p-4 bg-muted/50 rounded-xl">
        <h4 className="font-medium text-foreground mb-3 text-center">Где найти меню Chrome</h4>
        <div className="flex justify-center">
          <div className="relative w-64 h-32 bg-background rounded-xl border-2 border-border shadow-lg">
            {/* Mock Chrome top bar */}
            <div className="absolute top-0 left-0 right-0 h-12 bg-muted/80 rounded-t-xl flex items-center justify-between px-3">
              {/* Address bar */}
              <div className="flex-1 h-7 bg-background rounded-full flex items-center px-3 mr-2">
                <span className="text-xs text-muted-foreground truncate">newacademcrm.lovable.app</span>
              </div>
              {/* Menu button highlighted */}
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center animate-pulse">
                  <MoreVertical className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="absolute -bottom-8 right-0 whitespace-nowrap text-xs font-medium text-primary">
                  Здесь! →
                </div>
              </div>
            </div>
            {/* Content area */}
            <div className="absolute bottom-3 left-3 right-3 h-12 flex gap-2">
              <div className="flex-1 h-full bg-muted rounded-lg" />
              <div className="flex-1 h-full bg-muted rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Auto-install prompt note */}
      <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl">
        <p className="text-sm text-foreground">
          <strong>💡 Подсказка:</strong> Chrome может автоматически предложить установить приложение — 
          просто нажмите "Установить" на всплывающем баннере внизу экрана.
        </p>
      </div>
    </div>
  );
}
