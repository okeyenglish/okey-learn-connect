import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useStudentExport } from '@/hooks/useStudentExport';

interface ExportStudentsDialogProps {
  children?: React.ReactNode;
}

export const ExportStudentsDialog = ({ children }: ExportStudentsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [exportType, setExportType] = useState<'simple' | 'detailed'>('simple');
  const { exportToExcel, isExporting } = useStudentExport();

  const handleExport = async () => {
    await exportToExcel(exportType === 'detailed');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Экспорт студентов
          </DialogTitle>
          <DialogDescription>
            Выберите тип экспорта данных студентов в Excel
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RadioGroup value={exportType} onValueChange={(value: any) => setExportType(value)}>
            <div className="space-y-4">
              <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="simple" id="simple" />
                <div className="flex-1">
                  <Label
                    htmlFor="simple"
                    className="font-medium leading-none cursor-pointer"
                  >
                    Простой экспорт
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Основная информация о студентах (ФИО, контакты, статус)
                  </p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Включает: номер, ФИО, дата рождения, возраст, пол, телефон, email,
                    статус, филиал
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="detailed" id="detailed" />
                <div className="flex-1">
                  <Label
                    htmlFor="detailed"
                    className="font-medium leading-none cursor-pointer"
                  >
                    Детальный экспорт
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Полная информация включая родителей, группы и оплаты
                  </p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Включает всё из простого экспорта + родители, активные группы,
                    сумма всех оплат, примечания
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center gap-2 text-xs text-amber-600">
                      <Loader2 className="h-3 w-3" />
                      Может занять больше времени при большом количестве студентов
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </RadioGroup>

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="text-sm font-medium">Формат файла</h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Excel (.xlsx)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Файл будет сохранен в формате Excel с именем
              students_YYYY-MM-DD.xlsx
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Экспорт...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Экспортировать
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
