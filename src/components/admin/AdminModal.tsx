import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AdminSidebar } from "./AdminSidebar";
import { AdminDashboard } from "./AdminDashboard";
import { SidebarProvider } from "@/components/ui/sidebar";

interface AdminModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AdminModal = ({ open, onOpenChange }: AdminModalProps) => {
  const [activeSection, setActiveSection] = useState("dashboard");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-[95vh] p-0 gap-0">
        <SidebarProvider>
          <div className="flex h-full w-full">
            <AdminSidebar onSectionChange={setActiveSection} />
            <ScrollArea className="flex-1 h-full">
              <div className="p-6">
                <AdminDashboard activeSection={activeSection} />
              </div>
            </ScrollArea>
          </div>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
};
