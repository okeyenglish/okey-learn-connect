import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSubscriptionPlans, useDeleteSubscriptionPlan, SubscriptionPlan } from "@/hooks/useSubscriptionPlans";
import { EditSubscriptionPlanModal } from "./EditSubscriptionPlanModal";
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

export function SubscriptionPlansTable() {
  const { data: plans, isLoading } = useSubscriptionPlans();
  const deletePlan = useDeleteSubscriptionPlan();
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<SubscriptionPlan | null>(null);

  const handleDelete = async () => {
    if (deletingPlan) {
      await deletePlan.mutateAsync(deletingPlan.id);
      setDeletingPlan(null);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'per_lesson': return 'Поурочный';
      case 'monthly': return 'Месячный';
      case 'weekly': return 'Недельный';
      default: return type;
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Занятий</TableHead>
              <TableHead>Цена</TableHead>
              <TableHead>Филиал</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!plans || plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Нет абонементов
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>{getTypeLabel(plan.subscription_type)}</TableCell>
                  <TableCell>
                    {plan.lessons_count ? `${plan.lessons_count} занятий` : '—'}
                  </TableCell>
                  <TableCell>{plan.price.toLocaleString('ru-RU')} ₽</TableCell>
                  <TableCell>{plan.branch || 'Все'}</TableCell>
                  <TableCell>
                    <Badge variant={plan.is_active ? "default" : "secondary"}>
                      {plan.is_active ? 'Активен' : 'Неактивен'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingPlan(plan)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingPlan(plan)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editingPlan && (
        <EditSubscriptionPlanModal
          plan={editingPlan}
          open={!!editingPlan}
          onOpenChange={(open) => !open && setEditingPlan(null)}
        />
      )}

      <AlertDialog open={!!deletingPlan} onOpenChange={(open) => !open && setDeletingPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить абонемент?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить абонемент "{deletingPlan?.name}"? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
