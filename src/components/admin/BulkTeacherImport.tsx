import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from "@/integrations/supabase/typedClient";
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errorUtils';
import { normalizePhone } from '@/utils/phoneNormalization';
import Papa from 'papaparse';
import {
  Upload,
  FileSpreadsheet,
  Download,
  Check,
  X,
  AlertCircle,
  Loader2,
  Copy,
  Link2,
  Users,
  ChevronDown,
  ChevronUp,
  GraduationCap,
} from 'lucide-react';

interface ParsedTeacher {
  row: number;
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
  branch?: string;
  subjects?: string[];
  categories?: string[];
  status: 'pending' | 'processing' | 'success' | 'error' | 'exists';
  error?: string;
  inviteLink?: string;
  teacherId?: string;
}

interface ColumnMapping {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  branch: string;
  subjects: string;
  categories: string;
}

const DEFAULT_MAPPING: ColumnMapping = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  branch: '',
  subjects: '',
  categories: '',
};

const REQUIRED_FIELDS = ['firstName', 'phone'] as const;
const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  firstName: 'Имя *',
  lastName: 'Фамилия',
  phone: 'Телефон *',
  email: 'Email',
  branch: 'Филиал',
  subjects: 'Предметы',
  categories: 'Категории',
};

export const BulkTeacherImport: React.FC = () => {
  const { organizationId, branches } = useOrganization();
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'results'>('upload');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(DEFAULT_MAPPING);
  const [parsedTeachers, setParsedTeachers] = useState<ParsedTeacher[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [defaultBranch, setDefaultBranch] = useState<string>('');

  const baseUrl = window.location.origin;

  // Скачивание шаблона CSV
  const downloadTemplate = () => {
    const template = 'Имя,Фамилия,Телефон,Email,Филиал,Предметы,Категории\nАнна,Иванова,+79161234567,anna@example.com,Окская,"Английский,Немецкий","Дети,Взрослые"\nПётр,Сидоров,+79167654321,petr@example.com,Люберцы,Английский,Дети';
    const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teachers_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Обработка загрузки файла
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      encoding: 'UTF-8',
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast.error('Ошибка чтения CSV: ' + results.errors[0].message);
          return;
        }

        const headers = results.meta.fields || [];
        setCsvHeaders(headers);
        setCsvData(results.data);

        // Автоопределение маппинга
        const autoMapping: ColumnMapping = { ...DEFAULT_MAPPING };
        const lowerHeaders = headers.map(h => h.toLowerCase());

        const mappingRules: Record<keyof ColumnMapping, string[]> = {
          firstName: ['имя', 'first_name', 'firstname', 'first name', 'name'],
          lastName: ['фамилия', 'last_name', 'lastname', 'last name', 'surname'],
          phone: ['телефон', 'phone', 'tel', 'mobile', 'мобильный'],
          email: ['email', 'e-mail', 'почта', 'эл.почта'],
          branch: ['филиал', 'branch', 'офис', 'office'],
          subjects: ['предметы', 'subjects', 'дисциплины'],
          categories: ['категории', 'categories', 'типы'],
        };

        Object.entries(mappingRules).forEach(([field, variants]) => {
          const idx = lowerHeaders.findIndex(h => variants.some(v => h.includes(v)));
          if (idx !== -1) {
            autoMapping[field as keyof ColumnMapping] = headers[idx];
          }
        });

        setMapping(autoMapping);
        setStep('mapping');
      },
      error: (error) => {
        toast.error('Ошибка чтения файла: ' + error.message);
      },
    });
  }, []);

  // Проверка валидности маппинга
  const isMappingValid = REQUIRED_FIELDS.every(field => mapping[field]);

  // Парсинг преподавателей по маппингу
  const parseTeachers = useCallback(() => {
    const teachers: ParsedTeacher[] = csvData.map((row, index) => {
      const firstName = row[mapping.firstName]?.trim() || '';
      const lastName = row[mapping.lastName]?.trim();
      const phone = row[mapping.phone]?.trim();
      const email = row[mapping.email]?.trim();
      const branch = row[mapping.branch]?.trim() || defaultBranch;
      const subjects = row[mapping.subjects]?.split(',').map(s => s.trim()).filter(Boolean);
      const categories = row[mapping.categories]?.split(',').map(c => c.trim()).filter(Boolean);

      const errors: string[] = [];
      if (!firstName) errors.push('Имя обязательно');
      if (!phone) errors.push('Телефон обязателен');
      else if (!/^\+?\d[\d\s()-]{9,}$/.test(phone)) errors.push('Неверный формат телефона');

      return {
        row: index + 2, // +2: 1 для 0-индексации, 1 для заголовка
        firstName,
        lastName,
        phone,
        email,
        branch,
        subjects,
        categories,
        status: errors.length > 0 ? 'error' : 'pending',
        error: errors.join(', '),
      } as ParsedTeacher;
    });

    setParsedTeachers(teachers);
    setStep('preview');
  }, [csvData, mapping, defaultBranch]);

  // Импорт преподавателей
  const startImport = async () => {
    if (!organizationId) return;

    setIsImporting(true);
    setStep('importing');
    setImportProgress(0);

    const validTeachers = parsedTeachers.filter(t => t.status === 'pending');
    let processed = 0;

    for (let i = 0; i < validTeachers.length; i++) {
      const teacher = validTeachers[i];
      
      setParsedTeachers(prev => prev.map(t => 
        t.row === teacher.row ? { ...t, status: 'processing' } : t
      ));

      try {
        // Проверяем существующий профиль
        let existingProfileId: string | null = null;
        
        if (teacher.email || teacher.phone) {
          const { data: existingProfiles } = await supabase
            .from('profiles')
            .select('id, email, phone')
            .eq('organization_id', organizationId)
            .eq('is_active', true);

          if (existingProfiles) {
            if (teacher.email) {
              const emailMatch = existingProfiles.find(
                p => p.email?.toLowerCase() === teacher.email?.toLowerCase()
              );
              if (emailMatch) existingProfileId = emailMatch.id;
            }
            
            if (!existingProfileId && teacher.phone) {
              const normalizedPhone = normalizePhone(teacher.phone);
              const phoneMatch = existingProfiles.find(
                p => p.phone && normalizePhone(p.phone) === normalizedPhone
              );
              if (phoneMatch) existingProfileId = phoneMatch.id;
            }
          }
        }

        if (existingProfileId) {
          // Привязка к существующему профилю
          const { data: newTeacher, error: teacherError } = await supabase
            .from('teachers')
            .insert({
              profile_id: existingProfileId,
              first_name: teacher.firstName,
              last_name: teacher.lastName || null,
              email: teacher.email || null,
              phone: teacher.phone ? normalizePhone(teacher.phone) : null,
              branch: teacher.branch || null,
              subjects: teacher.subjects || [],
              categories: teacher.categories || [],
              is_active: true,
            })
            .select('id')
            .single();

          if (teacherError) throw teacherError;

          await supabase
            .from('user_roles')
            .upsert({
              user_id: existingProfileId,
              role: 'teacher',
            }, { onConflict: 'user_id,role' });

          setParsedTeachers(prev => prev.map(t => 
            t.row === teacher.row 
              ? { ...t, status: 'exists', teacherId: newTeacher.id }
              : t
          ));
        } else {
          // Создание нового преподавателя с приглашением
          const { data: newTeacher, error: teacherError } = await supabase
            .from('teachers')
            .insert({
              first_name: teacher.firstName,
              last_name: teacher.lastName || null,
              email: teacher.email || null,
              phone: teacher.phone ? normalizePhone(teacher.phone) : null,
              branch: teacher.branch || null,
              subjects: teacher.subjects || [],
              categories: teacher.categories || [],
              is_active: true,
              profile_id: null,
            })
            .select('id')
            .single();

          if (teacherError) throw teacherError;

          const { data: inviteData, error: inviteError } = await (supabase
            .from('teacher_invitations' as any)
            .insert({
              organization_id: organizationId,
              teacher_id: newTeacher.id,
              first_name: teacher.firstName,
              last_name: teacher.lastName || null,
              phone: teacher.phone ? normalizePhone(teacher.phone) : null,
              email: teacher.email || null,
              branch: teacher.branch || null,
              subjects: teacher.subjects || [],
              categories: teacher.categories || [],
              created_by: profile?.id,
            })
            .select('invite_token')
            .single() as any);

          if (inviteError) throw inviteError;

          const inviteLink = `${baseUrl}/teacher/onboarding/${inviteData.invite_token}`;

          setParsedTeachers(prev => prev.map(t => 
            t.row === teacher.row 
              ? { ...t, status: 'success', teacherId: newTeacher.id, inviteLink }
              : t
          ));
        }
      } catch (error) {
        setParsedTeachers(prev => prev.map(t => 
          t.row === teacher.row 
            ? { ...t, status: 'error', error: getErrorMessage(error) }
            : t
        ));
      }

      processed++;
      setImportProgress(Math.round((processed / validTeachers.length) * 100));
      
      // Небольшая задержка чтобы не перегружать API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsImporting(false);
    setStep('results');
    toast.success(`Импорт завершён: ${processed} преподавателей обработано`);
  };

  // Копирование всех ссылок
  const copyAllLinks = async () => {
    const links = parsedTeachers
      .filter(t => t.inviteLink)
      .map(t => `${t.firstName} ${t.lastName || ''}: ${t.inviteLink}`)
      .join('\n');
    
    await navigator.clipboard.writeText(links);
    toast.success('Все ссылки скопированы');
  };

  // Экспорт результатов в CSV
  const exportResults = () => {
    const rows = parsedTeachers.map(t => ({
      'Строка': t.row,
      'Имя': t.firstName,
      'Фамилия': t.lastName || '',
      'Телефон': t.phone || '',
      'Email': t.email || '',
      'Филиал': t.branch || '',
      'Статус': t.status === 'success' ? 'Создан' : 
               t.status === 'exists' ? 'Привязан' :
               t.status === 'error' ? 'Ошибка' : 'Ожидание',
      'Ссылка': t.inviteLink || '',
      'Ошибка': t.error || '',
    }));

    const csv = Papa.unparse(rows);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teachers_import_results_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleRow = (row: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(row)) next.delete(row);
      else next.add(row);
      return next;
    });
  };

  const resetImport = () => {
    setStep('upload');
    setCsvHeaders([]);
    setCsvData([]);
    setMapping(DEFAULT_MAPPING);
    setParsedTeachers([]);
    setImportProgress(0);
    setDefaultBranch('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const stats = {
    total: parsedTeachers.length,
    valid: parsedTeachers.filter(t => t.status === 'pending').length,
    success: parsedTeachers.filter(t => t.status === 'success').length,
    exists: parsedTeachers.filter(t => t.status === 'exists').length,
    errors: parsedTeachers.filter(t => t.status === 'error').length,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Массовый импорт преподавателей
        </CardTitle>
        <CardDescription>
          Загрузите CSV файл для создания преподавателей и генерации magic links
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Загрузите CSV файл с данными преподавателей
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Скачать шаблон
                </Button>
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Загрузить CSV
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                CSV должен содержать минимум колонки: <strong>Имя</strong> и <strong>Телефон</strong>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step 2: Mapping */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Сопоставление колонок</h3>
              <Badge variant="outline">{csvData.length} записей</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {(Object.keys(FIELD_LABELS) as Array<keyof ColumnMapping>).map((field) => (
                <div key={field} className="space-y-1">
                  <Label>{FIELD_LABELS[field]}</Label>
                  <Select
                    value={mapping[field]}
                    onValueChange={(value) => setMapping(prev => ({ ...prev, [field]: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите колонку" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— Не использовать —</SelectItem>
                      {csvHeaders.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Филиал по умолчанию</Label>
              <Select value={defaultBranch} onValueChange={setDefaultBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите филиал (если не указан в CSV)" />
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

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetImport}>
                Отмена
              </Button>
              <Button onClick={parseTeachers} disabled={!isMappingValid}>
                Далее
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="font-medium">Предпросмотр</h3>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    <Check className="h-3 w-3 mr-1" />
                    {stats.valid} к импорту
                  </Badge>
                  {stats.errors > 0 && (
                    <Badge variant="outline" className="bg-red-50 text-red-700">
                      <X className="h-3 w-3 mr-1" />
                      {stats.errors} с ошибками
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <ScrollArea className="h-[400px] border rounded-lg">
              <div className="p-4 space-y-2">
                {parsedTeachers.map((teacher) => (
                  <div
                    key={teacher.row}
                    className={`p-3 rounded-lg border ${
                      teacher.status === 'error' 
                        ? 'border-red-200 bg-red-50' 
                        : 'border-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">#{teacher.row}</span>
                        <span className="font-medium">
                          {teacher.firstName} {teacher.lastName || ''}
                        </span>
                        <span className="text-sm text-muted-foreground">{teacher.phone}</span>
                        {teacher.branch && (
                          <Badge variant="secondary" className="text-xs">
                            {teacher.branch}
                          </Badge>
                        )}
                      </div>
                      {teacher.status === 'error' && (
                        <span className="text-xs text-red-600">{teacher.error}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Назад
              </Button>
              <Button onClick={startImport} disabled={stats.valid === 0}>
                <Users className="h-4 w-4 mr-2" />
                Импортировать {stats.valid} преподавателей
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === 'importing' && (
          <div className="space-y-4 py-8">
            <div className="text-center">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
              <h3 className="font-medium mb-2">Импортируем преподавателей...</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Не закрывайте страницу
              </p>
            </div>
            <Progress value={importProgress} />
            <p className="text-center text-sm text-muted-foreground">
              {importProgress}% завершено
            </p>
          </div>
        )}

        {/* Step 5: Results */}
        {step === 'results' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Результаты импорта</h3>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  <Check className="h-3 w-3 mr-1" />
                  {stats.success} создано
                </Badge>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  <Link2 className="h-3 w-3 mr-1" />
                  {stats.exists} привязано
                </Badge>
                {stats.errors > 0 && (
                  <Badge variant="outline" className="bg-red-50 text-red-700">
                    <X className="h-3 w-3 mr-1" />
                    {stats.errors} ошибок
                  </Badge>
                )}
              </div>
            </div>

            <ScrollArea className="h-[400px] border rounded-lg">
              <div className="p-4 space-y-2">
                {parsedTeachers.map((teacher) => (
                  <div
                    key={teacher.row}
                    className={`rounded-lg border ${
                      teacher.status === 'error' 
                        ? 'border-red-200 bg-red-50' 
                        : teacher.status === 'exists'
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-green-200 bg-green-50'
                    }`}
                  >
                    <div 
                      className="p-3 flex items-center justify-between cursor-pointer"
                      onClick={() => toggleRow(teacher.row)}
                    >
                      <div className="flex items-center gap-3">
                        {teacher.status === 'success' && <Check className="h-4 w-4 text-green-600" />}
                        {teacher.status === 'exists' && <Link2 className="h-4 w-4 text-blue-600" />}
                        {teacher.status === 'error' && <X className="h-4 w-4 text-red-600" />}
                        <span className="font-medium">
                          {teacher.firstName} {teacher.lastName || ''}
                        </span>
                        <span className="text-sm text-muted-foreground">{teacher.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {teacher.status === 'success' && (
                          <Badge variant="secondary" className="text-xs">Magic link</Badge>
                        )}
                        {teacher.status === 'exists' && (
                          <Badge variant="secondary" className="text-xs">Существующий профиль</Badge>
                        )}
                        {expandedRows.has(teacher.row) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                    
                    {expandedRows.has(teacher.row) && teacher.inviteLink && (
                      <div className="px-3 pb-3 pt-0">
                        <div className="flex items-center gap-2 bg-white rounded p-2">
                          <Input 
                            value={teacher.inviteLink} 
                            readOnly 
                            className="text-xs font-mono"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(teacher.inviteLink!);
                              toast.success('Ссылка скопирована');
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {expandedRows.has(teacher.row) && teacher.status === 'error' && (
                      <div className="px-3 pb-3 pt-0">
                        <p className="text-xs text-red-600">{teacher.error}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2 justify-between">
              <Button variant="outline" onClick={resetImport}>
                Новый импорт
              </Button>
              <div className="flex gap-2">
                {stats.success > 0 && (
                  <Button variant="outline" onClick={copyAllLinks}>
                    <Copy className="h-4 w-4 mr-2" />
                    Копировать все ссылки
                  </Button>
                )}
                <Button variant="outline" onClick={exportResults}>
                  <Download className="h-4 w-4 mr-2" />
                  Экспорт результатов
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
