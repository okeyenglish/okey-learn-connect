import { Sparkles, Users, Clock, BarChart3, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ImprovementButtonsProps {
  onImprove: (request: string) => void;
  disabled?: boolean;
}

const improvements = [
  {
    icon: Users,
    label: 'Режим для двоих',
    request: 'Добавь режим игры для двух игроков, где они соревнуются между собой'
  },
  {
    icon: Clock,
    label: 'Таймер',
    request: 'Добавь таймер с обратным отсчетом и бонусами за быструю игру'
  },
  {
    icon: BarChart3,
    label: 'Статистика',
    request: 'Добавь детальную статистику результатов с графиками прогресса'
  },
  {
    icon: Sparkles,
    label: 'Подсказки',
    request: 'Добавь систему подсказок с ограниченным количеством использований'
  }
];

export const ImprovementButtons = ({ onImprove, disabled }: ImprovementButtonsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Улучшить приложение
        </CardTitle>
        <CardDescription>
          Выберите готовый вариант улучшения или опишите свой
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {improvements.map((imp) => (
            <Button
              key={imp.label}
              variant="outline"
              onClick={() => onImprove(imp.request)}
              disabled={disabled}
              className="h-auto py-3 justify-start"
            >
              <imp.icon className="h-4 w-4 mr-2" />
              {imp.label}
            </Button>
          ))}
        </div>
        
        <div className="relative mt-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              или
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            const customRequest = prompt('Опишите желаемое улучшение:');
            if (customRequest) onImprove(customRequest);
          }}
          disabled={disabled}
          className="w-full"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Свой запрос
        </Button>
      </CardContent>
    </Card>
  );
};
