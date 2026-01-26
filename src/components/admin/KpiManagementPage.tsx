import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ManagerKpiSettings } from "./ManagerKpiSettings";
import { KpiNotificationsList } from "./KpiNotificationsList";
import { Target, Bell } from "lucide-react";
import { useUnreadKpiNotificationsCount } from "@/hooks/useKpiNotifications";
import { Badge } from "@/components/ui/badge";

export const KpiManagementPage = () => {
  const { data: unreadCount = 0 } = useUnreadKpiNotificationsCount();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Управление KPI</h2>
        <p className="text-muted-foreground">
          Настройка целевых показателей и мониторинг уведомлений
        </p>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Настройки KPI
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Уведомления
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <ManagerKpiSettings />
        </TabsContent>

        <TabsContent value="notifications">
          <KpiNotificationsList />
        </TabsContent>
      </Tabs>
    </div>
  );
};
