import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LearningGroup } from "@/hooks/useLearningGroups";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { useTeachers } from "@/hooks/useTeachers";

interface EditGroupDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: LearningGroup | null;
  onSaveDetails: (details: any) => void;
}

export const EditGroupDetailsModal = ({ open, onOpenChange, group, onSaveDetails }: EditGroupDetailsModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<{
    name: string;
    branch: string;
    responsible_teacher: string;
    subject: string;
    category: 'preschool' | 'school' | 'adult' | 'all';
    level: string;
    group_type: 'general' | 'mini';
    capacity: number;
    status: 'reserve' | 'forming' | 'active' | 'suspended' | 'finished';
    zoom_link: string;
    course_id: string;
    total_lessons: number;
    course_start_date: string;
  }>({
    name: group?.name || "",
    branch: group?.branch || "",
    responsible_teacher: group?.responsible_teacher || "",
    subject: group?.subject || "",
    category: group?.category || "all",
    level: group?.level || "",
    group_type: group?.group_type || "general",
    capacity: group?.capacity || 0,
    status: group?.status || "active",
    zoom_link: group?.zoom_link || "",
    course_id: group?.course_id || "",
    total_lessons: group?.total_lessons || 0,
    course_start_date: group?.course_start_date ? new Date(group.course_start_date as any).toISOString().slice(0,10) : ""
  });

  // Загружаем список курсов
  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  // Загружаем список преподавателей
  const { teachers } = useTeachers({ branch: formData.branch });

  // Загружаем актуальные данные группы при открытии модалки
  const { data: latestGroup } = useQuery({
    queryKey: ['learning_group_details', group?.id],
    enabled: open && !!group?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_groups')
        .select('id, name, branch, responsible_teacher, subject, category, level, group_type, capacity, status, zoom_link, course_id, total_lessons, course_start_date')
        .eq('id', group!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const g: any = latestGroup || group;
    if (g) {
      setFormData({
        name: g.name || "",
        branch: g.branch || "",
        responsible_teacher: g.responsible_teacher || "",
        subject: g.subject || "",
        category: g.category || "all",
        level: g.level || "",
        group_type: g.group_type || "general",
        capacity: typeof g.capacity === 'number' ? g.capacity : parseInt(g.capacity) || 0,
        status: g.status || "active",
        zoom_link: g.zoom_link || "",
        course_id: g.course_id || "",
        total_lessons: typeof g.total_lessons === 'number' ? g.total_lessons : parseInt(g.total_lessons) || 0,
        course_start_date: g.course_start_date ? new Date(g.course_start_date as any).toISOString().slice(0,10) : "",
      });
    }
  }, [latestGroup, group, open]);

  const branches = [
    "Котельники", "Люберцы 1", "Люберцы 2", "Мытищи", 
    "Новокосино", "Окская", "Солнцево", "Стахановская", "Онлайн"
  ];

  const subjects = [
    "Английский язык", "Немецкий язык", "Французский язык", 
    "Испанский язык", "Китайский язык"
  ];

  const categories = [
    { value: "preschool", label: "Дошкольники" },
    { value: "school", label: "Школьники" },
    { value: "adult", label: "Взрослые" },
    { value: "all", label: "Все" }
  ];

  const groupTypes = [
    { value: "general", label: "Группа" },
    { value: "mini", label: "Мини-группа" }
  ];

  const handleSubmit = async () => {
    if (!group?.id) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('learning_groups')
        .update({
          name: formData.name,
          branch: formData.branch,
          responsible_teacher: formData.responsible_teacher,
          subject: formData.subject,
          category: formData.category,
          level: formData.level,
          group_type: formData.group_type,
          capacity: formData.capacity,
          status: formData.status,
          zoom_link: formData.zoom_link,
          course_id: formData.course_id || null,
          total_lessons: formData.total_lessons,
          course_start_date: formData.course_start_date || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', group.id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Детали группы обновлены"
      });

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['learning-groups'] });
      await queryClient.invalidateQueries({ queryKey: ['learning_group'] });
      await queryClient.invalidateQueries({ queryKey: ['group-details'] });
      
      // Refetch the data
      await queryClient.refetchQueries({ queryKey: ['learning-groups'] });
      
      onSaveDetails(formData);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating group:', error);
      toast({
        title: "Ошибка",
        description: error?.message || "Не удалось обновить детали группы",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать детали группы</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Название группы</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Введите название группы"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="branch">Филиал</Label>
              <Select value={formData.branch} onValueChange={(value) => setFormData(prev => ({ ...prev, branch: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(branch => (
                    <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="responsible_teacher">Ответственный преподаватель</Label>
              <Select 
                value={formData.responsible_teacher} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, responsible_teacher: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите преподавателя" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.id} value={`${teacher.last_name} ${teacher.first_name}`}>
                      {teacher.last_name} {teacher.first_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="status">Статус группы</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as typeof formData.status }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reserve">Резерв</SelectItem>
                  <SelectItem value="forming">Формируется</SelectItem>
                  <SelectItem value="active">В работе</SelectItem>
                  <SelectItem value="suspended">Приостановлена</SelectItem>
                  <SelectItem value="finished">Завершена</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="group_type">Тип группы</Label>
              <Select value={formData.group_type} onValueChange={(value) => setFormData(prev => ({ ...prev, group_type: value as typeof formData.group_type }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {groupTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="subject">Дисциплина</Label>
              <Select value={formData.subject} onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="level">Уровень</Label>
              <Input
                id="level"
                value={formData.level}
                onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))}
                placeholder="A1, A2, B1..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Категория</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as typeof formData.category }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="capacity">Вместимость</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                max="20"
                value={formData.capacity}
                onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="course">Курс/Программа</Label>
            <Select 
              value={formData.course_id} 
              onValueChange={(value) => {
                setFormData(prev => ({ 
                  ...prev, 
                  course_id: value
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите курс" />
              </SelectTrigger>
              <SelectContent>
                {courses?.map(course => (
                  <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="total_lessons">Всего занятий</Label>
              <Input
                id="total_lessons"
                type="number"
                min="0"
                value={formData.total_lessons}
                onChange={(e) => setFormData(prev => ({ ...prev, total_lessons: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="course_start_date">Дата старта курса</Label>
              <Input
                id="course_start_date"
                type="date"
                value={formData.course_start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, course_start_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="zoom_link">ZOOM ссылка</Label>
            <Input
              id="zoom_link"
              value={formData.zoom_link}
              onChange={(e) => setFormData(prev => ({ ...prev, zoom_link: e.target.value }))}
              placeholder="https://zoom.us/j/..."
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};