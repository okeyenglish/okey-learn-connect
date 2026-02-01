import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StaffAnalyticsPanel } from "@/components/crm/StaffAnalyticsPanel";
import { StaffComparisonTable } from "./StaffComparisonTable";
import { Activity, Trophy, Users } from "lucide-react";

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
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <StaffAnalyticsPanel />
        </TabsContent>

        <TabsContent value="ranking" className="mt-4">
          <StaffComparisonTable />
        </TabsContent>
      </Tabs>
    </div>
  );
};
