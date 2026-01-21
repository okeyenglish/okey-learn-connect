import { useState, useEffect } from 'react';
import { Smartphone, Zap, WifiOff, RefreshCw, HardDrive, Apple, Tablet } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IOSInstructions } from '@/components/install/IOSInstructions';
import { AndroidInstructions } from '@/components/install/AndroidInstructions';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

type DeviceType = 'ios' | 'android' | 'unknown';

function detectDevice(): DeviceType {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  }
  if (/android/.test(userAgent)) {
    return 'android';
  }
  return 'unknown';
}

const benefits = [
  {
    icon: Zap,
    title: 'Мгновенный доступ',
    description: 'Без загрузки из App Store или Play Market'
  },
  {
    icon: WifiOff,
    title: 'Работает офлайн',
    description: 'Базовые функции доступны без интернета'
  },
  {
    icon: RefreshCw,
    title: 'Авто-обновления',
    description: 'Всегда актуальная версия приложения'
  },
  {
    icon: HardDrive,
    title: 'Мало места',
    description: 'Занимает меньше памяти, чем обычные приложения'
  }
];

export default function Install() {
  const [detectedDevice, setDetectedDevice] = useState<DeviceType>('unknown');
  const [activeTab, setActiveTab] = useState<string>('ios');
  const navigate = useNavigate();

  useEffect(() => {
    const device = detectDevice();
    setDetectedDevice(device);
    if (device === 'android') {
      setActiveTab('android');
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <img 
              src="/pwa-192x192.png" 
              alt="O'KEY ENGLISH" 
              className="w-8 h-8 rounded-lg"
            />
            <span className="font-semibold text-foreground">O'KEY ENGLISH</span>
          </button>
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>
            Войти в CRM
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
        <div className="relative container mx-auto px-4 py-12 text-center">
          {/* App icon */}
          <div className="mb-6 inline-flex">
            <div className="relative">
              <img 
                src="/pwa-192x192.png" 
                alt="O'KEY ENGLISH App" 
                className="w-24 h-24 rounded-2xl shadow-xl"
              />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                <Smartphone className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Установите приложение
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Быстрый доступ к CRM, расписанию и урокам прямо с главного экрана вашего телефона
          </p>

          {/* Device detection badge */}
          {detectedDevice !== 'unknown' && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm text-primary font-medium">
              {detectedDevice === 'ios' ? (
                <>
                  <Apple className="w-4 h-4" />
                  <span>Мы определили, что у вас iPhone</span>
                </>
              ) : (
                <>
                  <Tablet className="w-4 h-4" />
                  <span>Мы определили, что у вас Android</span>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Instructions */}
      <section className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="ios" className="gap-2">
              <Apple className="w-4 h-4" />
              iPhone / iPad
            </TabsTrigger>
            <TabsTrigger value="android" className="gap-2">
              <Tablet className="w-4 h-4" />
              Android
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ios" className="mt-0">
            <IOSInstructions />
          </TabsContent>

          <TabsContent value="android" className="mt-0">
            <AndroidInstructions />
          </TabsContent>
        </Tabs>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center text-foreground mb-8">
          Преимущества PWA приложения
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {benefits.map((benefit) => (
            <div 
              key={benefit.title}
              className="p-4 bg-card rounded-xl border border-border text-center hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <benefit.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-sm mb-1">
                {benefit.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-12 border-t border-border">
        <h2 className="text-xl font-bold text-center text-foreground mb-6">
          Часто задаваемые вопросы
        </h2>
        <div className="max-w-xl mx-auto space-y-4">
          <div className="p-4 bg-muted/50 rounded-xl">
            <h3 className="font-medium text-foreground mb-2">Что такое PWA?</h3>
            <p className="text-sm text-muted-foreground">
              PWA (Progressive Web App) — это современная технология, которая позволяет использовать 
              веб-сайт как полноценное приложение на вашем телефоне без скачивания из магазина приложений.
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-xl">
            <h3 className="font-medium text-foreground mb-2">Это безопасно?</h3>
            <p className="text-sm text-muted-foreground">
              Да! PWA работает в защищённой среде браузера и не имеет доступа к вашим личным данным 
              без вашего разрешения. Все данные передаются по защищённому протоколу HTTPS.
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-xl">
            <h3 className="font-medium text-foreground mb-2">Как обновляется приложение?</h3>
            <p className="text-sm text-muted-foreground">
              Автоматически! При каждом запуске приложение проверяет наличие обновлений и загружает 
              их в фоновом режиме. Вам не нужно ничего делать.
            </p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="container mx-auto px-4 py-8 text-center">
        <Button onClick={() => navigate('/')} size="lg" className="gap-2">
          <Smartphone className="w-5 h-5" />
          Перейти в CRM
        </Button>
      </section>
    </div>
  );
}
