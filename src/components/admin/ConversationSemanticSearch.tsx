import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Sparkles, Star, ArrowRight, Loader2, MessageSquare, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { selfHostedPost } from '@/lib/selfHostedApi';

interface SearchResult {
  id: string;
  scenario_type: string;
  quality_score: number;
  outcome: string;
  context_summary: string;
  example_messages: string;
  key_phrases: string[];
  created_at: string;
  similarity: number;
}

interface SearchResponse {
  results: SearchResult[];
  query: string;
  count: number;
}

const SCENARIO_OPTIONS = [
  { value: '', label: 'Все сценарии' },
  { value: 'new_lead', label: 'Новый лид' },
  { value: 'returning', label: 'Возврат клиента' },
  { value: 'complaint', label: 'Жалоба' },
  { value: 'upsell', label: 'Допродажа' },
  { value: 'reactivation', label: 'Реактивация' },
  { value: 'info_request', label: 'Запрос информации' },
  { value: 'scheduling', label: 'Запись на занятие' },
  { value: 'payment', label: 'Оплата' },
];

const SCENARIO_LABELS: Record<string, string> = {
  new_lead: 'Новый лид',
  returning: 'Возврат',
  complaint: 'Жалоба',
  upsell: 'Допродажа',
  reactivation: 'Реактивация',
  info_request: 'Запрос инфо',
  scheduling: 'Запись',
  payment: 'Оплата',
};

export function ConversationSemanticSearch() {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [scenario, setScenario] = useState('');
  const [minQuality, setMinQuality] = useState<number | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['semantic-search', searchQuery, scenario, minQuality],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 3) return null;
      
      const response = await selfHostedPost<SearchResponse>('semantic-search-conversations', {
        query: searchQuery,
        scenario: scenario || undefined,
        minQuality: minQuality || undefined,
        limit: 20,
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Search failed');
      }
      return response.data;
    },
    enabled: searchQuery.length >= 3,
  });

  const handleSearch = () => {
    if (query.length >= 3) {
      setSearchQuery(query);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getScenarioColor = (scenarioType: string) => {
    const colors: Record<string, string> = {
      new_lead: 'bg-green-100 text-green-800',
      returning: 'bg-blue-100 text-blue-800',
      complaint: 'bg-red-100 text-red-800',
      upsell: 'bg-purple-100 text-purple-800',
      reactivation: 'bg-orange-100 text-orange-800',
      info_request: 'bg-gray-100 text-gray-800',
      scheduling: 'bg-cyan-100 text-cyan-800',
      payment: 'bg-amber-100 text-amber-800',
    };
    return colors[scenarioType] || 'bg-gray-100 text-gray-800';
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 4.5) return 'text-green-600';
    if (quality >= 3.5) return 'text-emerald-500';
    if (quality >= 2.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getOutcomeBadge = (outcome: string) => {
    if (outcome === 'converted') {
      return <Badge className="bg-green-100 text-green-800">Конверсия</Badge>;
    }
    if (outcome === 'lost') {
      return <Badge variant="destructive">Потеряно</Badge>;
    }
    return <Badge variant="secondary">{outcome}</Badge>;
  };

  const formatMessages = (messages: string) => {
    if (!messages) return [];
    try {
      // Try to parse as JSON array
      const parsed = JSON.parse(messages);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 6); // Show first 6 messages
      }
    } catch {
      // If not JSON, split by newlines
      return messages.split('\n').filter(Boolean).slice(0, 6);
    }
    return [];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-purple-500" />
          Семантический поиск по диалогам
        </h2>
        <p className="text-muted-foreground">
          Найдите похожие кейсы из базы знаний AI для решения текущих задач
        </p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Опишите ситуацию или введите ключевые слова..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={scenario} onValueChange={setScenario}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Сценарий" />
                </SelectTrigger>
                <SelectContent>
                  {SCENARIO_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={minQuality?.toString() || ''} 
                onValueChange={(v) => setMinQuality(v ? Number(v) : undefined)}
              >
                <SelectTrigger className="w-[140px]">
                  <Star className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Качество" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Любое</SelectItem>
                  <SelectItem value="3">★3+</SelectItem>
                  <SelectItem value="4">★4+</SelectItem>
                  <SelectItem value="5">★5</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={handleSearch} disabled={query.length < 3 || isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Найти
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {query.length > 0 && query.length < 3 && (
            <p className="text-sm text-muted-foreground mt-2">
              Введите минимум 3 символа для поиска
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Ошибка поиска: {(error as Error).message}</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-2">
              Повторить
            </Button>
          </CardContent>
        </Card>
      )}

      {data && data.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Результаты поиска</span>
              <Badge variant="secondary">{data.count} найдено</Badge>
            </CardTitle>
            <CardDescription>
              По запросу: "{data.query}"
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {data.results.map((result) => (
                  <Collapsible 
                    key={result.id}
                    open={expandedId === result.id}
                    onOpenChange={(open) => setExpandedId(open ? result.id : null)}
                  >
                    <Card className="border hover:border-primary/50 transition-colors">
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={getScenarioColor(result.scenario_type)}>
                                  {SCENARIO_LABELS[result.scenario_type] || result.scenario_type}
                                </Badge>
                                {getOutcomeBadge(result.outcome)}
                                <span className={`font-medium ${getQualityColor(result.quality_score)}`}>
                                  ★{result.quality_score?.toFixed(1)}
                                </span>
                                {result.similarity > 0.5 && (
                                  <Badge variant="outline" className="text-purple-600 border-purple-300">
                                    {Math.round(result.similarity * 100)}% релевантность
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {result.context_summary}
                              </p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-4">
                          {/* Key Phrases */}
                          {result.key_phrases && result.key_phrases.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">Ключевые фразы:</p>
                              <div className="flex flex-wrap gap-1">
                                {result.key_phrases.map((phrase, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {phrase}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Example Messages */}
                          {result.example_messages && (
                            <div>
                              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" />
                                Пример диалога:
                              </p>
                              <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                                {formatMessages(result.example_messages).map((msg: any, idx: number) => (
                                  <div 
                                    key={idx} 
                                    className={`p-2 rounded ${
                                      typeof msg === 'object' 
                                        ? msg.role === 'assistant' || msg.direction === 'outgoing'
                                          ? 'bg-primary/10 ml-4'
                                          : 'bg-muted mr-4'
                                        : idx % 2 === 0 ? 'bg-muted mr-4' : 'bg-primary/10 ml-4'
                                    }`}
                                  >
                                    {typeof msg === 'object' ? msg.content || msg.text : msg}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <p className="text-xs text-muted-foreground">
                            Индексировано: {new Date(result.created_at).toLocaleDateString('ru-RU')}
                          </p>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {data && data.results.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Ничего не найдено по запросу "{data.query}"</p>
            <p className="text-sm text-muted-foreground mt-1">
              Попробуйте изменить запрос или фильтры
            </p>
          </CardContent>
        </Card>
      )}

      {!searchQuery && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-12 w-12 text-purple-300 mb-4" />
            <p className="text-muted-foreground">
              Введите описание ситуации или ключевые слова для поиска похожих успешных кейсов
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Примеры: "клиент просит скидку", "перенос занятия", "жалоба на преподавателя"
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
