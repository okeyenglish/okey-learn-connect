import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Eye, Edit, Plus, Minus, MoreHorizontal, Gift, TrendingUp, TrendingDown } from 'lucide-react';
import { useFinances } from '@/hooks/useFinances';
import { BonusManagementModal } from './BonusManagementModal';

export function BonusAccountsTable() {
  const { bonusAccounts, loading } = useFinances();
  const [searchTerm, setSearchTerm] = useState('');
  const [showBonusModal, setShowBonusModal] = useState(false);

  const filteredAccounts = bonusAccounts.filter(account => {
    // В реальном приложении здесь будет поиск по имени студента
    return true;
  });

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ru-RU');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const totalBonusBalance = bonusAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalBonusEarned = bonusAccounts.reduce((sum, acc) => sum + acc.total_earned, 0);
  const totalBonusSpent = bonusAccounts.reduce((sum, acc) => sum + acc.total_spent, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Статистика бонусной системы */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общий баланс</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(totalBonusBalance)} б.
            </div>
            <p className="text-xs text-muted-foreground">
              У {bonusAccounts.length} клиентов
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего начислено</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +{formatAmount(totalBonusEarned)} б.
            </div>
            <p className="text-xs text-muted-foreground">
              За весь период
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего потрачено</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -{formatAmount(totalBonusSpent)} б.
            </div>
            <p className="text-xs text-muted-foreground">
              За весь период
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Поиск и фильтры */}
      <div className="flex justify-between items-center">
        <Input
          placeholder="Поиск по имени студента..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <BonusManagementModal
          open={showBonusModal}
          onOpenChange={setShowBonusModal}
        >
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Начислить бонусы
          </Button>
        </BonusManagementModal>
      </div>

      {/* Таблица бонусных счетов */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Студент</TableHead>
              <TableHead>Текущий баланс</TableHead>
              <TableHead>Всего начислено</TableHead>
              <TableHead>Всего потрачено</TableHead>
              <TableHead>Последняя активность</TableHead>
              <TableHead>Создан</TableHead>
              <TableHead className="w-[100px]">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bonusAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Нет бонусных счетов
                </TableCell>
              </TableRow>
            ) : (
              bonusAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">
                    {/* В реальном приложении здесь будет имя студента */}
                    <div>
                      <p className="font-medium">Студент #{account.student_id?.slice(-6)}</p>
                      <p className="text-sm text-muted-foreground">ID: {account.student_id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={account.balance > 0 ? "default" : "secondary"}
                        className={account.balance > 0 ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                      >
                        {formatAmount(account.balance)} б.
                      </Badge>
                      {account.balance > 1000 && (
                        <Gift className="h-4 w-4 text-yellow-600" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-green-600 font-medium">
                    +{formatAmount(account.total_earned)} б.
                  </TableCell>
                  <TableCell className="text-red-600 font-medium">
                    -{formatAmount(account.total_spent)} б.
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(account.updated_at)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(account.created_at)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          Просмотреть историю
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Plus className="mr-2 h-4 w-4" />
                          Начислить бонусы
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Minus className="mr-2 h-4 w-4" />
                          Списать бонусы
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Корректировка
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Информация о бонусной программе */}
      <Card>
        <CardHeader>
          <CardTitle>Настройки бонусной программы</CardTitle>
          <CardDescription>
            Конфигурация программы лояльности и бонусных начислений
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">Начисление бонусов</h4>
              <p className="text-sm text-muted-foreground">
                • 5% от суммы платежа при оплате занятий<br/>
                • 10% при приведении нового студента<br/>
                • 2% за каждый посещенный урок без пропусков
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Использование бонусов</h4>
              <p className="text-sm text-muted-foreground">
                • Оплата до 30% стоимости занятий<br/>
                • Покупка дополнительных материалов<br/>
                • Участие в мастер-классах и мероприятиях
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}