import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Search, Users, Monitor } from 'lucide-react';
import { useClassrooms, useDeleteClassroom } from '@/hooks/useReferences';
import { ClassroomModal } from './ClassroomModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export const ClassroomsTab = () => {
  const { data: classrooms, isLoading } = useClassrooms();
  const deleteClassroom = useDeleteClassroom();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState(null);

  const filteredClassrooms = (classrooms || []).filter(classroom =>
    classroom.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    classroom.branch.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (classroom.notes && classroom.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleEdit = (classroom: any) => {
    setEditingClassroom(classroom);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteClassroom.mutateAsync(id);
  };

  const handleAddNew = () => {
    setEditingClassroom(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClassroom(null);
  };

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Поиск аудиторий..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить аудиторию
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Загрузка...</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Филиал</TableHead>
              <TableHead>Вместимость</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Оборудование</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClassrooms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Аудитории не найдены' : 'Нет аудиторий'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredClassrooms.map((classroom) => (
                <TableRow key={classroom.id}>
                  <TableCell className="font-medium">{classroom.name}</TableCell>
                  <TableCell>{classroom.branch}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {classroom.capacity}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={classroom.is_online ? "default" : "secondary"}>
                      {classroom.is_online ? (
                        <>
                          <Monitor className="h-3 w-3 mr-1" />
                          Онлайн
                        </>
                      ) : (
                        'Офлайн'
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {classroom.equipment && classroom.equipment.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {classroom.equipment.slice(0, 2).map((item, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {item}
                          </Badge>
                        ))}
                        {classroom.equipment.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{classroom.equipment.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={classroom.is_active ? "default" : "secondary"}>
                      {classroom.is_active ? 'Активная' : 'Неактивная'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(classroom)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить аудиторию</AlertDialogTitle>
                            <AlertDialogDescription>
                              Вы уверены, что хотите удалить аудиторию "{classroom.name}" 
                              в филиале "{classroom.branch}"? Это действие необратимо.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(classroom.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <ClassroomModal
        open={isModalOpen}
        onOpenChange={handleCloseModal}
        classroom={editingClassroom}
      />
    </div>
  );
};