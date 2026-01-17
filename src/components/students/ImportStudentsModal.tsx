import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Info, MapPin } from "lucide-react";
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganization } from "@/hooks/useOrganization";

interface ImportStudentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportStats {
  total: number;
  success: number;
  errors: string[];
}

export function ImportStudentsModal({ open, onOpenChange }: ImportStudentsModalProps) {
  const { branches } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>('');

  const processFile = useCallback(async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error('Файл пустой');
      }

      setData(jsonData);
      toast.success(`Загружено ${jsonData.length} строк`);

    } catch (error) {
      console.error('File upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить файл');
    }
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      
      if (validTypes.includes(file.type) || file.name.endsWith('.csv')) {
        processFile(file);
      } else {
        toast.error('Поддерживаются только Excel и CSV файлы');
      }
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleImport = async () => {
    if (data.length === 0) {
      toast.error('Загрузите файл для импорта');
      return;
    }

    setLoading(true);
    const stats: ImportStats = {
      total: data.length,
      success: 0,
      errors: []
    };

    try {
      for (const row of data) {
        try {
          // Подготовка данных студента
          const studentData: any = {
            first_name: row['Имя'] || row['first_name'] || '',
            last_name: row['Фамилия'] || row['last_name'] || '',
            middle_name: row['Отчество'] || row['middle_name'] || '',
            date_of_birth: row['Дата рождения'] || row['date_of_birth'] || null,
            age: row['Возраст'] || row['age'] || null,
            phone: row['Телефон'] || row['phone'] || null,
            status: row['Статус'] || row['status'] || 'active',
            notes: row['Примечания'] || row['notes'] || null,
          };

          // Генерация имени студента
          studentData.name = `${studentData.last_name} ${studentData.first_name}`.trim() || 'Без имени';
          
          // Добавляем филиал если выбран
          if (selectedBranch) {
            studentData.branch = selectedBranch;
          }

          // Создание студента
          const { error } = await supabase
            .from('students')
            .insert(studentData as any);

          if (error) throw error;

          stats.success++;
        } catch (rowError) {
          console.error('Row import error:', rowError);
          stats.errors.push(
            `Строка ${stats.errors.length + 1}: ${rowError instanceof Error ? rowError.message : 'Неизвестная ошибка'}`
          );
        }
      }

      setImportStats(stats);
      toast.success(`Импортировано ${stats.success} из ${stats.total} студентов`);

    } catch (error) {
      console.error('Import error:', error);
      toast.error('Ошибка при импорте данных');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData([]);
    setImportStats(null);
    setSelectedBranch('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Импорт студентов
          </DialogTitle>
        </DialogHeader>

        {importStats ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-green-600">
              <CheckCircle className="h-6 w-6" />
              Импорт завершен
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">{importStats.total}</div>
                <div className="text-sm text-muted-foreground">Всего строк</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">{importStats.success}</div>
                <div className="text-sm text-muted-foreground">Успешно</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-red-600">{importStats.errors.length}</div>
                <div className="text-sm text-muted-foreground">Ошибок</div>
              </div>
            </div>

            {importStats.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">Ошибки ({importStats.errors.length})</span>
                </div>
                <ScrollArea className="h-48 border rounded-lg p-4">
                  <div className="space-y-1 text-sm">
                    {importStats.errors.map((error: string, i: number) => (
                      <div key={i} className="text-red-600">{error}</div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => { reset(); onOpenChange(false); }} className="w-full">
                Закрыть
              </Button>
            </DialogFooter>
          </div>
        ) : data.length === 0 ? (
          <div className="space-y-4">
            <div 
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Перетащите файл или выберите</p>
              <p className="text-sm text-muted-foreground mb-4">
                Поддерживаются файлы Excel (.xlsx, .xls) и CSV
              </p>
              <label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Выбрать файл
                  </span>
                </Button>
              </label>
            </div>

            <div className="rounded-lg bg-muted p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="font-semibold">Формат файла Excel/CSV:</p>
                  <div className="space-y-1 text-muted-foreground">
                    <p><strong>Фамилия</strong> - Фамилия студента</p>
                    <p><strong>Имя</strong> - Имя студента</p>
                    <p><strong>Отчество</strong> - Отчество студента (необязательно)</p>
                    <p><strong>Дата рождения</strong> - В формате YYYY-MM-DD (необязательно)</p>
                    <p><strong>Возраст</strong> - Возраст в годах (необязательно)</p>
                    <p><strong>Телефон</strong> - Номер телефона (необязательно)</p>
                    <p><strong>Статус</strong> - active/inactive/trial/graduated (необязательно, по умолчанию active)</p>
                    <p><strong>Примечания</strong> - Дополнительная информация (необязательно)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Branch Selection */}
            <div className="flex items-end gap-2 p-3 bg-muted/50 rounded-lg">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="import-branch" className="flex items-center gap-1.5 text-sm">
                  <MapPin className="h-3.5 w-3.5" />
                  Филиал для импортируемых студентов
                </Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger id="import-branch">
                    <SelectValue placeholder="Выберите филиал (рекомендуется)" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.name}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Предпросмотр данных ({data.length} строк)</h3>
              <ScrollArea className="h-[350px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(data[0] || {}).map((key) => (
                        <TableHead key={key} className="font-semibold">{key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.slice(0, 10).map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {Object.keys(row).map((key) => (
                          <TableCell key={key} className="text-sm">
                            {row[key] || '—'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              {data.length > 10 && (
                <p className="text-sm text-muted-foreground text-center">
                  Показано 10 из {data.length} строк
                </p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button onClick={reset} variant="outline">
                Отмена
              </Button>
              <Button onClick={handleImport} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Импорт...
                  </>
                ) : (
                  <>
                    Импортировать {data.length} студентов
                    {selectedBranch && <Badge variant="secondary" className="ml-2">{selectedBranch}</Badge>}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
