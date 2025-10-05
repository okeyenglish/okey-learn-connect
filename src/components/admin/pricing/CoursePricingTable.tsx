import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { EditCoursePriceModal } from "./EditCoursePriceModal";

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
}

export function CoursePricingTable() {
  const [editingPrice, setEditingPrice] = useState<CoursePrice | null>(null);

  // Преобразуем объект в массив для отображения
  const prices: CoursePrice[] = Object.entries(COURSE_PRICES).map(([name, data], index) => ({
    id: index.toString(),
    courseName: name,
    ...data,
  }));

  const handleEdit = (price: CoursePrice) => {
    setEditingPrice(price);
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Курс / Программа</TableHead>
              <TableHead>Цена за занятие</TableHead>
              <TableHead>Акад. часов</TableHead>
              <TableHead>Пакет 8 занятий</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Нет данных о ценах
                </TableCell>
              </TableRow>
            ) : (
              prices.map((price) => (
                <TableRow key={price.id}>
                  <TableCell className="font-medium capitalize">{price.courseName}</TableCell>
                  <TableCell>{price.pricePerLesson.toLocaleString('ru-RU')} ₽</TableCell>
                  <TableCell>{price.academicHoursPerLesson}</TableCell>
                  <TableCell>{price.packagePrice.toLocaleString('ru-RU')} ₽</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(price)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
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
