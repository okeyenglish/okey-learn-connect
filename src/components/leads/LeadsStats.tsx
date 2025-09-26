import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { useLeadsStats } from '@/hooks/useLeads';

export function LeadsStats() {
  const { stats, isLoading } = useLeadsStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                <div className="h-40 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const chartData = stats.map(stat => ({
    name: stat.name,
    count: stat.count,
    fill: stat.color
  }));

  const totalLeads = stats.reduce((sum, stat) => sum + stat.count, 0);
  const successfulLeads = stats.filter(s => s.is_success).reduce((sum, s) => sum + s.count, 0);
  const failedLeads = stats.filter(s => s.is_failure).reduce((sum, s) => sum + s.count, 0);
  const activeLeads = totalLeads - successfulLeads - failedLeads;

  const conversionRate = totalLeads > 0 ? Math.round((successfulLeads / totalLeads) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Основные метрики */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Общая конверсия</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {successfulLeads} из {totalLeads} лидов
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Активные лиды</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeLeads}</div>
            <p className="text-xs text-muted-foreground">
              В работе
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Успешные</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{successfulLeads}</div>
            <p className="text-xs text-muted-foreground">
              Конвертированы
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Неуспешные</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedLeads}</div>
            <p className="text-xs text-muted-foreground">
              Отклонены
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Столбчатая диаграмма */}
        <Card>
          <CardHeader>
            <CardTitle>Распределение по статусам</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Круговая диаграмма */}
        <Card>
          <CardHeader>
            <CardTitle>Структура лидов</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Детальная таблица */}
      <Card>
        <CardHeader>
          <CardTitle>Детальная статистика</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Статус</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Количество</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Процент</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Тип</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.map((stat) => (
                  <tr key={stat.name}>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stat.color }}
                        />
                        <span>{stat.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {stat.count}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {totalLeads > 0 ? Math.round((stat.count / totalLeads) * 100) : 0}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      {stat.is_success ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Успешный
                        </span>
                      ) : stat.is_failure ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Неуспешный
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          В работе
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}