import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useAllNotifications,
  useBroadcastCampaigns,
  useCreateNotification,
  useCreateBroadcastCampaign,
  useLaunchCampaign,
  useDeleteCampaign,
} from '@/hooks/useNotifications';
import {
  Bell,
  Send,
  Mail,
  MessageSquare,
  Users,
  Plus,
  Trash2,
  Play,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const notificationTypes = [
  { value: 'info', label: 'Информация', icon: Bell },
  { value: 'reminder', label: 'Напоминание', icon: Clock },
  { value: 'payment', label: 'Оплата', icon: AlertCircle },
  { value: 'schedule', label: 'Расписание', icon: Calendar },
  { value: 'broadcast', label: 'Рассылка', icon: Send },
];

const statusMap = {
  draft: { label: 'Черновик', variant: 'secondary' as const, icon: Clock },
  scheduled: { label: 'Запланирована', variant: 'default' as const, icon: Calendar },
  completed: { label: 'Отправлена', variant: 'outline' as const, icon: CheckCircle },
  failed: { label: 'Ошибка', variant: 'destructive' as const, icon: AlertCircle },
};

export const CommunicationsSection = () => {
  const [showCreateNotification, setShowCreateNotification] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  
  // Форма уведомления
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('info');
  
  // Форма рассылки
  const [campaignName, setCampaignName] = useState('');
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignMessage, setCampaignMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState('all_students');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [deliveryMethods, setDeliveryMethods] = useState<string[]>(['in_app']);

  const { data: notifications = [] } = useAllNotifications();
  const { data: campaigns = [] } = useBroadcastCampaigns();
  
  const createNotification = useCreateNotification();
  const createCampaign = useCreateBroadcastCampaign();
  const launchCampaign = useLaunchCampaign();
  const deleteCampaign = useDeleteCampaign();

  const handleCreateNotification = async () => {
    if (!notificationTitle || !notificationMessage) return;

    await createNotification.mutateAsync({
      recipient_id: '', // Нужно добавить выбор получателя
      title: notificationTitle,
      message: notificationMessage,
      notification_type: notificationType,
      status: 'sent',
      delivery_method: ['in_app'],
    } as any);

    setShowCreateNotification(false);
    setNotificationTitle('');
    setNotificationMessage('');
  };

  const handleCreateCampaign = async () => {
    if (!campaignName || !campaignTitle || !campaignMessage) return;

    const filters = targetAudience === 'by_branch' ? { branch: selectedBranch } : {};

    await createCampaign.mutateAsync({
      name: campaignName,
      title: campaignTitle,
      message: campaignMessage,
      target_audience: targetAudience,
      filters,
      delivery_method: deliveryMethods,
      status: 'draft',
    });

    setShowCreateCampaign(false);
    resetCampaignForm();
  };

  const resetCampaignForm = () => {
    setCampaignName('');
    setCampaignTitle('');
    setCampaignMessage('');
    setTargetAudience('all_students');
    setSelectedBranch('');
    setDeliveryMethods(['in_app']);
  };

  const handleLaunchCampaign = async (campaignId: string) => {
    if (confirm('Отправить рассылку сейчас?')) {
      await launchCampaign.mutateAsync(campaignId);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Коммуникации</h1>
          <p className="text-muted-foreground">
            Уведомления, рассылки и история общения со студентами
          </p>
        </div>
      </div>

      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="campaigns" className="gap-2">
            <Send className="h-4 w-4" />
            Рассылки
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Уведомления
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Массовые рассылки</CardTitle>
                  <CardDescription>
                    Создавайте и отправляйте уведомления группам студентов
                  </CardDescription>
                </div>
                <Dialog open={showCreateCampaign} onOpenChange={setShowCreateCampaign}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Создать рассылку
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Новая рассылка</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Название рассылки</Label>
                        <Input
                          value={campaignName}
                          onChange={(e) => setCampaignName(e.target.value)}
                          placeholder="Например: Напоминание об оплате"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Заголовок уведомления</Label>
                        <Input
                          value={campaignTitle}
                          onChange={(e) => setCampaignTitle(e.target.value)}
                          placeholder="Что увидят студенты"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Сообщение</Label>
                        <Textarea
                          value={campaignMessage}
                          onChange={(e) => setCampaignMessage(e.target.value)}
                          placeholder="Текст уведомления..."
                          rows={5}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Целевая аудитория</Label>
                          <Select value={targetAudience} onValueChange={setTargetAudience}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all_students">Все студенты</SelectItem>
                              <SelectItem value="active_students">Активные студенты</SelectItem>
                              <SelectItem value="low_balance">С низким балансом</SelectItem>
                              <SelectItem value="by_branch">По филиалу</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {targetAudience === 'by_branch' && (
                          <div className="space-y-2">
                            <Label>Филиал</Label>
                            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите филиал" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Окская">Окская</SelectItem>
                                <SelectItem value="Центр">Центр</SelectItem>
                                <SelectItem value="Онлайн">Онлайн</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Способы доставки</Label>
                        <div className="flex gap-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="in_app"
                              checked={deliveryMethods.includes('in_app')}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setDeliveryMethods([...deliveryMethods, 'in_app']);
                                } else {
                                  setDeliveryMethods(
                                    deliveryMethods.filter((m) => m !== 'in_app')
                                  );
                                }
                              }}
                            />
                            <label htmlFor="in_app" className="text-sm cursor-pointer">
                              В приложении
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="email" disabled />
                            <label htmlFor="email" className="text-sm text-muted-foreground">
                              Email (скоро)
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="sms" disabled />
                            <label htmlFor="sms" className="text-sm text-muted-foreground">
                              SMS (скоро)
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowCreateCampaign(false)}>
                          Отмена
                        </Button>
                        <Button onClick={handleCreateCampaign}>Создать</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {campaigns.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Нет рассылок
                  </div>
                ) : (
                  <div className="space-y-3">
                    {campaigns.map((campaign) => {
                      const StatusIcon =
                        statusMap[campaign.status as keyof typeof statusMap]?.icon ||
                        AlertCircle;
                      return (
                        <Card key={campaign.id}>
                          <CardContent className="pt-4">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <h3 className="font-semibold">{campaign.name}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {campaign.title}
                                  </p>
                                </div>
                                <Badge
                                  variant={
                                    statusMap[campaign.status as keyof typeof statusMap]
                                      ?.variant || 'secondary'
                                  }
                                  className="gap-1"
                                >
                                  <StatusIcon className="h-3 w-3" />
                                  {statusMap[campaign.status as keyof typeof statusMap]
                                    ?.label || campaign.status}
                                </Badge>
                              </div>

                              <p className="text-sm">{campaign.message}</p>

                              <div className="flex items-center justify-between pt-2 border-t">
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>
                                    <Users className="h-3 w-3 inline mr-1" />
                                    {campaign.total_recipients} получателей
                                  </span>
                                  {campaign.sent_count > 0 && (
                                    <span>
                                      <CheckCircle className="h-3 w-3 inline mr-1 text-green-600" />
                                      {campaign.sent_count} отправлено
                                    </span>
                                  )}
                                </div>

                                <div className="flex gap-2">
                                  {campaign.status === 'draft' && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleLaunchCampaign(campaign.id)}
                                      className="gap-1"
                                    >
                                      <Play className="h-3 w-3" />
                                      Отправить
                                    </Button>
                                  )}
                                  {campaign.status === 'draft' && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => deleteCampaign.mutate(campaign.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>История уведомлений</CardTitle>
              <CardDescription>Все отправленные уведомления</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {notifications.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Нет уведомлений
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((notification) => {
                      const TypeIcon =
                        notificationTypes.find((t) => t.value === notification.notification_type)
                          ?.icon || Bell;
                      return (
                        <div
                          key={notification.id}
                          className="flex items-start gap-3 p-3 rounded-lg border"
                        >
                          <TypeIcon className="h-4 w-4 text-muted-foreground mt-1" />
                          <div className="flex-1 space-y-1">
                            <p className="font-medium">{notification.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(notification.created_at), 'dd MMM yyyy, HH:mm', {
                                locale: ru,
                              })}
                            </p>
                          </div>
                          <Badge variant={notification.read_at ? 'outline' : 'default'}>
                            {notification.read_at ? 'Прочитано' : 'Новое'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
