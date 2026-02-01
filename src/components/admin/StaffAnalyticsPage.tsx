import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StaffAnalyticsPanel } from "@/components/crm/StaffAnalyticsPanel";
import { StaffComparisonTable } from "./StaffComparisonTable";
import { StaffActivityChart } from "./StaffActivityChart";
import { Activity, Trophy, BarChart3 } from "lucide-react";

export const StaffAnalyticsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Аналитика активности</h2>
        <p className="text-muted-foreground">
          Мониторинг работы сотрудников в реальном времени
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Обзор
          </TabsTrigger>
          <TabsTrigger value="ranking" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Рейтинг
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            История
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <StaffAnalyticsPanel />
        </TabsContent>

        <TabsContent value="ranking" className="mt-4">
          <StaffComparisonTable />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <StaffActivityChart />
        </TabsContent>
      </Tabs>
    </div>
  );
};
