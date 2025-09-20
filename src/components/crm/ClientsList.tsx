import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useClients } from "@/hooks/useClients";
import { Phone, Mail, MessageCircle, User } from "lucide-react";

interface ClientsListProps {
  onSelectClient?: (clientId: string) => void;
  selectedClientId?: string;
}

export const ClientsList = ({ onSelectClient, selectedClientId }: ClientsListProps) => {
  const { clients, isLoading, error } = useClients();

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
          <div className="p-4 space-y-2">
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
                  className={`p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                    selectedClientId === client.id ? 'bg-muted border-primary' : ''
                  }`}
                  onClick={() => onSelectClient?.(client.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{client.name}</h4>
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