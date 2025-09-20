import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  MessageCircle, 
  Phone, 
  GraduationCap, 
  Calendar,
  DollarSign,
  MapPin
} from "lucide-react";

interface SearchResult {
  id: string;
  type: 'client' | 'student' | 'chat' | 'payment' | 'schedule';
  title: string;
  subtitle?: string;
  description?: string;
  metadata?: Record<string, any>;
}

interface SearchResultsProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  results: SearchResult[];
  onSelectResult?: (result: SearchResult) => void;
}

export const SearchResults = ({ 
  isOpen, 
  onClose, 
  query, 
  results, 
  onSelectResult 
}: SearchResultsProps) => {
  const [activeTab, setActiveTab] = useState("all");

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'client': return User;
      case 'student': return GraduationCap;
      case 'chat': return MessageCircle;
      case 'payment': return DollarSign;
      case 'schedule': return Calendar;
      default: return User;
    }
  };

  const getResultBadgeColor = (type: string) => {
    switch (type) {
      case 'client': return 'default';
      case 'student': return 'secondary';
      case 'chat': return 'outline';
      case 'payment': return 'destructive';
      case 'schedule': return 'default';
      default: return 'default';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'client': return 'Клиент';
      case 'student': return 'Ученик';
      case 'chat': return 'Чат';
      case 'payment': return 'Платеж';
      case 'schedule': return 'Расписание';
      default: return type;
    }
  };

  const filterResultsByType = (type: string) => {
    if (type === 'all') return results;
    return results.filter(result => result.type === type);
  };

  const resultTypes = ['all', ...Array.from(new Set(results.map(r => r.type)))];
  const getTabLabel = (type: string) => {
    if (type === 'all') return `Все (${results.length})`;
    const count = results.filter(r => r.type === type).length;
    return `${getTypeLabel(type)} (${count})`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Результаты поиска: "{query}"
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid grid-cols-6 w-full">
              {resultTypes.map(type => (
                <TabsTrigger key={type} value={type} className="text-xs">
                  {getTabLabel(type)}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {resultTypes.map(type => {
              const filteredResults = filterResultsByType(type);
              return (
                <TabsContent key={type} value={type} className="flex-1 overflow-y-auto mt-4">
                  {filteredResults.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        {type === 'all' ? 'Ничего не найдено' : `Нет результатов в категории "${getTypeLabel(type)}"`}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredResults.map((result) => {
                        const Icon = getResultIcon(result.type);
                        return (
                          <div
                            key={result.id}
                            className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => onSelectResult?.(result)}
                          >
                            <div className="flex items-start gap-3">
                              <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium truncate">{result.title}</h4>
                                  <Badge variant={getResultBadgeColor(result.type)} className="text-xs">
                                    {getTypeLabel(result.type)}
                                  </Badge>
                                </div>
                                {result.subtitle && (
                                  <p className="text-sm text-muted-foreground mb-1">{result.subtitle}</p>
                                )}
                                {result.description && (
                                  <p className="text-sm text-muted-foreground">{result.description}</p>
                                )}
                                {result.metadata && (
                                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    {result.metadata.phone && (
                                      <div className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {result.metadata.phone}
                                      </div>
                                    )}
                                    {result.metadata.branch && (
                                      <div className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {result.metadata.branch}
                                      </div>
                                    )}
                                    {result.metadata.course && (
                                      <div className="flex items-center gap-1">
                                        <GraduationCap className="h-3 w-3" />
                                        {result.metadata.course}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <Button size="sm" variant="ghost" className="shrink-0">
                                Открыть
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};