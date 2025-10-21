import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface LeadFiltersProps {
  filters: {
    status: string;
    source: string;
    branch: string;
  };
  onFiltersChange: (filters: any) => void;
}

export const LeadFilters = ({ filters, onFiltersChange }: LeadFiltersProps) => {
  const { data: sources } = useQuery({
    queryKey: ["lead_sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_sources")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: statuses } = useQuery({
    queryKey: ["lead_statuses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_statuses")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
      <div className="space-y-2">
        <Label>Статус</Label>
        <Select
          value={filters.status}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, status: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {statuses?.map((status) => (
              <SelectItem key={status.id} value={status.id}>
                {status.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Источник</Label>
        <Select
          value={filters.source}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, source: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все источники</SelectItem>
            {sources?.map((source) => (
              <SelectItem key={source.id} value={source.id}>
                {source.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Филиал</Label>
        <Select
          value={filters.branch}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, branch: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все филиалы</SelectItem>
            <SelectItem value="Окская">Окская</SelectItem>
            <SelectItem value="Сормовская">Сормовская</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
