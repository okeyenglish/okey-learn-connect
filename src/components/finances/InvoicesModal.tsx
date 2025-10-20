import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInvoices, useUpdateInvoice } from '@/hooks/useInvoices';
import { Loader2, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { exportScheduleToExcel } from '@/utils/scheduleExport';

interface InvoicesModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const InvoicesModal: React.FC<InvoicesModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data: invoices, isLoading } = useInvoices({ status: statusFilter || undefined });
  const updateInvoice = useUpdateInvoice();

  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    await updateInvoice.mutateAsync({
      id: invoiceId,
      updates: { status: newStatus as any },
    });
  };

  const handleExport = () => {
    if (!invoices) return;

    const exportData = invoices.map((inv) => ({
      'Номер счета': inv.invoice_number,
      'Студент': inv.students ? `${inv.students.first_name} ${inv.students.last_name}` : '-',
      'Дата': format(new Date(inv.invoice_date), 'd MMMM yyyy', { locale: ru }),
      'Срок оплаты': format(new Date(inv.due_date), 'd MMMM yyyy', { locale: ru }),
      'Сумма': inv.amount,
      'Валюта': inv.currency,
      'Статус': getStatusLabel(inv.status),
      'Примечания': inv.notes || '-',
    }));

    // Используем существующую функцию экспорта
    const XLSX = require('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Счета');
    XLSX.writeFile(wb, `invoices_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: 'Ожидает оплаты',
      paid: 'Оплачен',
      overdue: 'Просрочен',
      cancelled: 'Отменен',
    };
    return labels[status] || status;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          Счета
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Счета на оплату</span>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Все статусы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Все статусы</SelectItem>
                  <SelectItem value="pending">Ожидает оплаты</SelectItem>
                  <SelectItem value="paid">Оплачен</SelectItem>
                  <SelectItem value="overdue">Просрочен</SelectItem>
                  <SelectItem value="cancelled">Отменен</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={!invoices?.length}>
                <Download className="h-4 w-4 mr-2" />
                Экспорт
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {invoices?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Нет счетов</p>
            ) : (
              invoices?.map((invoice) => (
                <Card key={invoice.id}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Номер счета</p>
                        <p className="font-medium">{invoice.invoice_number}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Студент</p>
                        <p className="font-medium">
                          {invoice.students
                            ? `${invoice.students.first_name} ${invoice.students.last_name}`
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Дата</p>
                        <p className="font-medium">
                          {format(new Date(invoice.invoice_date), 'd MMMM yyyy', { locale: ru })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Срок оплаты</p>
                        <p className="font-medium">
                          {format(new Date(invoice.due_date), 'd MMMM yyyy', { locale: ru })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Сумма</p>
                        <p className="font-medium text-lg">
                          {invoice.amount} {invoice.currency}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Статус</p>
                        <Select
                          value={invoice.status}
                          onValueChange={(value) => handleStatusChange(invoice.id, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Ожидает оплаты</SelectItem>
                            <SelectItem value="paid">Оплачен</SelectItem>
                            <SelectItem value="overdue">Просрочен</SelectItem>
                            <SelectItem value="cancelled">Отменен</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {invoice.notes && (
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground">Примечания</p>
                          <p className="text-sm">{invoice.notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
