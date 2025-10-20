import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface ImportStudentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ColumnMapping {
  source_column: string;
  target_entity: 'client' | 'student' | 'family';
  target_field: string;
  transformation?: string;
  confidence?: number;
}

export function ImportStudentsModal({ open, onOpenChange }: ImportStudentsModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [importStats, setImportStats] = useState<any>(null);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error('Файл пустой');
      }

      setData(jsonData);

      // Анализируем структуру через AI
      const { data: analysisData, error } = await supabase.functions.invoke('import-students', {
        body: { data: jsonData, preview: true }
      });

      if (error) throw error;

      setMapping(analysisData.mapping);
      setPreview(analysisData.preview);
      setSuggestions(analysisData.suggestions || []);

      toast({
        title: "Файл загружен",
        description: `Найдено ${jsonData.length} строк. Проверьте маппинг колонок.`,
      });

    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Ошибка загрузки",
        description: error instanceof Error ? error.message : 'Не удалось загрузить файл',
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  }, [toast]);

  const updateMapping = (index: number, field: string, value: any) => {
    const newMapping = [...mapping];
    newMapping[index] = { ...newMapping[index], [field]: value };
    setMapping(newMapping);
  };

  const handleImport = async () => {
    if (data.length === 0 || mapping.length === 0) {
      toast({
        title: "Нет данных",
        description: "Загрузите файл и настройте маппинг",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Добавляем маппинг к каждой строке
      const dataWithMapping = data.map(row => ({ ...row, __mapping: mapping }));

      const { data: result, error } = await supabase.functions.invoke('import-students', {
        body: { data: dataWithMapping, preview: false }
      });

      if (error) throw error;

      setImportStats(result);

      toast({
        title: "Импорт завершен",
        description: `Создано: ${result.students_created} учеников, ${result.clients_created} контактов, ${result.families_created} семей`,
      });

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Ошибка импорта",
        description: error instanceof Error ? error.message : 'Не удалось импортировать данные',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData([]);
    setMapping([]);
    setPreview([]);
    setSuggestions([]);
    setImportStats(null);
  };

  const entityColors = {
    client: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    student: 'bg-green-500/10 text-green-700 dark:text-green-400',
    family: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Импорт учеников
          </DialogTitle>
        </DialogHeader>

        {importStats ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-green-600 dark:text-green-400">
              <CheckCircle className="h-6 w-6" />
              Импорт завершен
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">{importStats.total}</div>
                <div className="text-sm text-muted-foreground">Всего строк</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">{importStats.students_created}</div>
                <div className="text-sm text-muted-foreground">Учеников создано</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{importStats.clients_created}</div>
                <div className="text-sm text-muted-foreground">Контактов создано</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{importStats.families_created}</div>
                <div className="text-sm text-muted-foreground">Семей создано</div>
              </div>
            </div>

            {importStats.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">Ошибки ({importStats.errors.length})</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 text-sm">
                  {importStats.errors.map((error: string, i: number) => (
                    <div key={i} className="text-red-600 dark:text-red-400">{error}</div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={() => { reset(); onOpenChange(false); }} className="w-full">
              Закрыть
            </Button>
          </div>
        ) : data.length === 0 ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-12 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Загрузите файл Excel или CSV</p>
              <p className="text-sm text-muted-foreground mb-4">
                AI автоматически определит структуру и предложит маппинг колонок
              </p>
              <label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={analyzing}
                />
                <Button disabled={analyzing} asChild>
                  <span>
                    {analyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Анализ...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Выбрать файл
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-semibold">Поддерживаемые форматы:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Excel (.xlsx, .xls)</li>
                <li>CSV (.csv)</li>
              </ul>
              <p className="font-semibold mt-4">Система автоматически:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Определит какие колонки относятся к родителям, а какие к детям</li>
                <li>Найдет существующие контакты по телефону</li>
                <li>Создаст семейные группы</li>
                <li>Нормализует телефоны и даты</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-2">
                <p className="font-semibold text-sm">Рекомендации AI:</p>
                {suggestions.map((s, i) => (
                  <p key={i} className="text-sm">{s}</p>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <h3 className="font-semibold">Маппинг колонок</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Колонка в файле</TableHead>
                      <TableHead>Сущность</TableHead>
                      <TableHead>Поле</TableHead>
                      <TableHead>Уверенность</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mapping.map((m, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{m.source_column}</TableCell>
                        <TableCell>
                          <Select
                            value={m.target_entity}
                            onValueChange={(v) => updateMapping(i, 'target_entity', v)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="client">Родитель</SelectItem>
                              <SelectItem value="student">Ученик</SelectItem>
                              <SelectItem value="family">Семья</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={m.target_field}
                            onValueChange={(v) => updateMapping(i, 'target_field', v)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {m.target_entity === 'client' && (
                                <>
                                  <SelectItem value="name">Имя</SelectItem>
                                  <SelectItem value="first_name">Имя (отдельно)</SelectItem>
                                  <SelectItem value="last_name">Фамилия</SelectItem>
                                  <SelectItem value="phone">Телефон</SelectItem>
                                  <SelectItem value="email">Email</SelectItem>
                                  <SelectItem value="branch">Филиал</SelectItem>
                                  <SelectItem value="notes">Заметки</SelectItem>
                                </>
                              )}
                              {m.target_entity === 'student' && (
                                <>
                                  <SelectItem value="name">Имя</SelectItem>
                                  <SelectItem value="first_name">Имя (отдельно)</SelectItem>
                                  <SelectItem value="last_name">Фамилия</SelectItem>
                                  <SelectItem value="middle_name">Отчество</SelectItem>
                                  <SelectItem value="age">Возраст</SelectItem>
                                  <SelectItem value="date_of_birth">Дата рождения</SelectItem>
                                  <SelectItem value="phone">Телефон</SelectItem>
                                  <SelectItem value="level">Уровень</SelectItem>
                                  <SelectItem value="notes">Заметки</SelectItem>
                                </>
                              )}
                              {m.target_entity === 'family' && (
                                <SelectItem value="name">Название семьи</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {m.confidence && (
                            <Badge className={entityColors[m.target_entity]}>
                              {Math.round(m.confidence * 100)}%
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Предпросмотр данных</h3>
              <div className="border rounded-lg overflow-x-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(preview[0] || {}).map((key) => (
                        <TableHead key={key}>{key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row, i) => (
                      <TableRow key={i}>
                        {Object.values(row).map((val: any, j) => (
                          <TableCell key={j} className="text-sm">
                            {String(val)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={reset} variant="outline" className="flex-1">
                Отмена
              </Button>
              <Button onClick={handleImport} disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Импорт...
                  </>
                ) : (
                  `Импортировать ${data.length} записей`
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
