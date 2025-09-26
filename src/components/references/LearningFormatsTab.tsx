import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Globe } from 'lucide-react';
import { useLearningFormats } from '@/hooks/useReferences';

export const LearningFormatsTab = () => {
  const { data: formats, isLoading } = useLearningFormats();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFormats = (formats || []).filter(format =>
    format.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (format.description && format.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Поиск форматов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Добавить формат
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
              <TableHead>Описание</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFormats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Форматы не найдены' : 'Нет форматов'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredFormats.map((format) => (
                <TableRow key={format.id}>
                  <TableCell className="font-medium">{format.name}</TableCell>
                  <TableCell>{format.description || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {format.is_online && (
                        <Badge variant="outline" className="text-xs">
                          <Globe className="h-3 w-3 mr-1" />
                          Онлайн
                        </Badge>
                      )}
                      {!format.is_online && (
                        <Badge variant="secondary" className="text-xs">
                          Офлайн
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={format.is_active ? "default" : "secondary"}>
                      {format.is_active ? 'Активный' : 'Неактивный'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
};