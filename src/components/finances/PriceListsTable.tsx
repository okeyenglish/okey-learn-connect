import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Eye, Edit, Plus, Copy, Trash2, MoreHorizontal, DollarSign, Users, Calendar } from 'lucide-react';
import { CreatePriceListModal } from './CreatePriceListModal';

interface PriceList {
  id: string;
  name: string;
  description?: string;
  branch: string;
  is_active: boolean;
  is_default: boolean;
  valid_from?: string;
  valid_until?: string;
  created_at: string;
  updated_at: string;
}

interface Price {
  id: string;
  price_list_id: string;
  service_name: string;
  service_category: string;
  price: number;
  currency: string;
  unit: string;
  is_active: boolean;
}

export function PriceListsTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [loading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Пока используем пустые массивы, так как соответствующих таблиц еще нет в БД
  const priceLists: PriceList[] = [];
  const samplePrices: Price[] = [];

  const filteredPriceLists = priceLists.filter(priceList => {
    const matchesSearch = 
      priceList.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      priceList.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesBranch = branchFilter === 'all' || priceList.branch === branchFilter;
    
    return matchesSearch && matchesBranch;
  });

  const getStatusBadge = (priceList: PriceList) => {
    if (!priceList.is_active) {
      return <Badge variant="outline">Неактивен</Badge>;
    }
    
    if (priceList.valid_until) {
      const validUntil = new Date(priceList.valid_until);
      const now = new Date();
      if (validUntil < now) {
        return <Badge variant="destructive">Истек</Badge>;
      }
    }
    
    if (priceList.is_default) {
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">По умолчанию</Badge>;
    }
    
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Активен</Badge>;
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

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'individual':
        return 'Индивидуальные';
      case 'group':
        return 'Групповые';
      case 'club':
        return 'Клубы';
      case 'workshop':
        return 'Мастер-классы';
      default:
        return category;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активных прайс-листов</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {priceLists.filter(p => p.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Из {priceLists.length} всего
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Средняя цена урока</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(1850)}
            </div>
            <p className="text-xs text-muted-foreground">
              По всем услугам
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего услуг</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {samplePrices.filter(p => p.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground">
              В активных прайс-листах
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры и поиск */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-4 w-full sm:w-auto">
          <Input
            placeholder="Поиск по названию или описанию..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-[300px]"
          />
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все филиалы</SelectItem>
              <SelectItem value="Окская">Окская</SelectItem>
              <SelectItem value="Мытищи">Мытищи</SelectItem>
              <SelectItem value="Люберцы">Люберцы</SelectItem>
              <SelectItem value="Котельники">Котельники</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <CreatePriceListModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
        >
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Создать прайс-лист
          </Button>
        </CreatePriceListModal>
      </div>

      {/* Таблица прайс-листов */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Филиал</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Период действия</TableHead>
              <TableHead>Услуг</TableHead>
              <TableHead>Обновлен</TableHead>
              <TableHead className="w-[100px]">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPriceLists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {priceLists.length === 0 ? 'Нет прайс-листов' : 'Не найдено прайс-листов по заданным критериям'}
                </TableCell>
              </TableRow>
            ) : (
              filteredPriceLists.map((priceList) => (
                <TableRow key={priceList.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{priceList.name}</p>
                      {priceList.description && (
                        <p className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {priceList.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{priceList.branch}</Badge>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(priceList)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {priceList.valid_from && (
                        <div>С: {formatDate(priceList.valid_from)}</div>
                      )}
                      {priceList.valid_until && (
                        <div>До: {formatDate(priceList.valid_until)}</div>
                      )}
                      {!priceList.valid_from && !priceList.valid_until && (
                        <span className="text-muted-foreground">Без ограничений</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {samplePrices.filter(p => p.price_list_id === priceList.id && p.is_active).length}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(priceList.updated_at)}
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
                          Просмотреть услуги
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="mr-2 h-4 w-4" />
                          Копировать
                        </DropdownMenuItem>
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

      {/* Пример услуг из выбранного прайс-листа */}
      {filteredPriceLists.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Услуги из прайс-листа "{filteredPriceLists[0].name}"</CardTitle>
            <CardDescription>
              Примеры цен на основные услуги
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {samplePrices.map((price) => (
                <div key={price.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <div>
                    <p className="font-medium">{price.service_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {getCategoryLabel(price.service_category)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatAmount(price.price)}</p>
                    <p className="text-sm text-muted-foreground">за {price.unit}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Посмотреть все услуги
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}