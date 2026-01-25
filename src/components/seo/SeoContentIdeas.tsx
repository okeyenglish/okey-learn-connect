import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/typedClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileEdit, FileText, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCurrentOrganizationId } from "@/lib/organizationHelpers";
import { getErrorMessage } from '@/lib/errorUtils';
import { useWordstatData } from "@/hooks/useWordstatData";
import { WordstatStats } from "./WordstatStats";

const SeoContentIdeas = () => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const { data: ideas, isLoading, refetch } = useQuery({
    queryKey: ["seo-ideas"],
    queryFn: async () => {
      const orgId = await getCurrentOrganizationId();
      const { data, error } = await supabase
        .from("content_ideas")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleCreateBrief = async (ideaId: string) => {
    try {
      setIsProcessing(ideaId);
      const orgId = await getCurrentOrganizationId();

      const { data, error } = await supabase.functions.invoke("seo-create-brief", {
        body: { ideaId, organizationId: orgId },
      });

      if (error) throw error;

      toast({
        title: "Бриф создан",
        description: "Контент-бриф успешно сгенерирован",
      });

      refetch();
    } catch (error: unknown) {
      toast({
        title: "Ошибка",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleGenerateContent = async (ideaId: string) => {
    try {
      setIsProcessing(ideaId);
      const orgId = await getCurrentOrganizationId();

      const { data, error } = await supabase.functions.invoke("seo-generate-content", {
        body: { ideaId, organizationId: orgId },
      });

      if (error) throw error;

      toast({
        title: "Контент сгенерирован",
        description: `Статья создана, слов: ${data.content?.word_count || 0}`,
      });

      refetch();
    } catch (error: unknown) {
      toast({
        title: "Ошибка",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: "secondary", label: "Новая" },
      brief_ready: { variant: "outline", label: "Бриф готов" },
      content_ready: { variant: "default", label: "Контент готов" },
      published: { variant: "default", label: "Опубликована" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return <div className="text-center py-8">Загрузка идей...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Идеи контента</h2>
        <p className="text-muted-foreground">
          Сгенерированные идеи статей на основе кластеров запросов
        </p>
      </div>

      {!ideas || ideas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Нет идей контента. Сгенерируйте идеи из кластеров запросов.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea) => {
            const IdeaCard = () => {
              const mainKeyword = idea.h1 || idea.title;
              const { data: wordstatData, isLoading: isLoadingWordstat } = useWordstatData(mainKeyword);
              
              return (
                <Card key={idea.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg">{idea.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {idea.h1}
                        </CardDescription>
                        {mainKeyword && (
                          <div className="mt-2">
                            <WordstatStats 
                              data={wordstatData} 
                              isLoading={isLoadingWordstat}
                              compact
                            />
                          </div>
                        )}
                      </div>
                      {getStatusBadge(idea.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {idea.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCreateBrief(idea.id)}
                          disabled={isProcessing === idea.id}
                        >
                          <FileEdit className="h-4 w-4 mr-2" />
                          {isProcessing === idea.id
                            ? "Создание..."
                            : "Создать бриф"}
                        </Button>
                      )}
                      {idea.status === "brief_ready" && (
                        <Button
                          size="sm"
                          onClick={() => handleGenerateContent(idea.id)}
                          disabled={isProcessing === idea.id}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          {isProcessing === idea.id
                            ? "Генерация..."
                            : "Сгенерировать статью"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            };
            
            return <IdeaCard key={idea.id} />;
          })}
        </div>
      )}
    </div>
  );
};

export default SeoContentIdeas;
