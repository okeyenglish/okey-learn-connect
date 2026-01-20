import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, MapPin, Palette, CreditCard, Users, Banknote, Phone } from 'lucide-react';
import { SipSettings } from '@/components/SipSettings';
import { OrganizationSettings } from '@/components/settings/OrganizationSettings';
import { BranchesSettings } from '@/components/settings/BranchesSettings';
import { BrandingSettings } from '@/components/settings/BrandingSettings';
import { SubscriptionSettings } from '@/components/settings/SubscriptionSettings';
import { UserManagementSettings } from '@/components/settings/UserManagementSettings';
import { TeacherRegistrationLink } from '@/components/settings/TeacherRegistrationLink';
import { PaymentTerminalsSettings } from '@/components/settings/PaymentTerminalsSettings';
import { useAuth } from '@/hooks/useAuth';

const Settings = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('organization');

  const handleBack = () => {
    navigate('/newcrm');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center gap-4 px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">Настройки</h1>
            <p className="text-sm text-muted-foreground">
              Управление настройками организации
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
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
            <TabsTrigger value="payments" className="gap-2">
              <Banknote className="h-4 w-4" />
              <span className="hidden sm:inline">Онлайн-оплаты</span>
            </TabsTrigger>
            <TabsTrigger value="telephony" className="gap-2">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">Телефония</span>
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
            <Card>
              <CardHeader>
                <CardTitle>Основная информация</CardTitle>
                <CardDescription>
                  Управление основными данными вашей организации
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OrganizationSettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branches" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Филиалы организации</CardTitle>
                <CardDescription>
                  Управление филиалами, адресами и контактами
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BranchesSettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Брендинг</CardTitle>
                <CardDescription>
                  Настройте внешний вид системы под ваш бренд
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BrandingSettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <PaymentTerminalsSettings />
          </TabsContent>

          <TabsContent value="telephony" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Настройки телефонии (SIP/OnlinePBX)</CardTitle>
                <CardDescription>
                  Настройте ваш внутренний номер для звонков через OnlinePBX
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SipSettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Подписка и лимиты</CardTitle>
                <CardDescription>
                  Информация о вашем тарифном плане и лимитах
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SubscriptionSettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Управление пользователями</CardTitle>
                <CardDescription>
                  Добавление и управление пользователями организации
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserManagementSettings />
              </CardContent>
            </Card>

            <TeacherRegistrationLink />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
