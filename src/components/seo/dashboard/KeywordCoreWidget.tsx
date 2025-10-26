import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users } from "lucide-react";
import { type ClusterWithKeywords } from "@/hooks/useSeoOverview";
import { useWordstatData } from "@/hooks/useWordstatData";
import { WordstatStats } from "../WordstatStats";

interface KeywordCoreWidgetProps {
  clusters: ClusterWithKeywords[] | undefined;
  isLoading: boolean;
}

export function KeywordCoreWidget({ clusters, isLoading }: KeywordCoreWidgetProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Ядро запросов
          </CardTitle>
          <CardDescription>Топ-5 главных кластеров по приоритету</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Загрузка...</p>
        </CardContent>
      </Card>
    );
  }

  if (!clusters || clusters.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Ядро запросов
          </CardTitle>
          <CardDescription>Топ-5 главных кластеров по приоритету</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Нет кластеров. Создайте их во вкладке "Кластеры"
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Ядро запросов
        </CardTitle>
        <CardDescription>Топ-5 главных кластеров по приоритету</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {clusters.map((cluster) => (
            <ClusterCard key={cluster.id} cluster={cluster} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ClusterCard({ cluster }: { cluster: ClusterWithKeywords }) {
  const { data: wordstatData, isLoading } = useWordstatData(cluster.head_term);

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-card hover:shadow-md transition-shadow">
      <div className="space-y-1">
        <h4 className="font-semibold text-sm line-clamp-2">{cluster.head_term}</h4>
        <p className="text-xs text-muted-foreground">{cluster.slug}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Приоритет:</span>
          <Badge variant={cluster.score && cluster.score > 70 ? 'default' : 'secondary'}>
            {cluster.score ? Math.round(cluster.score) : 0}
          </Badge>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          <span>{cluster.keywordsCount} запросов</span>
        </div>
      </div>

      <div className="pt-2 border-t">
        <WordstatStats data={wordstatData} isLoading={isLoading} compact />
      </div>
    </div>
  );
}
