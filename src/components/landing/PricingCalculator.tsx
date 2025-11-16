import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function PricingCalculator() {
  const [students, setStudents] = useState([100]);
  const [isYearly, setIsYearly] = useState(false);

  const calculatePrice = (studentCount: number) => {
    if (studentCount <= 50) return 5990;
    if (studentCount <= 200) return 14990;
    if (studentCount <= 500) return 29990;
    return 49990;
  };

  const getTier = (studentCount: number) => {
    if (studentCount <= 50) return 'Старт';
    if (studentCount <= 200) return 'Бизнес';
    if (studentCount <= 500) return 'Профессионал';
    return 'Enterprise';
  };

  const calculateSavings = (studentCount: number) => {
    // Экономия vs Excel + CRM + Zoom
    const excelCost = 500; // Excel управление
    const crmCost = 3000; // CRM система
    const zoomCost = 2000; // Zoom лицензии
    const manualWork = 5000; // Ручная работа

    const totalOldWay = excelCost + crmCost + zoomCost + manualWork;
    const ourPrice = calculatePrice(studentCount);
    
    return totalOldWay - ourPrice;
  };

  const monthlyPrice = calculatePrice(students[0]);
  const yearlyPrice = monthlyPrice * 12;
  const yearlyDiscount = Math.round(yearlyPrice * 0.2);
  const finalYearlyPrice = yearlyPrice - yearlyDiscount;
  const savings = calculateSavings(students[0]);

  return (
    <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-8 rounded-2xl border border-primary/20 shadow-xl">
      <h3 className="text-2xl font-bold mb-6 text-center">
        Рассчитайте стоимость для вашей школы
      </h3>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-4">
            <Label className="text-base font-semibold">Количество учеников</Label>
            <span className="text-2xl font-bold text-primary">{students[0]}</span>
          </div>
          <Slider
            value={students}
            onValueChange={setStudents}
            min={10}
            max={1000}
            step={10}
            className="mb-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>10</span>
            <span>500</span>
            <span>1000+</span>
          </div>
        </div>

        <div className="flex items-center justify-between bg-background/50 p-4 rounded-lg">
          <Label htmlFor="yearly-toggle" className="font-medium">
            Ежегодная оплата
          </Label>
          <div className="flex items-center gap-3">
            <span className="text-sm text-primary font-semibold">Скидка 20%</span>
            <Switch
              id="yearly-toggle"
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
          </div>
        </div>

        <div className="bg-background p-6 rounded-xl space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Ваш тариф:</span>
            <span className="text-xl font-bold text-primary">{getTier(students[0])}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Стоимость:</span>
            <div className="text-right">
              {isYearly && (
                <div className="text-sm text-muted-foreground line-through">
                  {yearlyPrice.toLocaleString('ru-RU')}₽/год
                </div>
              )}
              <div className="text-3xl font-bold">
                {isYearly 
                  ? `${finalYearlyPrice.toLocaleString('ru-RU')}₽/год`
                  : `${monthlyPrice.toLocaleString('ru-RU')}₽/мес`
                }
              </div>
            </div>
          </div>

          {isYearly && (
            <div className="text-center text-sm text-success font-semibold bg-success/10 py-2 rounded">
              Экономия {yearlyDiscount.toLocaleString('ru-RU')}₽ в год!
            </div>
          )}

          <div className="border-t border-border pt-4">
            <div className="text-sm text-muted-foreground mb-2">
              Экономия vs Excel + CRM + Zoom:
            </div>
            <div className="text-2xl font-bold text-success">
              +{savings.toLocaleString('ru-RU')}₽/месяц
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Окупаемость через 2 недели
            </div>
          </div>
        </div>

        <div className="text-center space-y-2 text-sm text-muted-foreground">
          <div>✓ 14 дней бесплатно, карта не нужна</div>
          <div>✓ Отменить можно в любой момент</div>
          <div>✓ 1,200+ школ уже экономят</div>
        </div>
      </div>
    </div>
  );
}
