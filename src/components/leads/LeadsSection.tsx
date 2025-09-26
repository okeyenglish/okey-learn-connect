import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Filter, Users, Target, TrendingUp, AlertCircle } from 'lucide-react';
import { LeadsTable } from './LeadsTable';
import { LeadsFunnel } from './LeadsFunnel';
import { AddLeadModal } from './AddLeadModal';
import { LeadsStats } from './LeadsStats';
import { useLeads, useLeadsStats } from '@/hooks/useLeads';

export default function LeadsSection() {
  const [activeTab, setActiveTab] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [filters, setFilters] = useState<{
    status_id?: string;
    branch?: string;
    assigned_to?: string;
  }>({});

  const { leads, isLoading } = useLeads(filters);
  const { stats } = useLeadsStats();

  const totalLeads = leads.length;
  const successfulLeads = leads.filter(lead => lead.lead_status?.is_success).length;
  const failedLeads = leads.filter(lead => lead.lead_status?.is_failure).length;
  const activeLeads = totalLeads - successfulLeads - failedLeads;

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Лиды и продажи</h1>
          <p className="text-muted-foreground">
            Управление лидами и воронкой продаж
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить лид
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего лидов</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">В работе</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeLeads}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Успешных</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{successfulLeads}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Неуспешных</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedLeads}</div>
          </CardContent>
        </Card>
      </div>

      {/* Основное содержимое */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Все лиды</TabsTrigger>
          <TabsTrigger value="funnel">Воронка продаж</TabsTrigger>
          <TabsTrigger value="stats">Аналитика</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Список лидов</CardTitle>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Фильтры
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <LeadsTable 
                leads={leads} 
                isLoading={isLoading}
                onFiltersChange={setFilters}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Воронка продаж</CardTitle>
              <CardDescription>
                Визуализация прохождения лидов через этапы продаж
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeadsFunnel stats={stats} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <LeadsStats />
        </TabsContent>
      </Tabs>

      {/* Модальное окно добавления лида */}
      <AddLeadModal 
        open={showAddModal}
        onOpenChange={setShowAddModal}
      />
    </div>
  );
}