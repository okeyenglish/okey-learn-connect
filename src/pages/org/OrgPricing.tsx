import { useOutletContext } from 'react-router-dom';
import { PublicOrganization } from '@/hooks/useOrganizationPublic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Star } from 'lucide-react';

interface OrgContext {
  org: PublicOrganization;
}

const PRICING_PLANS = [
  {
    id: 1,
    name: 'Групповые занятия',
    description: 'Идеально для социального обучения',
    price: 'от 4 000 ₽',
    period: 'в месяц',
    features: [
      '8 занятий в месяц',
      'Группы 6-8 человек',
      'Материалы включены',
      'Регулярная обратная связь',
    ],
    popular: false,
  },
  {
    id: 2,
    name: 'Мини-группы',
    description: 'Больше внимания каждому ученику',
    price: 'от 6 000 ₽',
    period: 'в месяц',
    features: [
      '8 занятий в месяц',
      'Группы 3-4 человека',
      'Материалы включены',
      'Индивидуальный подход',
      'Гибкое расписание',
    ],
    popular: true,
  },
  {
    id: 3,
    name: 'Индивидуальные',
    description: 'Максимальная эффективность',
    price: 'от 1 500 ₽',
    period: 'за занятие',
    features: [
      'Индивидуальный график',
      'Персональная программа',
      'Материалы включены',
      'Максимальный прогресс',
      'Онлайн или офлайн',
    ],
    popular: false,
  },
];

export const OrgPricing = () => {
  const { org } = useOutletContext<OrgContext>();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-4">Стоимость обучения</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Выберите формат обучения, который подходит именно вам
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {PRICING_PLANS.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1">
                <Star className="h-3 w-3" />
                Популярный выбор
              </Badge>
            )}
            <CardHeader className="text-center">
              <CardTitle>{plan.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </CardHeader>
            <CardContent className="text-center">
              <div className="mb-6">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground text-sm ml-1">{plan.period}</span>
              </div>

              <ul className="space-y-3 text-left mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                variant={plan.popular ? "default" : "outline"} 
                className="w-full"
              >
                Записаться
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-muted-foreground mb-4">
          Первое пробное занятие — бесплатно!
        </p>
        <Button size="lg">
          Записаться на пробный урок
        </Button>
      </div>
    </div>
  );
};

export default OrgPricing;
