import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Search, Plus, Edit2, MoreHorizontal, Zap, Loader2, Trash2, Check, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuickResponses, CategoryWithResponses, QuickResponse } from "@/hooks/useQuickResponses";

interface QuickResponsesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectResponse: (text: string) => void;
  isTeacher?: boolean;
}

// Default templates for initial data seeding
const defaultClientTemplates = [
  {
    name: "Фирменные курсы",
    responses: [
      "Speaking club - это занятие для практических упражнений в устной речи, где участники могут свободно общаться на английском языке в непринужденной атмосфере.",
      "*Workshop - это имитация ситуаций,* которые возникают в поездках заграницей. За год мы проигрываем более 50 различных ситуаций.",
      "*Watch&Play - это авторский курс нашей школы,* который позволяет детям погружаться в мир мультфильмов, изучая английский язык."
    ]
  },
  {
    name: "Стоимость",
    responses: [
      "Стоимость индивидуальных занятий составляет 2500 рублей за урок 60 минут.",
      "Групповые занятия (2-4 человека) - 1800 рублей за урок на человека.",
      "Мини-группы (5-8 человек) - 1200 рублей за урок на человека."
    ]
  },
  {
    name: "Тестирование",
    responses: [
      "Перед началом обучения мы проводим бесплатное тестирование для определения уровня знаний.",
      "Тестирование занимает около 30 минут и включает проверку грамматики, лексики и разговорных навыков."
    ]
  }
];

const defaultTeacherTemplates = [
  {
    name: "Расписание",
    responses: [
      "Добрый день! Подтверждаю ваше расписание на эту неделю.",
      "К сожалению, занятие придётся перенести. Предлагаю следующие варианты времени:",
      "Напоминаю о занятии завтра. Пожалуйста, подготовьте материалы."
    ]
  },
  {
    name: "Общее",
    responses: [
      "Спасибо за информацию! Приняла к сведению.",
      "Хорошо, подтверждаю.",
      "Пожалуйста, уточните детали."
    ]
  }
];

export const QuickResponsesModal = ({ open, onOpenChange, onSelectResponse, isTeacher = false }: QuickResponsesModalProps) => {
  const {
    categories,
    isLoading,
    addCategory,
    deleteCategory,
    addResponse,
    updateResponse,
    deleteResponse
  } = useQuickResponses({ isTeacher });

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddResponse, setShowAddResponse] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newResponseText, setNewResponseText] = useState("");
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null);
  const [editingResponseText, setEditingResponseText] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingResponse, setIsAddingResponse] = useState(false);

  const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);
  
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedCategoryId(null);
      setSearchQuery("");
      setShowAddCategory(false);
      setShowAddResponse(false);
      setNewCategoryName("");
      setNewResponseText("");
      setEditingResponseId(null);
    }
  }, [open]);

  const handleSelectResponse = (response: QuickResponse) => {
    onSelectResponse(response.text);
    onOpenChange(false);
  };

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

  const goBack = () => {
    setSelectedCategoryId(null);
    setShowAddResponse(false);
  };

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
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredCategories.length === 0 && !showAddCategory ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Нет сохранённых шаблонов</p>
                    <p className="text-sm mt-1">Создайте первый раздел для быстрых ответов</p>
                  </div>
                ) : (
                  filteredCategories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer group"
                      onClick={() => setSelectedCategoryId(category.id)}
                    >
                      <div className="flex items-center gap-3">
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
                                handleDeleteCategory(category.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Удалить раздел
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
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
              <div className="flex-shrink-0 mb-4">
                <p className="text-sm text-muted-foreground">
                  Нажмите на шаблон, чтобы вставить его в сообщение
                </p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {selectedCategory.responses.length === 0 && !showAddResponse ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>В этом разделе пока нет шаблонов</p>
                  </div>
                ) : (
                  selectedCategory.responses.map((response) => (
                    <div
                      key={response.id}
                      className={`p-3 border rounded-lg group ${
                        editingResponseId === response.id 
                          ? 'ring-2 ring-primary' 
                          : 'hover:bg-muted/50 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (editingResponseId !== response.id) {
                          handleSelectResponse(response);
                        }
                      }}
                    >
                      {editingResponseId === response.id ? (
                        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                          <Textarea
                            value={editingResponseText}
                            onChange={(e) => setEditingResponseText(e.target.value)}
                            className="min-h-[80px]"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveEditResponse}>
                              <Check className="h-4 w-4 mr-1" />
                              Сохранить
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEditResponse}>
                              <X className="h-4 w-4 mr-1" />
                              Отмена
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm flex-1 whitespace-pre-wrap">{response.text}</p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEditResponse(response);
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
                                    handleDeleteResponse(response.id);
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
                  ))
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
