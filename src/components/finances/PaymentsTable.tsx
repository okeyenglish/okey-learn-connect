import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Eye, Edit, Trash2, MoreHorizontal, RefreshCw, XCircle } from 'lucide-react';
import { useFinances } from '@/hooks/useFinances';

export function PaymentsTable() {
  const { payments, loading } = useFinances();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesMethod = methodFilter === 'all' || payment.payment_method === methodFilter;
    
    return matchesSearch && matchesStatus && matchesMethod;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Завершен</Badge>;
      case 'pending':
        return <Badge variant="secondary">В обработке</Badge>;
      case 'failed':
        return <Badge variant="destructive">Ошибка</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Отменен</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Наличные';
      case 'card':
        return 'Банковская карта';
      case 'bank_transfer':
        return 'Банковский перевод';
      case 'online':
        return 'Онлайн платеж';
      default:
        return method;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Поиск по описанию или примечаниям..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="pending">В обработке</SelectItem>
              <SelectItem value="completed">Завершен</SelectItem>
              <SelectItem value="failed">Ошибка</SelectItem>
              <SelectItem value="cancelled">Отменен</SelectItem>
            </SelectContent>
          </Select>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Способ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все способы</SelectItem>
              <SelectItem value="cash">Наличные</SelectItem>
              <SelectItem value="card">Карта</SelectItem>
              <SelectItem value="bank_transfer">Перевод</SelectItem>
              <SelectItem value="online">Онлайн</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Таблица */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Сумма</TableHead>
              <TableHead>Способ оплаты</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Описание</TableHead>
              <TableHead>Дата платежа</TableHead>
              <TableHead>Создан</TableHead>
              <TableHead className="w-[100px]">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {payments.length === 0 ? 'Нет платежей' : 'Не найдено платежей по заданным критериям'}
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {formatAmount(payment.amount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-muted" />
                      {getMethodLabel(payment.payment_method)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(payment.status)}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px] truncate" title={payment.description}>
                      {payment.description || '—'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatDate(payment.payment_date)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(payment.created_at)}
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
                          Просмотреть
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Редактировать
                        </DropdownMenuItem>
                        {payment.status === 'failed' && (
                          <DropdownMenuItem>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Повторить
                          </DropdownMenuItem>
                        )}
                        {payment.status === 'pending' && (
                          <DropdownMenuItem className="text-red-600">
                            <XCircle className="mr-2 h-4 w-4" />
                            Отменить
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Удалить
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

      {/* Статистика внизу */}
      {filteredPayments.length > 0 && (
        <div className="flex justify-between items-center text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <span>Показано {filteredPayments.length} из {payments.length} платежей</span>
          <span>
            Общая сумма: {filteredPayments
              .filter(p => p.status === 'completed')
              .reduce((sum, p) => sum + p.amount, 0)
              .toLocaleString('ru-RU')} ₽
          </span>
        </div>
      )}
    </div>
  );
}