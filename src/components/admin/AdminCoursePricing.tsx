import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CoursePricingTable } from "./pricing/CoursePricingTable";
import { SubscriptionPlansTable } from "./pricing/SubscriptionPlansTable";
import { AddCoursePriceModal } from "./pricing/AddCoursePriceModal";
import { AddSubscriptionPlanModal } from "./pricing/AddSubscriptionPlanModal";

export function AdminCoursePricing() {
  const [showAddPrice, setShowAddPrice] = useState(false);
  const [showAddPlan, setShowAddPlan] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Курсы и цены</h1>
        <p className="text-muted-foreground">Управление курсами, стоимостью и абонементами</p>
      </div>

      <Tabs defaultValue="prices" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="prices">Цены на курсы</TabsTrigger>
          <TabsTrigger value="plans">Абонементы</TabsTrigger>
        </TabsList>

        <TabsContent value="prices" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Стоимость курсов</CardTitle>
                <CardDescription>
                  Управление ценами за занятие для различных программ
                </CardDescription>
              </div>
              <Button onClick={() => setShowAddPrice(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Добавить цену
              </Button>
            </CardHeader>
            <CardContent>
              <CoursePricingTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Абонементы</CardTitle>
                <CardDescription>
                  Управление тарифными планами и абонементами
                </CardDescription>
              </div>
              <Button onClick={() => setShowAddPlan(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Добавить абонемент
              </Button>
            </CardHeader>
            <CardContent>
              <SubscriptionPlansTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddCoursePriceModal 
        open={showAddPrice} 
        onOpenChange={setShowAddPrice}
      />
      
      <AddSubscriptionPlanModal 
        open={showAddPlan} 
        onOpenChange={setShowAddPlan}
      />
    </div>
  );
}
