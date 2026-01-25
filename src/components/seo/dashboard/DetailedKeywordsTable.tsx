import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type KeywordWithStats } from "@/hooks/useSeoOverview";
import { getKeywordType, getKeywordTypeEmoji, getKeywordTypeColor } from "@/lib/seo/keywordAnalyzer";
import { calculateSEODifficulty } from "@/lib/seo/wordstatAnalyzer";

interface DetailedKeywordsTableProps {
  keywords: KeywordWithStats[] | undefined;
  isLoading: boolean;
}

export function DetailedKeywordsTable({ keywords, isLoading }: DetailedKeywordsTableProps) {
  const [typeFilter, setTypeFilter] = useState<'all' | 'narrow' | 'wide' | 'medium'>('all');
  const [competitionFilter, setCompetitionFilter] = useState<'all' | 'LOW' | 'MEDIUM' | 'HIGH'>('all');

  const filteredKeywords = useMemo(() => {
    if (!keywords) return [];

    return keywords.filter(kw => {
      const type = getKeywordType({
        keyword: kw.phrase,
        shows: kw.monthly_searches || 0,
        competition: kw.wordstat_competition as 'LOW' | 'MEDIUM' | 'HIGH' | undefined,
      });

      if (typeFilter !== 'all' && type !== typeFilter) return false;
      if (competitionFilter !== 'all' && kw.wordstat_competition !== competitionFilter) return false;

      return true;
    });
  }, [keywords, typeFilter, competitionFilter]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Детальная аналитика запросов</CardTitle>
          <CardDescription>Полная таблица всех запросов с фильтрами</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
        </CardContent>
      </Card>
    );
  }

  if (!keywords || keywords.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Детальная аналитика запросов</CardTitle>
          <CardDescription>Полная таблица всех запросов с фильтрами</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted-foreground">
            Нет данных по запросам. Соберите статистику во вкладке "Настройки".
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Детальная аналитика запросов</CardTitle>
            <CardDescription>
              Полная таблица всех запросов с фильтрами • {filteredKeywords.length} из {keywords.length}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Тип запроса" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="narrow">🎯 Узкие</SelectItem>
                <SelectItem value="wide">🌐 Широкие</SelectItem>
                <SelectItem value="medium">📊 Средние</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={competitionFilter} onValueChange={(v: any) => setCompetitionFilter(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Конкуренция" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Любая</SelectItem>
                <SelectItem value="LOW">Низкая</SelectItem>
                <SelectItem value="MEDIUM">Средняя</SelectItem>
                <SelectItem value="HIGH">Высокая</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Запрос</TableHead>
                <TableHead className="text-center">Тип</TableHead>
                <TableHead className="text-center">Частота</TableHead>
                <TableHead className="text-center">Конкуренция</TableHead>
                <TableHead className="text-center">SEO сложность</TableHead>
                <TableHead className="text-center">Источник</TableHead>
                <TableHead className="text-center">Обновлено</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredKeywords.slice(0, 100).map((kw, index) => {
              const type = getKeywordType({
                  keyword: kw.phrase,
                  shows: kw.monthly_searches || 0,
                  competition: kw.wordstat_competition as 'LOW' | 'MEDIUM' | 'HIGH' | undefined,
                });

                const difficulty = kw.monthly_searches && kw.wordstat_competition 
                  ? calculateSEODifficulty({
                      keyword: kw.phrase,
                      shows: kw.monthly_searches,
                      competition: kw.wordstat_competition as 'LOW' | 'MEDIUM' | 'HIGH',
                    })
                  : null;

                return (
                  <TableRow key={`${kw.phrase}-${index}`}>
                    <TableCell className="font-medium">{kw.phrase}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={getKeywordTypeColor(type)}>
                        {getKeywordTypeEmoji(type)} {type === 'narrow' ? 'Узкий' : type === 'wide' ? 'Широкий' : 'Средний'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {kw.monthly_searches ? (
                        <Badge variant="secondary">{kw.monthly_searches.toLocaleString()}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {kw.wordstat_competition ? (
                        <Badge
                          variant={
                            kw.wordstat_competition === 'HIGH' ? 'destructive' :
                            kw.wordstat_competition === 'MEDIUM' ? 'default' : 'secondary'
                          }
                        >
                          {kw.wordstat_competition === 'HIGH' ? 'Высокая' :
                           kw.wordstat_competition === 'MEDIUM' ? 'Средняя' : 'Низкая'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {difficulty ? (
                        <div className="space-y-1">
                          <Badge
                            variant={
                              difficulty.difficulty === 'EASY' ? 'secondary' :
                              difficulty.difficulty === 'MEDIUM' ? 'default' :
                              difficulty.difficulty === 'HARD' ? 'destructive' : 'destructive'
                            }
                          >
                            {difficulty.score}/100
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">
                        {kw.source || 'manual'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {kw.last_updated 
                        ? new Date(kw.last_updated).toLocaleDateString('ru-RU')
                        : '-'
                      }
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {filteredKeywords.length > 100 && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            Показано первых 100 запросов из {filteredKeywords.length}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
