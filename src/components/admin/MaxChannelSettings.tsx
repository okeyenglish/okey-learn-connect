import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Plus, 
  Trash2, 
  Power, 
  PowerOff, 
  RefreshCw, 
  Bot,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react';
import { useMaxChannel, MaxChannel } from '@/hooks/useMaxChannel';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export const MaxChannelSettings = () => {
  const { loading, channels, fetchChannels, addChannel, deleteChannel } = useMaxChannel();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelToken, setNewChannelToken] = useState('');
  const [autoStart, setAutoStart] = useState(true);
  const [showToken, setShowToken] = useState(false);
  const [addingChannel, setAddingChannel] = useState(false);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const handleAddChannel = async () => {
    if (!newChannelName.trim() || !newChannelToken.trim()) return;
    
    setAddingChannel(true);
    const result = await addChannel(newChannelName, newChannelToken, autoStart);
    setAddingChannel(false);
    
    if (result) {
      setShowAddDialog(false);
      setNewChannelName('');
      setNewChannelToken('');
      setAutoStart(true);
    }
  };

  const getStatusBadge = (status: MaxChannel['status']) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Онлайн</Badge>;
      case 'starting':
        return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30"><Clock className="h-3 w-3 mr-1 animate-spin" /> Запуск...</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Ошибка</Badge>;
      default:
        return <Badge variant="secondary"><PowerOff className="h-3 w-3 mr-1" /> Офлайн</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                MAX Каналы
              </CardTitle>
              <CardDescription>
                Управление MAX-ботами для приема и отправки сообщений
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchChannels()} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Обновить
              </Button>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить бота
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Добавить MAX бота</DialogTitle>
                    <DialogDescription>
                      Введите токен бота, полученный от @MasterBot в MAX
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="channel-name">Название канала</Label>
                      <Input
                        id="channel-name"
                        placeholder="MAX бот — Окей English Кузьминки"
                        value={newChannelName}
                        onChange={(e) => setNewChannelName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bot-token">Токен бота</Label>
                      <div className="relative">
                        <Input
                          id="bot-token"
                          type={showToken ? 'text' : 'password'}
                          placeholder="Вставьте токен от @MasterBot"
                          value={newChannelToken}
                          onChange={(e) => setNewChannelToken(e.target.value)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowToken(!showToken)}
                        >
                          {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Автозапуск</Label>
                        <p className="text-sm text-muted-foreground">Автоматически запускать бота при добавлении</p>
                      </div>
                      <Switch checked={autoStart} onCheckedChange={setAutoStart} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Отмена
                    </Button>
                    <Button 
                      onClick={handleAddChannel} 
                      disabled={!newChannelName.trim() || !newChannelToken.trim() || addingChannel}
                    >
                      {addingChannel ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Добавление...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Добавить
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {channels.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Нет подключенных MAX-ботов</p>
              <p className="text-sm mt-1">Добавьте первого бота для начала работы</p>
              <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить бота
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Бот</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-center">Сообщений сегодня</TableHead>
                  <TableHead>Последняя активность</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.map((channel) => (
                  <TableRow key={channel.id}>
                    <TableCell className="font-medium">{channel.name}</TableCell>
                    <TableCell>
                      {channel.bot_username ? (
                        <span className="text-primary">@{channel.bot_username}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(channel.status)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span>{channel.messages_today}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {channel.last_heartbeat_at ? (
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(channel.last_heartbeat_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {channel.status === 'online' ? (
                          <Button variant="outline" size="sm" disabled>
                            <PowerOff className="h-4 w-4 mr-1" />
                            Стоп
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" disabled>
                            <Power className="h-4 w-4 mr-1" />
                            Старт
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить MAX канал?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Бот «{channel.name}» будет отключен и удален. Это действие нельзя отменить.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteChannel(channel.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Удалить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Help section */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Как получить токен MAX-бота
            </h4>
            <ol className="mt-2 text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Откройте MAX и найдите @MasterBot</li>
              <li>Отправьте команду /newbot</li>
              <li>Следуйте инструкциям для создания бота</li>
              <li>Скопируйте полученный токен и вставьте его выше</li>
            </ol>
            <a 
              href="https://dev.max.ru/docs/chatbots/bots-coding/library/js" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline"
            >
              Документация MAX Bot API
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};