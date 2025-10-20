import { useOrganization } from '@/hooks/useOrganization';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Users, Building2, School } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export const SubscriptionSettings = () => {
  const { organization, isLoading } = useOrganization();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Организация не найдена
      </div>
    );
  }

  const getPlanLabel = (plan: string) => {
    const plans: Record<string, string> = {
      free: 'Бесплатный',
      basic: 'Базовый',
      professional: 'Профессиональный',
      enterprise: 'Корпоративный',
    };
    return plans[plan] || plan;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Тарифный план</span>
              <Badge variant="default">
                {getPlanLabel(organization.plan_type)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Статус</span>
              <Badge variant={organization.status === 'active' ? 'default' : 'secondary'}>
                {organization.status === 'active' ? 'Активна' : 
                 organization.status === 'trial' ? 'Пробный период' : 'Неактивна'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {organization.trial_ends_at && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Пробный период до</span>
              <span className="font-medium">
                {format(new Date(organization.trial_ends_at), 'd MMMM yyyy', { locale: ru })}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {organization.subscription_ends_at && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Подписка до</span>
              <span className="font-medium">
                {format(new Date(organization.subscription_ends_at), 'd MMMM yyyy', { locale: ru })}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">Лимиты</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <School className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Студентов</p>
                  <p className="text-2xl font-bold">
                    {organization.max_students ? organization.max_students : '∞'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Пользователей</p>
                  <p className="text-2xl font-bold">
                    {organization.max_users ? organization.max_users : '∞'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Филиалов</p>
                  <p className="text-2xl font-bold">
                    {organization.max_branches ? organization.max_branches : '∞'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
