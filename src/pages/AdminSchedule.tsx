import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Plus, Edit, Trash2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/typedClient";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ContentIndexer } from "@/components/ContentIndexer";
import type { Schedule } from "@/integrations/supabase/database.types";

type ScheduleItem = Schedule;

const BRANCHES = ["Новокосино", "Стахановская", "Окская", "Онлайн"];
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function AdminSchedule() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [searchBranch, setSearchBranch] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    office_name: "",
    level: "",
    compact_days: "",
    compact_time: "",
    compact_classroom: "",
    compact_teacher: "",
    vacancies: 0,
    group_URL: ""
  });
  const { toast } = useToast();

  // Fetch schedule data
  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('schedule')
        .select('*')
        .order('office_name', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setSchedule(data || []);
    } catch (error) {
      console.error("Error fetching schedule:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить расписание",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.office_name || !formData.level) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('schedule')
          .update({
            name: formData.name,
            office_name: formData.office_name,
            level: formData.level,
            compact_days: formData.compact_days,
            compact_time: formData.compact_time,
            compact_classroom: formData.compact_classroom,
            compact_teacher: formData.compact_teacher,
            vacancies: formData.vacancies,
            group_URL: formData.group_URL
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        
        toast({
          title: "Успешно",
          description: "Занятие обновлено"
        });
      } else {
        // Create new item
        const { error } = await supabase
          .from('schedule')
          .insert([{
            id: crypto.randomUUID(),
            name: formData.name,
            office_name: formData.office_name,
            level: formData.level,
            compact_days: formData.compact_days,
            compact_time: formData.compact_time,
            compact_classroom: formData.compact_classroom,
            compact_teacher: formData.compact_teacher,
            vacancies: formData.vacancies,
            group_URL: formData.group_URL,
            is_active: true
          }]);

        if (error) throw error;
        
        toast({
          title: "Успешно",
          description: "Новое занятие добавлено"
        });
      }

      setIsModalOpen(false);
      setEditingItem(null);
      resetForm();
      fetchSchedule();
    } catch (error) {
      console.error("Error saving schedule item:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить изменения",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (item: ScheduleItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      office_name: item.office_name,
      level: item.level,
      compact_days: item.compact_days,
      compact_time: item.compact_time,
      compact_classroom: item.compact_classroom,
      compact_teacher: item.compact_teacher,
      vacancies: item.vacancies,
      group_URL: item.group_URL || ""
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить это занятие?")) return;

    try {
      const { error } = await supabase
        .from('schedule')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Успешно",
        description: "Занятие удалено"
      });
      
      fetchSchedule();
    } catch (error) {
      console.error("Error deleting schedule item:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить занятие",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      office_name: "",
      level: "",
      compact_days: "",
      compact_time: "",
      compact_classroom: "",
      compact_teacher: "",
      vacancies: 0,
      group_URL: ""
    });
  };

  const handleAddNew = () => {
    setEditingItem(null);
    resetForm();
    setIsModalOpen(true);
  };

  const filteredSchedule = searchBranch && searchBranch !== "all"
    ? schedule.filter(item => item.office_name === searchBranch && item.is_active)
    : schedule.filter(item => item.is_active);

  if (loading) {
    return (
      <div className="min-h-screen py-20">
        <div className="container mx-auto px-4">
          <Card>
            <CardHeader>
              <CardTitle>Управление расписанием</CardTitle>
              <CardDescription>Загрузка...</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen py-20">
        <div className="container mx-auto px-4 space-y-8">
          {/* Content Indexer for Chat Bot */}
          <ContentIndexer />

          {/* Schedule Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Управление расписанием
              </CardTitle>
              <CardDescription>
                Добавляйте, редактируйте и управляйте расписанием занятий
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters and Add Button */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between">
                <Select value={searchBranch} onValueChange={setSearchBranch}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Все филиалы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все филиалы</SelectItem>
                    {BRANCHES.map(branch => (
                      <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={handleAddNew}>
                      <Plus className="w-4 h-4 mr-2" />
                      Добавить занятие
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingItem ? "Редактировать занятие" : "Добавить новое занятие"}
                      </DialogTitle>
                      <DialogDescription>
                        Заполните информацию о занятии
                      </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Input
                            placeholder="Название курса *"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Select value={formData.office_name} onValueChange={(value) => setFormData({...formData, office_name: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Филиал *" />
                            </SelectTrigger>
                            <SelectContent>
                              {BRANCHES.map(branch => (
                                <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Select value={formData.level} onValueChange={(value) => setFormData({...formData, level: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Уровень *" />
                            </SelectTrigger>
                            <SelectContent>
                              {LEVELS.map(level => (
                                <SelectItem key={level} value={level}>{level}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Input
                            placeholder="Дни (Пн, Ср, Пт)"
                            value={formData.compact_days}
                            onChange={(e) => setFormData({...formData, compact_days: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Input
                            placeholder="Время (16:00-17:30)"
                            value={formData.compact_time}
                            onChange={(e) => setFormData({...formData, compact_time: e.target.value})}
                          />
                        </div>
                        <div>
                          <Input
                            placeholder="Кабинет"
                            value={formData.compact_classroom}
                            onChange={(e) => setFormData({...formData, compact_classroom: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Input
                            placeholder="Преподаватель"
                            value={formData.compact_teacher}
                            onChange={(e) => setFormData({...formData, compact_teacher: e.target.value})}
                          />
                        </div>
                        <div>
                          <Input
                            type="number"
                            placeholder="Количество мест"
                            value={formData.vacancies}
                            onChange={(e) => setFormData({...formData, vacancies: parseInt(e.target.value) || 0})}
                          />
                        </div>
                      </div>

                      <div>
                        <Input
                          placeholder="Ссылка на группу (необязательно)"
                          value={formData.group_URL}
                          onChange={(e) => setFormData({...formData, group_URL: e.target.value})}
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button type="submit" className="flex-1">
                          <Save className="w-4 h-4 mr-2" />
                          {editingItem ? "Сохранить" : "Добавить"}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsModalOpen(false)}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Отмена
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Schedule Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Курс</TableHead>
                      <TableHead>Филиал</TableHead>
                      <TableHead>Уровень</TableHead>
                      <TableHead className="hidden sm:table-cell">Дни</TableHead>
                      <TableHead className="hidden md:table-cell">Время</TableHead>
                      <TableHead className="hidden lg:table-cell">Преподаватель</TableHead>
                      <TableHead>Места</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchedule.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Нет занятий в расписании
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSchedule.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.office_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.level}</Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{item.compact_days}</TableCell>
                          <TableCell className="hidden md:table-cell">{item.compact_time}</TableCell>
                          <TableCell className="hidden lg:table-cell">{item.compact_teacher}</TableCell>
                          <TableCell>
                            <Badge variant={item.vacancies > 0 ? "default" : "destructive"}>
                              {item.vacancies} мест
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(item)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(item.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
}
