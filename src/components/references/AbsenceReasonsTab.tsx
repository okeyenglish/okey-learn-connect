import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, CheckCircle, XCircle } from 'lucide-react';
import { useAbsenceReasons } from '@/hooks/useReferences';

export const AbsenceReasonsTab = () => {
  const { data: reasons, isLoading } = useAbsenceReasons();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReasons = (reasons || []).filter(reason =>
    reason.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (reason.description && reason.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatPaymentCoefficient = (coefficient: number) => {
    return `${Math.round(coefficient * 100)}%`;
  };

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Поиск причин..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Добавить причину
        </Button>
      </div>

      {/* Description */}
      <div className="bg-muted/50 p-4 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Коэффициент оплаты:</strong> определяет, какой процент от стоимости урока 
          будет списан при пропуске по данной причине. 0% = урок не оплачивается, 100% = полная оплата.
        </p>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Загрузка...</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Причина</TableHead>
              <TableHead>Описание</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Коэффициент оплаты</TableHead>
              <TableHead>Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReasons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Причины не найдены' : 'Нет причин'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredReasons.map((reason) => (
                <TableRow key={reason.id}>
                  <TableCell className="font-medium">{reason.name}</TableCell>
                  <TableCell>{reason.description || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {reason.is_excused ? (
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Уважительная
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600">
                          <XCircle className="h-3 w-3 mr-1" />
                          Неуважительная
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={reason.payment_coefficient === 0 ? "secondary" : 
                               reason.payment_coefficient === 1 ? "destructive" : "default"}
                      className="font-mono"
                    >
                      {formatPaymentCoefficient(reason.payment_coefficient)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={reason.is_active ? "default" : "secondary"}>
                      {reason.is_active ? 'Активная' : 'Неактивная'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
};