import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Search, Plus, Edit2, MoreHorizontal, Zap, Loader2, Trash2, Check, X, Download, Copy, GripVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuickResponses, CategoryWithResponses, QuickResponse } from "@/hooks/useQuickResponses";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface QuickResponsesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectResponse: (text: string) => void;
  isTeacher?: boolean;
}

// Sortable Category Item
const SortableCategoryItem = ({ 
  category, 
  onSelect, 
  onDelete 
}: { 
  category: CategoryWithResponses; 
  onSelect: () => void;
  onDelete: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer group"
    >
      <div className="flex items-center gap-2 flex-1" onClick={onSelect}>
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab hover:text-foreground text-muted-foreground p-1 -ml-1"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
          📁
        </div>
        <div>
          <span className="font-medium">{category.name}</span>
          <p className="text-xs text-muted-foreground">
            {category.responses.length} {category.responses.length === 1 ? 'шаблон' : 'шаблонов'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem 
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить раздел
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

// Sortable Response Item
const SortableResponseItem = ({ 
  response, 
  isEditing,
  editingText,
  onSelect,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onEditTextChange,
  onDelete,
  onCopy
}: { 
  response: QuickResponse;
  isEditing: boolean;
  editingText: string;
  onSelect: () => void;
  onEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditTextChange: (text: string) => void;
  onDelete: () => void;
  onCopy: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: response.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 border rounded-lg group ${
        isEditing 
          ? 'ring-2 ring-primary' 
          : 'hover:bg-muted/50 cursor-pointer'
      }`}
      onClick={() => {
        if (!isEditing) {
          onSelect();
        }
      }}
    >
      {isEditing ? (
        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
          <Textarea
            value={editingText}
            onChange={(e) => onEditTextChange(e.target.value)}
            className="min-h-[80px]"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={onSaveEdit}>
              <Check className="h-4 w-4 mr-1" />
              Сохранить
            </Button>
            <Button size="sm" variant="outline" onClick={onCancelEdit}>
              <X className="h-4 w-4 mr-1" />
              Отмена
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab hover:text-foreground text-muted-foreground p-1 -ml-1 mt-0.5 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <p className="text-sm flex-1 whitespace-pre-wrap">{response.text}</p>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
              title="Копировать"
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить шаблон
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
    </div>
  );
};

export const QuickResponsesModal = ({ open, onOpenChange, onSelectResponse, isTeacher = false }: QuickResponsesModalProps) => {
  const {
    categories,
    isLoading,
    isImporting,
    addCategory,
    deleteCategory,
    addResponse,
    updateResponse,
    deleteResponse,
    importDefaultTemplates,
    reorderCategories,
    reorderResponses
  } = useQuickResponses({ isTeacher });

  const { toast } = useToast();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [responseSearchQuery, setResponseSearchQuery] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddResponse, setShowAddResponse] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newResponseText, setNewResponseText] = useState("");
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null);
  const [editingResponseText, setEditingResponseText] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingResponse, setIsAddingResponse] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);
  
  const filteredCategories = useMemo(() => 
    categories.filter(category =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [categories, searchQuery]
  );

  // Filter responses within selected category
  const filteredResponses = useMemo(() => {
    if (!selectedCategory) return [];
    if (!responseSearchQuery.trim()) return selectedCategory.responses;
    
    const query = responseSearchQuery.toLowerCase();
    return selectedCategory.responses.filter(response =>
      response.text.toLowerCase().includes(query)
    );
  }, [selectedCategory, responseSearchQuery]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedCategoryId(null);
      setSearchQuery("");
      setResponseSearchQuery("");
      setShowAddCategory(false);
      setShowAddResponse(false);
      setNewCategoryName("");
      setNewResponseText("");
      setEditingResponseId(null);
    }
  }, [open]);

  // Reset response search when changing category
  useEffect(() => {
    setResponseSearchQuery("");
  }, [selectedCategoryId]);

  const handleSelectResponse = (response: QuickResponse) => {
    onSelectResponse(response.text);
    onOpenChange(false);
  };

  const handleCopyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Скопировано",
        description: "Текст скопирован в буфер обмена"
      });
    } catch (err) {
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать текст",
        variant: "destructive"
      });
    }
  }, [toast]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    setIsAddingCategory(true);
    const result = await addCategory(newCategoryName.trim());
    setIsAddingCategory(false);
    
    if (result) {
      setNewCategoryName("");
      setShowAddCategory(false);
    }
  };

  const handleAddResponse = async () => {
    if (!newResponseText.trim() || !selectedCategoryId) return;
    
    setIsAddingResponse(true);
    const result = await addResponse(selectedCategoryId, newResponseText.trim());
    setIsAddingResponse(false);
    
    if (result) {
      setNewResponseText("");
      setShowAddResponse(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    await deleteCategory(categoryId);
  };

  const handleDeleteResponse = async (responseId: string) => {
    await deleteResponse(responseId);
  };

  const handleStartEditResponse = (response: QuickResponse) => {
    setEditingResponseId(response.id);
    setEditingResponseText(response.text);
  };

  const handleSaveEditResponse = async () => {
    if (!editingResponseId || !editingResponseText.trim()) return;
    
    const success = await updateResponse(editingResponseId, editingResponseText.trim());
    if (success) {
      setEditingResponseId(null);
      setEditingResponseText("");
    }
  };

  const handleCancelEditResponse = () => {
    setEditingResponseId(null);
    setEditingResponseText("");
  };

  const handleImportDefaults = async () => {
    await importDefaultTemplates();
  };

  const goBack = () => {
    setSelectedCategoryId(null);
    setShowAddResponse(false);
    setResponseSearchQuery("");
  };

  // Handle category drag end
  const handleCategoryDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = filteredCategories.findIndex(c => c.id === active.id);
      const newIndex = filteredCategories.findIndex(c => c.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(filteredCategories, oldIndex, newIndex);
        await reorderCategories(newOrder.map(c => c.id));
      }
    }
  }, [filteredCategories, reorderCategories]);

  // Handle response drag end
  const handleResponseDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && selectedCategoryId) {
      const oldIndex = filteredResponses.findIndex(r => r.id === active.id);
      const newIndex = filteredResponses.findIndex(r => r.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(filteredResponses, oldIndex, newIndex);
        await reorderResponses(selectedCategoryId, newOrder.map(r => r.id));
      }
    }
  }, [filteredResponses, selectedCategoryId, reorderResponses]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-2">
            {selectedCategory && (
              <Button variant="ghost" size="sm" onClick={goBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <span>{selectedCategory ? selectedCategory.name : "Быстрые ответы"}</span>
              {isTeacher && (
                <span className="text-xs text-muted-foreground font-normal">(для преподавателей)</span>
              )}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !selectedCategory ? (
            // Categories view
            <>
              <div className="flex-shrink-0 space-y-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Поиск разделов..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleImportDefaults}
                    disabled={isImporting}
                    title="Импортировать стандартные шаблоны"
                  >
                    {isImporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Перетащите раздел, чтобы изменить порядок
                </p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredCategories.length === 0 && !showAddCategory ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Нет сохранённых шаблонов</p>
                    <p className="text-sm mt-1">Создайте первый раздел или импортируйте стандартные</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={handleImportDefaults}
                      disabled={isImporting}
                    >
                      {isImporting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Импортировать стандартные
                    </Button>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleCategoryDragEnd}
                  >
                    <SortableContext
                      items={filteredCategories.map(c => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {filteredCategories.map((category) => (
                        <SortableCategoryItem
                          key={category.id}
                          category={category}
                          onSelect={() => setSelectedCategoryId(category.id)}
                          onDelete={() => handleDeleteCategory(category.id)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
                
                {showAddCategory ? (
                  <div className="p-3 border rounded-lg space-y-2">
                    <Input
                      placeholder="Название раздела"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddCategory} disabled={isAddingCategory}>
                        {isAddingCategory && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Добавить
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowAddCategory(false)}>
                        Отмена
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-3 border-2 border-dashed text-primary"
                    onClick={() => setShowAddCategory(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить новый раздел
                  </Button>
                )}
              </div>
            </>
          ) : (
            // Responses view
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-shrink-0 mb-4 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск шаблонов..."
                    value={responseSearchQuery}
                    onChange={(e) => setResponseSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Нажмите на шаблон, чтобы вставить его. Перетащите для изменения порядка.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredResponses.length === 0 && !showAddResponse ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {responseSearchQuery ? (
                      <p>Ничего не найдено по запросу "{responseSearchQuery}"</p>
                    ) : (
                      <p>В этом разделе пока нет шаблонов</p>
                    )}
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleResponseDragEnd}
                  >
                    <SortableContext
                      items={filteredResponses.map(r => r.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {filteredResponses.map((response) => (
                        <SortableResponseItem
                          key={response.id}
                          response={response}
                          isEditing={editingResponseId === response.id}
                          editingText={editingResponseText}
                          onSelect={() => handleSelectResponse(response)}
                          onEdit={() => handleStartEditResponse(response)}
                          onSaveEdit={handleSaveEditResponse}
                          onCancelEdit={handleCancelEditResponse}
                          onEditTextChange={setEditingResponseText}
                          onDelete={() => handleDeleteResponse(response.id)}
                          onCopy={() => handleCopyToClipboard(response.text)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}

                {showAddResponse ? (
                  <div className="p-3 border rounded-lg space-y-2">
                    <Textarea
                      placeholder="Текст быстрого ответа"
                      value={newResponseText}
                      onChange={(e) => setNewResponseText(e.target.value)}
                      className="min-h-[80px]"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddResponse} disabled={isAddingResponse}>
                        {isAddingResponse && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Добавить
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowAddResponse(false)}>
                        Отмена
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-3 border-2 border-dashed text-primary"
                    onClick={() => setShowAddResponse(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить шаблон
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
