import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/typedClient';
import { toast } from 'sonner';
import { Phone, Mail, MapPin, Edit, Save, X, Plus, Loader2 } from 'lucide-react';
import type { TeacherChatItem } from '@/hooks/useTeacherChats';

const SUBJECTS = ['Английский', 'Немецкий', 'Французский', 'Китайский', 'Испанский', 'Арабский', 'Турецкий', 'Корейский', 'Японский'];
const CATEGORIES = ['Дошкольники', 'Школьники 1-4 класс', 'Школьники 5-8 класс', 'Школьники 9-11 класс', 'Взрослые', 'Корпоративные'];

interface TeacherProfilePanelProps {
  teacher: TeacherChatItem | null;
  onUpdated?: () => void;
}

export const TeacherProfilePanel: React.FC<TeacherProfilePanelProps> = ({ teacher, onUpdated }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // Sync state when teacher changes
  useEffect(() => {
    if (teacher) {
      setPhone(teacher.phone || '');
      setEmail(teacher.email || '');
      setSubjects(teacher.subjects || []);
      setCategories(teacher.categories || []);
      setEditing(false);
    }
  }, [teacher?.id]);

  const handleSave = async () => {
    if (!teacher) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('teachers')
        .update({
          phone: phone || null,
          email: email || null,
          subjects,
          categories,
        })
        .eq('id', teacher.id);

      if (error) throw error;
      toast.success('Данные обновлены');
      setEditing(false);
      onUpdated?.();
    } catch (err) {
      console.error('Error updating teacher:', err);
      toast.error('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (teacher) {
      setPhone(teacher.phone || '');
      setEmail(teacher.email || '');
      setSubjects(teacher.subjects || []);
      setCategories(teacher.categories || []);
    }
    setEditing(false);
  };

  const addSubject = (s: string) => {
    if (s && !subjects.includes(s)) setSubjects(prev => [...prev, s]);
  };

  const removeSubject = (s: string) => {
    setSubjects(prev => prev.filter(x => x !== s));
  };

  const addCategory = (c: string) => {
    if (c && !categories.includes(c)) setCategories(prev => [...prev, c]);
  };

  const removeCategory = (c: string) => {
    setCategories(prev => prev.filter(x => x !== c));
  };

  if (!teacher) return null;

  return (
    <ScrollArea className="h-full p-3">
      <div className="space-y-4">
        {/* Edit / Save buttons */}
        <div className="flex justify-end gap-2">
          {editing ? (
            <>
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
                <X className="h-3 w-3 mr-1" /> Отмена
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                Сохранить
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Edit className="h-3 w-3 mr-1" /> Редактировать
            </Button>
          )}
        </div>

        {/* Contact Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Контактная информация
              {teacher.teacherNumber && (
                <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
                  #{teacher.teacherNumber}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {editing ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Телефон</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 ..."
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Email</label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="h-8 text-xs"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-2">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs">{teacher.phone || 'Не указан'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs">{teacher.email || 'Не указан'}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Professional Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Профессиональная информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {/* Subjects */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Предметы</h4>
              <div className="flex flex-wrap gap-1">
                {subjects.length > 0 ? subjects.map((subject) => (
                  <Badge key={subject} variant="secondary" className="text-xs h-5 gap-1">
                    {subject}
                    {editing && (
                      <button onClick={() => removeSubject(subject)} className="hover:text-destructive">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </Badge>
                )) : (
                  <span className="text-xs text-muted-foreground">Не указаны</span>
                )}
              </div>
              {editing && (
                <Select value="" onValueChange={addSubject}>
                  <SelectTrigger className="mt-2 h-7 text-xs">
                    <SelectValue placeholder="Добавить предмет..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.filter(s => !subjects.includes(s)).map(s => (
                      <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Categories */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Категории</h4>
              <div className="flex flex-wrap gap-1">
                {categories.length > 0 ? categories.map((category) => (
                  <Badge key={category} variant="outline" className="text-xs h-5 gap-1">
                    {category}
                    {editing && (
                      <button onClick={() => removeCategory(category)} className="hover:text-destructive">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </Badge>
                )) : (
                  <span className="text-xs text-muted-foreground">Не указаны</span>
                )}
              </div>
              {editing && (
                <Select value="" onValueChange={addCategory}>
                  <SelectTrigger className="mt-2 h-7 text-xs">
                    <SelectValue placeholder="Добавить категорию..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter(c => !categories.includes(c)).map(c => (
                      <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Branch */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Филиалы</h4>
              <div className="flex flex-wrap gap-1">
                {teacher.branches && teacher.branches.length > 0 ? (
                  teacher.branches.map((b) => (
                    <Badge key={b} variant="secondary" className="text-xs h-5">{b}</Badge>
                  ))
                ) : teacher.branch ? (
                  <Badge variant="secondary" className="text-xs h-5">{teacher.branch}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Не указан</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};
