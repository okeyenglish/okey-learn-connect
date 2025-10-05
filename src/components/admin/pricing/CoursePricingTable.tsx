import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Pencil, Save } from "lucide-react";
import { EditCoursePriceModal } from "./EditCoursePriceModal";
import { toast } from "@/hooks/use-toast";

// Импортируем данные из централизованного прайс-листа
const COURSE_PRICES = {
  'super safari 1': { pricePerLesson: 1250, academicHoursPerLesson: 1.5, packagePrice: 10000 },
  'super safari 2': { pricePerLesson: 1250, academicHoursPerLesson: 1.5, packagePrice: 10000 },
  'super safari 3': { pricePerLesson: 2000, academicHoursPerLesson: 2, packagePrice: 16000 },
  "kid's box 1": { pricePerLesson: 1500, academicHoursPerLesson: 2, packagePrice: 12000 },
  "kid's box 2": { pricePerLesson: 1500, academicHoursPerLesson: 2, packagePrice: 12000 },
  "kid's box 3": { pricePerLesson: 1500, academicHoursPerLesson: 2, packagePrice: 12000 },
  "kid's box 4": { pricePerLesson: 1500, academicHoursPerLesson: 2, packagePrice: 12000 },
  "kid's box 5": { pricePerLesson: 1500, academicHoursPerLesson: 2, packagePrice: 12000 },
  "kid's box 6": { pricePerLesson: 1500, academicHoursPerLesson: 2, packagePrice: 12000 },
  'prepare 1': { pricePerLesson: 1750, academicHoursPerLesson: 2, packagePrice: 14000 },
  'prepare 2': { pricePerLesson: 1750, academicHoursPerLesson: 2, packagePrice: 14000 },
  'prepare 3': { pricePerLesson: 1750, academicHoursPerLesson: 2, packagePrice: 14000 },
  'prepare 4': { pricePerLesson: 1750, academicHoursPerLesson: 2, packagePrice: 14000 },
  'prepare 5': { pricePerLesson: 1750, academicHoursPerLesson: 2, packagePrice: 14000 },
  'prepare 6': { pricePerLesson: 1750, academicHoursPerLesson: 2, packagePrice: 14000 },
  'prepare 7': { pricePerLesson: 1750, academicHoursPerLesson: 2, packagePrice: 14000 },
  'empower a1': { pricePerLesson: 1750, academicHoursPerLesson: 2, packagePrice: 14000 },
  'empower a2': { pricePerLesson: 1750, academicHoursPerLesson: 2, packagePrice: 14000 },
  'empower b1': { pricePerLesson: 1750, academicHoursPerLesson: 2, packagePrice: 14000 },
  'empower b1+': { pricePerLesson: 1750, academicHoursPerLesson: 2, packagePrice: 14000 },
  'empower b2': { pricePerLesson: 1750, academicHoursPerLesson: 2, packagePrice: 14000 },
  'empower c1': { pricePerLesson: 1750, academicHoursPerLesson: 2, packagePrice: 14000 },
};

interface CoursePrice {
  id: string;
  courseName: string;
  pricePerLesson: number;
  academicHoursPerLesson: number;
  packagePrice: number;
  pricePer40Min?: number;
  pricePerAcademicHour?: number;
}

export function CoursePricingTable() {
  const [editingPrice, setEditingPrice] = useState<CoursePrice | null>(null);
  const [selectedPrices, setSelectedPrices] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrices, setEditedPrices] = useState<Map<string, { pricePer40Min: number; pricePerAcademicHour: number }>>(new Map());

  // Преобразуем объект в массив для отображения
  const prices: CoursePrice[] = Object.entries(COURSE_PRICES).map(([name, data], index) => {
    const pricePer40Min = data.pricePerLesson;
    const pricePerAcademicHour = Math.round(data.pricePerLesson / data.academicHoursPerLesson);
    
    return {
      id: index.toString(),
      courseName: name,
      ...data,
      pricePer40Min,
      pricePerAcademicHour,
    };
  });

  const handleEdit = (price: CoursePrice) => {
    setEditingPrice(price);
  };

  const toggleSelectAll = () => {
    if (selectedPrices.size === prices.length) {
      setSelectedPrices(new Set());
    } else {
      setSelectedPrices(new Set(prices.map(p => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedPrices);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPrices(newSelected);
  };

  const handlePriceChange = (id: string, field: 'pricePer40Min' | 'pricePerAcademicHour', value: string) => {
    const numValue = parseFloat(value) || 0;
    const current = editedPrices.get(id) || { pricePer40Min: 0, pricePerAcademicHour: 0 };
    setEditedPrices(new Map(editedPrices.set(id, { ...current, [field]: numValue })));
  };

  const startEditing = () => {
    if (selectedPrices.size === 0) {
      toast({
        title: "Выберите курсы",
        description: "Выберите хотя бы один курс для редактирования",
        variant: "destructive",
      });
      return;
    }
    
    // Инициализируем editedPrices текущими значениями
    const initialEdited = new Map();
    prices.forEach(price => {
      if (selectedPrices.has(price.id)) {
        initialEdited.set(price.id, {
          pricePer40Min: price.pricePer40Min || 0,
          pricePerAcademicHour: price.pricePerAcademicHour || 0,
        });
      }
    });
    setEditedPrices(initialEdited);
    setIsEditing(true);
  };

  const saveChanges = () => {
    toast({
      title: "Функция в разработке",
      description: "Сохранение изменений будет доступно после подключения к базе данных",
    });
    setIsEditing(false);
    setSelectedPrices(new Set());
    setEditedPrices(new Map());
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedPrices(new Map());
  };

  return (
    <>
      <div className="mb-4 flex gap-2">
        {!isEditing ? (
          <Button onClick={startEditing} disabled={selectedPrices.size === 0}>
            <Pencil className="mr-2 h-4 w-4" />
            Редактировать выбранные ({selectedPrices.size})
          </Button>
        ) : (
          <>
            <Button onClick={saveChanges} variant="default">
              <Save className="mr-2 h-4 w-4" />
              Сохранить изменения
            </Button>
            <Button onClick={cancelEditing} variant="outline">
              Отменить
            </Button>
          </>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedPrices.size === prices.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Название курса</TableHead>
              <TableHead>Стоимость за 40 минут</TableHead>
              <TableHead>1 ак/ч</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Нет данных о ценах
                </TableCell>
              </TableRow>
            ) : (
              prices.map((price) => {
                const edited = editedPrices.get(price.id);
                const isSelected = selectedPrices.has(price.id);
                const isEditingThis = isEditing && isSelected;

                return (
                  <TableRow key={price.id}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(price.id)}
                        disabled={isEditing}
                      />
                    </TableCell>
                    <TableCell className="font-medium capitalize">{price.courseName}</TableCell>
                    <TableCell>
                      {isEditingThis ? (
                        <Input
                          type="number"
                          value={edited?.pricePer40Min || price.pricePer40Min}
                          onChange={(e) => handlePriceChange(price.id, 'pricePer40Min', e.target.value)}
                          className="w-32"
                        />
                      ) : (
                        `${price.pricePer40Min?.toLocaleString('ru-RU')} ₽`
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditingThis ? (
                        <Input
                          type="number"
                          value={edited?.pricePerAcademicHour || price.pricePerAcademicHour}
                          onChange={(e) => handlePriceChange(price.id, 'pricePerAcademicHour', e.target.value)}
                          className="w-32"
                        />
                      ) : (
                        `${price.pricePerAcademicHour?.toLocaleString('ru-RU')} ₽`
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {editingPrice && (
        <EditCoursePriceModal
          price={editingPrice}
          open={!!editingPrice}
          onOpenChange={(open) => !open && setEditingPrice(null)}
        />
      )}
    </>
  );
}
