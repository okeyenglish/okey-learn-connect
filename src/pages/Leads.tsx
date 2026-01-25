import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/typedClient";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LeadCard } from "@/components/leads/LeadCard";
import { CreateLeadDialog } from "@/components/leads/CreateLeadDialog";
import { LeadFilters } from "@/components/leads/LeadFilters";
import { useToast } from "@/hooks/use-toast";

export default function Leads() {
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    source: "all",
    branch: "all",
  });
  const { toast } = useToast();

  const { data: leads, isLoading, refetch } = useQuery({
    queryKey: ["leads", filters, search],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select(`
          *,
          lead_source:lead_sources(name),
          status:lead_statuses(name, color, slug),
          assigned:profiles!leads_assigned_to_fkey(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
      }

      if (filters.status !== "all") {
        query = query.eq("status_id", filters.status);
      }

      if (filters.source !== "all") {
        query = query.eq("lead_source_id", filters.source);
      }

      if (filters.branch !== "all") {
        query = query.eq("branch", filters.branch);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Лиды</h1>
          <p className="text-muted-foreground mt-1">
            Управление входящими заявками
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Создать лид
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
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Фильтры
        </Button>
      </div>

      {showFilters && (
        <LeadFilters filters={filters} onFiltersChange={setFilters} />
      )}

      {isLoading ? (
        <div className="text-center py-12">Загрузка...</div>
      ) : leads?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Лиды не найдены
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {leads?.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onUpdate={refetch} />
          ))}
        </div>
      )}

      <CreateLeadDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          refetch();
          toast({
            title: "Лид создан",
            description: "Новый лид успешно добавлен в систему",
          });
        }}
      />
    </div>
  );
}
