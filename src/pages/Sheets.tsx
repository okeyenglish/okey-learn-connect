import { useState, useEffect, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, CellValueChangedEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { supabase } from '@/integrations/supabase/typedClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface Sheet {
  id: string;
  name: string;
  slug: string;
  table_name: string;
  created_at: string;
}

interface Column {
  name: string;
  data_type: string;
  is_required: boolean;
  position: number;
}

const defaultColumnsJson = `[
  {"name":"Название","data_type":"text","is_required":true},
  {"name":"Количество","data_type":"integer","is_required":false,"default_expr":"0"},
  {"name":"Активен","data_type":"boolean","is_required":false,"default_expr":"false"}
]`;

export default function Sheets() {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [currentSheet, setCurrentSheet] = useState<Sheet | null>(null);
  const [rowData, setRowData] = useState<any[]>([]);
  const [columnDefs, setColumnDefs] = useState<ColDef[]>([]);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [colsJson, setColsJson] = useState(defaultColumnsJson);
  const gridRef = useRef<AgGridReact>(null);

  // Load sheets list
  const loadSheets = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_sheets');

    if (error) {
      toast.error('Ошибка загрузки листов: ' + error.message);
      return;
    }

    setSheets(data || []);
    if (data && data.length > 0 && !currentSheet) {
      setCurrentSheet(data[0]);
    }
  }, [currentSheet]);

  // Get columns for a sheet
  const getColumns = useCallback(async (sheetId: string): Promise<Column[]> => {
    const { data, error } = await supabase.rpc('get_sheet_columns', { p_sheet_id: sheetId });

    if (error) {
      toast.error('Ошибка загрузки колонок: ' + error.message);
      return [];
    }

    // Add system columns
    const systemCols: Column[] = [
      { name: 'id', data_type: 'text', is_required: false, position: -3 },
      { name: 'created_at', data_type: 'timestamptz', is_required: false, position: -2 },
      { name: 'updated_at', data_type: 'timestamptz', is_required: false, position: -1 },
    ];

    return [...systemCols, ...(data || [])];
  }, []);

  // Convert columns to AG Grid column definitions
  const toColumnDefs = useCallback((cols: Column[]): ColDef[] => {
    return cols.map(c => ({
      headerName: c.name,
      field: c.name,
      editable: !['id', 'created_at', 'updated_at', 'org_id', 'created_by'].includes(c.name),
      sortable: true,
      filter: true,
      resizable: true,
      hide: ['org_id', 'created_by'].includes(c.name),
    }));
  }, []);

  // Load rows for current sheet
  const loadRows = useCallback(async () => {
    if (!currentSheet) return;

    const cols = await getColumns(currentSheet.id);
    setColumnDefs(toColumnDefs(cols));

    // Use RPC to query dynamic table
    const { data, error } = await supabase.rpc('get_sheet_data', {
      p_table_name: currentSheet.table_name
    });

    if (error) {
      toast.error('Ошибка загрузки данных: ' + error.message);
      return;
    }

    setRowData((data as any[]) || []);
  }, [currentSheet, getColumns, toColumnDefs]);

  // Handle cell value change
  const onCellValueChanged = useCallback(async (event: CellValueChangedEvent) => {
    if (!currentSheet) return;
    
    const row = event.data;
    if (!row.id) return;

    const { error } = await supabase.rpc('update_sheet_cell', {
      p_table_name: currentSheet.table_name,
      p_row_id: row.id,
      p_column: event.colDef.field!,
      p_value: JSON.stringify(row[event.colDef.field!])
    });

    if (error) {
      toast.error('Не удалось сохранить: ' + error.message);
    } else {
      toast.success('Ячейка обновлена');
    }
  }, [currentSheet]);

  // Add new row
  const addRow = useCallback(async () => {
    if (!currentSheet) return;

    const { data, error } = await supabase.rpc('add_sheet_row', {
      p_table_name: currentSheet.table_name
    });

    if (error) {
      toast.error('Ошибка добавления строки: ' + error.message);
      return;
    }

    const rows = data as any[];
    if (rows && rows.length > 0) {
      setRowData(prev => [rows[0], ...prev]);
      toast.success('Строка добавлена');
    }
  }, [currentSheet]);

  // Delete selected rows
  const deleteSelected = useCallback(async () => {
    if (!currentSheet) return;

    const selectedRows = gridRef.current?.api.getSelectedRows();
    if (!selectedRows || selectedRows.length === 0) {
      toast.info('Выберите строки для удаления');
      return;
    }

    const ids = selectedRows.map(r => r.id).filter(Boolean);
    
    const { error } = await supabase.rpc('delete_sheet_rows', {
      p_table_name: currentSheet.table_name,
      p_row_ids: ids
    });

    if (error) {
      toast.error('Ошибка удаления: ' + error.message);
      return;
    }

    setRowData(prev => prev.filter(row => !ids.includes(row.id)));
    toast.success(`Удалено ${ids.length} строк(и)`);
  }, [currentSheet]);

  // Export to CSV
  const exportCsv = useCallback(() => {
    if (!currentSheet) return;
    gridRef.current?.api.exportDataAsCsv({ 
      fileName: `${currentSheet.slug}.csv`,
    });
    toast.success('CSV экспортирован');
  }, [currentSheet]);

  // Import from CSV
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentSheet) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        rows.forEach(r => delete r.id);

        const { data, error } = await supabase.rpc('import_sheet_rows', {
          p_table_name: currentSheet.table_name,
          p_rows: rows
        });

        if (error) {
          toast.error('Ошибка импорта: ' + error.message);
          return;
        }

        const importedRows = data as any[];
        if (importedRows) {
          setRowData(prev => [...importedRows, ...prev]);
          toast.success(`Импортировано ${importedRows.length} строк(и)`);
        }
      }
    });
  }, [currentSheet]);

  // Create new sheet
  const createSheet = useCallback(async () => {
    if (!newName.trim() || !newSlug.trim()) {
      toast.error('Укажите название и slug');
      return;
    }

    let cols;
    try {
      cols = JSON.parse(colsJson);
    } catch {
      toast.error('Некорректный JSON колонок');
      return;
    }

    const { error } = await supabase.rpc('create_sheet', {
      p_name: newName,
      p_slug: newSlug,
      p_columns: cols
    });

    if (error) {
      toast.error('Ошибка создания листа: ' + error.message);
      return;
    }

    toast.success('Лист создан');
    setNewName('');
    setNewSlug('');
    setColsJson(defaultColumnsJson);
    await loadSheets();
  }, [newName, newSlug, colsJson, loadSheets]);

  // Initial load
  useEffect(() => {
    loadSheets();
  }, [loadSheets]);

  // Load rows when sheet changes
  useEffect(() => {
    if (currentSheet) {
      loadRows();
    }
  }, [currentSheet, loadRows]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Lovable Sheets</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Редактор данных</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Label>Лист:</Label>
            <Select
              value={currentSheet?.id}
              onValueChange={(value) => {
                const sheet = sheets.find(s => s.id === value);
                setCurrentSheet(sheet || null);
              }}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Выберите лист" />
              </SelectTrigger>
              <SelectContent>
                {sheets.map(sheet => (
                  <SelectItem key={sheet.id} value={sheet.id}>
                    {sheet.name} ({sheet.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={loadRows} variant="outline">Обновить</Button>
            <Button onClick={addRow}>+ Строка</Button>
            <Button onClick={deleteSelected} variant="destructive">Удалить выбранные</Button>
            <Button onClick={exportCsv} variant="outline">Экспорт CSV</Button>
            
            <Label htmlFor="csv-upload" className="cursor-pointer">
              <Button variant="outline" asChild>
                <span>Импорт CSV</span>
              </Button>
              <Input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </Label>
          </div>

          <div className="ag-theme-alpine" style={{ height: '500px', width: '100%' }}>
            <AgGridReact
              ref={gridRef}
              rowData={rowData}
              columnDefs={columnDefs}
              rowSelection="multiple"
              animateRows={true}
              onCellValueChanged={onCellValueChanged}
              defaultColDef={{
                flex: 1,
                minWidth: 100,
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Создать новый лист</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="new-name">Название листа</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Например: Расписание уборок"
              />
            </div>
            <div>
              <Label htmlFor="new-slug">Slug (англ., без пробелов)</Label>
              <Input
                id="new-slug"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="cleaning_schedule"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="cols-json">JSON колонок</Label>
            <Textarea
              id="cols-json"
              value={colsJson}
              onChange={(e) => setColsJson(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Доступные типы: text, integer, numeric, boolean, date, timestamptz, jsonb
            </p>
          </div>

          <Button onClick={createSheet} size="lg">
            Создать лист
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
