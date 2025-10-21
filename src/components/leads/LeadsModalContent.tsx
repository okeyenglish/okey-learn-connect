import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LeadCard } from "@/components/leads/LeadCard";
import { CreateLeadDialog } from "@/components/leads/CreateLeadDialog";
import { LeadFilters } from "@/components/leads/LeadFilters";
import { useToast } from "@/hooks/use-toast";
import { useStudents } from "@/hooks/useStudents";

interface LeadsModalContentProps {
  onLeadClick?: (clientId: string) => void;
}

export function LeadsModalContent({ onLeadClick }: LeadsModalContentProps) {
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    source: "all",
    branch: "all",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { students, isLoading: studentsLoading } = useStudents();

  // Получаем активных студентов по занятиям
  const { data: activeGroupStudents = [], isLoading: groupStudentsLoading } = useQuery({
    queryKey: ['active-group-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_students')
        .select('student_id')
        .eq('status', 'active');
      if (error) throw error;
      return (data || []).map((gs: any) => gs.student_id as string);
    }
  });

  const { data: activeIndividualLessons = [], isLoading: individualLessonsLoading } = useQuery({
    queryKey: ['active-individual-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('individual_lessons')
        .select('student_id')
        .eq('is_active', true)
        .eq('status', 'active');
      if (error) throw error;
      return (data || []).map((il: any) => il.student_id as string);
    }
  });

  // Лиды = студенты без занятий
  const leadsData = useMemo(() => {
    if (!students || students.length === 0) return [];
    
    const activeStudentIds = new Set<string>([...activeGroupStudents, ...activeIndividualLessons]);
    
    return students
      .filter((s) => !activeStudentIds.has(s.id))
      .map((s) => ({
        id: s.id,
        first_name: s.first_name || s.name?.split(" ")[0] || "Без имени",
        last_name: s.last_name || s.name?.split(" ").slice(1).join(" ") || "",
        phone: s.phone || "",
        email: s.email || "",
        branch: s.branch || "Окская",
        notes: s.notes || "",
        status: s.status,
        created_at: s.created_at,
      }));
  }, [students, activeGroupStudents, activeIndividualLessons]);
  
  const refetch = () => {
    // Инвалидируем все связанные запросы
    queryClient.invalidateQueries({ queryKey: ['students'] });
    queryClient.invalidateQueries({ queryKey: ['active-group-students'] });
    queryClient.invalidateQueries({ queryKey: ['active-individual-lessons'] });
  };

  const applyFilters = (items: any[]) => {
    const s = search.toLowerCase();
    return items.filter((x) => {
      const fullName = `${x.first_name || ""} ${x.last_name || ""}`.toLowerCase();
      const matchesSearch = !s || fullName.includes(s) || (x.phone || "").toLowerCase().includes(s) || (x.email || "").toLowerCase().includes(s);
      const matchesBranch = filters.branch === "all" || x.branch === filters.branch;
      return matchesSearch && matchesBranch;
    });
  };

  const displayLeads = applyFilters(leadsData || []);
  const loading = studentsLoading || groupStudentsLoading || individualLessonsLoading;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Лиды</h2>
          <p className="text-muted-foreground mt-1">
            Ученики без занятий ({displayLeads.length})
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить лида
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени, телефону, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="w-4 h-4 mr-2" />
          Фильтры
        </Button>
      </div>

      {showFilters && (
        <LeadFilters filters={filters} onFiltersChange={setFilters} />
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
      ) : displayLeads.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Лиды не найдены</p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Создать первый лид
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onUpdate={refetch} />
          ))}
        </div>
      )}

      <CreateLeadDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          refetch();
          toast({ title: "Лид создан", description: "Новый лид успешно добавлен в систему" });
        }}
      />
    </div>
  );
}
