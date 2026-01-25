import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ExternalLink } from "lucide-react";
import { type PageWithKeywords, type KeywordWithStats } from "@/hooks/useSeoOverview";
import { calculateOptimizationProgress, getPageStatus, getKeywordType, getKeywordTypeEmoji } from "@/lib/seo/keywordAnalyzer";

interface PageKeywordsTableProps {
  pages: PageWithKeywords[] | undefined;
  keywords: KeywordWithStats[] | undefined;
  isLoading: boolean;
}

export function PageKeywordsTable({ pages, keywords, isLoading }: PageKeywordsTableProps) {
  const enrichedPages = useMemo(() => {
    if (!pages || !keywords) return [];

    return pages.map(page => {
      const pageKeywords = keywords.filter(kw => 
        page.targetKeywords.some(tk => tk.toLowerCase() === kw.phrase.toLowerCase())
      );

      const avgFrequency = pageKeywords.length > 0
        ? pageKeywords.reduce((sum, kw) => sum + (kw.monthly_searches || 0), 0) / pageKeywords.length
        : 0;

      const narrowKeywords = pageKeywords.filter(kw => getKeywordType({ keyword: kw.phrase, shows: kw.monthly_searches || 0, competition: kw.wordstat_competition as 'LOW' | 'MEDIUM' | 'HIGH' | undefined }) === 'narrow').length;
      const wideKeywords = pageKeywords.filter(kw => getKeywordType({ keyword: kw.phrase, shows: kw.monthly_searches || 0, competition: kw.wordstat_competition as 'LOW' | 'MEDIUM' | 'HIGH' | undefined }) === 'wide').length;

      const progress = calculateOptimizationProgress({
        hasAnalysis: !!page.analysis,
        wordstatCoverage: page.targetKeywords.length > 0 
          ? (pageKeywords.length / page.targetKeywords.length) * 100 
          : 0,
        hasContent: false, // TODO: check content_docs
        hasGscData: false, // TODO: check search_console_queries
      });

      return {
        ...page,
        pageKeywords,
        avgFrequency: Math.round(avgFrequency),
        narrowKeywords,
        wideKeywords,
        progress,
      };
    });
  }, [pages, keywords]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Запросы по страницам</CardTitle>
          <CardDescription>Целевые запросы каждой страницы с статистикой Wordstat</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
        </CardContent>
      </Card>
    );
  }

  if (enrichedPages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Запросы по страницам</CardTitle>
          <CardDescription>Целевые запросы каждой страницы с статистикой Wordstat</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted-foreground">
            Нет проанализированных страниц. Перейдите во вкладку "Страницы" для анализа.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Запросы по страницам</CardTitle>
        <CardDescription>Целевые запросы каждой страницы с статистикой Wordstat</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Страница</TableHead>
                <TableHead className="text-center">Запросы</TableHead>
                <TableHead className="text-center">Типы</TableHead>
                <TableHead className="text-center">Ср. частота</TableHead>
                <TableHead>Прогресс</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrichedPages.map((page) => {
                const status = getPageStatus(page.progress);
                
                return (
                  <TableRow key={page.url}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{page.pageTitle || page.url}</span>
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <p className="text-xs text-muted-foreground">{page.url}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{page.targetKeywords.length}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {page.narrowKeywords > 0 && (
                          <Badge variant="outline" className="gap-1">
                            {getKeywordTypeEmoji('narrow')} {page.narrowKeywords}
                          </Badge>
                        )}
                        {page.wideKeywords > 0 && (
                          <Badge variant="outline" className="gap-1">
                            {getKeywordTypeEmoji('wide')} {page.wideKeywords}
                          </Badge>
                        )}
                        {page.narrowKeywords === 0 && page.wideKeywords === 0 && (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {page.avgFrequency > 0 ? (
                        <Badge variant="secondary">{page.avgFrequency.toLocaleString()}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{page.progress}%</span>
                        </div>
                        <Progress value={page.progress} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
