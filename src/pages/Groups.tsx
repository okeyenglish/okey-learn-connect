import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, BarChart3, TrendingUp, Download, ArrowLeft } from "lucide-react";
import { useLearningGroups, GroupFilters } from "@/hooks/useLearningGroups";
import { GroupsTable } from "@/components/learning-groups/GroupsTable";
import { GroupsFilters } from "@/components/learning-groups/GroupsFilters";
import { AddGroupModal } from "@/components/learning-groups/AddGroupModal";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const GroupsContent = () => {
  const [filters, setFilters] = useState<GroupFilters>({
    status: ['active', 'forming'] // Show active and forming groups by default
  });

  const { groups, isLoading } = useLearningGroups(filters);

  const handleFiltersChange = (newFilters: GroupFilters) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({ status: ['active', 'forming'] });
  };

  const handleGroupAdded = () => {
    // Refresh will happen automatically due to React Query
  };

  // Calculate statistics
  const stats = {
    total: groups.length,
    active: groups.filter(g => g.status === 'active').length,
    forming: groups.filter(g => g.status === 'forming').length,
    totalStudents: groups.reduce((sum, g) => sum + g.current_students, 0),
    totalCapacity: groups.reduce((sum, g) => sum + g.capacity, 0)
  };

  const utilizationRate = stats.totalCapacity > 0 ? Math.round((stats.totalStudents / stats.totalCapacity) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Управление группами</h1>
                <p className="text-gray-600 text-sm">Управляйте учебными группами и их расписанием</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Экспорт
              </Button>
              <AddGroupModal onGroupAdded={handleGroupAdded} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Всего групп</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Активных групп</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Формируется</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.forming}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Заполненность</p>
                  <p className="text-2xl font-bold text-purple-600">{utilizationRate}%</p>
                  <p className="text-xs text-gray-500">{stats.totalStudents}/{stats.totalCapacity}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <GroupsFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onReset={handleResetFilters}
        />

        {/* Groups Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-gray-900">Список групп</h2>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {groups.length} групп
              </Badge>
            </div>
          </div>

          <GroupsTable groups={groups} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default function Groups() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'manager']}>
      <GroupsContent />
    </ProtectedRoute>
  );
}