import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, BookOpen, Clock, TrendingUp, Download, X, GraduationCap } from "lucide-react";
import { useIndividualLessons, IndividualLessonFilters } from "@/hooks/useIndividualLessons";
import { IndividualLessonsTable } from "./IndividualLessonsTable";
import { IndividualLessonsFilters } from "./IndividualLessonsFilters";
import { AddIndividualLessonModal } from "./AddIndividualLessonModal";

interface IndividualLessonsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const IndividualLessonsModal = ({ open, onOpenChange }: IndividualLessonsModalProps) => {
  const [filters, setFilters] = useState<IndividualLessonFilters>({});

  const { lessons, isLoading } = useIndividualLessons(filters);

  const handleFiltersChange = (newFilters: IndividualLessonFilters) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({});
  };

  const handleLessonAdded = () => {
    // Refresh will happen automatically due to React Query
  };

  // Calculate statistics
  const stats = {
    total: lessons.length,
    withDebt: lessons.filter(l => (l.debt_hours || 0) > 0).length,
    totalHours: lessons.reduce((sum, l) => sum + (l.academic_hours || 0), 0),
    totalDebtHours: lessons.reduce((sum, l) => sum + (l.debt_hours || 0), 0)
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <GraduationCap className="h-6 w-6" />
                  <span>Индивидуальные занятия</span>
                </DialogTitle>
                <p className="text-green-100">Управляйте индивидуальными занятиями учеников</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="gap-2 text-green-600 bg-white hover:bg-green-50">
                  <Download className="h-4 w-4" />
                  Экспорт в CSV
                </Button>
                <AddIndividualLessonModal onLessonAdded={handleLessonAdded} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Всего учеников</p>
                    <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">С задолженностью</p>
                    <p className="text-xl font-bold text-red-600">{stats.withDebt}</p>
                  </div>
                  <div className="p-2 bg-red-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Всего часов</p>
                    <p className="text-xl font-bold text-green-600">{stats.totalHours}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <BookOpen className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Долг часов</p>
                    <p className="text-xl font-bold text-orange-600">{stats.totalDebtHours}</p>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <IndividualLessonsFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onReset={handleResetFilters}
          />

          {/* Lessons Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-gray-900">Список индивидуальных занятий</h2>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {lessons.length} учеников
                </Badge>
              </div>
            </div>

            <IndividualLessonsTable lessons={lessons} isLoading={isLoading} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};