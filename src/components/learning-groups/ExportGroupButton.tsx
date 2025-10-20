import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LearningGroup } from '@/hooks/useLearningGroups';
import { GroupStudent } from '@/hooks/useGroupStudents';
import { 
  exportGroupsToExcel, 
  exportGroupStudentsToExcel, 
  exportGroupDetailedReport 
} from '@/utils/exportGroups';

interface ExportGroupButtonProps {
  mode: 'list' | 'single';
  groups?: LearningGroup[];
  group?: LearningGroup;
  students?: GroupStudent[];
  financialStats?: {
    totalPaid: number;
    totalDebt: number;
    studentsWithDebt: number;
  };
}

export const ExportGroupButton = ({ 
  mode, 
  groups, 
  group, 
  students,
  financialStats 
}: ExportGroupButtonProps) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportList = async () => {
    if (!groups || groups.length === 0) {
      toast({
        title: "Нет данных",
        description: "Нет групп для экспорта",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    try {
      await exportGroupsToExcel(groups);
      toast({
        title: "Успешно",
        description: `Экспортировано ${groups.length} групп`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось экспортировать данные",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportStudents = async () => {
    if (!group || !students || students.length === 0) {
      toast({
        title: "Нет данных",
        description: "Нет студентов для экспорта",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    try {
      await exportGroupStudentsToExcel(group.name, students);
      toast({
        title: "Успешно",
        description: `Экспортировано ${students.length} студентов`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось экспортировать студентов",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDetailed = async () => {
    if (!group) {
      toast({
        title: "Ошибка",
        description: "Группа не выбрана",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    try {
      await exportGroupDetailedReport(group, students || [], financialStats);
      toast({
        title: "Успешно",
        description: "Подробный отчёт создан"
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать отчёт",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (mode === 'list') {
    return (
      <Button
        variant="outline"
        onClick={handleExportList}
        disabled={isExporting || !groups || groups.length === 0}
        className="gap-2"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Экспорт в Excel
      </Button>
    );
  }

  // Single group mode with dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={isExporting}
          className="gap-2"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Экспорт
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Выберите формат</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleExportStudents}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Список студентов
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleExportDetailed}>
          <FileText className="mr-2 h-4 w-4" />
          Подробный отчёт
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
