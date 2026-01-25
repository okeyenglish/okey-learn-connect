import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Smartphone, 
  Share, 
  Plus, 
  MoreVertical, 
  Download,
  CheckCircle2,
  ArrowDown,
  Monitor
} from "lucide-react";

type DeviceType = 'ios' | 'android' | 'desktop' | 'unknown';

interface PWAInstallInstructionsProps {
  onSkip?: () => void;
  showSkip?: boolean;
  title?: string;
  description?: string;
}

export const PWAInstallInstructions = ({ 
  onSkip, 
  showSkip = true,
  title = "Установите приложение",
  description = "Для удобной работы установите приложение на ваш телефон"
}: PWAInstallInstructionsProps) => {
  const [deviceType, setDeviceType] = useState<DeviceType>('unknown');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setDeviceType('ios');
    } else if (/android/.test(userAgent)) {
      setDeviceType('android');
    } else {
      setDeviceType('desktop');
    }

    // Check if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  // Already installed
  if (isInstalled) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Приложение уже установлено!</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Smartphone className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* iOS Instructions */}
        {deviceType === 'ios' && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-4">
              <p className="text-sm font-medium text-center mb-3">
                Инструкция для iPhone/iPad:
              </p>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  1
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm">
                    Нажмите кнопку <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-background rounded border text-xs font-medium">
                      <Share className="h-3 w-3" /> Поделиться
                    </span> внизу экрана Safari
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  2
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm">
                    Прокрутите вниз и нажмите <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-background rounded border text-xs font-medium">
                      <Plus className="h-3 w-3" /> На экран «Домой»
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  3
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm">
                    Нажмите <span className="font-medium">«Добавить»</span> в правом верхнем углу
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ArrowDown className="h-4 w-4 animate-bounce" />
              <span>Кнопка "Поделиться" находится внизу Safari</span>
            </div>
          </div>
        )}

        {/* Android Instructions */}
        {deviceType === 'android' && (
          <div className="space-y-4">
            {deferredPrompt ? (
              // Native install prompt available
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Нажмите кнопку ниже для быстрой установки
                </p>
                <Button onClick={handleInstallClick} className="gap-2">
                  <Download className="h-4 w-4" />
                  Установить приложение
                </Button>
              </div>
            ) : (
              // Manual instructions
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <p className="text-sm font-medium text-center mb-3">
                  Инструкция для Android:
                </p>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                    1
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm">
                      Нажмите <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-background rounded border text-xs font-medium">
                        <MoreVertical className="h-3 w-3" /> меню
                      </span> (три точки) в правом верхнем углу браузера
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                    2
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm">
                      Выберите <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-background rounded border text-xs font-medium">
                        <Download className="h-3 w-3" /> Установить приложение
                      </span> или «Добавить на главный экран»
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                    3
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm">
                      Подтвердите установку нажав <span className="font-medium">«Установить»</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Desktop Instructions */}
        {deviceType === 'desktop' && (
          <div className="space-y-4">
            {deferredPrompt ? (
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Нажмите кнопку ниже для установки приложения
                </p>
                <Button onClick={handleInstallClick} className="gap-2">
                  <Download className="h-4 w-4" />
                  Установить приложение
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3 text-center">
                  <Monitor className="h-8 w-8 text-muted-foreground mx-auto" />
                </div>
                <p className="text-sm text-muted-foreground text-center mt-3">
                  Для работы на компьютере просто добавьте эту страницу в закладки браузера. 
                  Для мобильного — откройте ссылку на телефоне.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Unknown device */}
        {deviceType === 'unknown' && (
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              Откройте эту страницу в браузере Safari (iPhone) или Chrome (Android) 
              для установки приложения на телефон.
            </p>
          </div>
        )}

        {/* Skip button */}
        {showSkip && onSkip && (
          <div className="pt-2 text-center">
            <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
              Пропустить, установлю позже
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
