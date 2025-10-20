import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, MapPin, Palette, CreditCard, Users } from 'lucide-react';
import { OrganizationSettings } from './OrganizationSettings';
import { BranchesSettings } from './BranchesSettings';
import { BrandingSettings } from './BrandingSettings';
import { SubscriptionSettings } from './SubscriptionSettings';
import { UserManagementSettings } from './UserManagementSettings';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsModal = ({ open, onOpenChange }: SettingsModalProps) => {
  const [activeTab, setActiveTab] = useState('organization');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl">Настройки</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Управление настройками организации
          </p>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="px-6 pb-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="organization" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Организация</span>
                </TabsTrigger>
                <TabsTrigger value="branches" className="gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="hidden sm:inline">Филиалы</span>
                </TabsTrigger>
                <TabsTrigger value="branding" className="gap-2">
                  <Palette className="h-4 w-4" />
                  <span className="hidden sm:inline">Брендинг</span>
                </TabsTrigger>
                <TabsTrigger value="subscription" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden sm:inline">Подписка</span>
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Пользователи</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="organization" className="space-y-4">
                <OrganizationSettings />
              </TabsContent>

              <TabsContent value="branches" className="space-y-4">
                <BranchesSettings />
              </TabsContent>

              <TabsContent value="branding" className="space-y-4">
                <BrandingSettings />
              </TabsContent>

              <TabsContent value="subscription" className="space-y-4">
                <SubscriptionSettings />
              </TabsContent>

              <TabsContent value="users" className="space-y-4">
                <UserManagementSettings />
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
