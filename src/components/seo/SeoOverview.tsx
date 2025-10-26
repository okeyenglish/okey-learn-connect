import { useSeoOverview } from "@/hooks/useSeoOverview";
import { KeywordCoreWidget } from "./dashboard/KeywordCoreWidget";
import { LiveStatsPanel } from "./dashboard/LiveStatsPanel";
import { PageKeywordsTable } from "./dashboard/PageKeywordsTable";
import { DetailedKeywordsTable } from "./dashboard/DetailedKeywordsTable";

export function SeoOverview() {
  const { topClusters, keywords, pages, gscStats, stats, isLoading } = useSeoOverview();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">SEO Dashboard</h2>
        <p className="text-muted-foreground">
          Центр управления продвижением: ядро запросов, статистика и прогресс работы
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <KeywordCoreWidget clusters={topClusters} isLoading={isLoading} />
          <PageKeywordsTable pages={pages} keywords={keywords} isLoading={isLoading} />
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <LiveStatsPanel stats={stats} gscStats={gscStats} />
        </div>
      </div>

      <DetailedKeywordsTable keywords={keywords} isLoading={isLoading} />
    </div>
  );
}
