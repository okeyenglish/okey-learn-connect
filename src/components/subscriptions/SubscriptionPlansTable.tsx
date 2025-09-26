import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { 
  useSubscriptionPlans, 
  useDeleteSubscriptionPlan 
} from "@/hooks/useSubscriptionPlans";
import { AddSubscriptionPlanModal } from "./AddSubscriptionPlanModal";

export const SubscriptionPlansTable = () => {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);

  const { data: plans = [], isLoading } = useSubscriptionPlans();
  const deletePlan = useDeleteSubscriptionPlan();

  const getTypeText = (type: string) => {
    switch (type) {
      case 'per_lesson':
        return 'Поурочный';
      case 'monthly':
        return 'Помесячный';
      case 'weekly':
        return 'Понедельный';
      default:
        return type;
    }
  };

  const handleEdit = (plan: any) => {
    setSelectedPlan(plan);
    setEditModalOpen(true);
  };

  const handleDelete = (planId: string) => {
    setPlanToDelete(planId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (planToDelete) {
      await deletePlan.mutateAsync(planToDelete);
      setDeleteModalOpen(false);
      setPlanToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Загрузка тарифных планов...</div>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Тарифные планы</CardTitle>
            <Button onClick={() => setAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Создать план
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Цена</TableHead>
                  <TableHead>Уроки</TableHead>
                  <TableHead>Филиал</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-medium">{plan.name}</div>
                        {plan.description && (
                          <div className="text-sm text-muted-foreground">
                            {plan.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getTypeText(plan.subscription_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{plan.price}₽</div>
                        {plan.price_per_lesson && (
                          <div className="text-sm text-muted-foreground">
                            {plan.price_per_lesson}₽ за урок
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {plan.lessons_count || '-'}
                    </TableCell>
                    <TableCell>
                      {plan.branch || 'Все филиалы'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={plan.is_active ? "default" : "secondary"}
                      >
                        {plan.is_active ? 'Активен' : 'Неактивен'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(plan)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(plan.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {plans.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Тарифные планы не найдены. Создайте новый план.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AddSubscriptionPlanModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        plan={editModalOpen ? selectedPlan : null}
        isEdit={editModalOpen}
      />

      <AddSubscriptionPlanModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        plan={selectedPlan}
        isEdit={true}
      />

      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить тарифный план?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Тарифный план будет удален навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};