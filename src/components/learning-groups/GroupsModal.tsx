import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, BarChart3, TrendingUp, Download, X } from "lucide-react";
import { useLearningGroups, GroupFilters } from "@/hooks/useLearningGroups";
import { GroupsTable } from "./GroupsTable";
import { GroupsFilters } from "./GroupsFilters";
import { AddGroupModal } from "./AddGroupModal";

interface GroupsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GroupsModal = ({ open, onOpenChange }: GroupsModalProps) => {
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

  const handleStatusFilter = (status: string) => {
    setFilters({ status: [status] });
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold mb-2">Управление группами</DialogTitle>
                <p className="text-blue-100">Управляйте учебными группами и их расписанием</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="gap-2 text-blue-600 bg-white hover:bg-blue-50">
                  <Download className="h-4 w-4" />
                  Экспорт
                </Button>
                <AddGroupModal onGroupAdded={handleGroupAdded} />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow border-green-200 hover:border-green-300"
              onClick={() => handleStatusFilter('active')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-medium text-gray-900">Активных групп</p>
                    <p className="text-4xl font-bold text-green-600">{stats.active}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-xl">
                    <BookOpen className="h-8 w-8 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow border-yellow-200 hover:border-yellow-300"
              onClick={() => handleStatusFilter('forming')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-medium text-gray-900">Формируется</p>
                    <p className="text-4xl font-bold text-yellow-600">{stats.forming}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-xl">
                    <TrendingUp className="h-8 w-8 text-yellow-600" />
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
      </DialogContent>
    </Dialog>
  );
};