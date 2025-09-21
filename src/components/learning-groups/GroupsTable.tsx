import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Edit, Trash2, Users, Calendar, MapPin, BookOpen, DollarSign } from "lucide-react";
import { LearningGroup, formatSchedule, getStatusColor, getCategoryLabel, getStatusLabel, useDeleteLearningGroup } from "@/hooks/useLearningGroups";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface GroupsTableProps {
  groups: LearningGroup[];
  isLoading: boolean;
}

export const GroupsTable = ({ groups, isLoading }: GroupsTableProps) => {
  const { toast } = useToast();
  const deleteGroup = useDeleteLearningGroup();

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteGroup.mutateAsync(id);
      toast({
        title: "Успешно",
        description: `Группа "${name}" удалена`
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить группу",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка групп...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Группы не найдены</h3>
            <p className="text-gray-600">Попробуйте изменить фильтры или добавить новую группу</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Группа</TableHead>
                <TableHead className="font-semibold">Филиал</TableHead>
                <TableHead className="font-semibold">Дисциплина</TableHead>
                <TableHead className="font-semibold">Уровень</TableHead>
                <TableHead className="font-semibold">Категория</TableHead>
                <TableHead className="font-semibold">Ак. часов</TableHead>
                <TableHead className="font-semibold">Тип</TableHead>
                <TableHead className="font-semibold">Расписание</TableHead>
                <TableHead className="font-semibold">Преподаватели</TableHead>
                <TableHead className="font-semibold">Аудит.</TableHead>
                <TableHead className="font-semibold">Долг. чел</TableHead>
                <TableHead className="font-semibold text-center">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-blue-600">{group.name}</div>
                      {group.custom_name && (
                        <div className="text-sm text-gray-600">{group.custom_name}</div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-blue-600">{group.branch}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell>{group.subject}</TableCell>
                  
                  <TableCell>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {group.level}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm">{getCategoryLabel(group.category)}</span>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4 text-gray-400" />
                      <span>{group.academic_hours || 0} а.ч.</span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge className={getStatusColor(group.status)}>
                      {getStatusLabel(group.status)}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1 max-w-[200px]">
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        {formatSchedule(group.schedule_days, group.schedule_time)}
                      </div>
                      {group.schedule_room && (
                        <div className="text-xs text-gray-600">
                          {group.schedule_room}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-gray-400 text-sm">-</span>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{group.current_students}/{group.capacity}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-center">
                      {group.debt_count && group.debt_count > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          {group.debt_count}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-8 w-8 p-0 text-yellow-600 hover:bg-yellow-50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить группу?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Вы уверены, что хотите удалить группу "{group.name}"? Это действие нельзя отменить.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(group.id, group.name)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};