import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClientsList } from './ClientsList';
import { ChatArea } from './ChatArea';
import { TeacherChatArea } from './TeacherChatArea';
import { CorporateChatArea } from './CorporateChatArea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, GraduationCap, Building2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

export const ManagerInterface = () => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'clients' | 'teachers' | 'corporate'>('clients');

  // Fetch client data when selected
  const { data: selectedClient } = useQuery({
    queryKey: ['client', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return null;
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, phone')
        .eq('id', selectedClientId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClientId,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">CRM - Менеджер</h1>
          <p className="text-muted-foreground">Управление коммуникациями с клиентами и преподавателями</p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Клиенты
            </TabsTrigger>
            <TabsTrigger value="teachers" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Преподаватели
            </TabsTrigger>
            <TabsTrigger value="corporate" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Корп. чаты
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-0">
            <div className="grid grid-cols-[350px_1fr] gap-4 h-[calc(100vh-240px)]">
              <div className="overflow-hidden">
                <ClientsList 
                  onSelectClient={setSelectedClientId}
                  selectedClientId={selectedClientId || undefined}
                />
              </div>
              <Card className="overflow-hidden flex flex-col">
                {selectedClientId && selectedClient ? (
                  <ChatArea 
                    clientId={selectedClientId}
                    clientName={selectedClient.name}
                    clientPhone={selectedClient.phone || ''}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Выберите клиента для начала чата
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="teachers" className="space-y-0">
            <div className="h-[calc(100vh-240px)]">
              <Card className="h-full overflow-hidden">
                <TeacherChatArea onSelectTeacher={setSelectedTeacherId} />
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="corporate" className="space-y-0">
            <div className="h-[calc(100vh-240px)]">
              <Card className="h-full overflow-hidden">
                <CorporateChatArea />
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
