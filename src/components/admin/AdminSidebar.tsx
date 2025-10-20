import { useState, useEffect } from "react";
import { 
  Settings, 
  HelpCircle, 
  Calendar, 
  RefreshCw, 
  Users, 
  BarChart3,
  Menu,
  MessageSquare,
  BookOpen,
  Database
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
import { useAuth } from "@/hooks/useAuth";
import { canAccessAdminSection } from "@/lib/permissions";

const adminItems = [
  { title: "Dashboard", id: "dashboard", icon: BarChart3 },
  { title: "FAQ", id: "faq", icon: HelpCircle },
  { title: "Schedule", id: "schedule", icon: Calendar },
  { title: "Courses & Pricing", id: "pricing", icon: Settings },
  { title: "WhatsApp", id: "whatsapp", icon: MessageSquare },
  { title: "Textbooks", id: "textbooks", icon: BookOpen },
  { title: "Справочники", id: "references", icon: Database },
  { title: "Sync", id: "sync", icon: RefreshCw },
  { title: "Users", id: "users", icon: Users },
  { title: "Settings", id: "settings", icon: Settings },
];

interface AdminSidebarProps {
  onSectionChange?: (section: string) => void;
}

export function AdminSidebar({ onSectionChange }: AdminSidebarProps) {
  const { roles, loading, role } = useAuth();
  const isAdminUser = role === 'admin' || roles?.includes?.('admin');
  // Show full menu while roles are loading or when user is admin
  const filteredItems = adminItems.filter((i) => canAccessAdminSection(roles, i.id as any));
  const visibleItems = (loading || isAdminUser)
    ? adminItems
    : (filteredItems.length ? filteredItems : adminItems.filter((i) => i.id === 'dashboard'));
  const [activeSection, setActiveSection] = useState(visibleItems[0]?.id ?? 'dashboard');

  useEffect(() => {
    if (!visibleItems.find(i => i.id === activeSection) && visibleItems[0]) {
      setActiveSection(visibleItems[0].id);
      onSectionChange?.(visibleItems[0].id);
    }
  }, [roles, loading]);

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
              {visibleItems.map((item) => (
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