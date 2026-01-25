import { useState } from "react";
import * as React from "react";
import { AdminFAQManager } from "./AdminFAQManager";
import { AdminScheduleManager } from "./AdminScheduleManager";
import { TextbookManager } from "./TextbookManager";
import { RoleManager } from "./RoleManager";
import { UserPermissionsManager } from "./UserPermissionsManager";
import { UserBranchesManager } from "./UserBranchesManager";
import { AdminCoursePricing } from "./AdminCoursePricing";
import { AIProviderSettings } from "./AIProviderSettings";
import ReferencesSection from "@/components/references/ReferencesSection";
import { FamilyGroupsCleanup } from "./FamilyGroupsCleanup";
import { FamilyMembersManager } from "./FamilyMembersManager";
import { FamilyGroupSplitter } from "./FamilyGroupSplitter";
import { FamilyMembersRestorer } from "./FamilyMembersRestorer";
import { FamilyGroupsReorganizer } from "./FamilyGroupsReorganizer";
import { AuditLogViewer } from "@/components/audit/AuditLogViewer";
import { AuditDashboard } from "@/components/audit/AuditDashboard";
import { PaymentCompensationPanel } from "@/components/payments/PaymentCompensationPanel";
import { PendingPaymentsPanel } from "@/components/payments/PendingPaymentsPanel";
import { SLAMonitoringDashboard } from "@/components/monitoring/SLAMonitoringDashboard";
import { EventBusMonitor } from "@/components/monitoring/EventBusMonitor";
import { BranchPhotosManager } from "./BranchPhotosManager";
import { RoutingRulesSettings } from "./RoutingRulesSettings";
import { MessengersSettings } from "./MessengersSettings";
import { SyncDashboard } from "./SyncDashboard";
import { PaymentTerminalsSettings } from "@/components/settings/PaymentTerminalsSettings";
import { OnlinePBXSettings } from "./OnlinePBXSettings";
import { WebhooksDirectory } from "./WebhooksDirectory";
import { SystemMonitorPanel } from "./SystemMonitorPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminDashboardProps {
  activeSection: string;
}

export function AdminDashboard({ activeSection }: AdminDashboardProps) {
  const [currentSection, setCurrentSection] = useState(activeSection);

  // Update current section when prop changes
  React.useEffect(() => {
    setCurrentSection(activeSection);
  }, [activeSection]);

  const renderContent = () => {
    switch (currentSection) {
      case "faq":
        return <AdminFAQManager />;
      case "schedule":
        return <AdminScheduleManager />;
      case "pricing":
        return <AdminCoursePricing />;
      case "messengers":
        return <MessengersSettings />;
      case "telephony":
        return <OnlinePBXSettings />;
      case "textbooks":
        return <TextbookManager />;
      case "references":
        return <ReferencesSection />;
      case "audit":
        return <AuditLogViewer />;
      case "audit-dashboard":
        return <AuditDashboard />;
      case "pending-payments":
        return <PendingPaymentsPanel />;
      case "compensation":
        return <PaymentCompensationPanel />;
      case "family-cleanup":
        return <FamilyGroupsCleanup />;
      case "family-members":
        return <FamilyMembersManager />;
      case "family-splitter":
        return <FamilyGroupSplitter />;
      case "family-restorer":
        return <FamilyMembersRestorer />;
      case "family-reorganizer":
        return <FamilyGroupsReorganizer />;
      case "sla-monitoring":
        return <SLAMonitoringDashboard />;
      case "event-bus":
        return <EventBusMonitor />;
      case "ai-settings":
        return <AIProviderSettings />;
      case "branch-photos":
        return <BranchPhotosManager />;
      case "routing-rules":
        return <RoutingRulesSettings />;
      case "webhooks":
        return <WebhooksDirectory />;
      case "system-monitor":
        return <SystemMonitorPanel />;
      case "sync":
        return <SyncDashboard />;
      case "payment-terminals":
        return <PaymentTerminalsSettings />;
      case "users":
        return <UserPermissionsManager />;
      case "user-branches":
        return <UserBranchesManager />;
      case "settings":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>System configuration and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Settings panel coming soon...</p>
            </CardContent>
          </Card>
        );
      default:
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage your application settings and content</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Полная реорганизация — всегда первая и заметная */}
              <Card
                className="cursor-pointer hover:bg-muted/50 border-red-200 bg-red-50"
                onClick={() => setCurrentSection("family-reorganizer")}
              >
                <CardHeader>
                  <CardTitle className="text-red-600">⚠️ Полная реорганизация</CardTitle>
                  <CardDescription>Пересоздание всех семейных групп с нуля</CardDescription>
                </CardHeader>
              </Card>

              {/* Восстановление связей родителей */}
              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setCurrentSection("family-restorer")}>
                <CardHeader>
                  <CardTitle>Восстановление связей родителей</CardTitle>
                  <CardDescription>Автоматическое связывание студентов с родителями</CardDescription>
                </CardHeader>
              </Card>

              {/* Очистка семейных групп */}
              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setCurrentSection("family-cleanup")}>
                <CardHeader>
                  <CardTitle>Очистка семейных групп</CardTitle>
                  <CardDescription>Удаление дубликатов и исправление данных</CardDescription>
                </CardHeader>
              </Card>
              
              {/* FAQ */}
              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setCurrentSection("faq")}>
                <CardHeader>
                  <CardTitle>FAQ Management</CardTitle>
                  <CardDescription>Add, edit, and manage FAQ entries</CardDescription>
                </CardHeader>
              </Card>
              
              {/* Schedule */}
              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setCurrentSection("schedule")}>
                <CardHeader>
                  <CardTitle>Schedule Management</CardTitle>
                  <CardDescription>Manage class schedules and timetables</CardDescription>
                </CardHeader>
              </Card>
              
              {/* Мессенджеры */}
              <Card className="cursor-pointer hover:bg-muted/50 border-green-200" onClick={() => setCurrentSection("messengers")}>
                <CardHeader>
                  <CardTitle className="text-green-600">💬 Мессенджеры</CardTitle>
                  <CardDescription>WhatsApp, Telegram, MAX - все интеграции</CardDescription>
                </CardHeader>
              </Card>
              
              {/* Телефония */}
              <Card className="cursor-pointer hover:bg-muted/50 border-blue-200" onClick={() => setCurrentSection("telephony")}>
                <CardHeader>
                  <CardTitle className="text-blue-600">📞 Телефония (OnlinePBX)</CardTitle>
                  <CardDescription>Настройка интеграции с виртуальной АТС</CardDescription>
                </CardHeader>
              </Card>
              
              {/* Routing Rules */}
              <Card className="cursor-pointer hover:bg-muted/50 border-purple-200" onClick={() => setCurrentSection("routing-rules")}>
                <CardHeader>
                  <CardTitle className="text-purple-600">🔀 Правила маршрутизации</CardTitle>
                  <CardDescription>Автоответы и распределение обращений</CardDescription>
                </CardHeader>
              </Card>
              
              {/* Webhooks */}
              <Card className="cursor-pointer hover:bg-muted/50 border-orange-200" onClick={() => setCurrentSection("webhooks")}>
                <CardHeader>
                  <CardTitle className="text-orange-600">🔗 Webhooks</CardTitle>
                  <CardDescription>Все URL для интеграций</CardDescription>
                </CardHeader>
              </Card>
              
              {/* System Monitor */}
              <Card className="cursor-pointer hover:bg-muted/50 border-cyan-200" onClick={() => setCurrentSection("system-monitor")}>
                <CardHeader>
                  <CardTitle className="text-cyan-600">📊 Мониторинг</CardTitle>
                  <CardDescription>Edge Functions и миграции</CardDescription>
                </CardHeader>
              </Card>
              
              {/* Textbooks */}
              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setCurrentSection("textbooks")}>
                <CardHeader>
                  <CardTitle>Textbooks</CardTitle>
                  <CardDescription>Upload and manage PDF textbooks</CardDescription>
                </CardHeader>
              </Card>
              
              {/* Users */}
              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setCurrentSection("users")}>
                <CardHeader>
                  <CardTitle>User Permissions</CardTitle>
                  <CardDescription>Manage detailed user permissions</CardDescription>
                </CardHeader>
              </Card>
              
              {/* Управление членами семьи */}
              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setCurrentSection("family-members")}>
                <CardHeader>
                  <CardTitle>Управление членами семьи</CardTitle>
                  <CardDescription>Просмотр и удаление связей</CardDescription>
                </CardHeader>
              </Card>
              
              {/* Разделение семейных групп */}
              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setCurrentSection("family-splitter")}>
                <CardHeader>
                  <CardTitle>Разделение семейных групп</CardTitle>
                  <CardDescription>Разделение студентов на отдельные группы</CardDescription>
                </CardHeader>
              </Card>
              
              {/* SLA Monitoring */}
              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setCurrentSection("sla-monitoring")}>
                <CardHeader>
                  <CardTitle>SLA Monitoring</CardTitle>
                  <CardDescription>Monitor service level agreements and metrics</CardDescription>
                </CardHeader>
              </Card>
              
              {/* Event Bus Monitor */}
              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setCurrentSection("event-bus")}>
                <CardHeader>
                  <CardTitle>Event Bus Monitor</CardTitle>
                  <CardDescription>Monitor system events and processing</CardDescription>
                </CardHeader>
              </Card>
              
              {/* AI Settings */}
              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setCurrentSection("ai-settings")}>
                <CardHeader>
                  <CardTitle>AI Settings</CardTitle>
                  <CardDescription>Configure AI provider (Lovable Gateway or Vertex AI)</CardDescription>
                </CardHeader>
              </Card>
              
              {/* Synchronization */}
              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setCurrentSection("sync")}>
                <CardHeader>
                  <CardTitle>Synchronization</CardTitle>
                  <CardDescription>Data sync and integration</CardDescription>
                </CardHeader>
              </Card>
              
              {/* Онлайн-оплаты */}
              <Card className="cursor-pointer hover:bg-muted/50 border-green-200" onClick={() => setCurrentSection("payment-terminals")}>
                <CardHeader>
                  <CardTitle className="text-green-600">💳 Онлайн-оплаты</CardTitle>
                  <CardDescription>Настройка терминалов T-Bank для приёма платежей</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {renderContent()}
    </div>
  );
}
