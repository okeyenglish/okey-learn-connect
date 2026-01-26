import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/typedClient";
import { getCurrentOrganizationId } from "@/lib/organizationHelpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { getErrorMessage } from '@/lib/errorUtils';
import { selfHostedPost } from '@/lib/selfHostedApi';

const MAIN_PAGES = [
  { url: '/', title: 'Главная страница' },
  { url: '/programs', title: 'Программы обучения' },
  { url: '/branches', title: 'Филиалы' },
  { url: '/about', title: 'О школе' },
  { url: '/teachers', title: 'Преподаватели' },
  { url: '/reviews', title: 'Отзывы' },
  { url: '/price', title: 'Цены' },
  { url: '/contacts', title: 'Контакты' },
];

export function SeoPages() {
  const { toast } = useToast();
  const [analyzingUrl, setAnalyzingUrl] = useState<string | null>(null);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: pages, refetch, isLoading } = useQuery({
    queryKey: ['seo-pages', session?.user?.id],
    enabled: !!session?.user,
    queryFn: async () => {
      const organizationId = await getCurrentOrganizationId();
      
      const { data, error } = await supabase
        .from('seo_pages')
        .select('*')
        .eq('organization_id', organizationId)
        .order('last_analyzed_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleAnalyzePage = async (url: string) => {
    setAnalyzingUrl(url);

    try {
      const organizationId = await getCurrentOrganizationId();

      const response = await selfHostedPost('seo-analyze-page', { url, organizationId });

      if (!response.success) throw new Error(response.error);

      toast({
        title: "Анализ завершен",
        description: `Страница ${url} проанализирована`,
      });

      refetch();
    } catch (error: unknown) {
      console.error('Error analyzing page:', error);
      toast({
        title: "Ошибка анализа",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setAnalyzingUrl(null);
    }
  };

  const getPageAnalysis = (url: string) => {
    return pages?.find(p => p.url === url);
  };

  type AnalysisData = {
    target_keywords?: string[];
    current_issues?: string[];
    recommendations?: {
      title?: string;
      h1?: string;
      meta_description?: string;
      content_structure?: string[];
      internal_links?: string[];
      additional_sections?: string[];
    };
    priority?: 'high' | 'medium' | 'low';
  };

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null;
    
    const variants: Record<string, "destructive" | "default" | "secondary"> = {
      high: "destructive",
      medium: "default",
      low: "secondary",
    };

    const labels: Record<string, string> = {
      high: "Высокий приоритет",
      medium: "Средний приоритет",
      low: "Низкий приоритет",
    };

    return <Badge variant={variants[priority]}>{labels[priority]}</Badge>;
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">SEO оптимизация страниц</h2>
        <p className="text-muted-foreground">
          Анализ и оптимизация основных страниц сайта для продвижения по ключевым запросам
        </p>
      </div>

      <div className="grid gap-4">
        {MAIN_PAGES.map((page) => {
          const analysis = getPageAnalysis(page.url);
          const analysisData = analysis?.analysis as AnalysisData | undefined;
          const isAnalyzing = analyzingUrl === page.url;

          return (
            <Card key={page.url}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {page.title}
                      <a 
                        href={page.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </CardTitle>
                    <CardDescription>{page.url}</CardDescription>
                  </div>
                  {analysisData?.priority && getPriorityBadge(analysisData.priority)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis ? (
                  <>
                    {analysisData?.target_keywords && (
                      <div>
                        <h4 className="font-semibold mb-2">Целевые запросы:</h4>
                        <div className="flex flex-wrap gap-2">
                          {analysisData.target_keywords.map((kw: string, i: number) => (
                            <Badge key={i} variant="outline">{kw}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysisData?.current_issues && (
                      <div>
                        <h4 className="font-semibold mb-2">Текущие проблемы:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          {analysisData.current_issues.map((issue: string, i: number) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysisData?.recommendations && (
                      <div>
                        <h4 className="font-semibold mb-2">Рекомендации:</h4>
                        <div className="space-y-2 text-sm">
                          {analysisData.recommendations.title && (
                            <div>
                              <span className="font-medium">Title:</span> {analysisData.recommendations.title}
                            </div>
                          )}
                          {analysisData.recommendations.h1 && (
                            <div>
                              <span className="font-medium">H1:</span> {analysisData.recommendations.h1}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {analysis.last_analyzed_at && (
                      <p className="text-xs text-muted-foreground">
                        Последний анализ: {new Date(analysis.last_analyzed_at).toLocaleString('ru-RU')}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">Страница еще не анализировалась</p>
                )}

                <Button
                  onClick={() => handleAnalyzePage(page.url)}
                  disabled={isAnalyzing}
                  size="sm"
                  variant="outline"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Анализ...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {analysis ? 'Обновить анализ' : 'Анализировать'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
