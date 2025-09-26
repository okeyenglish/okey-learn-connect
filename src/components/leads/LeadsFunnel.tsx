import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface FunnelStatsItem {
  name: string;
  color: string;
  is_success: boolean;
  is_failure: boolean;
  count: number;
}

interface LeadsFunnelProps {
  stats: FunnelStatsItem[];
}

export function LeadsFunnel({ stats }: LeadsFunnelProps) {
  const totalLeads = stats.reduce((sum, stat) => sum + stat.count, 0);
  
  // Сортируем статусы по логическому порядку воронки
  const sortedStats = [...stats].sort((a, b) => {
    const order = {
      'Новый': 1,
      'В работе': 2,
      'Записан на пробный': 3,
      'Отложен': 4,
      'Успешен': 5,
      'Неуспешен': 6
    };
    return (order[a.name as keyof typeof order] || 999) - (order[b.name as keyof typeof order] || 999);
  });

  const getConversionRate = (currentCount: number, previousCount: number) => {
    if (previousCount === 0) return 0;
    return Math.round((currentCount / previousCount) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего лидов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Конверсия в ученики</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalLeads > 0 
                ? Math.round((stats.find(s => s.is_success)?.count || 0) / totalLeads * 100)
                : 0
              }%
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Активных лидов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.filter(s => !s.is_success && !s.is_failure).reduce((sum, s) => sum + s.count, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Воронка */}
      <Card>
        <CardHeader>
          <CardTitle>Воронка продаж</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedStats.map((stat, index) => {
              const percentage = totalLeads > 0 ? Math.round((stat.count / totalLeads) * 100) : 0;
              const prevStat = index > 0 ? sortedStats[index - 1] : null;
              const conversionRate = prevStat ? getConversionRate(stat.count, prevStat.count) : 100;
              
              return (
                <div key={stat.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stat.color }}
                      />
                      <span className="font-medium">{stat.name}</span>
                      {index > 0 && (
                        <span className="text-sm text-muted-foreground">
                          ({conversionRate}% от предыдущего)
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{stat.count}</div>
                      <div className="text-sm text-muted-foreground">{percentage}%</div>
                    </div>
                  </div>
                  
                  <Progress 
                    value={percentage} 
                    className="h-2"
                    style={{
                      '--progress-background': stat.color,
                    } as React.CSSProperties}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Детальная аналитика */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Успешные лиды</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.filter(s => s.is_success).map(stat => (
                <div key={stat.name} className="flex justify-between items-center">
                  <span>{stat.name}</span>
                  <span className="font-bold text-green-600">{stat.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Неуспешные лиды</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.filter(s => s.is_failure).map(stat => (
                <div key={stat.name} className="flex justify-between items-center">
                  <span>{stat.name}</span>
                  <span className="font-bold text-red-600">{stat.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}