import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePaymentTerminals, useCreatePaymentTerminal, useUpdatePaymentTerminal, useDeletePaymentTerminal } from '@/hooks/usePaymentTerminals';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, CreditCard, Building2, TestTube } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const PaymentTerminalsSettings = () => {
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;

  const { data: terminals, isLoading } = usePaymentTerminals(organizationId);
  const { data: branches } = useQuery({
    queryKey: ['organization-branches', organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('organization_branches')
        .select('id, name')
        .eq('organization_id', organizationId!)
        .order('name');
      return data || [];
    },
    enabled: !!organizationId,
  });
  const createTerminal = useCreatePaymentTerminal();
  const updateTerminal = useUpdatePaymentTerminal();
  const deleteTerminal = useDeletePaymentTerminal();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    terminal_key: '',
    terminal_password: '',
    branch_id: '',
    is_test_mode: false,
  });

  const resetForm = () => {
    setFormData({
      terminal_key: '',
      terminal_password: '',
      branch_id: '',
      is_test_mode: false,
    });
    setEditingTerminal(null);
  };

  const handleSubmit = async () => {
    if (!organizationId) return;

    if (editingTerminal) {
      await updateTerminal.mutateAsync({
        id: editingTerminal,
        terminal_key: formData.terminal_key,
        terminal_password: formData.terminal_password,
        branch_id: formData.branch_id || null,
        is_test_mode: formData.is_test_mode,
      });
    } else {
      await createTerminal.mutateAsync({
        organization_id: organizationId,
        terminal_key: formData.terminal_key,
        terminal_password: formData.terminal_password,
        branch_id: formData.branch_id || null,
        is_test_mode: formData.is_test_mode,
      });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (terminal: any) => {
    setFormData({
      terminal_key: terminal.terminal_key,
      terminal_password: terminal.terminal_password,
      branch_id: terminal.branch_id || '',
      is_test_mode: terminal.is_test_mode,
    });
    setEditingTerminal(terminal.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!organizationId) return;
    await deleteTerminal.mutateAsync({ id, organizationId });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Платежные терминалы Т-Банк
            </CardTitle>
            <CardDescription>
              Настройте терминалы для приема онлайн-платежей. Можно настроить отдельный терминал для каждого филиала.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Добавить терминал
              </Button>
            </DialogTrigger>
            <DialogContent className="z-[100]">
              <DialogHeader>
                <DialogTitle>
                  {editingTerminal ? 'Редактировать терминал' : 'Добавить терминал'}
                </DialogTitle>
                <DialogDescription>
                  Введите данные терминала из личного кабинета Т-Банк Эквайринг
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="terminal_key">Terminal Key</Label>
                  <Input
                    id="terminal_key"
                    value={formData.terminal_key}
                    onChange={(e) => setFormData({ ...formData, terminal_key: e.target.value })}
                    placeholder="Введите Terminal Key"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="terminal_password">Пароль терминала</Label>
                  <Input
                    id="terminal_password"
                    type="password"
                    value={formData.terminal_password}
                    onChange={(e) => setFormData({ ...formData, terminal_password: e.target.value })}
                    placeholder="Введите пароль"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch">Филиал (опционально)</Label>
                <Select
                    value={formData.branch_id || "__all__"}
                    onValueChange={(value) => setFormData({ ...formData, branch_id: value === "__all__" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Для всей организации" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Для всей организации</SelectItem>
                      {branches?.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Тестовый режим</Label>
                    <p className="text-sm text-muted-foreground">
                      Использовать тестовую среду Т-Банка
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_test_mode}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_test_mode: checked })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Отмена
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!formData.terminal_key || !formData.terminal_password}
                >
                  {editingTerminal ? 'Сохранить' : 'Добавить'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {terminals && terminals.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Terminal Key</TableHead>
                  <TableHead>Филиал</TableHead>
                  <TableHead>Режим</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terminals.map((terminal) => (
                  <TableRow key={terminal.id}>
                    <TableCell className="font-mono text-sm">
                      {terminal.terminal_key.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {terminal.branch ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {terminal.branch.name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Вся организация</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {terminal.is_test_mode ? (
                        <Badge variant="outline" className="gap-1">
                          <TestTube className="h-3 w-3" />
                          Тест
                        </Badge>
                      ) : (
                        <Badge variant="default">Боевой</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={terminal.is_active ? 'default' : 'secondary'}>
                        {terminal.is_active ? 'Активен' : 'Неактивен'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(terminal)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="z-[100]">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить терминал?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Это действие нельзя отменить. Терминал будет удален и прием платежей прекратится.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(terminal.id)}>
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
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Нет настроенных терминалов</p>
              <p className="text-sm">Добавьте терминал для приема онлайн-платежей</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Инструкция</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <h4 className="font-medium text-foreground mb-1">1. Получите данные терминала</h4>
            <p>Зайдите в личный кабинет Т-Банк Эквайринг и скопируйте Terminal Key и пароль.</p>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-1">2. Настройте Notification URL</h4>
            <p>В личном кабинете Т-Банка укажите URL для уведомлений:</p>
            <code className="block bg-muted px-2 py-1 rounded mt-1">
              https://kbojujfwtvmsgudumown.supabase.co/functions/v1/tbank-webhook
            </code>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-1">3. Тестирование</h4>
            <p>Рекомендуем сначала настроить тестовый терминал для проверки интеграции.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
