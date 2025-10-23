import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchInputProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onClear?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  debounceMs?: number;
  value?: string;
}

export const SearchInput = ({ 
  placeholder = "Поиск...", 
  onSearch, 
  onClear,
  className = "",
  size = 'md',
  debounceMs = 500,
  value: externalValue
}: SearchInputProps) => {
  const [internalQuery, setInternalQuery] = useState(externalValue || "");
  const query = externalValue !== undefined ? externalValue : internalQuery;
  
  // Debounced value для оптимизации запросов
  const debouncedQuery = useDebounce(query, debounceMs);

  // Вызываем onSearch только когда debounced значение меняется
  useEffect(() => {
    if (debouncedQuery !== undefined) {
      onSearch?.(debouncedQuery);
    }
  }, [debouncedQuery, onSearch]);

  const handleChange = (value: string) => {
    if (externalValue === undefined) {
      setInternalQuery(value);
    }
    // Если используется controlled компонент, родитель обновит значение
  };

  const handleClear = () => {
    if (externalValue === undefined) {
      setInternalQuery("");
    }
    onClear?.();
  };

  const sizeClasses = {
    sm: "h-8 text-sm",
    md: "h-10",
    lg: "h-12"
  };

  return (
    <div className={`relative ${className}`}>
      <Input
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className={`pr-20 ${sizeClasses[size]}`}
      />
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
        {query && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClear}
            className="h-6 w-6 p-0 hover:bg-muted"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        <Search className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
};