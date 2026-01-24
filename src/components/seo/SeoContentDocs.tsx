import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/typedClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { getCurrentOrganizationId } from "@/lib/organizationHelpers";

const SeoContentDocs = () => {
  const { data: docs, isLoading } = useQuery({
    queryKey: ["seo-docs"],
    queryFn: async () => {
      const orgId = await getCurrentOrganizationId();
      const { data, error } = await supabase
        .from("content_docs")
        .select(`
          *,
          content_ideas(title, route)
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Загрузка контента...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Контент</h2>
        <p className="text-muted-foreground">
          Сгенерированные статьи готовые к публикации
        </p>
      </div>

      {!docs || docs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Нет сгенерированного контента
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <Card key={doc.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {doc.content_ideas?.title || "Без названия"}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {doc.content_ideas?.route || "/"}
                    </CardDescription>
                  </div>
                  <Badge>v{doc.version}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Слов:</span>
                    <p className="font-medium">{doc.word_count || 0}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Создан:</span>
                    <p className="font-medium">
                      {new Date(doc.created_at).toLocaleDateString("ru")}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Опубликован:</span>
                    <p className="font-medium">
                      {doc.published_at
                        ? new Date(doc.published_at).toLocaleDateString("ru")
                        : "Нет"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SeoContentDocs;
