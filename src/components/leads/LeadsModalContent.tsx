import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LeadCard } from "@/components/leads/LeadCard";
import { CreateLeadDialog } from "@/components/leads/CreateLeadDialog";
import { LeadFilters } from "@/components/leads/LeadFilters";
import { useToast } from "@/hooks/use-toast";
import { useClients } from "@/hooks/useClients";

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

  // Primary source: leads table (simple select, no FK expansions to avoid schema issues)
  const { data: leads, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["leads", filters, search],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
        );
      }

      if (filters.status !== "all") query = query.eq("status_id", filters.status);
      if (filters.source !== "all") query = query.eq("lead_source_id", filters.source);
      if (filters.branch !== "all") query = query.eq("branch", filters.branch);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fallback: clients as leads when leads table is empty or unavailable
  const { clients, isLoading: clientsLoading } = useClients();
  const mappedClients = useMemo(() =>
    (clients || []).map((client: any) => ({
      id: client.id,
      first_name: client.name?.split(" ")[0] || client.name || "Без имени",
      last_name: client.name?.split(" ").slice(1).join(" ") || "",
      phone: client.phone,
      email: client.email || "",
      branch: client.branch || "Окская",
      notes: client.notes || "",
      created_at: client.created_at,
    })),
  [clients]);

  const applyFilters = (items: any[]) => {
    const s = search.toLowerCase();
    return items.filter((x) => {
      const fullName = `${x.first_name || ""} ${x.last_name || ""}`.toLowerCase();
      const matchesSearch = !s || fullName.includes(s) || (x.phone || "").toLowerCase().includes(s) || (x.email || "").toLowerCase().includes(s);
      const matchesBranch = filters.branch === "all" || x.branch === filters.branch;
      const matchesStatus = filters.status === "all" || x.status_id === filters.status;
      const matchesSource = filters.source === "all" || x.lead_source_id === filters.source;
      return matchesSearch && matchesBranch && matchesStatus && matchesSource;
    });
  };

  const useFallback = isError || (leads && leads.length === 0);
  const displayLeads = useFallback ? applyFilters(mappedClients) : applyFilters(leads || []);
  const loading = isLoading || (useFallback && clientsLoading);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Лиды</h2>
          <p className="text-muted-foreground mt-1">
            Управление входящими заявками{useFallback ? " (данные из контактов)" : ""}
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
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="w-4 h-4 mr-2" />
          Фильтры
        </Button>
      </div>

      {showFilters && (
        <LeadFilters filters={filters} onFiltersChange={setFilters} />
      )}

      {isError && (
        <div className="flex items-center gap-2 text-yellow-600 text-sm">
          <AlertTriangle className="w-4 h-4" />
          Не удалось загрузить таблицу лидов. Показаны контакты как лиды. {String((error as any)?.message || "")}
        </div>
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
