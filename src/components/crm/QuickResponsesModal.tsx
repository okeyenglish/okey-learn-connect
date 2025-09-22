import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Plus, Edit2, MoreHorizontal, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface QuickResponse {
  id: string;
  text: string;
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
  responses: QuickResponse[];
}

interface QuickResponsesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectResponse: (text: string) => void;
}

const defaultCategories: Category[] = [
  {
    id: "1",
    name: "Фирменные курсы",
    responses: [
      {
        id: "1-1",
        categoryId: "1",
        text: "Speaking club - это занятие для практических упражнений в устной речи, где участники могут свободно общаться на английском языке в непринужденной атмосфере."
      },
      {
        id: "1-2",
        categoryId: "1",
        text: "*Workshop - это имитация ситуаций,* которые возникают в поездках заграницей. За год мы проигрываем более 50 различных ситуаций."
      },
      {
        id: "1-3",
        categoryId: "1",
        text: "*Watch&Play - это авторский курс нашей школы,* который позволяет детям погружаться в мир мультфильмов, изучая английский язык."
      },
      {
        id: "1-4",
        categoryId: "1",
        text: "*Субботний мини-садик O'KEY ENGLISH*..."
      }
    ]
  },
  {
    id: "2",
    name: "Стоимость",
    responses: [
      {
        id: "2-1",
        categoryId: "2",
        text: "Стоимость индивидуальных занятий составляет 2500 рублей за урок 60 минут."
      },
      {
        id: "2-2",
        categoryId: "2",
        text: "Групповые занятия (2-4 человека) - 1800 рублей за урок на человека."
      },
      {
        id: "2-3",
        categoryId: "2",
        text: "Мини-группы (5-8 человек) - 1200 рублей за урок на человека."
      }
    ]
  },
  {
    id: "3",
    name: "Регистрация лица",
    responses: [
      {
        id: "3-1",
        categoryId: "3",
        text: "Для записи на пробное занятие нам потребуется ваше имя, контактный телефон и возраст ученика."
      },
      {
        id: "3-2",
        categoryId: "3",
        text: "Регистрация проходит через наш сайт или по телефону. Пробное занятие бесплатно!"
      }
    ]
  },
  {
    id: "4",
    name: "Тестирование",
    responses: [
      {
        id: "4-1",
        categoryId: "4",
        text: "Перед началом обучения мы проводим бесплатное тестирование для определения уровня знаний."
      },
      {
        id: "4-2",
        categoryId: "4",
        text: "Тестирование занимает около 30 минут и включает проверку грамматики, лексики и разговорных навыков."
      }
    ]
  },
  {
    id: "5",
    name: "Материнский капитал",
    responses: [
      {
        id: "5-1",
        categoryId: "5",
        text: "Да, мы принимаем оплату материнским капиталом для детей от 3 лет."
      },
      {
        id: "5-2",
        categoryId: "5",
        text: "Для оплаты материнским капиталом необходимо предоставить справку из ПФР и заключить договор."
      }
    ]
  },
  {
    id: "6",
    name: "Учебники",
    responses: [
      {
        id: "6-1",
        categoryId: "6",
        text: "Мы используем современные британские учебники Cambridge и Oxford."
      },
      {
        id: "6-2",
        categoryId: "6",
        text: "Все необходимые материалы предоставляются школой. Дополнительно покупать ничего не нужно."
      }
    ]
  }
];

export const QuickResponsesModal = ({ open, onOpenChange, onSelectResponse }: QuickResponsesModalProps) => {
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddResponse, setShowAddResponse] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newResponseText, setNewResponseText] = useState("");

  const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);
  
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectResponse = (response: QuickResponse) => {
    onSelectResponse(response.text);
    onOpenChange(false);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const newCategory: Category = {
      id: Date.now().toString(),
      name: newCategoryName.trim(),
      responses: []
    };
    
    setCategories(prev => [...prev, newCategory]);
    setNewCategoryName("");
    setShowAddCategory(false);
  };

  const handleAddResponse = () => {
    if (!newResponseText.trim() || !selectedCategoryId) return;
    
    const newResponse: QuickResponse = {
      id: Date.now().toString(),
      categoryId: selectedCategoryId,
      text: newResponseText.trim()
    };
    
    setCategories(prev => prev.map(cat => 
      cat.id === selectedCategoryId 
        ? { ...cat, responses: [...cat.responses, newResponse] }
        : cat
    ));
    
    setNewResponseText("");
    setShowAddResponse(false);
  };

  const handleDeleteCategory = (categoryId: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
  };

  const handleDeleteResponse = (responseId: string) => {
    setCategories(prev => prev.map(cat => ({
      ...cat,
      responses: cat.responses.filter(resp => resp.id !== responseId)
    })));
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
            <DialogTitle>
              {selectedCategory ? selectedCategory.name : "Быстрые ответы"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {!selectedCategory ? (
            // Categories view
            <>
              <div className="flex-shrink-0 space-y-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Разделы"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer group"
                    onClick={() => setSelectedCategoryId(category.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                        📁
                      </div>
                      <span className="font-medium">{category.name}</span>
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
                          <DropdownMenuItem onClick={() => handleDeleteCategory(category.id)}>
                            Удалить раздел
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
                
                {showAddCategory ? (
                  <div className="p-3 border rounded-lg space-y-2">
                    <Input
                      placeholder="Название раздела"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddCategory}>
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
                <p className="text-sm text-muted-foreground">Сообщения</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {selectedCategory.responses.map((response) => (
                  <div
                    key={response.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer group"
                    onClick={() => handleSelectResponse(response)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm flex-1">{response.text}</p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Edit functionality
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
                            <DropdownMenuItem onClick={() => handleDeleteResponse(response.id)}>
                              Удалить сообщение
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}

                {showAddResponse ? (
                  <div className="p-3 border rounded-lg space-y-2">
                    <Textarea
                      placeholder="Текст быстрого ответа"
                      value={newResponseText}
                      onChange={(e) => setNewResponseText(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddResponse}>
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
                    Добавить быстрый ответ
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