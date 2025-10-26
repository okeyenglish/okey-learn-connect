import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Sparkles, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCurrentOrganizationId } from "@/lib/organizationHelpers";
import { AddClusterDialog } from "./AddClusterDialog";
import { useWordstatData } from "@/hooks/useWordstatData";
import { WordstatStats } from "./WordstatStats";
import { Separator } from "@/components/ui/separator";

const SeoKeywordClusters = () => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const { data: clusters, isLoading, refetch } = useQuery({
    queryKey: ["seo-clusters"],
    queryFn: async () => {
      const orgId = await getCurrentOrganizationId();
      const { data, error } = await supabase
        .from("kw_clusters")
        .select("*")
        .eq("organization_id", orgId)
        .order("score", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleGenerateIdeas = async (clusterId: string) => {
    try {
      setIsGenerating(clusterId);
      const orgId = await getCurrentOrganizationId();

      const { data, error } = await supabase.functions.invoke("seo-suggest-ideas", {
        body: { kwClusterId: clusterId, organizationId: orgId },
      });

      if (error) throw error;

      toast({
        title: "Идеи сгенерированы",
        description: `Создано ${data.ideas?.length || 0} идей контента`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Загрузка кластеров...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Кластеры запросов</h2>
          <p className="text-muted-foreground">
            Сгруппированные поисковые запросы для генерации контента
          </p>
        </div>
        <AddClusterDialog onClusterAdded={refetch} />
      </div>

      {!clusters || clusters.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Нет кластеров запросов. Импортируйте запросы из Яндекс.Вебмастер
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clusters.map((cluster) => {
            const ClusterCard = () => {
              const { data: wordstatData, isLoading: isLoadingWordstat } = useWordstatData(cluster.head_term);
              
              return (
                <Card key={cluster.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{cluster.head_term}</CardTitle>
                    <CardDescription>{cluster.slug}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Статус:</span>
                      <Badge variant="secondary">
                        {cluster.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Приоритет:</span>
                      <Badge
                        variant={
                          cluster.score && cluster.score > 70
                            ? "default"
                            : "secondary"
                        }
                      >
                        {cluster.score ? Math.round(cluster.score) : 0}
                      </Badge>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 font-medium">
                        Статистика Яндекс.Вордстат
                      </p>
                      <WordstatStats 
                        data={wordstatData} 
                        isLoading={isLoadingWordstat}
                      />
                    </div>
                    
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => handleGenerateIdeas(cluster.id)}
                      disabled={isGenerating === cluster.id}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {isGenerating === cluster.id
                        ? "Генерация..."
                        : "Сгенерировать идеи"}
                    </Button>
                  </CardContent>
                </Card>
              );
            };
            
            return <ClusterCard key={cluster.id} />;
          })}
        </div>
      )}
    </div>
  );
};

export default SeoKeywordClusters;
