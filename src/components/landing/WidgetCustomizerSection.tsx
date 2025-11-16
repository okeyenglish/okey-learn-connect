import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Image, Layout, Code } from 'lucide-react';
import ScrollReveal from '@/components/effects/ScrollReveal';

export const WidgetCustomizerSection = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [layout, setLayout] = useState<'compact' | 'full'>('full');
  const [showLogo, setShowLogo] = useState(true);

  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Виджет онлайн-записи для вашего сайта
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Настройте внешний вид под свой бренд за минуту. Встраивается одной строкой кода.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid lg:grid-cols-2 gap-12 items-start max-w-7xl mx-auto">
          {/* Настройки */}
          <ScrollReveal delay={0.1}>
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Palette className="w-5 h-5 text-primary" />
                    Настройки виджета
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Тема</Label>
                      <Select value={theme} onValueChange={(v) => setTheme(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Светлая</SelectItem>
                          <SelectItem value="dark">Тёмная</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Основной цвет</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-20 h-10"
                        />
                        <Input
                          type="text"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          placeholder="#6366f1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Макет</Label>
                      <Select value={layout} onValueChange={(v) => setLayout(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Полный</SelectItem>
                          <SelectItem value="compact">Компактный</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={showLogo}
                        onChange={(e) => setShowLogo(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <Label>Показывать логотип школы</Label>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Code className="w-4 h-4" />
                    Код для встраивания
                  </div>
                  <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
                    {`<script src="https://academius.app/widget.js"></script>
<div data-academius-widget 
     data-theme="${theme}"
     data-color="${primaryColor}"
     data-layout="${layout}">
</div>`}
                  </div>
                  <Button className="w-full">
                    Скопировать код
                  </Button>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* Превью */}
          <ScrollReveal delay={0.2}>
            <div className="sticky top-24">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-2xl blur-xl" />
                <Card className={`relative ${theme === 'dark' ? 'bg-gray-900' : 'bg-background'}`}>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {showLogo && (
                        <div className="flex items-center gap-3 pb-4 border-b">
                          <div 
                            className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: primaryColor }}
                          >
                            Л
                          </div>
                          <div>
                            <div className={`font-semibold ${theme === 'dark' ? 'text-white' : ''}`}>
                              Школа "Лингва"
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Английский язык
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : ''}`}>
                          Запись на занятие
                        </h3>
                        
                        <div className="space-y-2">
                          <Label className={theme === 'dark' ? 'text-gray-300' : ''}>
                            Выберите направление
                          </Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Английский язык" />
                            </SelectTrigger>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className={theme === 'dark' ? 'text-gray-300' : ''}>
                            Преподаватель
                          </Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Иванова Мария" />
                            </SelectTrigger>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className={theme === 'dark' ? 'text-gray-300' : ''}>
                            Дата и время
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input type="date" />
                            <Input type="time" value="14:00" />
                          </div>
                        </div>

                        <Button 
                          className="w-full mt-4"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Записаться
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={0.3}>
          <div className="mt-16 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-6 text-center">
                <Layout className="w-10 h-10 text-primary mx-auto mb-3" />
                <h4 className="font-semibold mb-2">Адаптивный</h4>
                <p className="text-sm text-muted-foreground">
                  Отлично выглядит на всех устройствах
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Palette className="w-10 h-10 text-primary mx-auto mb-3" />
                <h4 className="font-semibold mb-2">Брендированный</h4>
                <p className="text-sm text-muted-foreground">
                  Полная кастомизация под ваш стиль
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Code className="w-10 h-10 text-primary mx-auto mb-3" />
                <h4 className="font-semibold mb-2">Простая установка</h4>
                <p className="text-sm text-muted-foreground">
                  Одна строка кода для интеграции
                </p>
              </CardContent>
            </Card>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
