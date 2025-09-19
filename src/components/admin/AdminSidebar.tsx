import { useState } from "react";
import { 
  Settings, 
  HelpCircle, 
  Calendar, 
  RefreshCw, 
  Users, 
  BarChart3,
  Menu
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const adminItems = [
  { title: "Dashboard", id: "dashboard", icon: BarChart3 },
  { title: "FAQ", id: "faq", icon: HelpCircle },
  { title: "Schedule", id: "schedule", icon: Calendar },
  { title: "Sync", id: "sync", icon: RefreshCw },
  { title: "Users", id: "users", icon: Users },
  { title: "Settings", id: "settings", icon: Settings },
];

interface AdminSidebarProps {
  onSectionChange?: (section: string) => void;
}

export function AdminSidebar({ onSectionChange }: AdminSidebarProps) {
  const [activeSection, setActiveSection] = useState("dashboard");

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    onSectionChange?.(sectionId);
  };

  return (
    <Sidebar className="w-64">
      <div className="p-4 border-b">
        <SidebarTrigger />
        <h2 className="text-lg font-semibold mt-2">Admin Panel</h2>
      </div>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => handleSectionClick(item.id)}
                    className={
                      activeSection === item.id 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted"
                    }
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}