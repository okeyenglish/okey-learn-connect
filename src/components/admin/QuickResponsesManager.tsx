import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Loader2,
  Download,
  GripVertical,
  FolderPlus,
  Zap,
  Check,
  MessageSquare,
} from 'lucide-react';
import { useQuickResponses, CategoryWithResponses, QuickResponse } from '@/hooks/useQuickResponses';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable response item for drag-and-drop reordering
const SortableResponseItem = ({
  response,
  onEdit,
  onDelete,
  isEditing,
  editText,
  onEditTextChange,
  onSaveEdit,
  onCancelEdit,
}: {
  response: QuickResponse;
  onEdit: () => void;
  onDelete: () => void;
  isEditing: boolean;
  editText: string;
  onEditTextChange: (text: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: response.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 p-3 border rounded-lg bg-card group">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab hover:text-foreground text-muted-foreground p-1 mt-0.5 flex-shrink-0"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {isEditing ? (
        <div className="flex-1 space-y-2">
          <Textarea
            value={editText}
            onChange={(e) => onEditTextChange(e.target.value)}
            className="min-h-[60px] text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={onSaveEdit} className="h-7 text-xs">
              <Check className="h-3 w-3 mr-1" /> Сохранить
            </Button>
            <Button size="sm" variant="outline" onClick={onCancelEdit} className="h-7 text-xs">
              <X className="h-3 w-3 mr-1" /> Отмена
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 text-sm whitespace-pre-wrap">{response.text}</div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onEdit}>
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

// Sortable category item
const SortableCategoryCard = ({
  category,
  isSelected,
  onClick,
}: {
  category: CategoryWithResponses;
  isSelected: boolean;
  onClick: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
      }`}
      onClick={onClick}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab hover:text-foreground text-muted-foreground p-0.5 flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{category.name}</p>
        <p className="text-xs text-muted-foreground">
          {category.responses.length} {category.responses.length === 1 ? 'шаблон' : 'шаблонов'}
        </p>
      </div>
    </div>
  );
};

export function QuickResponsesManager() {
  const [activeTab, setActiveTab] = useState<'clients' | 'teachers'>('clients');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Zap className="h-8 w-8" />
          Быстрые ответы
        </h1>
        <p className="text-muted-foreground mt-1">
          Управление шаблонами быстрых ответов для чатов. Доступны как из админ-панели, так и из поля ввода в чате.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'clients' | 'teachers')}>
        <TabsList>
          <TabsTrigger value="clients">
            <MessageSquare className="h-4 w-4 mr-1.5" />
            Для клиентов
          </TabsTrigger>
          <TabsTrigger value="teachers">
            <MessageSquare className="h-4 w-4 mr-1.5" />
            Для преподавателей
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-4">
          <QuickResponsesEditor isTeacher={false} />
        </TabsContent>
        <TabsContent value="teachers" className="mt-4">
          <QuickResponsesEditor isTeacher={true} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QuickResponsesEditor({ isTeacher }: { isTeacher: boolean }) {
  const {
    categories,
    isLoading,
    isImporting,
    addCategory,
    updateCategory,
    deleteCategory,
    addResponse,
    updateResponse,
    deleteResponse,
    importDefaultTemplates,
    reorderCategories,
    reorderResponses,
  } = useQuickResponses({ isTeacher });

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [newResponseText, setNewResponseText] = useState('');
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null);
  const [editingResponseText, setEditingResponseText] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'category' | 'response'; id: string; name: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) || null;

  // Auto-select first category
  React.useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const cat = await addCategory(newCategoryName.trim());
    if (cat) {
      setNewCategoryName('');
      setIsAddingCategory(false);
      setSelectedCategoryId(cat.id);
    }
  };

  const handleSaveCategoryName = async () => {
    if (!editingCategoryId || !editingCategoryName.trim()) return;
    await updateCategory(editingCategoryId, editingCategoryName.trim());
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  const handleDeleteCategory = async () => {
    if (!deleteConfirm || deleteConfirm.type !== 'category') return;
    await deleteCategory(deleteConfirm.id);
    if (selectedCategoryId === deleteConfirm.id) {
      setSelectedCategoryId(categories.find((c) => c.id !== deleteConfirm.id)?.id || null);
    }
    setDeleteConfirm(null);
  };

  const handleAddResponse = async () => {
    if (!selectedCategoryId || !newResponseText.trim()) return;
    await addResponse(selectedCategoryId, newResponseText.trim());
    setNewResponseText('');
  };

  const handleSaveResponse = async () => {
    if (!editingResponseId || !editingResponseText.trim()) return;
    await updateResponse(editingResponseId, editingResponseText.trim());
    setEditingResponseId(null);
    setEditingResponseText('');
  };

  const handleDeleteResponse = async () => {
    if (!deleteConfirm || deleteConfirm.type !== 'response') return;
    await deleteResponse(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(categories, oldIndex, newIndex);
    reorderCategories(reordered.map((c) => c.id));
  };

  const handleResponseDragEnd = (event: DragEndEvent) => {
    if (!selectedCategory) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const responses = selectedCategory.responses;
    const oldIndex = responses.findIndex((r) => r.id === active.id);
    const newIndex = responses.findIndex((r) => r.id === over.id);
    const reordered = arrayMove(responses, oldIndex, newIndex);
    reorderResponses(selectedCategory.id, reordered.map((r) => r.id));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Загрузка шаблонов...</span>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <Zap className="h-12 w-12 text-muted-foreground/50" />
          <div className="text-center">
            <h3 className="text-lg font-semibold">Нет сохранённых шаблонов</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Создайте первый раздел или импортируйте стандартные
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={importDefaultTemplates} disabled={isImporting}>
              {isImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Импортировать стандартные
            </Button>
            <Button onClick={() => setIsAddingCategory(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Создать раздел
            </Button>
          </div>
          {isAddingCategory && (
            <div className="flex gap-2 mt-4 w-full max-w-md">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Название раздела"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              />
              <Button size="sm" onClick={handleAddCategory}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setIsAddingCategory(false); setNewCategoryName(''); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
      {/* Left: Categories */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Разделы</CardTitle>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={importDefaultTemplates} disabled={isImporting} title="Импортировать стандартные">
                {isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setIsAddingCategory(true)} title="Добавить раздел">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2">
              {isAddingCategory && (
                <div className="flex gap-2 p-2">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Название..."
                    className="h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCategory();
                      if (e.key === 'Escape') { setIsAddingCategory(false); setNewCategoryName(''); }
                    }}
                  />
                  <Button size="sm" className="h-8 w-8 p-0" onClick={handleAddCategory}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => { setIsAddingCategory(false); setNewCategoryName(''); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
                <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  {categories.map((category) => (
                    <div key={category.id} className="relative group">
                      {editingCategoryId === category.id ? (
                        <div className="flex gap-2 p-2">
                          <Input
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            className="h-8 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveCategoryName();
                              if (e.key === 'Escape') { setEditingCategoryId(null); setEditingCategoryName(''); }
                            }}
                          />
                          <Button size="sm" className="h-8 w-8 p-0" onClick={handleSaveCategoryName}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => { setEditingCategoryId(null); setEditingCategoryName(''); }}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                          <SortableCategoryCard
                            category={category}
                            isSelected={selectedCategoryId === category.id}
                            onClick={() => setSelectedCategoryId(category.id)}
                          />
                          <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCategoryId(category.id);
                                setEditingCategoryName(category.name);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm({ type: 'category', id: category.id, name: category.name });
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Right: Responses in selected category */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">
                {selectedCategory ? selectedCategory.name : 'Выберите раздел'}
              </CardTitle>
              {selectedCategory && (
                <CardDescription className="text-xs mt-0.5">
                  {selectedCategory.responses.length} шаблонов
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {!selectedCategory ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Выберите раздел слева для управления шаблонами
            </div>
          ) : (
            <div className="space-y-4">
              {/* Add new response */}
              <div className="space-y-2 p-3 border rounded-lg border-dashed">
                <Textarea
                  value={newResponseText}
                  onChange={(e) => setNewResponseText(e.target.value)}
                  placeholder="Введите текст нового быстрого ответа..."
                  className="min-h-[60px] text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleAddResponse}
                  disabled={!newResponseText.trim()}
                  className="h-8"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Добавить шаблон
                </Button>
              </div>

              {/* Response list */}
              <ScrollArea className="max-h-[50vh]">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleResponseDragEnd}>
                  <SortableContext
                    items={selectedCategory.responses.map((r) => r.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {selectedCategory.responses.map((response) => (
                        <SortableResponseItem
                          key={response.id}
                          response={response}
                          isEditing={editingResponseId === response.id}
                          editText={editingResponseText}
                          onEditTextChange={setEditingResponseText}
                          onEdit={() => {
                            setEditingResponseId(response.id);
                            setEditingResponseText(response.text);
                          }}
                          onDelete={() =>
                            setDeleteConfirm({ type: 'response', id: response.id, name: response.text.slice(0, 40) })
                          }
                          onSaveEdit={handleSaveResponse}
                          onCancelEdit={() => {
                            setEditingResponseId(null);
                            setEditingResponseText('');
                          }}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {selectedCategory.responses.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    Нет шаблонов в этом разделе. Добавьте первый выше.
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Удалить {deleteConfirm?.type === 'category' ? 'раздел' : 'шаблон'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === 'category'
                ? `Раздел "${deleteConfirm?.name}" и все его шаблоны будут удалены.`
                : `Шаблон "${deleteConfirm?.name}..." будет удалён.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteConfirm?.type === 'category' ? handleDeleteCategory : handleDeleteResponse}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
