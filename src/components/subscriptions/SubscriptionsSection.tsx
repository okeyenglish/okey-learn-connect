import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, CreditCard } from "lucide-react";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { AddSubscriptionModal } from "./AddSubscriptionModal";
import { SubscriptionCard } from "./SubscriptionCard";
import { SubscriptionPlansTable } from "./SubscriptionPlansTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const SubscriptionsSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [addModalOpen, setAddModalOpen] = useState(false);
  
  const { data: subscriptions = [], isLoading } = useSubscriptions();

  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch = !searchQuery || 
      subscription.student?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subscription.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subscription.student?.phone?.includes(searchQuery);
    
    const matchesStatus = statusFilter === "all" || subscription.status === statusFilter;
    const matchesType = typeFilter === "all" || subscription.subscription_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusCounts = () => {
    const counts = { active: 0, paused: 0, expired: 0, cancelled: 0 };
    subscriptions.forEach(sub => {
      counts[sub.status as keyof typeof counts]++;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Загрузка абонементов...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Абонементы</h2>
          <p className="text-muted-foreground">
            Управление абонементами студентов
          </p>
        </div>
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Новый абонемент
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Активные</p>
                <p className="text-2xl font-bold text-green-600">{statusCounts.active}</p>
              </div>
              <CreditCard className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Замороженные</p>
                <p className="text-2xl font-bold text-blue-600">{statusCounts.paused}</p>
              </div>
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Истекшие</p>
                <p className="text-2xl font-bold text-orange-600">{statusCounts.expired}</p>
              </div>
              <CreditCard className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Отмененные</p>
                <p className="text-2xl font-bold text-red-600">{statusCounts.cancelled}</p>
              </div>
              <CreditCard className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="subscriptions" className="w-full">
        <TabsList>
          <TabsTrigger value="subscriptions">Абонементы студентов</TabsTrigger>
          <TabsTrigger value="plans">Тарифные планы</TabsTrigger>
        </TabsList>
        
        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Фильтры
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Поиск по студенту, плану или телефону..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="active">Активные</SelectItem>
                    <SelectItem value="paused">Замороженные</SelectItem>
                    <SelectItem value="expired">Истекшие</SelectItem>
                    <SelectItem value="cancelled">Отмененные</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Тип" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все типы</SelectItem>
                    <SelectItem value="per_lesson">Поурочный</SelectItem>
                    <SelectItem value="monthly">Помесячный</SelectItem>
                    <SelectItem value="weekly">Понедельный</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSubscriptions.map((subscription) => (
              <SubscriptionCard
                key={subscription.id}
                subscription={subscription}
              />
            ))}
          </div>

          {filteredSubscriptions.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Абонементы не найдены</h3>
                <p className="text-muted-foreground">
                  Измените фильтры или создайте новый абонемент
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="plans">
          <SubscriptionPlansTable />
        </TabsContent>
      </Tabs>

      <AddSubscriptionModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
      />
    </div>
  );
};

export default SubscriptionsSection;