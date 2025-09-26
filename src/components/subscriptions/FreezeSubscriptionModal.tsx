import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Subscription, useFreezeSubscription } from "@/hooks/useSubscriptions";
import { Snowflake, AlertCircle } from "lucide-react";

interface FreezeSubscriptionModalProps {
  subscription: Subscription;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FreezeSubscriptionModal = ({ 
  subscription, 
  open, 
  onOpenChange 
}: FreezeSubscriptionModalProps) => {
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    reason: "",
  });

  const freezeSubscription = useFreezeSubscription();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.start_date || !formData.end_date || !formData.reason.trim()) {
      return;
    }

    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      return;
    }

    try {
      await freezeSubscription.mutateAsync({
        subscriptionId: subscription.id,
        startDate: formData.start_date,
        endDate: formData.end_date,
        reason: formData.reason,
      });
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error freezing subscription:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      start_date: "",
      end_date: "",
      reason: "",
    });
  };

  const getDaysDifference = () => {
    if (!formData.start_date || !formData.end_date) return 0;
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const isFormValid = () => {
    return (
      formData.start_date &&
      formData.end_date &&
      formData.reason.trim() &&
      new Date(formData.start_date) < new Date(formData.end_date)
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Snowflake className="h-5 w-5" />
            Заморозка абонемента
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Абонемент "{subscription.name}" будет заморожен на указанный период. 
              {subscription.subscription_type === 'per_lesson' 
                ? ' Уроки не будут списываться в период заморозки.'
                : ' Срок действия абонемента будет продлен на период заморозки.'
              }
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Дата начала заморозки *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Дата окончания заморозки *</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                min={formData.start_date || new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            {formData.start_date && formData.end_date && (
              <div className="text-sm text-muted-foreground">
                Период заморозки: {getDaysDifference()} дней
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Причина заморозки *</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Укажите причину заморозки абонемента"
                rows={3}
                required
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  onOpenChange(false);
                  resetForm();
                }}
              >
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={!isFormValid() || freezeSubscription.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {freezeSubscription.isPending ? 'Заморозка...' : 'Заморозить'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};