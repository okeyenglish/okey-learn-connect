import { useState } from "react";
import * as React from "react";
import { AdminFAQManager } from "./AdminFAQManager";
import { AdminScheduleManager } from "./AdminScheduleManager";
import { WhatsAppSettings } from "./WhatsAppSettings";
import { TextbookManager } from "./TextbookManager";
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
      case "whatsapp":
        return <WhatsAppSettings />;
      case "textbooks":
        return <TextbookManager />;
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
        return (
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage users and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">User management coming soon...</p>
            </CardContent>
          </Card>
        );
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
              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setCurrentSection("faq")}>
                <CardHeader>
                  <CardTitle>FAQ Management</CardTitle>
                  <CardDescription>Add, edit, and manage FAQ entries</CardDescription>
                </CardHeader>
              </Card>
              
              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setCurrentSection("schedule")}>
                <CardHeader>
                  <CardTitle>Schedule Management</CardTitle>
                  <CardDescription>Manage class schedules and timetables</CardDescription>
                </CardHeader>
              </Card>
              
              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setCurrentSection("whatsapp")}>
                <CardHeader>
                  <CardTitle>WhatsApp Integration</CardTitle>
                  <CardDescription>Configure WhatsApp messaging settings</CardDescription>
                </CardHeader>
              </Card>
              
              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setCurrentSection("textbooks")}>
                <CardHeader>
                  <CardTitle>Textbooks</CardTitle>
                  <CardDescription>Upload and manage PDF textbooks</CardDescription>
                </CardHeader>
              </Card>
              
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