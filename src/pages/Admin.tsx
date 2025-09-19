import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

const Admin = () => {
  const [activeSection, setActiveSection] = useState("dashboard");

  return (
    <div className="min-h-screen bg-background">
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AdminSidebar onSectionChange={setActiveSection} />
          <main className="flex-1 p-6">
            <AdminDashboard activeSection={activeSection} />
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default Admin;