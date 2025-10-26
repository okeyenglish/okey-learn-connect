import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, FileText, Target, BarChart3 } from "lucide-react";

interface LiveStatsPanelProps {
  stats: {
    clustersCount: number;
    ideasCount: number;
    docsCount: number;
    keywordsCount: number;
  } | undefined;
  gscStats: {
    avgPosition: number;
    top10Count: number;
    top20Count: number;
    totalClicks: number;
    totalQueries: number;
  } | undefined;
}

export function LiveStatsPanel({ stats, gscStats }: LiveStatsPanelProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Сбор данных</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StatItem
            icon={<Target className="h-4 w-4" />}
            label="Запросов обработано"
            value={stats?.keywordsCount || 0}
          />
          <StatItem
            icon={<TrendingUp className="h-4 w-4" />}
            label="Кластеров создано"
            value={stats?.clustersCount || 0}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Контент</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StatItem
            icon={<FileText className="h-4 w-4" />}
            label="Идей сгенерировано"
            value={stats?.ideasCount || 0}
          />
          <StatItem
            icon={<FileText className="h-4 w-4" />}
            label="Статей создано"
            value={stats?.docsCount || 0}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Позиции</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StatItem
            icon={<BarChart3 className="h-4 w-4" />}
            label="Средняя позиция"
            value={gscStats?.avgPosition.toFixed(1) || '-'}
          />
          <StatItem
            icon={<Badge variant="default" className="h-4 w-4 p-0 flex items-center justify-center text-[10px]">10</Badge>}
            label="Запросов в топ-10"
            value={gscStats?.top10Count || 0}
          />
          <StatItem
            icon={<Badge variant="secondary" className="h-4 w-4 p-0 flex items-center justify-center text-[10px]">20</Badge>}
            label="Запросов в топ-20"
            value={gscStats?.top20Count || 0}
          />
          <StatItem
            icon={<TrendingUp className="h-4 w-4" />}
            label="Кликов за период"
            value={gscStats?.totalClicks || 0}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
