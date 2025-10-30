import { useState } from "react";
import * as React from "react";
import { AdminFAQManager } from "./AdminFAQManager";
import { AdminScheduleManager } from "./AdminScheduleManager";
import { WhatsAppSettings } from "./WhatsAppSettings";
import { TextbookManager } from "./TextbookManager";
import { RoleManager } from "./RoleManager";
import { UserPermissionsManager } from "./UserPermissionsManager";
import { AdminCoursePricing } from "./AdminCoursePricing";
import ReferencesSection from "@/components/references/ReferencesSection";
import { FamilyGroupsCleanup } from "./FamilyGroupsCleanup";
import { FamilyMembersManager } from "./FamilyMembersManager";
import { FamilyGroupSplitter } from "./FamilyGroupSplitter";
import { FamilyMembersRestorer } from "./FamilyMembersRestorer";
import { FamilyGroupsReorganizer } from "./FamilyGroupsReorganizer";
import { AuditLogViewer } from "@/components/audit/AuditLogViewer";
import { PaymentCompensationPanel } from "@/components/payments/PaymentCompensationPanel";
import { PendingPaymentsPanel } from "@/components/payments/PendingPaymentsPanel";
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
      case "whatsapp":
        return <WhatsAppSettings />;
      case "textbooks":
        return <TextbookManager />;
      case "references":
        return <ReferencesSection />;
      case "audit":
        return <AuditLogViewer />;
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
      case "sync":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Synchronization</CardTitle>
              <CardDescription>Data sync and integration settings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Sync functionality coming soon...</p>
            </CardContent>
          </Card>
        );
      case "users":
        return <UserPermissionsManager />;
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
              
              {/* WhatsApp */}
              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setCurrentSection("whatsapp")}>
                <CardHeader>
                  <CardTitle>WhatsApp Integration</CardTitle>
                  <CardDescription>Configure WhatsApp messaging settings</CardDescription>
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
              
              {/* Synchronization */}
              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setCurrentSection("sync")}>
                <CardHeader>
                  <CardTitle>Synchronization</CardTitle>
                  <CardDescription>Data sync and integration</CardDescription>
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
