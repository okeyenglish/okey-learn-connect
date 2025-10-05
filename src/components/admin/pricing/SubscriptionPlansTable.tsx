import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Save } from "lucide-react";
import { useGroupCoursePrices, useUpdateGroupCoursePrices } from "@/hooks/useGroupCoursePrices";

export function SubscriptionPlansTable() {
  const { data: prices, isLoading } = useGroupCoursePrices();
  const updatePrices = useUpdateGroupCoursePrices();
  
  const [selectedPrices, setSelectedPrices] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrices, setEditedPrices] = useState<Map<string, {
    duration_minutes: number;
    price_8_lessons: number;
    price_24_lessons: number;
    price_80_lessons: number;
  }>>(new Map());
  const [bulkDuration, setBulkDuration] = useState("");
  const [bulkPrice8, setBulkPrice8] = useState("");
  const [bulkPrice24, setBulkPrice24] = useState("");
  const [bulkPrice80, setBulkPrice80] = useState("");

  const toggleSelectAll = () => {
    if (selectedPrices.size === prices?.length) {
      setSelectedPrices(new Set());
    } else {
      setSelectedPrices(new Set(prices?.map(p => p.id) || []));
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

  const handlePriceChange = (id: string, field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const current = editedPrices.get(id) || prices?.find(p => p.id === id);
    if (current) {
      setEditedPrices(new Map(editedPrices.set(id, {
        duration_minutes: field === 'duration_minutes' ? numValue : current.duration_minutes,
        price_8_lessons: field === 'price_8_lessons' ? numValue : current.price_8_lessons,
        price_24_lessons: field === 'price_24_lessons' ? numValue : current.price_24_lessons,
        price_80_lessons: field === 'price_80_lessons' ? numValue : current.price_80_lessons,
      })));
    }
  };

  const applyBulkPrices = () => {
    const duration = parseFloat(bulkDuration);
    const price8 = parseFloat(bulkPrice8);
    const price24 = parseFloat(bulkPrice24);
    const price80 = parseFloat(bulkPrice80);

    selectedPrices.forEach(id => {
      const current = editedPrices.get(id) || prices?.find(p => p.id === id);
      if (current) {
        setEditedPrices(new Map(editedPrices.set(id, {
          duration_minutes: !isNaN(duration) ? duration : current.duration_minutes,
          price_8_lessons: !isNaN(price8) ? price8 : current.price_8_lessons,
          price_24_lessons: !isNaN(price24) ? price24 : current.price_24_lessons,
          price_80_lessons: !isNaN(price80) ? price80 : current.price_80_lessons,
        })));
      }
    });
  };

  const startEditing = () => {
    const initialEdits = new Map();
    prices?.forEach(price => {
      if (selectedPrices.has(price.id)) {
        initialEdits.set(price.id, {
          duration_minutes: price.duration_minutes,
          price_8_lessons: price.price_8_lessons,
          price_24_lessons: price.price_24_lessons,
          price_80_lessons: price.price_80_lessons,
        });
      }
    });
    setEditedPrices(initialEdits);
    setIsEditing(true);
  };

  const saveChanges = async () => {
    const updates = Array.from(editedPrices.entries()).map(([id, values]) => ({
      id,
      ...values
    }));
    
    await updatePrices.mutateAsync(updates);
    setIsEditing(false);
    setEditedPrices(new Map());
    setSelectedPrices(new Set());
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedPrices(new Map());
    setBulkDuration("");
    setBulkPrice8("");
    setBulkPrice24("");
    setBulkPrice80("");
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-4">
        <div className="flex gap-2">
          {!isEditing ? (
            <Button onClick={startEditing} disabled={selectedPrices.size === 0}>
              <Pencil className="mr-2 h-4 w-4" />
              Редактировать выбранные ({selectedPrices.size})
            </Button>
          ) : (
            <>
              <Button onClick={saveChanges} variant="default" disabled={updatePrices.isPending}>
                <Save className="mr-2 h-4 w-4" />
                Сохранить изменения
              </Button>
              <Button onClick={cancelEditing} variant="outline">
                Отменить
              </Button>
            </>
          )}
        </div>

        {isEditing && selectedPrices.size > 0 && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <h3 className="text-sm font-medium mb-3">Применить ко всем выбранным:</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Продолжительность (мин)</label>
                <Input
                  type="number"
                  placeholder="80"
                  value={bulkDuration}
                  onChange={(e) => setBulkDuration(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">8 занятий (₽)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={bulkPrice8}
                  onChange={(e) => setBulkPrice8(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">24 занятия (₽)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={bulkPrice24}
                  onChange={(e) => setBulkPrice24(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">80 занятий (₽)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={bulkPrice80}
                  onChange={(e) => setBulkPrice80(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={applyBulkPrices} size="sm" className="mt-3">
              Применить ко всем
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedPrices.size === prices?.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Название курса</TableHead>
              <TableHead>Продолжительность (мин)</TableHead>
              <TableHead>8 занятий</TableHead>
              <TableHead>24 занятия</TableHead>
              <TableHead>80 занятий</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!prices || prices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Нет курсов
                </TableCell>
              </TableRow>
            ) : (
              prices.map((price) => {
                const edited = editedPrices.get(price.id);
                const isSelected = selectedPrices.has(price.id);
                const showEditing = isEditing && isSelected;
                
                return (
                  <TableRow key={price.id}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(price.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{price.course_name}</TableCell>
                    <TableCell>
                      {showEditing ? (
                        <Input
                          type="number"
                          value={edited?.duration_minutes ?? price.duration_minutes}
                          onChange={(e) => handlePriceChange(price.id, 'duration_minutes', e.target.value)}
                          className="w-24"
                        />
                      ) : (
                        `${price.duration_minutes} мин`
                      )}
                    </TableCell>
                    <TableCell>
                      {showEditing ? (
                        <Input
                          type="number"
                          value={edited?.price_8_lessons ?? price.price_8_lessons}
                          onChange={(e) => handlePriceChange(price.id, 'price_8_lessons', e.target.value)}
                          className="w-32"
                        />
                      ) : (
                        `${price.price_8_lessons.toLocaleString('ru-RU')} ₽`
                      )}
                    </TableCell>
                    <TableCell>
                      {showEditing ? (
                        <Input
                          type="number"
                          value={edited?.price_24_lessons ?? price.price_24_lessons}
                          onChange={(e) => handlePriceChange(price.id, 'price_24_lessons', e.target.value)}
                          className="w-32"
                        />
                      ) : (
                        `${price.price_24_lessons.toLocaleString('ru-RU')} ₽`
                      )}
                    </TableCell>
                    <TableCell>
                      {showEditing ? (
                        <Input
                          type="number"
                          value={edited?.price_80_lessons ?? price.price_80_lessons}
                          onChange={(e) => handlePriceChange(price.id, 'price_80_lessons', e.target.value)}
                          className="w-32"
                        />
                      ) : (
                        `${price.price_80_lessons.toLocaleString('ru-RU')} ₽`
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
