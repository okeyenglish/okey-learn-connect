import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Lightbulb, TrendingUp, Settings, BarChart, Layout, Home } from "lucide-react";
import SeoKeywordClusters from "@/components/seo/SeoKeywordClusters";
import SeoContentIdeas from "@/components/seo/SeoContentIdeas";
import SeoContentDocs from "@/components/seo/SeoContentDocs";
import SeoMetrics from "@/components/seo/SeoMetrics";
import SeoSettings from "@/components/seo/SeoSettings";
import { SeoPages } from "@/components/seo/SeoPages";
import { SeoOverview } from "@/components/seo/SeoOverview";

const SeoManager = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SEO Manager</h1>
          <p className="text-muted-foreground mt-1">
            Автоматическая генерация и оптимизация контента
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="pages" className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Страницы
          </TabsTrigger>
          <TabsTrigger value="clusters" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Кластеры
          </TabsTrigger>
          <TabsTrigger value="ideas" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Идеи
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Контент
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            Метрики
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Настройки
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <SeoOverview />
        </TabsContent>

        <TabsContent value="pages" className="mt-6">
          <SeoPages />
        </TabsContent>

        <TabsContent value="clusters" className="mt-6">
          <SeoKeywordClusters />
        </TabsContent>

        <TabsContent value="ideas" className="mt-6">
          <SeoContentIdeas />
        </TabsContent>

        <TabsContent value="content" className="mt-6">
          <SeoContentDocs />
        </TabsContent>

        <TabsContent value="metrics" className="mt-6">
          <SeoMetrics />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SeoSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SeoManager;
