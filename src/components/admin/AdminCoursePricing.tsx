import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CoursePricingTable } from "./pricing/CoursePricingTable";
import { SubscriptionPlansTable } from "./pricing/SubscriptionPlansTable";
import { AddCoursePriceModal } from "./pricing/AddCoursePriceModal";

export function AdminCoursePricing() {
  const [showAddPrice, setShowAddPrice] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Курсы и цены</h1>
        <p className="text-muted-foreground">Управление курсами, стоимостью и абонементами</p>
      </div>

      <Tabs defaultValue="individual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="individual">Индивидуально</TabsTrigger>
          <TabsTrigger value="group">Групповые занятия</TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Индивидуальные занятия</CardTitle>
                <CardDescription>
                  Управление ценами за индивидуальные занятия
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

        <TabsContent value="group" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Групповые занятия</CardTitle>
              <CardDescription>
                Управление ценами за групповые занятия и абонементами (8, 24, 80 занятий)
              </CardDescription>
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
    </div>
  );
}
