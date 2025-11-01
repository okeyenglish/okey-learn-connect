import { Star, Download, ExternalLink, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CatalogApp, App } from '@/hooks/useApps';

interface AppCardProps {
  app: CatalogApp | App;
  onOpen?: () => void;
  onInstall?: () => void;
  onUninstall?: () => void;
  onPublish?: () => void;
  onUnpublish?: () => void;
  onDelete?: () => void;
  isInstalled?: boolean;
  isOwner?: boolean;
}

export const AppCard = ({ 
  app, 
  onOpen, 
  onInstall, 
  onUninstall,
  onPublish,
  onUnpublish,
  onDelete,
  isInstalled,
  isOwner 
}: AppCardProps) => {
  const catalogApp = app as CatalogApp;
  const hasRating = 'rating' in catalogApp;

  return (
    <Card className="group hover:shadow-lg transition-all">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{app.title}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {app.description}
            </CardDescription>
          </div>
          <Badge variant="outline" className="ml-2">
            {app.kind}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {app.level && (
            <Badge variant="secondary">{app.level}</Badge>
          )}
          {app.lang && (
            <Badge variant="outline">{app.lang.toUpperCase()}</Badge>
          )}
          {app.status !== 'published' && (
            <Badge variant="outline">{app.status}</Badge>
          )}
        </div>

        {hasRating && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-primary text-primary" />
              <span className="font-medium">{catalogApp.rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Download className="h-4 w-4" />
              <span>{catalogApp.installs}</span>
            </div>
          </div>
        )}

        {isOwner && (
          <p className="text-xs text-muted-foreground">
            Обновлено: {new Date(app.updated_at).toLocaleDateString()}
          </p>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        {onOpen && (
          <Button 
            onClick={onOpen}
            variant="default"
            size="sm"
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Открыть
          </Button>
        )}
        
        {!isOwner && !isInstalled && onInstall && (
          <Button 
            onClick={onInstall}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Установить
          </Button>
        )}

        {!isOwner && isInstalled && onUninstall && (
          <Button 
            onClick={onUninstall}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            Удалить
          </Button>
        )}

        {isOwner && (
          <>
            {app.status === 'draft' && onPublish && (
              <Button 
                onClick={onPublish}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Опубликовать
              </Button>
            )}
            
            {app.status === 'published' && onUnpublish && (
              <Button 
                onClick={onUnpublish}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Снять с публикации
              </Button>
            )}
            
            {onDelete && (
              <Button 
                onClick={onDelete}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  );
};
