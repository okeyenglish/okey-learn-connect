import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useClients } from "@/hooks/useClients";
import { useClientStatus } from "@/hooks/useClientStatus";
import { Phone, Mail, MessageCircle, User, UserPlus } from "lucide-react";

interface ClientsListProps {
  onSelectClient?: (clientId: string) => void;
  selectedClientId?: string;
}

export const ClientsList = ({ onSelectClient, selectedClientId }: ClientsListProps) => {
  const { clients, isLoading, error } = useClients();
  const clientIds = clients.map(client => client.id);
  const { getClientStatus } = useClientStatus(clientIds);

  // Безопасная обработка URL аватарок (замена http -> https)
  const getSafeUrl = (url?: string | null) => {
    if (!url) return '';
    try {
      return url.replace(/^http:\/\//i, 'https://');
    } catch {
      return url;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Клиенты</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[150px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Клиенты</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            Ошибка загрузки клиентов
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Клиенты
          <Badge variant="secondary">{clients.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-3 space-y-0.5">
            {clients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Нет клиентов</p>
                <p className="text-sm">Добавьте первого клиента</p>
              </div>
            ) : (
              clients.map((client) => (
                <div
                  key={client.id}
                  className={`p-2 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                    selectedClientId === client.id ? 'bg-muted border-primary' : ''
                  }`}
                  onClick={() => onSelectClient?.(client.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Client Avatar */}
                      <div className="flex-shrink-0 relative">
                        {client.avatar_url ? (
                          <img 
                            src={getSafeUrl(client.avatar_url)} 
                            alt={`${client.name} avatar`} 
                            className="w-10 h-10 rounded-full object-cover border-2 border-green-200"
                            style={{ borderRadius: '50%' }}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            onError={(e) => {
                              const target = e.currentTarget as HTMLImageElement;
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGM0Y0RjYiLz4KPGF1Y2NsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMzAgMzBDMzAgMjYuNjg2MyAyNi42Mjc0IDI0IDIyLjUgMjRIMTcuNUMxMy4zNzI2IDI0IDEwIDI2LjY4NjMgMTAgMzBWMzBIMzBWMzBaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center" style={{ borderRadius: '50%' }}>
                            <User className="w-6 h-6 text-green-600" />
                          </div>
                        )}
                        
                        {/* Lead indicator */}
                        {(() => {
                          const clientStatus = getClientStatus(client.id);
                          return clientStatus.isLead ? (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center border border-white">
                              <UserPlus className="w-2.5 h-2.5 text-white" />
                            </div>
                          ) : null;
                        })()}
                      </div>
                      
                      {/* Client Info */}
                       <div className="flex-1 min-w-0 overflow-hidden">
                         <h4 className="font-medium text-sm flex items-center gap-2 truncate">
                           <span className="truncate">{client.name}</span>
                           {(() => {
                             const s = getClientStatus(client.id);
                             return s.isLead ? (
                               <Badge variant="destructive" className="sm:hidden flex-shrink-0">Лид</Badge>
                             ) : null;
                           })()}
                         </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {client.phone}
                          </span>
                        </div>
                        {client.email && (
                          <div className="flex items-center gap-2 mt-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {client.email}
                            </span>
                          </div>
                        )}
                        {client.notes && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {client.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle phone call
                          window.open(`tel:${client.phone}`, '_self');
                        }}
                      >
                        <Phone className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectClient?.(client.id);
                        }}
                      >
                        <MessageCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};