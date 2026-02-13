import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTeachers, getTeacherFullName } from '@/hooks/useTeachers';
import { supabase } from '@/integrations/supabase/typedClient';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errorUtils';
import {
  Search,
  GraduationCap,
  Save,
  X,
  Plus,
  BookOpen,
  Users,
  Filter,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

const SUBJECTS = ['Английский', 'Немецкий', 'Французский', 'Китайский', 'Испанский', 'Арабский', 'Турецкий', 'Корейский', 'Японский'];
const CATEGORIES = ['Дошкольники', 'Школьники 1-4 класс', 'Школьники 5-8 класс', 'Школьники 9-11 класс', 'Взрослые', 'Корпоративные'];

type ChangeMap = Record<string, { subjects?: string[]; categories?: string[] }>;

export const TeacherSubjectsCategoriesEditor: React.FC = () => {
  const { teachers, isLoading, refetch } = useTeachers({ includeInactive: false });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterEmpty, setFilterEmpty] = useState<'all' | 'no-subjects' | 'no-categories' | 'no-both'>('all');
  const [changes, setChanges] = useState<ChangeMap>({});
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSubject, setBulkSubject] = useState('');
  const [bulkCategory, setBulkCategory] = useState('');

  const hasChanges = Object.keys(changes).length > 0;

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const name = getTeacherFullName(t).toLowerCase();
      if (searchTerm && !name.includes(searchTerm.toLowerCase())) return false;

      const subjects = changes[t.id]?.subjects ?? t.subjects ?? [];
      const categories = changes[t.id]?.categories ?? t.categories ?? [];

      if (filterSubject !== 'all' && !subjects.includes(filterSubject)) return false;
      if (filterCategory !== 'all' && !categories.includes(filterCategory)) return false;

      if (filterEmpty === 'no-subjects' && subjects.length > 0) return false;
      if (filterEmpty === 'no-categories' && categories.length > 0) return false;
      if (filterEmpty === 'no-both' && (subjects.length > 0 || categories.length > 0)) return false;

      return true;
    });
  }, [teachers, searchTerm, filterSubject, filterCategory, filterEmpty, changes]);

  const stats = useMemo(() => {
    let noSubjects = 0, noCategories = 0;
    teachers.forEach(t => {
      const subjects = changes[t.id]?.subjects ?? t.subjects ?? [];
      const categories = changes[t.id]?.categories ?? t.categories ?? [];
      if (subjects.length === 0) noSubjects++;
      if (categories.length === 0) noCategories++;
    });
    return { noSubjects, noCategories, total: teachers.length };
  }, [teachers, changes]);

  const toggleSubject = useCallback((teacherId: string, subject: string, currentSubjects: string[]) => {
    setChanges(prev => {
      const existing = prev[teacherId] || {};
      const subjects = existing.subjects ?? [...currentSubjects];
      const newSubjects = subjects.includes(subject)
        ? subjects.filter(s => s !== subject)
        : [...subjects, subject];
      return { ...prev, [teacherId]: { ...existing, subjects: newSubjects } };
    });
  }, []);

  const toggleCategory = useCallback((teacherId: string, category: string, currentCategories: string[]) => {
    setChanges(prev => {
      const existing = prev[teacherId] || {};
      const categories = existing.categories ?? [...currentCategories];
      const newCategories = categories.includes(category)
        ? categories.filter(c => c !== category)
        : [...categories, category];
      return { ...prev, [teacherId]: { ...existing, categories: newCategories } };
    });
  }, []);

  const handleBulkAddSubject = () => {
    if (!bulkSubject || selectedIds.size === 0) return;
    setChanges(prev => {
      const next = { ...prev };
      selectedIds.forEach(id => {
        const teacher = teachers.find(t => t.id === id);
        if (!teacher) return;
        const existing = next[id] || {};
        const subjects = existing.subjects ?? [...(teacher.subjects || [])];
        if (!subjects.includes(bulkSubject)) {
          next[id] = { ...existing, subjects: [...subjects, bulkSubject] };
        }
      });
      return next;
    });
    setBulkSubject('');
    toast.success(`Предмет "${bulkSubject}" добавлен ${selectedIds.size} преподавателям`);
  };

  const handleBulkAddCategory = () => {
    if (!bulkCategory || selectedIds.size === 0) return;
    setChanges(prev => {
      const next = { ...prev };
      selectedIds.forEach(id => {
        const teacher = teachers.find(t => t.id === id);
        if (!teacher) return;
        const existing = next[id] || {};
        const categories = existing.categories ?? [...(teacher.categories || [])];
        if (!categories.includes(bulkCategory)) {
          next[id] = { ...existing, categories: [...categories, bulkCategory] };
        }
      });
      return next;
    });
    setBulkCategory('');
    toast.success(`Категория "${bulkCategory}" добавлена ${selectedIds.size} преподавателям`);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTeachers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTeachers.map(t => t.id)));
    }
  };

  const handleSave = async () => {
    const entries = Object.entries(changes);
    if (entries.length === 0) return;

    setSaving(true);
    let success = 0;
    let failed = 0;

    for (const [teacherId, data] of entries) {
      const updateData: Record<string, unknown> = {};
      if (data.subjects !== undefined) updateData.subjects = data.subjects;
      if (data.categories !== undefined) updateData.categories = data.categories;

      const { error } = await supabase
        .from('teachers')
        .update(updateData)
        .eq('id', teacherId);

      if (error) {
        console.error(`Error updating teacher ${teacherId}:`, error);
        failed++;
      } else {
        success++;
      }
    }

    setSaving(false);
    setChanges({});
    refetch();

    if (failed === 0) {
      toast.success(`Обновлено ${success} преподавателей`);
    } else {
      toast.error(`Обновлено ${success}, ошибок: ${failed}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Предметы и категории</h1>
          <p className="text-muted-foreground">
            Массовое редактирование предметов и возрастных категорий преподавателей
          </p>
        </div>
        {hasChanges && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setChanges({})}>
              <X className="h-4 w-4 mr-2" />
              Отменить
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Сохранить ({Object.keys(changes).length})
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего активных</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className={stats.noSubjects > 0 ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Без предметов</CardTitle>
            <BookOpen className={`h-4 w-4 ${stats.noSubjects > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.noSubjects > 0 ? 'text-amber-700' : ''}`}>{stats.noSubjects}</div>
          </CardContent>
        </Card>
        <Card className={stats.noCategories > 0 ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Без категорий</CardTitle>
            <Users className={`h-4 w-4 ${stats.noCategories > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.noCategories > 0 ? 'text-amber-700' : ''}`}>{stats.noCategories}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterEmpty} onValueChange={(v) => setFilterEmpty(v as typeof filterEmpty)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Фильтр" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="no-subjects">Без предметов</SelectItem>
                <SelectItem value="no-categories">Без категорий</SelectItem>
                <SelectItem value="no-both">Без предметов и категорий</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Выбрано: {selectedIds.size}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex gap-2 items-center">
                <Select value={bulkSubject} onValueChange={setBulkSubject}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Добавить предмет" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={handleBulkAddSubject} disabled={!bulkSubject}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2 items-center">
                <Select value={bulkCategory} onValueChange={setBulkCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Добавить категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={handleBulkAddCategory} disabled={!bulkCategory}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Преподаватели</CardTitle>
          <CardDescription>
            Показано {filteredTeachers.length} из {teachers.length}
            {hasChanges && (
              <Badge variant="secondary" className="ml-2">
                Несохранённых изменений: {Object.keys(changes).length}
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedIds.size === filteredTeachers.length && filteredTeachers.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Преподаватель</TableHead>
                  <TableHead>Предметы</TableHead>
                  <TableHead>Категории</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeachers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Не найдено преподавателей
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTeachers.map(teacher => {
                    const currentSubjects = changes[teacher.id]?.subjects ?? teacher.subjects ?? [];
                    const currentCategories = changes[teacher.id]?.categories ?? teacher.categories ?? [];
                    const isChanged = !!changes[teacher.id];

                    return (
                      <TableRow key={teacher.id} className={isChanged ? 'bg-primary/5' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(teacher.id)}
                            onCheckedChange={(checked) => {
                              setSelectedIds(prev => {
                                const next = new Set(prev);
                                checked ? next.add(teacher.id) : next.delete(teacher.id);
                                return next;
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">
                            {getTeacherFullName(teacher)}
                          </div>
                          <div className="text-xs text-muted-foreground">{teacher.branch || '—'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {SUBJECTS.map(subject => {
                              const active = currentSubjects.includes(subject);
                              return (
                                <Badge
                                  key={subject}
                                  variant={active ? 'default' : 'outline'}
                                  className={`cursor-pointer text-xs transition-colors ${
                                    active
                                      ? 'bg-primary hover:bg-primary/80'
                                      : 'opacity-40 hover:opacity-70'
                                  }`}
                                  onClick={() => toggleSubject(teacher.id, subject, teacher.subjects || [])}
                                >
                                  {subject.slice(0, 3)}
                                </Badge>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {CATEGORIES.map(category => {
                              const active = currentCategories.includes(category);
                              const shortLabel = category.replace('Школьники ', '').replace('класс', 'кл');
                              return (
                                <Badge
                                  key={category}
                                  variant={active ? 'secondary' : 'outline'}
                                  className={`cursor-pointer text-xs transition-colors ${
                                    active
                                      ? ''
                                      : 'opacity-40 hover:opacity-70'
                                  }`}
                                  onClick={() => toggleCategory(teacher.id, category, teacher.categories || [])}
                                >
                                  {shortLabel}
                                </Badge>
                              );
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
